import { Box, Text } from 'ink';

import { uiHighlightTokens } from 'dirvi-apis';
import type { HighlightResolver, Config } from 'dirvi-apis';
import type { ViewRow } from '@mak-98/dirvi-app';
import { colorConfigToInkColor } from '@mak-98/dirvi-app';

import type { StyledSpan } from '../../domain/styled-span.js';

type ViewRowComponentProps = {
  row: ViewRow;
  config: Config;
  styledSpans: readonly StyledSpan[];
  rowIndex: number;
  highlightResolver: HighlightResolver;
};

function indentationPrefix(
  indent: number,
  indentSize: number,
  firstIndent: string,
  showGuides: boolean,
): string {
  if (indent <= 0 || indentSize <= 0) {
    return '';
  }

  const remainingIndentation = showGuides
    ? `│${' '.repeat(Math.max(0, indentSize - 1))}`
    : ' '.repeat(indentSize);

  return `${firstIndent}${remainingIndentation.repeat(indent - 1)}`;
}

/**
 * Draws the full width row.
 *
 * @param param0
 * @param param0.row - the view row
 * @param param0.config - the config
 * @param param0.styledSpans - the resolved spans to render
 * @constructor
 */
export function ViewRowComponent({
  row,
  config,
  styledSpans,
  rowIndex,
  highlightResolver,
}: ViewRowComponentProps) {
  const rowHighlight = highlightResolver(
    row.cursor
      ? uiHighlightTokens.tree.cursorLine
      : rowIndex % 2 === 0
        ? uiHighlightTokens.tree.bg.even
        : uiHighlightTokens.tree.bg.odd,
  );
  const rowBackgroundColor =
    rowHighlight?.bg === undefined
      ? undefined
      : colorConfigToInkColor(rowHighlight.bg);

  const indentationGuide = row.cursor
    ? (highlightResolver(uiHighlightTokens.tree.activeIndentGuide) ??
      highlightResolver(uiHighlightTokens.tree.indentGuide))
    : highlightResolver(uiHighlightTokens.tree.indentGuide);

  const indentationGuideColor =
    indentationGuide?.fg === undefined
      ? undefined
      : colorConfigToInkColor(indentationGuide.fg);
  const indentationGuideBackgroundColor =
    indentationGuide?.bg === undefined
      ? undefined
      : colorConfigToInkColor(indentationGuide.bg);

  const firstIndent =
    config.firstIndent === undefined
      ? ' '.repeat(config.indentSize)
      : config.firstIndent;
  const indentation = indentationPrefix(
    row.indent,
    config.indentSize,
    firstIndent,
    indentationGuideColor !== undefined,
  );

  return (
    <Box width="100%" backgroundColor={rowBackgroundColor}>
      {indentationGuide !== undefined && (
        <Text
          {...(indentationGuideColor === undefined
            ? {}
            : { color: indentationGuideColor, dimColor: true })}
        >
          {indentation}
        </Text>
      )}

      <Text>
        {styledSpans.map((span, index) => (
          <Text
            key={index}
            {...(indentationGuideColor === undefined
              ? {}
              : { color: indentationGuideColor })}
            {...(indentationGuideBackgroundColor === undefined
              ? {}
              : { backgroundColor: indentationGuideBackgroundColor })}
            {...(indentationGuide?.bold === undefined
              ? {}
              : { bold: indentationGuide.bold })}
            {...(indentationGuide?.italic === undefined
              ? {}
              : { italic: indentationGuide.italic })}
            {...(indentationGuide?.underline === undefined
              ? {}
              : { underline: indentationGuide.underline })}
            {...(indentationGuide === undefined ? {} : { dimColor: true })}
          >
            {span.content}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
