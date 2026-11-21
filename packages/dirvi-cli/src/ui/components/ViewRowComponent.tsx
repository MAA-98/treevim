import { Box, Text } from 'ink';

import type { UiHighlightToken } from 'dirvi-apis';
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
  const rowToken: UiHighlightToken = row.cursor
    ? 'ui.tree.cursor-line'
    : rowIndex % 2 === 0
      ? 'ui.tree.bg.even'
      : 'ui.tree.bg.odd';

  const rowHighlight = highlightResolver(rowToken);
  const rowBackgroundColor =
    rowHighlight?.bg === undefined
      ? undefined
      : colorConfigToInkColor(rowHighlight.bg);
  
  const indentationGuide = highlightResolver('ui.tree.indent-guide');

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
      {indentation !== '' && (
        <Text
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
        >
          {indentation}
        </Text>
      )}

      <Text>
        {styledSpans.map((span, index) => (
          <Text
            key={index}
            {...(span.color === undefined ? {} : { color: span.color })}
            {...(row.cursor || span.bgColor === undefined
              ? {}
              : { backgroundColor: span.bgColor })}
            {...(span.bold === undefined ? {} : { bold: span.bold })}
            {...(span.italic === undefined ? {} : { italic: span.italic })}
            {...(span.underline === undefined
              ? {}
              : { underline: span.underline })}
          >
            {span.content}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
