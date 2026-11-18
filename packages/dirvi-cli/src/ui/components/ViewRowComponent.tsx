import { Box, Text } from 'ink';

import type { Config } from 'dirvi-apis';
import type { ViewRow } from '@mak-98/dirvi-app';
import { colorConfigToInkColor } from '@mak-98/dirvi-app';

import type { StyledSpan } from '../../domain/styled-span.js';

type ViewRowComponentProps = {
  row: ViewRow;
  config: Config;
  styledSpans: readonly StyledSpan[];
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
}: ViewRowComponentProps) {
  const cursorRowBgColor = colorConfigToInkColor(
    config.theme.tree.cursorLine.bg,
  );
  const indentationGuideConfig = row.cursor
    ? (config.theme.tree.activeIndentGuide ?? config.theme.tree.indentGuide)
    : config.theme.tree.indentGuide;

  const indentationGuideColor =
    indentationGuideConfig === undefined
      ? undefined
      : colorConfigToInkColor(indentationGuideConfig.fg);

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
    <Box
      width="100%"
      backgroundColor={row.cursor ? cursorRowBgColor : undefined}
    >
      {indentation !== '' && (
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
            {...(span.color === undefined ? {} : { color: span.color })}
            {...(row.cursor || span.bgColor === undefined
              ? {}
              : { backgroundColor: span.bgColor })}
            {...(span.bold === undefined ? {} : { bold: span.bold })}
            {...(span.italic === undefined ? {} : { italic: span.italic })}
            {...(span.underline === undefined
              ? {}
              : { underline: span.underline })}
            dimColor={span.dimColor}
          >
            {span.content}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
