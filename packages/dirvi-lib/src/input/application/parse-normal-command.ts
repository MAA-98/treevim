import type { EffectAction } from '../domain/index.js';
import {
  tokenizeNormalCommand,
  type FoldCommand,
  type Token,
} from './tokenize-normal-command.js';

export type ParseNormalCommandResult<Id, Value> =
  | {
      kind: 'incomplete';
    }
  | {
      kind: 'complete';
      action: EffectAction<Id, Value>;
    }
  | {
      kind: 'invalid';
    };

export function parseNormalCommand<Id, Value>(
  normalBuffer: string,
): ParseNormalCommandResult<Id, Value> {
  const tokens = tokenizeNormalCommand(normalBuffer);

  // If any token is invalid then command is invalid
  if (tokens.some(isInvalidToken) || tokens.length === 0) {
    return {
      kind: 'invalid',
    };
  }

  const firstToken = tokens[0];
  if (firstToken.tokenType === 'validInteger') {
    const secondToken = tokens[1];
    if (secondToken === undefined) {
      // 0 goes to first sibling, other integers are incomplete
      return firstToken.value === 0
        ? {
            kind: 'complete',
            action: {
              effectActionType: 'firstSibling',
            },
          }
        : {
            kind: 'incomplete',
          };
    }
    
    // first token is an integer, second token defined
    if (tokens.length !== 2) {
      return {
        kind: 'invalid',
      }
    }
    return IntAndTokenToResult<Id, Value>(firstToken.value, secondToken);
  }
  
  if (tokens.length !== 1) {
    return {
      kind: 'invalid',
    };
  }
  
  return singleNonIntegerToken<Id, Value>(firstToken);
}

function isInvalidToken(token: Token): boolean {
  return (
    token.tokenType === 'invalidInteger' || token.tokenType === 'invalidCommand'
  );
}

function singleNonIntegerToken<Id, Value>(
  token: Token,
): ParseNormalCommandResult<Id, Value> {
  switch (token.tokenType) {
    case 'navigationCommand':
      return {
        kind: 'complete',
        action: {
          effectActionType: token.value,
        },
      };

    case 'partialCommand':
      return {
        kind: 'incomplete',
      };

    case 'foldCommand':
      return {
        kind: 'complete',
        action: foldCommandToAction<Id, Value>(token, 0),
      };

    case 'validInteger':
    case 'invalidInteger':
    case 'invalidCommand':
      return {
        kind: 'invalid',
      };
  }
}

function IntAndTokenToResult<Id, Value>(
  integer: number,
  token: Token,
): ParseNormalCommandResult<Id, Value> {
  switch (token.tokenType) {
    case 'partialCommand':
      return {
        kind: 'incomplete',
      };

    case 'foldCommand':
      return {
        kind: 'complete',
        action: foldCommandToAction<Id, Value>(token, integer),
      };

    case 'validInteger':
    case 'invalidInteger':
    case 'invalidCommand':
    case 'navigationCommand':
      return {
        kind: 'invalid',
      };
  }
}

function foldCommandToAction<Id, Value>(
  foldCommand: FoldCommand,
  index: number,
): EffectAction<Id, Value> {
  const foldTree = {
    foldTreeReferenceType: 'index' as const,
    index,
  };

  switch (foldCommand.foldCommandType) {
    case 'addToFoldTree':
      return {
        effectActionType: 'addToFoldTree',
        foldTree,
      };

    case 'removeFromFoldTree':
      return {
        effectActionType: 'removeFromFoldTree',
        foldTree,
      };

    case 'fold':
      return {
        effectActionType: 'fold',
        foldTree,
      };

    case 'unfold':
      return {
        effectActionType: 'unfold',
        foldTree,
      };

    case 'toggleFold':
      return {
        effectActionType: 'toggleFold',
        foldTree,
      };
  }
}
