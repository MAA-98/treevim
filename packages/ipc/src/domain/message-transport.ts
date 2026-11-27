import type {
  IncomingEnvelope,
  NotIgnoredOutgoingEnvelope,
} from './transport-message.js';

/**
 * Replies to a received message.
 *
 * The transport attaches the original message ID and sends the reply only to
 * the connection that originated the message.
 *
 * Returns true if the reply was queued for writing, not necessarily delivered.
 * Returns false if it could not be queued.
 */
export type MessageReplier = (data: IncomingEnvelope['data']) => boolean;

/**
 * Exchanges structured messages with at most one connected client at a time.
 */
export type MessageTransport = {
  /**
   * Installs the current consumer. At most one consumer may be subscribed
   * at a time.
   *
   * Messages received without a consumer are queued for delivery to the
   * next consumer, subject to the transport's queue limits.
   *
   * The returned function detaches this consumer without stopping the
   * transport. It does not detach a later subscription.
   *
   * Queued messages may be delivered synchronously before subscribe returns.
   * The listener must not throw.
   */
  subscribe: (
    listener: (message: IncomingEnvelope, replier: MessageReplier) => void,
  ) => () => void;

  /**
   * Queues an unsolicited event for the currently connected client.
   *
   * Returns true if the event was queued for writing, not necessarily
   * delivered. Use the supplied replier for responses to received messages,
   * so a response cannot be sent to a later connection.
   */
  send: (data: NotIgnoredOutgoingEnvelope['data']) => boolean;
};
