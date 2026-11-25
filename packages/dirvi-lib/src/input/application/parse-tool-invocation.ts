type ScalarValue = string | number | boolean | null;

export type ToolInvocation = Readonly<{
  name: string;
  input: Readonly<Record<string, ScalarValue>>;
}>;

export type ParseToolInvocationResult =
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'success'; invocation: ToolInvocation }>
  | Readonly<{ kind: 'error'; message: string; position: number }>;

/**
 * Parses a tool invocation from an Ex command line.
 *
 * Positions in errors are zero-based UTF-16 offsets into commandLine.
 * Arrays and objects are reserved for future support.
 */
export function parseToolInvocation(
  commandLine: string,
): ParseToolInvocationResult {
  let index = 0;

  const skipWhitespace = (): void => {
    while (index < commandLine.length && /\s/.test(commandLine[index]!)) {
      index++;
    }
  };

  const error = (
    message: string,
    position = index,
  ): ParseToolInvocationResult => ({
    kind: 'error',
    message,
    position,
  });

  skipWhitespace();

  // Match the existing Ex parser's handling of leading colons.
  while (commandLine[index] === ':') {
    index++;
  }

  skipWhitespace();

  if (index === commandLine.length) {
    return { kind: 'empty' };
  }

  const nameMatch = /^\S+/.exec(commandLine.slice(index));
  const name = nameMatch![0];
  index += name.length;

  // A Map detects duplicates and safely handles keys such as "__proto__".
  const entries = new Map<string, ScalarValue>();

  while (index < commandLine.length) {
    skipWhitespace();

    if (index === commandLine.length) {
      break;
    }

    const keyPosition = index;
    const keyMatch = /^[^\s=]+/.exec(commandLine.slice(index));

    if (keyMatch === null) {
      return error('Expected an argument name', keyPosition);
    }

    const key = keyMatch[0];
    index += key.length;

    if (commandLine[index] !== '=') {
      return error(`Expected "=" after argument "${key}"`);
    }

    index++;

    if (index === commandLine.length || /\s/.test(commandLine[index]!)) {
      return error(`Expected a value for argument "${key}"`);
    }

    if (entries.has(key)) {
      return error(`Duplicate argument "${key}"`, keyPosition);
    }

    const valuePosition = index;
    let value: ScalarValue;

    if (commandLine[index] === '"') {
      // Find the end of the JSON string, respecting escaped characters.
      index++;
      let escaped = false;
      let closed = false;

      while (index < commandLine.length) {
        const character = commandLine[index]!;
        index++;

        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          closed = true;
          break;
        }
      }

      if (!closed) {
        return error('Unterminated string', valuePosition);
      }

      try {
        value = JSON.parse(commandLine.slice(valuePosition, index)) as string;
      } catch {
        return error('Invalid JSON string', valuePosition);
      }

      if (index < commandLine.length && !/\s/.test(commandLine[index]!)) {
        return error('Expected whitespace after the string');
      }
    } else {
      while (index < commandLine.length && !/\s/.test(commandLine[index]!)) {
        index++;
      }

      const rawValue = commandLine.slice(valuePosition, index);

      if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
        return error(
          'Object and array values are not supported yet',
          valuePosition,
        );
      }

      if (rawValue === 'true') {
        value = true;
      } else if (rawValue === 'false') {
        value = false;
      } else if (rawValue === 'null') {
        value = null;
      } else if (
        /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(rawValue)
      ) {
        value = Number(rawValue);

        if (!Number.isFinite(value)) {
          return error('Number must be finite', valuePosition);
        }
      } else {
        value = rawValue;
      }
    }

    entries.set(key, value);
  }

  return {
    kind: 'success',
    invocation: {
      name,
      input: Object.fromEntries(entries),
    },
  };
}
