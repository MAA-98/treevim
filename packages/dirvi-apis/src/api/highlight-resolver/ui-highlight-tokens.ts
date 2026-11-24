/**
 * Highlight tokens emitted by Treevim's user interface, including parent tokens
 * used for fallback.
 *
 * Applications can resolve these alongside their content tokens to style the
 * complete interface.
 */
export const uiHighlightTokens = [
  'ui',
  'ui.status-bar',
  'ui.status-bar.command',
  'ui.status-bar.normal',
  'ui.tree',
  'ui.tree.bg',
  'ui.tree.bg.odd',
  'ui.tree.bg.even',
  'ui.tree.fold',
  'ui.tree.fold.inline',
  'ui.tree.cursor-line',
  'ui.tree.indent-guide',
  'ui.tree.indent-guide.active',
  'ui.feedback-bar',
  'ui.feedback-bar.message',
  'ui.feedback-bar.success',
  'ui.feedback-bar.error',
] as const;

export type UiHighlightToken = (typeof uiHighlightTokens)[number];