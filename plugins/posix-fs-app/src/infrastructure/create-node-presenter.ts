import type { NodeKind, NodePresenterOptions } from 'treevim';

import type { PosixId, PosixValue } from '../domain/posix-tree.js';

export const createNodePresenter =
  ({ nerdFonts }: NodePresenterOptions) =>
  (id: PosixId, value: PosixValue, _nodeKind: NodeKind) => {
    switch (value.kind) {
      case 'file': {
        const filenameHighlightToken = {
          content: id,
          hlToken: 'node.content.file.name',
        };
        if (!nerdFonts) {
          return [filenameHighlightToken];
        }

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
        
        if (id.endsWith('.yaml')) {
          return [
            {
              content: '\ue8eb ',
              hlToken: 'node.content.icon.yaml',
            },
            filenameHighlightToken,
          ];
        }
        
        if (id.endsWith('.xml')) {
          return [
            {
              content: '\ue8ea ',
              hlToken: 'node.content.icon.xml',
            },
            filenameHighlightToken,
          ];
        }
        
        if (id.endsWith('.zsh')) {
          return [
            {
              content: '\ue957 ',
              hlToken: 'node.content.icon.zshell',
            },
            filenameHighlightToken,
          ];
        }
        
        if (['.prettierignore', '.prettierrc'].includes(id)) {
          return [
            {
              content: '\ue6b4 ',
              hlToken: 'node.content.icon.prettier',
            },
            filenameHighlightToken
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
        if (!nerdFonts) {
          return foldernameHighlightTokens;
        }

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
        const symlinkName = {
          content: id,
          hlToken: 'node.content.symlink.name',
        };

        if (!nerdFonts) {
          return [symlinkName];
        }
        return [
          {
            content: '  ',
            hlToken: 'node.content.padding',
          },
          symlinkName,
        ];
      }
    }
  };
