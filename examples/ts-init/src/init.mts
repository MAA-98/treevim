import type {} from 'treevim/treevim';
import type { HighlightStyle, TreevimApi, UiHighlightToken } from 'treevim';

import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const execFileAsync = promisify(execFile);

import { highlightResolver as fsHlRes } from '@mak-98/posix-fs-dirvi-app/highlight';

const commonConfig = {
  firstIndent: ' ',
};
const fsUiHighlights = new Map<string, HighlightStyle>(
  Object.entries({
    'ui.status-bar.normal': { fg: { hex: '#b9f5ed' }, bg: { hex: '#164e59' } },
    'ui.status-bar.command': { fg: { hex: '#102a36' }, bg: { hex: '#67d5c5' } },
    'ui.tree.cursor-line': { bg: { hex: '#24465b' } },
    'ui.tree.fold': { fg: { hex: '#79b9bd' } },
    'ui.tree.indent-guide': { fg: { hex: '#527b8d' } },
    'ui.tree.indent-guide.active': { fg: { hex: '#80d4ca' } },
  } satisfies Partial<Record<UiHighlightToken, HighlightStyle>>),
);

const xmlUiHighlights = new Map<string, HighlightStyle>(
  Object.entries({
    'ui.status-bar.normal': { fg: { hex: '#e7d8ff' }, bg: { hex: '#49365f' } },
    'ui.status-bar.command': { fg: { hex: '#302317' }, bg: { hex: '#f2c57c' } },
    'ui.tree.cursor-line': { bg: { hex: '#403b5c' } },
    'ui.tree.fold': { fg: { hex: '#c9a7e8' } },
    'ui.tree.indent-guide': { fg: { hex: '#82769c' } },
    'ui.tree.indent-guide.active': { fg: { hex: '#e2bd81' } },
  } satisfies Partial<Record<UiHighlightToken, HighlightStyle>>),
);
const commonCommands = [
  {
    command: 'shell',
    execute: async (api: TreevimApi, rawArgs: string | undefined) => {
      if (rawArgs === undefined || rawArgs.trim() === '') {
        api.app.addMessage('Usage: :shell <shell command>', 'error');
        return;
      }

      try {
        const { stdout, stderr } = await execFileAsync(
          '/bin/sh',
          ['-c', rawArgs],
          {
            encoding: 'utf8',
            timeout: 30_000,
            maxBuffer: 1024 * 1024,
          },
        );

        if (stdout !== '') {
          api.app.addMessage(stdout.trimEnd(), 'message');
        }

        if (stderr !== '') {
          api.app.addMessage(stderr.trimEnd(), 'error');
        }
      } catch (error) {
        // Failed commands may still have produced useful output.
        if (
          error instanceof Error &&
          'stdout' in error &&
          typeof error.stdout === 'string' &&
          error.stdout !== ''
        ) {
          api.app.addMessage(error.stdout.trimEnd(), 'message');
        }

        const stderr =
          error instanceof Error &&
          'stderr' in error &&
          typeof error.stderr === 'string'
            ? error.stderr.trimEnd()
            : '';

        api.app.addMessage(
          stderr || (error instanceof Error ? error.message : String(error)),
          'error',
        );
      }
    },
  },
];

treevim.app.register({
  id: 'fs',
  create: async (input) => {
    const { app } = await import('@mak-98/posix-fs-dirvi-app/app');
    return app(input);
  },
  config: commonConfig,
  ex: [
    {
      command: 'show-path',
      execute: (api, _rawArg) => {
        const path = api.app.pathAtCursor();
        api.app.addMessage(path.join('/'));
      },
    },
  ],
  highlightResolver: (token: string) =>
    // Use icon highlights then theme
    fsHlRes(token) ?? fsUiHighlights.get(token),
});

treevim.app.initial('fs');

treevim.app.register({
  id: 'xml',
  create: async (input) => {
    const { app } = await import('@mak-98/xml-dirvi-app');
    return app(input);
  },
  config: commonConfig,
  ex: commonCommands,
  highlightResolver: (token: string) => xmlUiHighlights.get(token),
});
