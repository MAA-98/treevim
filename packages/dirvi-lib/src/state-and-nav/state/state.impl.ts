import type { TreeNode, TreeMethods } from '../tree/index.js';
import type { Folds, FoldMethods } from '../fold-node/index.js';
import type { Cursor, CursorMethods } from '../cursor.js';
import type { StateMethods, State } from './state.types.js';

// =============================================================================
// Opaque Type Implementation
// =============================================================================

/**
 * Opaque state type implementation.
 *
 * Invariant: `root` is an open branch.
 *
 * Note: This cannot be represented through a structural intersection because
 * TreeNode is opaque; enforce it when constructing State, using
 * TreeNodeApi.state or TreeNodeApi.getChildren.
 *
 * @typeParam Id - Tree-node sibling ID type.
 * @typeParam Value - Application-owned value stored in every tree node.
 */
type StateData<Id, Value> = Readonly<{
  root: TreeNode<Id, Value>;
  folds: Folds<Id>;
  cursor: Cursor<Id>;
}>;

function getStateData<Id, Value>(
  state: State<Id, Value>,
): StateData<Id, Value> {
  return state as unknown as StateData<Id, Value>;
}

function createState<Id, Value>(data: StateData<Id, Value>): State<Id, Value> {
  return data as unknown as State<Id, Value>;
}

// =============================================================================
// StateApi Init
// =============================================================================

/**
 * Creates operations for navigating and resynchronizing tree-surfer state.
 */
export function createStateApi<Id, Value>(
  treeMethods: TreeMethods<Id, Value>,
  foldsApi: FoldMethods<Id, Value>,
  cursorApi: CursorMethods<Id>,
): StateMethods<Id, Value> {
  /**
   * Determines the cursor after resynchronization.
   *
   * Current policy: return the root cursor.
   */
  function resyncCursor(
    _oldState: State<Id, Value>,
    _newRoot: TreeNode<Id, Value>,
    _newFolds: Folds<Id>,
  ): Cursor<Id> {
    return { path: [] };
  }

  return {
    treeMethods,
    foldMethods: foldsApi,
    cursorMethods: cursorApi,

    create(root, folds, cursor) {
      return treeMethods.kind(root) === 'loaded-branch'
        ? createState({ root, folds, cursor })
        : undefined;
    },

    getRoot(state) {
      return getStateData(state).root;
    },

    getFolds(state) {
      return getStateData(state).folds;
    },

    getCursor(state) {
      return getStateData(state).cursor;
    },

    update(state, changes) {
      const data = getStateData(state);
      const root = changes.root ?? data.root;
      const folds = changes.folds ?? data.folds;
      const cursor = changes.cursor ?? data.cursor;

      if (treeMethods.kind(root) !== 'loaded-branch') {
        return undefined;
      }

      if (
        root === data.root &&
        folds === data.folds &&
        cursor === data.cursor
      ) {
        return state;
      }

      return createState({ root, folds, cursor });
    },

    getNodeAtCursor(state) {
      const { root, cursor } = getStateData(state);

      /*
       * A fold cursor identifies a display item, not a single source node.
       * Its representative path must not silently select its first child.
       */
      if (!cursorApi.isNodeCursor(cursor)) {
        return undefined;
      }

      return treeMethods.selectAtPath(root, cursor.path, (node) => node);
    },

    isCursorRoot(state) {
      const { cursor } = getStateData(state);

      return cursorApi.isNodeCursor(cursor) && cursor.path.length === 0;
    },

    cursorPath(state) {
      const { cursor } = getStateData(state);

      return cursorApi.getPath(cursor);
    },
  };
}
