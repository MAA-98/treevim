import { basename, join } from 'node:path';

import type { CreateAppDefinitionApplicator, NodeKind } from 'treevim';

import type { PosixValue, PosixId } from './domain/posix-tree.js';
import { posixFilenameSchema, posixValueSchema } from './domain/posix-tree.js';
import { createFsResyncSubscription } from './infrastructure/load-node-posix-app-api.js';
import { getUnixAbsPath } from './infrastructure/get-unix-abs-path.js';
import { getDirEntries } from './infrastructure/get-dir-entries.js';

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
    createNodePresenter:
      ({ nerdFonts }) =>
      (id: PosixId, value: PosixValue, _nodeKind: NodeKind) => {
        switch (value.kind) {
          case 'file': {
            const filenameHighlightToken = {
              content: id,
              hlToken: 'node.content.file.name',
            };

            if (['.ts', '.mts', '.cts'].some((suffix) => id.endsWith(suffix))) {
              return [
                {
                  content: '\ue8ca ',
                  hlToken: 'node.content.icon.typescript',
                },
                filenameHighlightToken,
              ];
            }

            if (id.endsWith('.tsx')) {
              return [
                {
                  content: '\ue7ba ',
                  hlToken: 'node.content.icon.typescript',
                },
                filenameHighlightToken,
              ];
            }

            if (['.js', '.mjs', '.cjs'].some((suffix) => id.endsWith(suffix))) {
              return [
                {
                  content: '\udb80\udf1e ',
                  hlToken: 'node.content.icon.javascript',
                },
                filenameHighlightToken,
              ];
            }

            if (id.endsWith('.jsx')) {
              return [
                {
                  content: '\ue7ba ',
                  hlToken: 'node.content.icon.javascript',
                },
                filenameHighlightToken,
              ];
            }

            if (id.endsWith('.json')) {
              return [
                {
                  content: '\udb80\udd69 ',
                  hlToken: 'node.content.icon.json',
                },
                filenameHighlightToken,
              ];
            }

            if (id.endsWith('.md')) {
              return [
                {
                  content: '\uf48a ',
                  hlToken: 'node.content.icon.md',
                },
                filenameHighlightToken,
              ];
            }

            if (id.endsWith('.svg')) {
              return [
                {
                  content: '\udb81\udf21 ',
                  hlToken: 'node.content.icon.svg',
                },
                filenameHighlightToken,
              ];
            }

            if (id === '.DS_Store') {
              return [
                {
                  content: '\ue711 ',
                  hlToken: 'node.content.icon.apple-logo',
                },
                filenameHighlightToken,
              ];
            }

            if (id === '.gitignore') {
              return [
                {
                  content: '\udb80\udea2 ',
                  hlToken: 'node.content.icon.git-logo',
                },
                filenameHighlightToken,
              ];
            }

            return [
              {
                content: '  ',
                hlToken: 'node.content.padding',
              },
              filenameHighlightToken,
            ];
          }

          case 'directory': {
            const foldernameHighlightTokens = [
              {
                content: id,
                hlToken: 'node.content.directory.name',
              },
              {
                content: '/',
                hlToken: 'node.content.directory.slash',
              },
            ];

            if (id === '.git') {
              return [
                {
                  content: '\udb80\udea2 ',
                  hlToken: 'node.content.icon.git-logo',
                },
                ...foldernameHighlightTokens,
              ];
            }

            return [
              {
                content: '\uf07b ',
                hlToken: 'node.content.icon.folder',
              },
              ...foldernameHighlightTokens,
            ];
          }

          case 'symlink': {
            return [
              {
                content: '  ',
                hlToken: 'node.content.padding',
              },
              {
                content: id,
                hlToken: 'node.content.symlink.name',
              },
            ];
          }
        }
      },
    subscribeToResync: createFsResyncSubscription(join(unixAbsPath)),
  };

  return (appDefinitionConsumer) => {
    return appDefinitionConsumer(appDefinition);
  };
};
