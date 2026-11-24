import type { z } from 'zod';
import type { TreevimApi } from './treevim-api/index.js';

/**
 * A JSON-compatible value returned by a tool.
 *
 * Tools that perform an action without returning data can return `null`.
 * This type does not by itself guarantee runtime JSON compatibility:
 * for example, numbers must be finite and objects must not be circular.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Defines an app-scoped tool available while its app is active.
 *
 * A tool accepts one structured input object and returns a JSON-compatible
 * value. This supports composition in JS mode and provides a portable
 * boundary for future integrations.
 *
 * @typeParam Schema - The Zod object schema used to parse the tool's input.
 */
export type ToolDefinition<Schema extends z.ZodObject> = {
  name: string;
  label: string;
  description: string;
  parameters: Schema;
  /**
   * Creates the tool's execution function with access to the live Treevim API.
   *
   * The returned function receives the parsed schema output and may return
   * its result synchronously or asynchronously. Return `null` when there is
   * no data to report. Failures should be thrown or returned as rejected
   * promises; the caller is responsible for handling them.
   */
  createExecute: (
    api: TreevimApi,
  ) => (params: z.output<Schema>) => JsonValue | Promise<JsonValue>;
};
