import type { FeedbackType } from './feedback-type.js';

/**
 * API exposing methods at the dirvi app-level.
 */
export type AppApi = {
  pathAtCursor: () => unknown[];
  //valueAtCursor: () => unknown;
  visiblePaths: () => unknown[][];
  addMessage: (message: string, type?: FeedbackType) => void;

  /**
   * Operations on fold trees in the current view.
   */
  readonly folds: {
    /**
     * Lists fold trees in the current view.
     *
     * Indexes are local to the view and may be reused after deletion. A null
     * name indicates that information for the index was unavailable.
     */
    readonly list: () => readonly {
      index: number;
      name: string | null;
      active: boolean;
    }[];
  };
};
