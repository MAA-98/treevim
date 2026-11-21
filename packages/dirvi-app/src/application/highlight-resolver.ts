import type { HighlightResolver, HighlightStyle } from 'dirvi-apis';

export const resolveWithFallback = (
  highlightResolver: HighlightResolver,
  token: string,
): HighlightStyle | undefined => {
  let currentToken = token;

  while (true) {
    const style = highlightResolver(currentToken);
    if (style !== undefined) {
      return style;
    }

    const separator = currentToken.lastIndexOf('.');
    if (separator <= 0) {
      return undefined;
    }

    currentToken = currentToken.slice(0, separator);
  }
};
