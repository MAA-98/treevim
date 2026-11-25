import { createServer, type Socket } from 'node:net';

import type { ToolBridge } from '@mak-98/dirvi-app';

const maxRequestBytes = 64 * 1024;
const timeoutMs = 30_000;

/**
 * Starts the initial, fold.list-only IPC endpoint.
 * Returns a function that closes the server and its connections.
 */
export async function startToolSocket(
  socketName: string,
  toolBridge: ToolBridge,
): Promise<() => Promise<void>> {
  const connections = new Set<Socket>();

  const server = createServer((socket) => {
    connections.add(socket);

    const controller = new AbortController();
    let buffer = '';
    let handled = false;

    socket.setEncoding('utf8');
    socket.setTimeout(timeoutMs, () => socket.destroy());

    socket.on('error', () => {
      // A disconnected client is handled by the close event.
    });

    socket.on('close', () => {
      connections.delete(socket);
      controller.abort();
    });

    socket.on('data', (chunk: string) => {
      if (handled) {
        return;
      }

      buffer += chunk;

      if (Buffer.byteLength(buffer, 'utf8') > maxRequestBytes) {
        handled = true;
        socket.destroy();
        return;
      }

      const newline = buffer.indexOf('\n');
      if (newline === -1) {
        return;
      }

      handled = true;
      const line = buffer.slice(0, newline);

      void (async () => {
        try {
          const request: unknown = JSON.parse(line);

          if (
            typeof request !== 'object' ||
            request === null ||
            !('method' in request) ||
            request.method !== 'fold.list'
          ) {
            throw new Error('Unsupported request.');
          }

          const value = await toolBridge.invoke(
            'fold.list',
            {},
            controller.signal,
          );

          socket.end(`${JSON.stringify({ ok: true, value })}\n`);
        } catch (error: unknown) {
          if (socket.destroyed) {
            return;
          }

          const message =
            error instanceof Error ? error.message : String(error);

          socket.end(`${JSON.stringify({ ok: false, error: message })}\n`);
        }
      })();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketName, () => {
      server.off('error', reject);
      resolve();
    });
  });

  // Keep a listener after startup so later server errors don't crash Node.
  // Add application-level error reporting when this leaves prototype status.
  server.on('error', () => {});

  return async () => {
    for (const socket of connections) {
      socket.destroy();
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };
}
