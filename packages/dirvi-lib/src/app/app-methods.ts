import type { NavMethods, StateMethods } from '../state-and-nav/index.js';
import { TreeNode } from '../state-and-nav/index.js';
import type { NodePresenter, NodePresenterOptions } from 'dirvi-apis';

export type AppMethods<Id, Value> = Readonly<{
  /**
   * Loads direct children for the branch addressed by `path`.
   *
   * Returned nodes must be opaque tree values created or decoded through this
   * application's TreeNodeApi specialization.
   */
  loadChildren: (
    path: readonly Id[],
  ) => Promise<readonly TreeNode<Id, Value>[]>;

  /**
   * Creates the application's root node.
   *
   * Invariant: the returned node is an open branch. That invariant is checked
   * when an initial State is created.
   */
  loadRoot: () => Promise<TreeNode<Id, Value>>;

  createNodePresenter: (
    options: NodePresenterOptions,
  ) => NodePresenter<Id, Value>;

  /**
   * Subscribes to external data changes that require tree state to be loaded
   * again.
   *
   * Returns an unsubscribe function.
   */
  subscribeToResync: (listener: () => void) => () => void;

  stateMethods: StateMethods<Id, Value>;

  /**
   * UI navigation projection and cursor-navigation operations.
   */
  navMethods: NavMethods<Id, Value>;
}>;

/**
 * An operation that can consume `AppMethods` of any valid concrete type and
 * produce a caller-selected result.
 */
export type AppMethodsConsumer<Result> = <Id, Value>(
  appMethods: AppMethods<Id, Value>,
) => Result;

/**
 * Creates and applies the AppMethods to a given consumer of it.
 */
export type AppMethodsApplicator = <Result>(
  appMethodsConsumer: AppMethodsConsumer<Result>,
) => Result;
