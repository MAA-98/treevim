import { NavMethods, State, StateMethods, TreeNode } from 'dirvi-lib';

/**
 * Creates an operation that reloads the materialized tree, reconciles its
 * folds, and selects a cursor in the resulting navigation projection.
 *
 * The operation uses `oldState` as a snapshot. The caller is responsible for
 * deciding whether the result is still applicable when loading completes.
 */
export function createResync<Id, Value>(
  stateMethods: StateMethods<Id, Value>,
  navMethods: NavMethods<Id, Value>,
) {
  return async (
    oldState: State<Id, Value>,
    loadBranches: (
      path: readonly Id[],
    ) => Promise<readonly TreeNode<Id, Value>[]>,
  ): Promise<State<Id, Value>> => {
    const { treeMethods, foldMethods } = stateMethods;
    const oldRoot = stateMethods.getRoot(oldState);
    const oldFolds = stateMethods.getFolds(oldState);
    const oldCursor = stateMethods.getCursor(oldState);
    const oldNavigation = navMethods.from(oldRoot, oldFolds);

    if (oldNavigation === undefined) {
      throw new Error('Cannot resync: old root is not a branch');
    }

    // Reload previously loaded branches, then remove stale fold entries.
    // Build navigation from the updated tree and folds so cursor validity
    // reflects the new visibility state.
    const root = await treeMethods.reload(oldRoot, loadBranches);
    const folds = foldMethods.filter(oldFolds, root, treeMethods);
    const navigation = navMethods.from(root, folds);

    if (navigation === undefined) {
      throw new Error('Cannot resync: root is not a branch');
    }

    const cursor = navMethods.cursorAfterResync(
      oldNavigation,
      navigation,
      oldCursor,
    );

    const newState = stateMethods.update(oldState, { root, folds, cursor });

    // State requires a loaded root branch.
    if (newState === undefined) {
      throw new Error('Cannot resync: root is not a loaded branch');
    }

    return newState;
  };
}
