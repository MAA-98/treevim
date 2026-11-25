import {
  CodemodeSandbox,
  type CodemodeTool,
} from '@earendil-works/pi-codemode';

import type { CreateExecuteCode } from '../application/create-execute-code.js';
import { createToolInvoker } from '../application/create-tool-invoker.js';

const timeoutMs = 10_000;
const memoryLimitBytes = 64 * 1024 * 1024;

/**
 * Creates a code executor bound to an app's tools and live Treevim API.
 *
 * Each execution uses a fresh, worker-backed QuickJS sandbox. The code is
 * interpreted as an async function body. The sandbox has an execution timeout
 * and a QuickJS memory limit, not including memory used by tools.
 *
 * Tool calls are relayed to the host. Before a tool is invoked, its input is
 * parsed with its Zod schema using `parseAsync`. The resulting schema output,
 * including defaults and transforms, is passed to the tool.
 *
 * If parsing fails, the tool's `createExecute` function is not called. The
 * tool-call promise rejects inside the script with an error carrying the
 * failure message. The script may catch that error; if it does not, execution
 * fails with a `script` error. The original Zod error and its structured
 * `issues` are not preserved across the sandbox boundary.
 *
 * Tool execution errors are relayed to the script in the same way. Tool
 * results are expected to be JSON-compatible, but this adapter does not yet
 * validate them at runtime.
 *
 * Aborting or timing out an execution prevents new tool calls from starting
 * after cancellation is observed. It does not guarantee that a host tool
 * already executing will stop or undo its side effects.
 *
 * @param tools - Tools registered for the active app, keyed by name.
 * @param api - Live Treevim API supplied to each tool invocation.
 * @returns A function that executes code and returns its output or error.
 */
export const createExecuteCode: CreateExecuteCode = (tools, api) => {
  const toolInvoker = createToolInvoker(tools, api)
  const sandboxTools: CodemodeTool[] = [...tools.values()].map((tool) => ({
    name: tool.name,
    description: tool.description,

    execute: (input, { signal }) => toolInvoker(tool.name, input, signal),
  }));

  return async (code, options) => {
    if (options?.signal?.aborted) {
      return {
        kind: 'failure',
        error: { kind: 'aborted', message: 'Execution aborted' },
        messages: [],
      };
    }

    try {
      const sandbox = new CodemodeSandbox({
        tools: sandboxTools,
        timeoutMs,
        memoryLimitBytes,
      });

      try {
        const result = await sandbox.execute(
          code,
          options?.signal === undefined ? {} : { signal: options.signal },
        );

        if (result.ok) {
          return {
            kind: 'success',
            value: result.value,
            messages: result.output,
          };
        }

        return {
          kind: 'failure',
          error: {
            kind: result.error.kind,
            message: result.error.message,
          },
          messages: result.output,
        };
      } finally {
        await sandbox.close();
      }
    } catch (error: unknown) {
      return {
        kind: 'failure',
        error: {
          kind: 'sandbox',
          message: error instanceof Error ? error.message : String(error),
        },
        messages: [],
      };
    }
  };
};
