import type { ItemQueue, SizedItem } from '../domain/item-queue.js';

type ItemQueueOptions = {
  readonly maxItems: number;
  readonly maxBytes: number;
};

/**
 * Creates a bounded FIFO queue that delivers items synchronously.
 *
 * Enqueueing or setting a consumer may synchronously deliver multiple items
 * before the call returns. Items added during delivery are delivered in FIFO
 * order by the same drain, provided a consumer remains set.
 *
 * @remarks
 * A consumer must not create an unbounded cycle of enqueues. Queue limits do
 * not prevent such a cycle: an item is removed before its consumer is called,
 * freeing capacity for another item. An infinite cycle would block the event
 * loop.
 *
 * The byte limit uses the caller-provided item sizes; it does not measure
 * actual memory usage.
 *
 * @warning
 * The `enqueue` method synchronously tries to drain all the items to the
 * consumer. Hence, enqueue may throw an error propagated from the consumer.
 * Likewise, this is true for the `setConsumer` method.
 *
 * The item being delivered has already been removed and is not retried.
 * Remaining items stay queued; a later enqueue or setConsumer call can trigger
 * another drain.
 *
 * @throws Error: if the limits are invalid, an item has an invalid byte size,
 * or the consumer throws during synchronous delivery.
 */
export function createItemQueue<Item>({
  maxItems,
  maxBytes,
}: ItemQueueOptions): ItemQueue<Item> {
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) {
    throw new Error('maxItems must be a positive safe integer.');
  }

  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error('maxBytes must be a non-negative safe integer.');
  }

  let items: SizedItem<Item>[] = [];
  let totalBytes = 0;
  let consumer: ((item: Item) => void) | undefined;
  let draining = false;

  /**
   * Delivers items in order. The guard prevents nested drains from delivering
   * newer items ahead of items already waiting in the queue.
   */
  const drain = (): void => {
    if (draining) {
      return;
    }

    draining = true;

    try {
      while (items.length > 0) {
        const listener = consumer;

        if (listener === undefined) {
          break;
        }

        const sizedItem = items.shift();

        if (sizedItem === undefined) {
          break;
        }

        // Remove the item before calling the consumer so reentrant operations
        // see the correct queue size.
        totalBytes -= sizedItem.bytes;
        listener(sizedItem.item);
      }
    } finally {
      draining = false;
    }
  };

  return {
    enqueue: (sizedItem) => {
      const { item, bytes } = sizedItem;

      if (!Number.isSafeInteger(bytes) || bytes < 0) {
        throw new Error('Item bytes must be a non-negative safe integer.');
      }

      if (items.length >= maxItems || bytes > maxBytes - totalBytes) {
        return false;
      }

      // Store our own wrapper so later mutation of sizedItem cannot change
      // the queue's byte accounting.
      items.push({ item, bytes });
      totalBytes += bytes;
      drain();

      return true;
    },

    setConsumer: (nextConsumer) => {
      consumer = nextConsumer;
      drain();
    },

    discard: (predicate) => {
      let remainingBytes = 0;

      const remainingItems = items.filter((sizedItem) => {
        if (predicate(sizedItem.item)) {
          return false;
        }

        remainingBytes += sizedItem.bytes;
        return true;
      });

      items = remainingItems;
      totalBytes = remainingBytes;
    },
  };
}
