import { z } from 'zod';
import { uiHighlightTokens } from 'dirvi-apis';
import type {
  BasicColorName,
  LogicalColor,
  HighlightResolver,
  HighlightStyle,
  UiHighlightToken,
} from 'dirvi-apis';

// =============================================================================
// Colors: Schemas
// =============================================================================

/** Named ANSI colors accepted by the theme schema. */
export const basicColorNames = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'cyan',
  'magenta',
  'white',

  // Common aliases for blackBright.
  'gray',
  'grey',

  'blackBright',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'cyanBright',
  'magentaBright',
  'whiteBright',
] as const satisfies readonly BasicColorName[];

const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, {
  message: 'Expected a #rrggbb color',
});

const Ansi256ColorSchema = z.number().int().min(0).max(255);

const BasicColorSchema = z.enum(basicColorNames);

export const ColorConfigSchema = z
  .object({
    hex: HexColorSchema.optional(),
    ansi256: Ansi256ColorSchema.optional(),
    basic: BasicColorSchema.optional(),
  })
  .refine(
    (value) =>
      value.hex !== undefined ||
      value.ansi256 !== undefined ||
      value.basic !== undefined,
    {
      message: 'Expected at least one terminal color profile',
    },
  ) satisfies z.ZodType<LogicalColor>;

// =============================================================================
// Highlight Style: Schemas
// =============================================================================
// This schema is intentionally non-strict.
export const HighlightStyleSchema = z.object({
  fg: ColorConfigSchema.exactOptional(),
  bg: ColorConfigSchema.exactOptional(),
  bold: z.boolean().exactOptional(),
  italic: z.boolean().exactOptional(),
  underline: z.boolean().exactOptional(),
}) satisfies z.ZodType<HighlightStyle>;

// =============================================================================
// Theme defaults
// =============================================================================

const white: LogicalColor = {
  hex: '#ffffff',
  ansi256: 231,
  basic: 'white',
};

const black: LogicalColor = {
  hex: '#28282a',
  ansi256: 235,
  basic: 'black',
};

const lightGray: LogicalColor = {
  hex: '#eaeaec',
  ansi256: 254,
  basic: 'gray',
};

const darkGray: LogicalColor = {
  hex: '#808080',
  ansi256: 245,
  basic: 'gray',
};

const activeIndentGuide: LogicalColor = {
  hex: '#2472c8',
  ansi256: 26,
  basic: 'blue',
};

const cursorLine: LogicalColor = {
  hex: '#3a3a3c',
  ansi256: 237,
  basic: 'gray',
};

const successGreen: LogicalColor = {
  hex: '#238c4b',
  ansi256: 28,
  basic: 'green',
};

const errorRed: LogicalColor = {
  hex: '#be2d2d',
  ansi256: 160,
  basic: 'red',
};

const defaultUiHighlightStyles = {
  'ui.status-bar': { fg: black, bg: white },

  'ui.tree.bg': {},
  'ui.tree.fold': { fg: darkGray },
  'ui.tree.cursor-line': { bg: cursorLine },
  'ui.tree.indent-guide': { fg: darkGray },
  'ui.tree.indent-guide.active': { fg: activeIndentGuide },

  'ui.feedback-bar': { fg: black, bg: lightGray },
  'ui.feedback-bar.success': { fg: successGreen, bg: lightGray },
  'ui.feedback-bar.error': { fg: errorRed, bg: lightGray },
} satisfies Partial<Record<UiHighlightToken, HighlightStyle>>;

const defaultUiHighlights = new Map<string, HighlightStyle>(
  Object.entries(defaultUiHighlightStyles),
);

export const defaultUiHighlightResolver: HighlightResolver = (token) =>
  defaultUiHighlights.get(token);
