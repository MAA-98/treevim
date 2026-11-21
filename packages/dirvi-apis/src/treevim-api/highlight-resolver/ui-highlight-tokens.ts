/**
 * Highlight tokens emitted by Treevim's user interface.
 *
 * Applications can resolve these alongside their content tokens to style the
 * complete interface.
 */
export const uiHighlightTokens = {
  statusBar: {
    command: 'ui.status-bar.command',
    normal: 'ui.status-bar.normal',
  },
  tree: {
    bg: {
      odd: 'ui.tree.bg.odd',
      even: 'ui.tree.bg.even',
    },
    fold: 'ui.tree.fold',
    inlineFold: 'ui.tree.fold.inline',
    cursorLine: 'ui.tree.cursor-line',
    indentGuide: 'ui.tree.indent-guide',
    activeIndentGuide: 'ui.tree.indent-guide.active',
  },
  feedbackBar: {
    message: 'ui.feedback-bar.message',
    success: 'ui.feedback-bar.success',
    error: 'ui.feedback-bar.error',
  },
} as const;

/**
 * Recursively collects the string values from a nested object into a union type.
 */
type NestedStringValues<Value> = Value extends string
  ? Value
  : Value extends Record<string, infer Nested>
    ? NestedStringValues<Nested>
    : never;

/**
 * All the tokens in uiHighlightTokens as a union type.
 */
export type UiHighlightToken = NestedStringValues<typeof uiHighlightTokens>;
