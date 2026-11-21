import { Box, Text } from 'ink';

import type { HighlightStyle } from 'dirvi-apis';
import { colorConfigToInkColor } from '@mak-98/dirvi-app';

import type { FeedbackDisplay } from '../helpers/feedback-display.js';
import { config } from 'zod';

type FeedbackBarProps = {
  display: FeedbackDisplay;
  highlight: HighlightStyle | undefined;
};

export function FeedbackBar({ display, highlight }: FeedbackBarProps) {
  if (display.height === 0) {
    return null;
  }

  const color =
    highlight?.fg === undefined
      ? undefined
      : colorConfigToInkColor(highlight.fg);
  const backgroundColor =
    highlight?.bg === undefined
      ? undefined
      : colorConfigToInkColor(highlight.bg);

  return (
    <Box
      width="100%"
      height={display.height}
      flexShrink={0}
      backgroundColor={backgroundColor}
    >
      <Text
        {...(color === undefined ? {} : { color })}
        {...(highlight?.bold === undefined ? {} : { bold: highlight.bold })}
        {...(highlight?.italic === undefined
          ? {}
          : { italic: highlight.italic })}
        {...(highlight?.underline === undefined
          ? {}
          : { underline: highlight.underline })}
      >
        {display.content}
      </Text>
    </Box>
  );
}
