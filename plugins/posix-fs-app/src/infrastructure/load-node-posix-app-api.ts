import { watch, type FSWatcher } from 'node:fs';

/**
 * Creates a resync subscription for a directory and its descendants.
 *
 * The first listener starts a recursive filesystem watcher, which is shared
 * by all listeners. Filesystem events are debounced: after 100 ms without
 * another event, each listener is called to request a resync. The event type
 * and filename are ignored; this function does not reload entries itself.
 *
 * The returned subscribe function provides an unsubscribe function for each
 * listener. When the last listener unsubscribes, the watcher is closed and
 * any pending notification is canceled.
 *
 * Watcher errors are ignored; they do not trigger a resync notification.
 *
 * @param directory - Directory to watch recursively.
 * @returns A function that subscribes a listener and returns an unsubscribe function.
 */
export function createFsResyncSubscription(
  directory: string,
): (listener: () => void) => () => void {
  const listeners = new Set<() => void>();

  let watcher: FSWatcher | undefined;
  let notificationTimer: ReturnType<typeof setTimeout> | undefined;

  function notifyListeners() {
    for (const listener of listeners) {
      listener();
    }
  }

  function scheduleNotification() {
    // fs.watch can emit several events for one filesystem operation.
    // Debounce them into a single resync request.
    if (notificationTimer !== undefined) {
      clearTimeout(notificationTimer);
    }

    notificationTimer = setTimeout(() => {
      notificationTimer = undefined;

      if (listeners.size > 0) {
        notifyListeners();
      }
    }, 100);
  }

  function startWatcher() {
    if (watcher !== undefined) {
      return;
    }

    watcher = watch(
      directory,
      {
        recursive: true,
      },
      (_eventType, _filename) => {
        scheduleNotification();
      },
    );

    watcher.on('error', () => {
      // The next loadBranches call will report the relevant error.
    });
  }

  function stopWatcher() {
    if (notificationTimer !== undefined) {
      clearTimeout(notificationTimer);
      notificationTimer = undefined;
    }

    watcher?.close();
    watcher = undefined;
  }

  return (listener) => {
    listeners.add(listener);
    startWatcher();

    let subscribed = true;

    return () => {
      if (!subscribed) {
        return;
      }

      subscribed = false;
      listeners.delete(listener);

      if (listeners.size === 0) {
        stopWatcher();
      }
    };
  };
}
