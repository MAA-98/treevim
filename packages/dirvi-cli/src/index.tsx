#!/usr/bin/env node
import { join } from 'node:path';
import { Command } from 'commander';
import { render } from 'ink';

import type { InitialAppOptions } from '@mak-98/dirvi-app';

import { createInitialization } from './infrastructure/create-initialization.js';
import { getXdgConfigHome } from './infrastructure/get-xdg-paths.js';
import { createClipboard } from './infrastructure/create-clipboard.js';
import { InkAppScreen } from './ui/InkAppScreen.js';
import { InkLoadingScreen } from './ui/InkLoadingScreen.js';
import { InkShell } from './ui/InkShell.js';

const program = new Command();

// =============================================================================
// Terminal Screen Setup
// =============================================================================
// Restore the terminal away from alternate screen during normal cleanup and as
// a last-resort fallback when Node is exiting.
const uiOutput = process.stderr;
const enterAlternateScreen = '\u001b[?1049h\u001b[2J\u001b[H\u001b[?25l';
const leaveAlternateScreen = '\u001b[?25h\u001b[?1049l';

// Idempotent terminal restoration
let alternateScreenActive = false;
const restoreTerminal = () => {
  if (!alternateScreenActive) {
    return;
  }

  uiOutput.write(leaveAlternateScreen);
  alternateScreenActive = false;
};

// Node exit last resort
process.on('exit', restoreTerminal);

// =============================================================================
// Resolving Paths
// =============================================================================
/**
 * The base directory for user-maintained treevim configuration.
 *
 * Prefer the XDG override when supplied, otherwise keep configuration in the
 * conventional dot-config location:
 *
 *   ~/.config/treevim/init.mjs
 *
 * This is intentionally separate from application data such as saved views.
 */
const treevimConfigDirectory = join(getXdgConfigHome(), 'treevim');
/** Executable ESM startup script evaluated during treevim initialization. */
const initPath = join(treevimConfigDirectory, 'init.mjs');

// =============================================================================
// Commands
// =============================================================================
program
  .name('treevim')
  .description('View and manage trees.')
  .version('0.1.0-beta.9')
  .helpOption('--help')
  .option('-a, --app <id>', 'App name to open at startup.')
  .option('-i, --input <value>', 'Input for the app at startup.')
  .action(async () => {
    const initialAppOptions = program.opts<InitialAppOptions>();
    const initResult = await createInitialization(initPath);

    const useAlternateScreen = uiOutput.isTTY === true;
    const stdoutIsInteractive = process.stdout.isTTY === true;
    if (useAlternateScreen) {
      uiOutput.write(enterAlternateScreen);
      alternateScreenActive = true;
    }
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const clipboard = createClipboard();

    try {
      const app = render(
        <InkShell
          loadingScreenRenderer={InkLoadingScreen}
          appScreenRenderer={InkAppScreen}
          initialAppOptions={initialAppOptions}
          initResult={initResult}
          {...(stdoutIsInteractive ? {} : { stdout: stdoutWrite })}
          {...(clipboard === undefined ? {} : { clipboard })}
        />,
        {
          stdout: uiOutput,
          incrementalRendering: true,
        },
      );

      // Errors thrown while leaving this await still execute the finally block.
      await app.waitUntilExit();
    } finally {
      restoreTerminal(); // Always restore terminal regardless of error
    }
  });

// =============================================================================
// Program Start
// =============================================================================
try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  const message =
    error instanceof Error
      ? process.env.TREEVIM_DEBUG === '1'
        ? (error.stack ?? error.message)
        : error.message
      : String(error);

  process.stderr.write(`treevim error: ${message}\n`);
  process.exitCode = 1;
}
