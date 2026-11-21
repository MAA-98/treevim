import { basename, join } from 'node:path';

import type { CreateAppDefinitionApplicator } from 'treevim';

import type { PosixId } from './domain/posix-tree.js';
import { posixFilenameSchema, posixValueSchema } from './domain/posix-tree.js';
import { createFsResyncSubscription } from './infrastructure/load-node-posix-app-api.js';
import { getUnixAbsPath } from './infrastructure/get-unix-abs-path.js';
import { getDirEntries } from './infrastructure/get-dir-entries.js';
import { createNodePresenter } from './infrastructure/create-node-presenter.js';

/**
 * Creates applicator of AppDefinition.
 *
 * Input for this app is the absolute path to the directory to open on.
 */
export const app: CreateAppDefinitionApplicator = (input) => {
  const unixAbsPath = getUnixAbsPath(input ?? process.cwd());
  const rootId = posixFilenameSchema.parse(basename(unixAbsPath));
  function loadDirectoryEntries(path: readonly PosixId[]) {
    const address = join(unixAbsPath, ...path);
    return getDirEntries(address);
  }

  const appDefinition = {
    semanticOrder: false,
    valueSchema: posixValueSchema,
    loadChildren: (path: readonly PosixId[]) => loadDirectoryEntries(path),
    loadRoot: async () => ({
      id: rootId,
      value: { kind: 'directory' as const },
    }),
    createNodePresenter: createNodePresenter,
    subscribeToResync: createFsResyncSubscription(join(unixAbsPath)),
  };

  return (appDefinitionConsumer) => {
    return appDefinitionConsumer(appDefinition);
  };
};
