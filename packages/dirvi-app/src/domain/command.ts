import type { TreevimApi } from 'dirvi-apis';

/**
 * A command registered by init.mjs and invoked through Ex mode.
 */
export type ExCommand = {
  readonly execute: (
    api: TreevimApi,
    rawArgs: string | undefined,
  ) => void | Promise<void>;
};

export type NormalCommand = {
  readonly execute: (api: TreevimApi) => void | Promise<void>;
};
