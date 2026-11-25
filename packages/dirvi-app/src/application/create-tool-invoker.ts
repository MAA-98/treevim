import type { ToolDefinition, TreevimApi } from 'dirvi-apis';
import type { ToolInvoker } from '../domain/tool-invoker.js';

/**
 * Creates an executor bound to an app's tools and live Treevim API.
 *
 * Aborting prevents a tool from starting after cancellation is observed.
 * It does not stop a tool that has already started.
 */
export function createToolInvoker(
  tools: ReadonlyMap<string, ToolDefinition<any>>,
  api: TreevimApi,
): ToolInvoker {
  return async (name, input, signal) => {
    signal?.throwIfAborted();

    const tool = tools.get(name);

    if (tool === undefined) {
      throw new Error(`Tool is no longer registered: "${name}"`);
    }

    const params = await tool.parameters.parseAsync(input);

    // Validation can be asynchronous.
    signal?.throwIfAborted();

    const execute = tool.createExecute(api);
    return await execute(params);
  };
}
