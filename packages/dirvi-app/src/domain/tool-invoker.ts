import { JsonValue } from 'dirvi-apis';

export type ToolInvoker = (
  name: string,
  input: unknown,
  signal?: AbortSignal,
) => Promise<JsonValue>;
