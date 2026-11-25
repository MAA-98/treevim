import type {
  AsyncCreateAppDefinitionApplicator,
  Config,
  HighlightResolver, ToolDefinition,
} from 'dirvi-apis';

import { NormalCommand } from './command.js';

/**
 * Resolved startup state produced by evaluating `init.mjs`.
 *
 * The initialization script runs before the terminal UI starts. It uses the
 * temporary `dirvi` configuration facade to set shared options, register app
 * packages, choose the initial app, and register Ex commands.
 */
export type Initialization = {
  /** Registered apps and the app selected for startup. */
  readonly app: {
    /** ID of the app to open initially; must be present in `registered`. */
    initial: string;

    /** App definition applicator keyed by app ID. */
    registered: ReadonlyMap<string, AsyncCreateAppDefinitionApplicator>;
  };

  /** Resolved app configurations keyed by app ID. */
  readonly configs: ReadonlyMap<string, Readonly<Config>>;

  /**
   * Normal commands registered by the initialization script, keyed by appId and
   * then command.
   */
  readonly normalCommands: ReadonlyMap<
    string,
    ReadonlyMap<string, NormalCommand>
  >;

  /**
   * Tools registered by the initialization script, keyed by `appId` and then
   * tool name.
   */
  readonly tools: ReadonlyMap<string, ReadonlyMap<string, ToolDefinition<any>>>;

  /**
   * App-specific highlight resolvers, keyed by app ID.
   * Apps without an entry use the default rendering.
   */
  readonly highlightResolvers: ReadonlyMap<string, HighlightResolver>;
};

export type InitializationResult = {
  kind: 'init' | 'default';
  value: Initialization;
};
