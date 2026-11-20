import type { TreeNode, TreeMethods } from '../tree/index.js';
import type { FoldMethods, Folds } from '../fold-node/index.js';
import type { Cursor, CursorMethods } from '../cursor.js';

declare const stateBrand: unique symbol;

/**
 * Opaque type for state of the tree, folds, and cursor.
 *
 * Used by consumers as React State.
 */
export type State<Id, Value> = Readonly<{
  [stateBrand]: Readonly<{
    id: Id;
    value: Value;
  }>;
}>;

export type StateMethods<Id, Value> = Readonly<{
  treeMethods: TreeMethods<Id, Value>;
  foldMethods: FoldMethods<Id, Value>;
  cursorMethods: CursorMethods<Id>;

  /**
   * Creates state whose root is a loaded branch.
   *
   * Returns undefined when root is a leaf or an unloaded branch.
   */
  create(
    root: TreeNode<Id, Value>,
    folds: Folds<Id>,
    cursor: Cursor<Id>,
  ): State<Id, Value> | undefined;

  getRoot(state: State<Id, Value>): TreeNode<Id, Value>;
  getFolds(state: State<Id, Value>): Folds<Id>;
  getCursor(state: State<Id, Value>): Cursor<Id>;

  /**
   * Immutably replaces supplied state components.
   *
   * Returns undefined when the replacement root is not a loaded branch.
   * Returns the original state when all components retain their references.
   */
  update(
    state: State<Id, Value>,
    changes: Readonly<{
      root?: TreeNode<Id, Value>;
      folds?: Folds<Id>;
      cursor?: Cursor<Id>;
    }>,
  ): State<Id, Value> | undefined;

  /**
   * Returns a mutable root-relative path.
   *
   * For a fold cursor, returns the path of its first hidden child.
   * This representative path does not identify the fold marker itself.
   */
  cursorPath(state: State<Id, Value>): Id[];
  /**
   * Tests whether the cursor is the root node cursor: { path: [] }.
   */
  isCursorRoot(state: State<Id, Value>): boolean;
  /**
   * Resolves a node cursor against the source tree.
   *
   * Returns undefined for fold cursors or paths absent from the loaded tree.
   * This does not check visibility in a navigation projection.
   */
  getNodeAtCursor(state: State<Id, Value>): TreeNode<Id, Value> | undefined;
}>;
