import { createConnection } from 'node:net';

const maxResponseBytes = 1024 * 1024;
const timeoutMs = 30_000;

export async function invokeTool(
  socketName: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  signal?.throwIfAborted();

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
      socket.write(
        `${JSON.stringify({ method: 'invokeTool', name, input })}\n`,
      );
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
