import { createServer, type Socket } from 'node:net';

import type {
  MessageReplier,
  MessageTransport,
} from '../domain/message-transport.js';
import {
  envelopeSchema,
  outgoingEnvelopeSchema,
  type IncomingEnvelope,
  type OutgoingEnvelope,
} from '../domain/transport-message.js';

import { createItemQueue } from '../application/create-item-queue.js';

const maxQueuedMessageBytes = 1024 * 1024;
const maxIncomingFrameBytes = 64 * 1024;
const maxOutgoingFrameBytes = 1024 * 1024;

type SocketTransportOptions = {
  /** Maximum number of incoming envelopes waiting for the consumer. */
  maxQueuedMessages: number;
};

type QueuedMessage = {
  socket: Socket;
  message: IncomingEnvelope;
};

/**
 * Starts a Unix-domain socket server and exposes it as a message transport.
 *
 * The server accepts one client connection at a time. An additional
 * connection is closed. A new client may connect after the existing
 * connection closes.
 *
 * Messages received without a subscriber are queued and delivered in order
 * when a consumer subscribes. Queued messages from a client that disconnects
 * before delivery are discarded.
 *
 * If an envelope cannot be queued because a queue limit has been reached,
 * the transport enters mirror mode. It sends an `ignored` envelope for that
 * envelope and every subsequent incoming envelope. Previously queued
 * envelopes remain available for delivery.
 *
 * Mirror mode persists across client reconnections and lasts until the server
 * is stopped. There is currently no restart operation.
 *
 * Messages are newline-delimited UTF-8 JSON frames. The transport validates
 * incoming and outgoing envelopes, but does not interpret the application
 * payload in `data`. An invalid incoming frame closes the connection.
 *
 * Each incoming envelope is delivered with a replier bound to its originating
 * connection and ID. The transport also provides `send` for unsolicited
 * events to the currently connected client.
 *
 * The transport accepts at most one consumer at a time. Unsubscribing
 * detaches the consumer without stopping the server. A later consumer may
 * subscribe and receive messages queued in the meantime.
 *
 * The returned `stop` function stops the server and can be called repeatedly.
 *
 * @param socketName - Filesystem name of the Unix-domain socket.
 * @param onError - Receives server errors after successful startup.
 * @param options - Incoming message queue configuration.
 * @returns The transport and an asynchronous server cleanup function.
 *
 * @remarks
 * A successful send or reply means that the envelope was queued for writing,
 * not that the client received it.
 *
 * The caller owns the server and should await `stop` during cleanup.
 *
 * Socket access is controlled by filesystem permissions. The transport does
 * not authenticate clients.
 */
export async function createSocketTransport(
  socketName: string,
  onError: (error: Error) => void,
  { maxQueuedMessages }: SocketTransportOptions,
): Promise<{
  transport: MessageTransport;
  stop: () => Promise<void>;
}> {
  let connection: Socket | undefined;
  let consumer:
    | { listener: Parameters<MessageTransport['subscribe']>[0] }
    | undefined;
  const queuedMessages = createItemQueue<QueuedMessage>({
    maxItems: maxQueuedMessages,
    maxBytes: maxQueuedMessageBytes,
  });
  let shutdownStarted = false;
  let mirroring = false;

  /**
   * Queues an envelope for a particular connection.
   *
   * Checking socket identity prevents a reply created for an old connection
   * from being sent to a later client.
   */
  const sendToSocket = (socket: Socket, message: OutgoingEnvelope): boolean => {
    if (
      shutdownStarted ||
      connection !== socket ||
      socket.destroyed ||
      !socket.writable
    ) {
      return false;
    }

    let frame: string;

    try {
      // TypeScript types alone do not guarantee JSON-compatible runtime data.
      const result = outgoingEnvelopeSchema.safeParse(message);

      if (!result.success) {
        return false;
      }

      const serialized = JSON.stringify(result.data);

      if (serialized === undefined) {
        return false;
      }

      frame = serialized;
    } catch {
      // For example, a cyclic value cannot be serialized as JSON.
      return false;
    }

    if (Buffer.byteLength(frame, 'utf8') > maxOutgoingFrameBytes) {
      return false;
    }

    // Cut connection if client is not keeping up.
    if (socket.writableNeedDrain) {
      socket.destroy();
      return false;
    }

    try {
      socket.write(`${frame}\n`);
      return true;
    } catch {
      socket.destroy();
      return false;
    }
  };

  // The callback runs once for each accepted client connection.
  const server = createServer((socket) => {
    // Install an error handler for both accepted and rejected sockets.
    socket.on('error', () => {
      // The close event handles connection and queue cleanup.
    });

    if (shutdownStarted || connection !== undefined) {
      socket.destroy();
      return;
    }

    connection = socket;

    // A socket is a stream: a chunk may contain part of a frame or several
    // frames. Keep incomplete data until another chunk arrives.
    let buffer = '';

    socket.setEncoding('utf8');

    socket.on('close', () => {
      if (connection === socket) {
        connection = undefined;
      }
      queuedMessages.discard((queued) => queued.socket === socket);
    });

    socket.on('data', (chunk: string) => {
      buffer += chunk;

      // Extract every complete newline-delimited frame.
      for (;;) {
        const newline = buffer.indexOf('\n');

        if (newline === -1) {
          // An incomplete frame must also stay within the size limit.
          if (Buffer.byteLength(buffer, 'utf8') > maxIncomingFrameBytes) {
            socket.destroy();
          }
          return;
        }

        const frame = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);

        const bytes = Buffer.byteLength(frame, 'utf8');

        if (bytes > maxIncomingFrameBytes) {
          socket.destroy();
          return;
        }

        if (socket.destroyed) {
          return;
        }

        let message: IncomingEnvelope;

        try {
          const result = envelopeSchema.safeParse(JSON.parse(frame));

          if (!result.success) {
            // There may be no trustworthy ID to reply to.
            socket.destroy();
            return;
          }

          message = result.data;
        } catch {
          // Invalid JSON.
          socket.destroy();
          return;
        }

        if (
          mirroring ||
          !queuedMessages.enqueue({
            item: { socket, message },
            bytes,
          })
        ) {
          mirroring = true;

          if (
            !sendToSocket(socket, {
              type: 'ignored',
              id: message.id,
            })
          ) {
            // Close if we cannot report that the envelope was ignored.
            socket.destroy();
            return;
          }
        }
      }
    });
  });

  let stopPromise: Promise<void> | undefined;

  /**
   * Stops accepting connections and closes the existing client.
   *
   * Every caller receives the same promise.
   */
  const stop = (): Promise<void> => {
    if (stopPromise !== undefined) {
      return stopPromise;
    }

    shutdownStarted = true;
    consumer = undefined;
    queuedMessages.setConsumer(undefined);
    queuedMessages.discard(() => true);

    connection?.destroy();

    stopPromise = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    return stopPromise;
  };

  const transport: MessageTransport = {
    subscribe: (listener) => {
      if (shutdownStarted) {
        throw new Error('Cannot subscribe while shutting down.');
      }

      if (consumer !== undefined) {
        throw new Error('Socket transport already has a subscriber.');
      }

      const registration = { listener };
      consumer = registration;

      try {
        queuedMessages.setConsumer((queued) => {
          if (queued.socket.destroyed) {
            return;
          }

          const id = queued.message.id;

          const reply: MessageReplier = (data) =>
            sendToSocket(queued.socket, {
              type: 'reply',
              id,
              data,
            });

          registration.listener(queued.message, reply);
        });
      } catch (error) {
        // setConsumer can synchronously deliver queued messages. Restore the
        // subscription state if a listener violates its must-not-throw contract.
        if (consumer === registration) {
          consumer = undefined;
          queuedMessages.setConsumer(undefined);
        }

        throw error;
      }

      return () => {
        if (consumer === registration) {
          consumer = undefined;
          queuedMessages.setConsumer(undefined);
        }
      };
    },

    send: (data) => {
      const socket = connection;

      if (socket === undefined) {
        return false;
      }

      return sendToSocket(socket, {
        type: 'event',
        data,
      });
    },
  };

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);

    server.listen(socketName, () => {
      server.off('error', reject);

      // Startup errors reject the promise; later server errors go to the
      // host-provided callback.
      server.on('error', onError);
      resolve();
    });
  });

  return { transport, stop };
}
