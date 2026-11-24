import { UserInput, InputModeState, Intent } from '../domain/index.js';

/**
 * Converts a user input, mode and mode's buffer into an intent.
 *
 * By design "intent = input + mode + modeState", so it interprets the key
 * inputs depending on the mode and mode's buffer. No other context.
 *
 * @param userInput - the user input pressed now.
 * @param inputModeState - the current mode and the user inputs so far.
 * @returns The user's intent.
 */
export function userInputToIntent(
  userInput: UserInput,
  inputModeState: InputModeState,
): Intent | undefined {
  switch (inputModeState.inputMode) {
    case 'normal':
      return normalUserInputToIntent(userInput, inputModeState.normalBuffer);

    case 'lineInput':
      return commandUserInputToIntent(userInput, inputModeState.line);
  }
}

function normalUserInputToIntent(
  userInput: UserInput,
  normalBuffer: string,
): Intent | undefined {
  // Esc cancels of current key sequence
  if (userInput.userInputType === 'esc') {
    return {
      intentType: 'setNormalBuffer',
      normalBuffer: '',
    };
  }

  switch (userInput.userInputType) {
    case 'character':
      if (normalBuffer === '') {
        if (userInput.string === ':')  {
          return {
            intentType: 'enterLineMode',
            type: 'ex',
          };
        }

        if (userInput.string === '!') {
          return {
            intentType: 'enterLineMode',
            type: 'code',
          };
        }
      }

      return {
        intentType: 'setNormalBuffer',
        normalBuffer: normalBuffer + userInput.string,
      };

    case 'rightArrow':
      return {
        intentType: 'normalRight',
      };

    case 'leftArrow':
      return {
        intentType: 'normalLeft',
      };

    case 'downArrow':
      return {
        intentType: 'normalDown',
      };

    case 'upArrow':
      return {
        intentType: 'normalUp',
      };
  }
}

function commandUserInputToIntent(
  userInput: UserInput,
  commandLine: string,
): Intent | undefined {
  if (userInput.userInputType === 'esc') {
    return {
      intentType: 'exitLineMode',
    };
  }

  if (userInput.userInputType === 'enter') {
    return {
      intentType: 'submitLine',
      line: commandLine,
    };
  }

  if (userInput.userInputType === 'backspace') {
    if (commandLine.length < 2) {
      return {
        intentType: 'exitLineMode',
      };
    }
    return {
      intentType: 'setLine',
      line: commandLine.slice(0, -1),
    };
  }

  if (userInput.userInputType === 'character') {
    return {
      intentType: 'setLine',
      line: commandLine + userInput.string,
    };
  }
}
