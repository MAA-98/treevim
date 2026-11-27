/**
 * A queue item paired with its size for byte-limit accounting.
 *
 * @typeParam Item - The type of value held by the queue.
 */
export type SizedItem<Item> = {
  readonly item: Item;
  readonly bytes: number;
};

/**
 * A bounded FIFO queue that delivers items to a consumer when one is set.
 *
 * @typeParam Item - The type of value held and delivered by the queue.
 */
export type ItemQueue<Item> = {
  /**
   * Adds an item unless doing so would exceed a limit.
   *
   * If a consumer is set, synchronously attempts to drain the queue before
   * returning. A true result means the item was accepted, not necessarily
   * delivered.
   *
   * @throws If the item's byte size is invalid or the consumer throws during
   * delivery. A consumer error may occur after the item has been accepted.
   */
  enqueue: (sizedItem: SizedItem<Item>) => boolean;

  /**
   * Sets or removes the consumer. Setting one synchronously attempts to drain
   * the queue in FIFO order.
   *
   * If the consumer throws, the item being delivered is not retried, the
   * remaining items stay queued, and the consumer remains set.
   *
   * @throws If the consumer throws during delivery.
   */
  setConsumer: (consumer: ((item: Item) => void) | undefined) => void;

  /**
   * Removes queued items matching the predicate.
   *
   * The predicate must not modify the queue while it is being evaluated.
   */
  discard: (predicate: (item: Item) => boolean) => void;
};
