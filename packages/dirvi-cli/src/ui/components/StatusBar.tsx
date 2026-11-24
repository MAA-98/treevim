import { Box, Text } from 'ink';

import type { HighlightStyle } from 'dirvi-apis';
import { colorConfigToInkColor } from '@mak-98/dirvi-app';
import type { InputModeState } from 'dirvi-lib';

export const STATUS_BAR_HEIGHT = 1;

type StatusBarProps = {
  inputState: InputModeState;
  highlight: HighlightStyle | undefined;
};

export function StatusBar({ inputState, highlight }: StatusBarProps) {
  const inputMode = inputState.inputMode;

  const color =
    highlight?.fg === undefined
      ? undefined
      : colorConfigToInkColor(highlight.fg);
  const backgroundColor =
    highlight?.bg === undefined
      ? undefined
      : colorConfigToInkColor(highlight.bg);

  const textStyle = {
    ...(color === undefined ? {} : { color }),
    ...(highlight?.bold === undefined ? {} : { bold: highlight.bold }),
    ...(highlight?.italic === undefined ? {} : { italic: highlight.italic }),
    ...(highlight?.underline === undefined
      ? {}
      : { underline: highlight.underline }),
  };

  return (
    <Box
      width="100%"
      height={STATUS_BAR_HEIGHT}
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      backgroundColor={backgroundColor}
    >
      <Box flexShrink={1}>
        <Text {...textStyle} wrap="truncate-end">
          {inputMode === 'lineInput' ? inputState.line : ''}
        </Text>
      </Box>

      <Box flexShrink={1}>
        <Text {...textStyle} wrap="truncate-start">
          {inputMode === 'normal' ? inputState.normalBuffer : ''}
        </Text>
      </Box>
    </Box>
  );
}
