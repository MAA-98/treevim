/**
 * Content emitted by a script during code-mode execution.
 *
 * This is useful for coding agents to understand a code mode execution, and can
 * be used in UI also.
 *
 * Messages are separate from the script's final return value.
 */
export type CodeModeMessage =
  | Readonly<{
      type: 'text';
      text: string;
      /** Whether the text originated from console output. */
      console?: true;
    }>
  | Readonly<{
      type: 'image';
      data: string;
      mimeType: string;
    }>;

/**
 * The outcome of executing a code-mode script, including any messages emitted
 * before it finished.
 */
export type CodeExecutionResult =
  | Readonly<{
      kind: 'success';
      /** The script's return value, or `undefined` if it returned nothing. */
      value: unknown;
      messages: readonly CodeModeMessage[];
    }>
  | Readonly<{
      kind: 'failure';
      error: Readonly<{
        kind: 'script' | 'timeout' | 'aborted' | 'sandbox';
        message: string;
      }>;
      messages: readonly CodeModeMessage[];
    }>;
