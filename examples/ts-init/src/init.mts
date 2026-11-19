import type {} from 'treevim/treevim';
import { TreevimApi } from 'treevim';

import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const execFileAsync = promisify(execFile);

import { highlightResolver as fsHlRes } from '@mak-98/posix-fs-dirvi-app/highlight';

const commonConfig = {
  firstIndent: ' ',
};
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
  config: {
    ...commonConfig,
    theme: {
      statusBar: {
        normal: { fg: { hex: '#b9f5ed' }, bg: { hex: '#164e59' } },
        command: { fg: { hex: '#102a36' }, bg: { hex: '#67d5c5' } },
      },
      tree: {
        cursorLine: { bg: { hex: '#24465b' } },
        foldInfo: { fg: { hex: '#79b9bd' } },
        indentGuide: { fg: { hex: '#527b8d' } },
        activeIndentGuide: { fg: { hex: '#80d4ca' } },
      },
    },
  },
  ex: [
    {
      command: 'show-path',
      execute: (api, _rawArg) => {
        const path = api.app.pathAtCursor();
        api.app.addMessage(path.join('/'));
      },
    },
  ],
  highlightResolver: (token: string) => {
    return fsHlRes(token);
  },
});

treevim.app.initial('fs');

treevim.app.register({
  id: 'xml',
  create: async (input) => {
    const { app } = await import('@mak-98/xml-dirvi-app');
    return app(input);
  },
  config: {
    ...commonConfig,
    theme: {
      statusBar: {
        normal: { fg: { hex: '#e7d8ff' }, bg: { hex: '#49365f' } },
        command: { fg: { hex: '#302317' }, bg: { hex: '#f2c57c' } },
      },
      tree: {
        cursorLine: { bg: { hex: '#403b5c' } },
        foldInfo: { fg: { hex: '#c9a7e8' } },
        indentGuide: { fg: { hex: '#82769c' } },
        activeIndentGuide: { fg: { hex: '#e2bd81' } },
      },
    },
  },
  ex: commonCommands,
});
