import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { MessageReplier } from '../src/domain/message-transport.js';
import { createSocketTransport } from '../src/infrastructure/create-socket-transport.js';

describe('createSocketTransport', () => {
  const frame = (id: string, data: string): string =>
    `${JSON.stringify({ type: 'message', id, data })}\n`;
  // ---------------------------------------------------------------------------
  // CREATE TEST SOCKETS
  // ---------------------------------------------------------------------------
  let socketDir: string | undefined;
  let socketName: string;
  beforeEach(async () => {
    // Keep the socket name short: Unix socket paths have a length limit.
    socketDir = await mkdtemp('/tmp/treevim-ipc-test');
    socketName = join(socketDir, 'sock');
  });
  
  // State of connection
  let client: Socket | undefined;
  let stop: (() => Promise<void>) | undefined;
  
  test('messages: ordered & newline-delimited', async () => {
    const onError = vi.fn();
    const server = await createSocketTransport(socketName, onError, {
      maxQueuedMessages: 256,
    });
    stop = server.stop;

    const messages: unknown[] = [];

    server.transport.subscribe((message) => {
      messages.push(message);
    });

    client = createConnection(socketName);
    await once(client, 'connect');

    // A frame can be split across writes; a write can also contain multiple
    // frames.
    const first = frame('1', 'first');
    client.write(first.slice(0, 5));
    client.write(first.slice(5) + frame('2', 'second'));

    await vi.waitFor(() => {
      expect(messages).toEqual([
        { type: 'message', id: '1', data: 'first' },
        { type: 'message', id: '2', data: 'second' },
      ]);
    });

    expect(onError).not.toHaveBeenCalled();
  });

  test('connection gets reply with the original message ID', async () => {
    const server = await createSocketTransport(socketName, vi.fn(), {
      maxQueuedMessages: 256,
    });
    stop = server.stop;

    const messages: unknown[] = [];
    const repliers: MessageReplier[] = [];

    server.transport.subscribe((message, replier) => {
      messages.push(message);
      repliers.push(replier);
    });

    client = createConnection(socketName);
    client.setEncoding('utf8');

    let response = '';
    client.on('data', (chunk: string) => {
      response += chunk;
    });

    await once(client, 'connect');
    client.write(frame('1', 'request'));

    await vi.waitFor(() => {
      expect(messages).toEqual([{ type: 'message', id: '1', data: 'request' }]);
    });

    expect(repliers[0]?.('result')).toBe(true);

    await vi.waitFor(() => {
      expect(response).toBe(
        `${JSON.stringify({ type: 'reply', id: '1', data: 'result' })}\n`,
      );
    });
  });

  test('messages received before subscription are queued in order', async () => {
    const server = await createSocketTransport(socketName, vi.fn(), {
      maxQueuedMessages: 2,
    });
    stop = server.stop;

    client = createConnection(socketName);
    client.setEncoding('utf8');

    let response = '';
    client.on('data', (chunk: string) => {
      response += chunk;
    });

    await once(client, 'connect');
    client.write(
      frame('1', 'first') + frame('2', 'second') + frame('3', 'overflow'),
    );

    // The ignored response confirms the server processed the first two frames
    // before we subscribe. Overflow intentionally puts this server in mirror mode.
    await vi.waitFor(() => {
      expect(response).toBe(
        `${JSON.stringify({ type: 'ignored', id: '3' })}\n`,
      );
    });

    const messages: unknown[] = [];
    server.transport.subscribe((message) => {
      messages.push(message);
    });

    // Subscription drains the queue synchronously.
    expect(messages).toEqual([
      { type: 'message', id: '1', data: 'first' },
      { type: 'message', id: '2', data: 'second' },
    ]);
  });
  
  test('messages queue between subscriptions and old cleanup is harmless', async () => {
    const server = await createSocketTransport(socketName, vi.fn(), {
      maxQueuedMessages: 2,
    });
    stop = server.stop;

    const firstMessages: unknown[] = [];
    // Subscribe then unsubscribe
    const unsubscribeFirst = server.transport.subscribe((message) => {
      firstMessages.push(message);
    });
    unsubscribeFirst();

    // Connect client
    client = createConnection(socketName);
    client.setEncoding('utf8');
    
    // Collect response while there's no consumer
    let response = '';
    client.on('data', (chunk: string) => {
      response += chunk;
    });

    await once(client, 'connect');
    client.write(
      frame('1', 'first') + frame('2', 'second') + frame('3', 'overflow'),
    );

    await vi.waitFor(() => {
      expect(response).toBe(
        `${JSON.stringify({ type: 'ignored', id: '3' })}\n`,
      );
    });

    const secondMessages: unknown[] = [];
    const unsubscribeSecond = server.transport.subscribe((message) => {
      secondMessages.push(message);
    });

    expect(firstMessages).toEqual([]);
    expect(secondMessages).toEqual([
      { type: 'message', id: '1', data: 'first' },
      { type: 'message', id: '2', data: 'second' },
    ]);

    // A second call to the old cleanup must not detach this subscription.
    unsubscribeFirst();
    expect(() => server.transport.subscribe(() => {})).toThrow(
      'Socket transport already has a subscriber.',
    );

    unsubscribeSecond();
    expect(() => server.transport.subscribe(() => {})).not.toThrow();
  });
  
  // ---------------------------------------------------------------------------
  // CLEANUP CLIENT AND SOCKET
  // ---------------------------------------------------------------------------
  afterEach(async () => {
    client?.destroy();
    client = undefined;

    try {
      await stop?.();
    } finally {
      stop = undefined;

      if (socketDir !== undefined) {
        await rm(socketDir, { recursive: true, force: true });
        socketDir = undefined;
      }
    }
  });
})
