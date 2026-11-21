import { Box, Text } from 'ink';

import type { Config, HighlightResolver, HighlightSpan, UiHighlightToken } from 'dirvi-apis';
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
  const resolveSpan = (content: string, token: string): StyledSpan => {
    const style = highlightResolver(token);

    return {
      content,
      color:
        style?.fg === undefined ? undefined : colorConfigToInkColor(style.fg),
      bgColor:
        style?.bg === undefined ? undefined : colorConfigToInkColor(style.bg),
      bold: style?.bold,
      italic: style?.italic,
      underline: style?.underline,
    };
  };

  const resolveHlSpan = (hlSpan: HighlightSpan): StyledSpan =>
    resolveSpan(hlSpan.content, hlSpan.hlToken);

  return (
    <Box flexDirection="column" flexShrink={0} width="100%">
      {view.rows.length === 0 ? (
        <Text>Empty.</Text>
      ) : (
        view.rows.map((row, index) => {
          const styledSpans =
            row.type === 'fold'
              ? [
                  resolveSpan(
                    `… ${row.foldedCount} folded`,
                    'ui.tree.fold' satisfies UiHighlightToken,
                  ),
                ]
              : row.spans.map(resolveHlSpan);

          // Unordered folds are displayed as a suffix on their parent branch.
          if (row.type === 'branch' && row.foldedCount !== undefined) {
            styledSpans.push(
              resolveSpan(
                ` … ${row.foldedCount}`,
                'ui.tree.fold.inline' satisfies UiHighlightToken,
              ),
            );
          }

          return (
            // TODO: Use a stable row ID when ViewRow exposes one.
            <ViewRowComponent
              key={index}
              row={row}
              config={config}
              styledSpans={styledSpans}
              rowIndex={index}
              highlightResolver={highlightResolver}
            />
          );
        })
      )}
    </Box>
  );
}
