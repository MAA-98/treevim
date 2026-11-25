import type { ToolInvoker } from '../domain/tool-invoker.js';

export type ToolBridge = {
  /**
   * Publishes the active app's invoker. The returned function unregisters only
   * this registration, not a newer one.
   */
  register: (toolInvoker: ToolInvoker) => () => void;

  /** Invokes a tool on the currently published app. */
  invoke: ToolInvoker;
};

export function createToolBridge(): ToolBridge {
  let active: ToolInvoker | undefined;

  return {
    register: (invoke) => {
      active = invoke;

      return () => {
        if (active === invoke) {
          active = undefined;
        }
      };
    },

    invoke: async (name, input, signal) => {
      if (active === undefined) {
        throw new Error('No app is ready to receive tool calls.');
      }

      return await active(name, input, signal);
    },
  };
}
