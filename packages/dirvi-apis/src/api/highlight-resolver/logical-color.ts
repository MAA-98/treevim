/**
 * Named ANSI colors supported by highlight styles.
 *
 * Renderers translate these names into their own color APIs.
 */
export type BasicColorName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'cyan'
  | 'magenta'
  | 'white'
  // Common aliases for blackBright.
  | 'gray'
  | 'grey'
  | 'blackBright'
  | 'redBright'
  | 'greenBright'
  | 'yellowBright'
  | 'blueBright'
  | 'cyanBright'
  | 'magentaBright'
  | 'whiteBright';

/** Terminal color profiles for one logical highlight color. */
export type LogicalColor = {
  hex?: string | undefined;
  ansi256?: number | undefined;
  basic?: BasicColorName | undefined;
};
