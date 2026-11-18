import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { PublicInitApi } from 'dirvi-apis';
import type { Initialization } from '@mak-98/dirvi-app';
import { createInitRuntime } from '@mak-98/dirvi-app';
import { createNoFileInitialization } from './create-no-file-initialization.js';

/**
 * Evaluates the user's init.mjs startup script and returns its resolved
 * configuration object `Initialization`.
 *
 * While init.mjs is evaluated, this loader provides the global `treevim` API.
 * The script configures treevim by calling that API:
 *
 * ```js
 * treevim.options.set({
 *   indentSize: 4,
 * });
 * ```
 *
 * The global API is restored after evaluation, whether evaluation succeeds or
 * fails. A missing init.mjs is valid and resolves to the default
 * configuration.
 *
 * init.mjs is trusted local code. It executes with the same Node.js
 * permissions as the treevim process and may import other ESM modules.
 *
 * @throws {Error} When init.mjs cannot be read, imported, executed, or when
 * configuration registered by the script is invalid.
 */
export async function createInitialization(
  initPath: string,
): Promise<Initialization> {
  // A missing init.mjs means no script registrations. Other access failures are
  // startup errors and must not be treated as a missing configuration file.
  try {
    await access(initPath);
  } catch (error: unknown) {
    if (isFileNotFoundError(error)) {
      return createNoFileInitialization()
    }
    throw error;
  }

  const runtime = createInitRuntime();
  // Preserve an existing property descriptor so this loader does not leak its
  // startup API into the process after init.mjs evaluation completes.
  const previousTreevim = Object.getOwnPropertyDescriptor(
    globalThis,
    'treevim',
  );

  Object.defineProperty(globalThis, 'treevim', {
    configurable: true,
    value: runtime.api,
    // init.mjs may call the global `treevim` API but cannot replace it.
    writable: false,
  });

  try {
    // Convert the filesystem path into a file URL before dynamic ESM import.
    // init.mjs may use imports and top-level await normally.
    await import(pathToFileURL(initPath).href);

    // Seal startup registration only after the full init module graph has
    // finished evaluating.
    return runtime.finish();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Unable to evaluate configuration at ${initPath}: ${message}`,
    );
  } finally {
    restoreGlobalTreevim(previousTreevim);
  }
}

/**
 * Restores the global `treevim` property to exactly the state it had before
 * init.mjs was evaluated.
 *
 * Restoring the full property descriptor preserves a pre-existing getter,
 * setter, writability, configurability, or value. If no property existed,
 * remove the temporary injected API entirely.
 */
function restoreGlobalTreevim(
  previousTreevim: PropertyDescriptor | undefined,
): void {
  if (previousTreevim === undefined) {
    delete (globalThis as { treevim?: PublicInitApi }).treevim;
    return;
  }

  Object.defineProperty(globalThis, 'treevim', previousTreevim);
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
