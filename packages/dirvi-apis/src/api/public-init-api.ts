import type { TreevimApi, ConfigPatch } from './treevim-api/index.js';
import type { HighlightResolver } from './highlight-resolver/highlight-resolver.js';
import type { AsyncCreateAppDefinitionApplicator } from '../app/index.js';
import type { ToolDefinition } from './tool-definition.js';

// An `InitRuntime` provides this API while the script runs. It describes
// the intended API for TypeScript consumers and provides editor guidance and
// compile-time checking. The script uses it to configure Treevim by evaluation
// creating `Initialization` object used internally by Treevim.
//
// WARNING: Does not validate values at runtime: `init.mjs` may be plain
// JavaScript and can pass values that do not match these types. The runtime
// must validate inputs before relying on them.

/**
 * The public API exposed to `init.mjs` as the global `treevim` object.
 */
export type PublicInitApi = {
  readonly app: {
    /**
     * Optionally selects the app initially opened by the shell.
     *
     * If omitted, the runtime falls back to the most recently registered app.
     */
    initial: (appId: string) => void;
    /**
     * Registers an application made available by init.mjs.
     */
    register: (app: {
      id: string;
      create: AsyncCreateAppDefinitionApplicator;
      /**
       * Configuration patch for this app. Sets indentation behavior.
       *
       * The runtime merges it with the default configuration and validates
       * the result. When the app becomes active, its configuration is used.
       */
      config?: ConfigPatch;
      /**
       * Normal commands invoked in normal mode while the app is active.
       *
       * Each closure receives the live TreevimApi when invoked, not while init.mjs
       * is being evaluated.
       *
       * An exact registered command takes precedence over a built-in command
       * with the same sequence. However, a shorter complete command may execute
       * before a longer registered sequence can be entered.
       *
       * Sequences must be nonempty and must not start with `:`, which is reserved
       * for entering command-line mode.
       */
      normal?: readonly {
        command: string;
        execute: (api: TreevimApi) => void | Promise<void>;
      }[];
      /**
       * Tools available in JS mode while this app is active.
       *
       * Each tool receives validated input and the live TreevimApi when invoked.
       *
       * Tool names must be unique within this app. The runtime rejects invalid
       * registrations and invalid inputs.
       */
      tools?: readonly ToolDefinition<any>[];
      /**
       * App-specific highlight resolver for content and UI tokens.
       */
      highlightResolver?: HighlightResolver;
    }) => void;
  };
};
