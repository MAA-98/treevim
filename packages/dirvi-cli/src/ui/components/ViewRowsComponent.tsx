import { Box, Text } from 'ink';

import type { Config, HighlightResolver, HighlightSpan } from 'dirvi-apis';
import { colorConfigToInkColor, View } from '@mak-98/dirvi-app';

import { ViewRowComponent } from './ViewRowComponent.js';
import { StyledSpan } from '../../domain/styled-span.js';

type ViewRowsComponentProps = {
  view: View;
  config: Config;
  highlightResolver: HighlightResolver;
};

export function ViewRowsComponent({
  view,
  config,
  highlightResolver,
}: ViewRowsComponentProps) {
  const resolveHlSpan = (hlSpan: HighlightSpan): StyledSpan => {
    const style = highlightResolver(hlSpan.hlToken);

    return {
      content: hlSpan.content,
      color:
        style?.fg === undefined ? undefined : colorConfigToInkColor(style.fg),
      bgColor:
        style?.bg === undefined ? undefined : colorConfigToInkColor(style.bg),
      bold: style?.bold,
      italic: style?.italic,
      underline: style?.underline,
      dimColor: false,
    };
  };

  const createFoldSpan = (content: string): StyledSpan => ({
    content,
    color: colorConfigToInkColor(config.theme.tree.foldInfo.fg),
    bgColor: undefined,
    bold: undefined,
    italic: undefined,
    underline: undefined,
    dimColor: true,
  });

  return (
    <Box flexDirection="column" flexShrink={0} width="100%">
      {view.rows.length === 0 ? (
        <Text dimColor>Empty.</Text>
      ) : (
        view.rows.map((row, index) => {
          const styledSpans =
            row.type === 'fold'
              ? [createFoldSpan(`… ${row.foldedCount} folded`)]
              : row.spans.map(resolveHlSpan);

          // Unordered folds are displayed as a suffix on their parent branch.
          if (row.type === 'branch' && row.foldedCount !== undefined) {
            styledSpans.push(createFoldSpan(` … ${row.foldedCount}`));
          }

          return (
            // TODO: Use a stable row ID when ViewRow exposes one.
            <ViewRowComponent
              key={index}
              row={row}
              config={config}
              styledSpans={styledSpans}
            />
          );
        })
      )}
    </Box>
  );
}
