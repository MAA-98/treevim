import { createConnection } from 'node:net';

import { Type } from '@earendil-works/pi-ai';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const maxResponseBytes = 1024 * 1024;
const timeoutMs = 30_000;

async function listFolds(signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted();

  const socketName = process.env.TREEVIM_SOCKET;
  if (socketName === undefined) {
    throw new Error('TREEVIM_SOCKET is not set.');
  }

  return await new Promise((resolve, reject) => {
    const socket = createConnection(socketName);
    let buffer = '';
    let received = false;

    const abort = () => {
      socket.destroy(new Error('Treevim tool call aborted.'));
    };

    signal?.addEventListener('abort', abort, { once: true });

    socket.setEncoding('utf8');
    socket.setTimeout(timeoutMs, () => {
      socket.destroy(new Error('Treevim tool call timed out.'));
    });

    socket.once('connect', () => {
      socket.write(`${JSON.stringify({ method: 'fold.list' })}\n`);
    });

    socket.on('data', (chunk: string) => {
      if (received) {
        return;
      }

      buffer += chunk;

      if (Buffer.byteLength(buffer, 'utf8') > maxResponseBytes) {
        socket.destroy(new Error('Treevim response is too large.'));
        return;
      }

      const newline = buffer.indexOf('\n');
      if (newline === -1) {
        return;
      }

      received = true;

      try {
        const response: unknown = JSON.parse(buffer.slice(0, newline));

        if (typeof response !== 'object' || response === null) {
          throw new Error('Invalid Treevim response.');
        }

        if ('ok' in response && response.ok === true && 'value' in response) {
          resolve(response.value);
        } else if (
          'ok' in response &&
          response.ok === false &&
          'error' in response &&
          typeof response.error === 'string'
        ) {
          reject(new Error(response.error));
        } else {
          reject(new Error('Invalid Treevim response.'));
        }
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });

    socket.once('error', reject);

    socket.once('close', () => {
      signal?.removeEventListener('abort', abort);

      if (!received) {
        reject(new Error('Treevim connection closed without a response.'));
      }
    });
  });
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'treevim_fold_list',
    label: 'List Treevim folds',
    description: 'List the fold trees in the active Treevim app.',
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, signal) {
      const value = await listFolds(signal);

      return {
        content: [{ type: 'text', text: JSON.stringify(value) }],
        details: {},
      };
    },
  });
}
