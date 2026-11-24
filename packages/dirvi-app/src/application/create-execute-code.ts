import type { ToolDefinition, TreevimApi } from 'dirvi-apis';

import type { CodeExecutionResult } from '../domain/code-execution.js';

/**
 * Executes one code-mode script.
 *
 * The code is the body of an async JavaScript function and does not include
 * the leading `!` prompt. Its final return value and emitted messages are
 * reported separately in the result.
 *
 * @param code - The script body to execute.
 * @param options - Optional controls for this execution.
 * @param options.signal - Requests cancellation of this execution. If already
 *   aborted, execution should not start. Otherwise, an abort requests that
 *   the running script stop and return a failure with kind `aborted`.
 *
 *   Cancellation does not guarantee that a host tool call already in progress
 *   will stop or that its side effects will be undone.
 *
 * @returns The script's outcome and any messages emitted before it finished.
 */
export type ExecuteCode = (
  code: string,
  options?: Readonly<{ signal?: AbortSignal }>,
) => Promise<CodeExecutionResult>;

/**
 * Creates a code executor bound to an app's tools and live Treevim API.
 *
 * The executor makes the supplied tools available to scripts. Tool inputs must
 * be validated against their parameter schemas before execution.
 *
 * @param tools - Tool definitions available to scripts for this app.
 * @param api - Live Treevim API passed to tool execution factories.
 * @returns A function for executing code-mode scripts with these tools.
 */
export type CreateExecuteCode = (
  tools: ReadonlyMap<string, ToolDefinition<any>>,
  api: TreevimApi,
) => ExecuteCode;
