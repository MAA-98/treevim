import type {
  TreeNode,
  TreeMethods,
  MatchByKind,
  TreeNodeKind,
} from './tree.types.js';
import type { TreeNodeModel } from './tree-node.model.js';

// =============================================================================
// Opaque Type Implementation
// =============================================================================
// These representations are intentionally not exported. The public `TreeNode`
// type is opaque, so consumers must use `TreeNodeApi` operations rather than
// depending on these object properties.

type TreeNodeData<Id, Value> =
  | LeafTreeNodeData<Id, Value>
  | UnloadedBranchTreeNodeData<Id, Value>
  | LoadedBranchTreeNodeData<Id, Value>;

type LeafTreeNodeData<Id, Value> = Readonly<{
  id: Id;
  value: Value;
  children?: never;
}>;

type UnloadedBranchTreeNodeData<Id, Value> = Readonly<{
  id: Id;
  value: Value;
  children: null;
}>;

type LoadedBranchTreeNodeData<Id, Value> = Readonly<{
  id: Id;
  value: Value;
  children: readonly TreeNode<Id, Value>[];
}>;

/**
 * Crosses from the opaque public type into the private representation.
 *
 * This cast is intentionally centralized here. Public callers should never
 * need to know that tree nodes currently use `{ id, value, children }`.
 */
function toData<Id, Value>(node: TreeNode<Id, Value>): TreeNodeData<Id, Value> {
  return node as unknown as TreeNodeData<Id, Value>;
}

/**
 * Crosses from the private representation into the opaque public type.
 */
function fromData<Id, Value>(
  data: TreeNodeData<Id, Value>,
): TreeNode<Id, Value> {
  return data as unknown as TreeNode<Id, Value>;
}

// =============================================================================
// Helpers
// =============================================================================

function isLeafData<Id, Value>(
  node: TreeNodeData<Id, Value>,
): node is LeafTreeNodeData<Id, Value> {
  return !('children' in node);
}

function isUnloadedBranchData<Id, Value>(
  node: TreeNodeData<Id, Value>,
): node is UnloadedBranchTreeNodeData<Id, Value> {
  return 'children' in node && node.children === null;
}

function isLoadedBranchData<Id, Value>(
  node: TreeNodeData<Id, Value>,
): node is LoadedBranchTreeNodeData<Id, Value> {
  return 'children' in node && node.children !== null;
}

/**
 * Returns a reusable iterable over child nodes in their stored order without
 * exposing the internal child array.
 */
function asChildrenIterable<Id, Value>(
  children: readonly TreeNode<Id, Value>[],
): Iterable<TreeNode<Id, Value>> {
  return Object.freeze({
    *[Symbol.iterator](): Iterator<TreeNode<Id, Value>> {
      yield* children;
    },
  });
}

/**
 * Copies an arbitrary child iterable into the current private representation
 * and verifies sibling-ID uniqueness.
 *
 * Returning `undefined` represents an invalid child collection rather than an
 * exceptional implementation failure. This matches the public API contract
 * for `createLoadedBranch` and `withLoadedChildren`.
 */
function copyUniqueChildren<Id, Value>(
  children: Iterable<TreeNode<Id, Value>>,
  getId: (node: TreeNode<Id, Value>) => Id,
): readonly TreeNode<Id, Value>[] | undefined {
  const copiedChildren: TreeNode<Id, Value>[] = [];
  const seenIds = new Set<Id>();

  for (const child of children) {
    const id = getId(child);

    if (seenIds.has(id)) {
      return undefined;
    }

    seenIds.add(id);
    copiedChildren.push(child);
  }

  return Object.freeze(copiedChildren);
}

function createLeafData<Id, Value>(
  id: Id,
  value: Value,
): LeafTreeNodeData<Id, Value> {
  return Object.freeze({
    id,
    value,
  });
}

function createUnloadedBranchData<Id, Value>(
  id: Id,
  value: Value,
): UnloadedBranchTreeNodeData<Id, Value> {
  return Object.freeze({
    id,
    value,
    children: null,
  });
}

function createLoadedBranchData<Id, Value>(
  id: Id,
  value: Value,
  children: readonly TreeNode<Id, Value>[],
): LoadedBranchTreeNodeData<Id, Value> {
  return Object.freeze({
    id,
    value,
    children,
  });
}

// =============================================================================
// Generic Tree Methods Init
// =============================================================================

/**
 * Creates an API for constructing, inspecting, and immutably updating opaque
 * tree nodes.
 *
 * The returned nodes are ordinary JavaScript objects at runtime. Their
 * structural representation is private to this module; consumers interact
 * with them only through the returned API.
 *
 * Tree updates preserve object identity for unrelated nodes. New ancestor
 * nodes and child collections are created only along an updated path.
 */
export function createTreeMethods<Id, Value>(): TreeMethods<Id, Value> {
  function getLoadedChildrenData(
    node: TreeNode<Id, Value>,
  ): readonly TreeNode<Id, Value>[] | undefined {
    const data = toData(node);

    return isLoadedBranchData(data) ? data.children : undefined;
  }

  /**
   * Reloads one node's direct children and recursively reloads descendant
   * branches that were loaded in the old state.
   *
   * The node itself retains its existing application value. The supplied
   * loader refreshes only its direct child collection.
   *
   * Previously unloaded branches are not recursively reloaded.
   */
  async function reload(
    oldRoot: TreeNode<Id, Value>,
    parentPath: readonly Id[],
    loadBranches: (
      path: readonly Id[],
    ) => Promise<readonly TreeNode<Id, Value>[]>,
  ): Promise<TreeNode<Id, Value>> {
    const oldChildren = methods.getLoadedChildren(oldRoot);

    /*
     * The old node was either a leaf or a closed branch. In either case, it
     * had no loaded child collection to resynchronize.
     */
    if (oldChildren === undefined) {
      return oldRoot;
    }

    const loadedChildren = await loadBranches(parentPath);

    /*
     * `withLoadedChildren` retains oldRoot's ID and application value, replacing
     * only its structural child collection.
     *
     * Failure means the loader supplied duplicate sibling IDs, violating the
     * methods contract. This is a loader/data-integrity error rather than
     * an ordinary missing-path condition.
     */
    let newRoot = methods.withLoadedChildren(oldRoot, loadedChildren);

    if (newRoot === undefined) {
      throw new Error(
        'Cannot resync tree: loaded branch contains duplicate sibling IDs',
      );
    }

    /*
     * Recurse only into entries that were open in the old state and which
     * still exist in the freshly loaded child collection.
     *
     * This preserves fresh values from loaded children while restoring their
     * previously loaded descendant collections.
     */
    for (const oldEntry of oldChildren) {
      const oldEntryChildren = methods.getLoadedChildren(oldEntry);

      /*
       * A leaf or closed branch did not have loaded descendants in old state.
       */
      if (oldEntryChildren === undefined) {
        continue;
      }

      const oldEntryId = methods.id(oldEntry);
      const currentChildren = methods.getLoadedChildren(newRoot);

      if (currentChildren === undefined) {
        throw new Error(
          'Cannot resync tree: replacement root unexpectedly has no children',
        );
      }

      const currentChildrenArray = [...currentChildren];

      const currentChildIndex = currentChildrenArray.findIndex(
        (child) => methods.id(child) === oldEntryId,
      );

      if (currentChildIndex === -1) {
        continue;
      }

      const currentChild = currentChildrenArray[currentChildIndex];

      if (currentChild === undefined) {
        continue;
      }

      if (methods.kind(currentChild) === 'leaf') {
        continue;
      }

      const reloadedChild = await reload(
        oldEntry,
        [...parentPath, oldEntryId],
        loadBranches,
      );

      const reloadedGrandchildren = methods.getLoadedChildren(reloadedChild);

      if (reloadedGrandchildren === undefined) {
        throw new Error(
          'Cannot resync tree: reloaded open branch has no children',
        );
      }

      const updatedCurrentChild = methods.withLoadedChildren(
        currentChild,
        reloadedGrandchildren,
      );

      if (updatedCurrentChild === undefined) {
        throw new Error(
          'Cannot resync tree: reloaded descendants contain duplicate sibling IDs',
        );
      }

      const updatedChildren = [...currentChildrenArray];
      updatedChildren[currentChildIndex] = updatedCurrentChild;

      const updatedRoot = methods.withLoadedChildren(newRoot, updatedChildren);

      if (updatedRoot === undefined) {
        throw new Error(
          'Cannot resync tree: updated branch contains duplicate sibling IDs',
        );
      }

      newRoot = updatedRoot;
    }

    return newRoot;
  }

  const methods: TreeMethods<Id, Value> = {
    createLeaf(id, value) {
      return fromData(createLeafData(id, value));
    },

    createUnloadedBranch(id, value) {
      return fromData(createUnloadedBranchData(id, value));
    },

    createLoadedBranch(id, value, children) {
      const copiedChildren = copyUniqueChildren(children, methods.id);

      if (copiedChildren === undefined) {
        return undefined;
      }

      return fromData(createLoadedBranchData(id, value, copiedChildren));
    },

    id(node) {
      return toData(node).id;
    },

    value(node) {
      return toData(node).value;
    },

    kind(node): TreeNodeKind {
      const data = toData(node);

      if (isLeafData(data)) {
        return 'leaf';
      }

      if (isUnloadedBranchData(data)) {
        return 'unloaded-branch';
      }

      return 'loaded-branch';
    },

    matchByKind<Result>(
      node: TreeNode<Id, Value>,
      handlers: MatchByKind<Id, Value, Result>,
    ): Result {
      const data = toData(node);

      if (isLeafData(data)) {
        return handlers.leaf({
          id: data.id,
          value: data.value,
        });
      }

      if (isUnloadedBranchData(data)) {
        return handlers.unloadedBranch({
          id: data.id,
          value: data.value,
        });
      }

      return handlers.loadedBranch({
        id: data.id,
        value: data.value,
        children: asChildrenIterable(data.children),
      });
    },

    getLoadedChildren(node) {
      const children = getLoadedChildrenData(node);

      return children === undefined ? undefined : asChildrenIterable(children);
    },

    findChildById(node, id) {
      const children = getLoadedChildrenData(node);

      if (children === undefined) {
        return undefined;
      }

      for (const child of children) {
        if (methods.id(child) === id) {
          return child;
        }
      }

      return undefined;
    },

    withValue(node, value) {
      const data = toData(node);

      if (isLeafData(data)) {
        return fromData(createLeafData(data.id, value));
      }

      if (isUnloadedBranchData(data)) {
        return fromData(createUnloadedBranchData(data.id, value));
      }

      return fromData(createLoadedBranchData(data.id, value, data.children));
    },

    toLeaf(node) {
      const data = toData(node);

      return fromData(createLeafData(data.id, data.value));
    },

    toUnloadedBranch(node) {
      const data = toData(node);

      return fromData(createUnloadedBranchData(data.id, data.value));
    },

    withLoadedChildren(node, children) {
      const copiedChildren = copyUniqueChildren(children, methods.id);

      if (copiedChildren === undefined) {
        return undefined;
      }

      const data = toData(node);

      return fromData(
        createLoadedBranchData(data.id, data.value, copiedChildren),
      );
    },

    async reload(root, loadBranches) {
      const reloaded = await reload(root, [], loadBranches);
      return reloaded;
    },

    findAtPath(root, path) {
      return methods.selectAtPath(root, path, (node) => node);
    },

    selectAtPath(root, path, selector) {
      let node = root;

      for (const id of path) {
        const child = methods.findChildById(node, id);

        if (child === undefined) {
          return undefined;
        }

        node = child;
      }

      return selector(node);
    },

    updateAtPath(root, path, update) {
      if (path.length === 0) {
        return update(root);
      }

      return modifyChildAtPath(root, path, update);
    },

    toModel(node): TreeNodeModel<Id, Value> {
      const data = toData(node);

      if (isLeafData(data)) {
        return {
          id: data.id,
          value: data.value,
        };
      }

      if (isUnloadedBranchData(data)) {
        return {
          id: data.id,
          value: data.value,
          children: null,
        };
      }

      return {
        id: data.id,
        value: data.value,
        children: data.children.map(methods.toModel),
      };
    },

    fromModel(model) {
      if (!('children' in model)) {
        return methods.createLeaf(model.id, model.value);
      }

      if (model.children === null) {
        return methods.createUnloadedBranch(model.id, model.value);
      }

      const children: TreeNode<Id, Value>[] = [];

      for (const childModel of model.children) {
        const child = methods.fromModel(childModel);

        if (child === undefined) {
          return undefined;
        }

        children.push(child);
      }

      return methods.createLoadedBranch(model.id, model.value, children);
    },
  };

  function modifyChildAtPath(
    node: TreeNode<Id, Value>,
    path: readonly Id[],
    modifier: (node: TreeNode<Id, Value>) => TreeNode<Id, Value> | undefined,
  ): TreeNode<Id, Value> | undefined {
    const childId = path[0];
    const children = getLoadedChildrenData(node);

    if (childId === undefined || children === undefined) {
      return undefined;
    }

    let childIndex = -1;

    for (const [index, child] of children.entries()) {
      if (methods.id(child) === childId) {
        childIndex = index;
        break;
      }
    }

    if (childIndex === -1) {
      return undefined;
    }

    const child = children[childIndex];

    if (child === undefined) {
      return undefined;
    }

    const updatedChild =
      path.length === 1
        ? modifier(child)
        : modifyChildAtPath(child, path.slice(1), modifier);

    if (updatedChild === undefined) {
      return undefined;
    }

    /*
     * Replace the child at its existing position, preserving sibling order even
     * when the replacement has a different ID.
     */
    const updatedChildren = [...children];
    updatedChildren[childIndex] = updatedChild;

    /*
     * `withLoadedChildren` revalidates sibling-ID uniqueness. This matters when
     * `modifier` replaces a node with another node having a different ID.
     */
    return methods.withLoadedChildren(node, updatedChildren);
  }

  return methods;
}
