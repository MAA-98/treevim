import { inspect } from 'node:util';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import type {
  AppApi,
  Config,
  FeedbackType,
  HighlightResolver,
  ShellApi, ToolDefinition,
} from 'dirvi-apis';
import type {
  AppMethods,
  Effect,
  EffectToAction,
  InputModeState,
  IntentToEffect,
  NavBranch,
  Reducer,
  State,
  Feedback,
  UserInput,
} from 'dirvi-lib';
import { createFeedbackApi, userInputToIntent } from 'dirvi-lib';

import { useView } from './hooks/useView.js';
import type { AppScreenRenderer } from './app-screen-renderer.js';
import type { NormalCommand } from '../domain/command.js';
import { createResync } from '../application/create-resync.js';
import { createExecuteCode } from '../infrastructure/create-execute-code.js';

type AppProps<Id, Value> = {
  screenRenderer: AppScreenRenderer;
  shellApi: ShellApi;
  appMethods: AppMethods<Id, Value>;
  normalCommands: ReadonlyMap<string, NormalCommand>;
  tools: ReadonlyMap<string, ToolDefinition<any>>;
  config: Readonly<Config>;
  highlightResolver: HighlightResolver;
  initialState: State<Id, Value>;
  initialMessage?: {
    message: string;
    type: FeedbackType;
  };
  onInitialMessageShown: () => void;
  reducer: Reducer<Id, Value>;
  intentToEffect: IntentToEffect<Id, Value>;
  effectToAction: EffectToAction<Id, Value>;
  onError?: (error: Error) => void;
};

export function App<Id, Value>({
  screenRenderer,
  shellApi,
  appMethods,
  normalCommands,
  tools,
  config,
  highlightResolver,
  initialState,
  initialMessage,
  onInitialMessageShown,
  reducer,
  intentToEffect,
  effectToAction,
  onError,
}: AppProps<Id, Value>) {
  const ScreenRenderer = screenRenderer;
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state); // Gives `subscribeToResync` callback a way to
  // see current state
  stateRef.current = state;

  const navEntry: NavBranch<Id, Value> = useMemo(() => {
    const root = appMethods.stateMethods.getRoot(state);
    const folds = appMethods.stateMethods.getFolds(state);
    const navigation = appMethods.navMethods.from(root, folds);

    if (navigation === undefined) {
      throw new Error('Tree-surfer state root must be a loaded branch.');
    }
    return navigation;
  }, [appMethods.navMethods, appMethods.stateMethods, state]);

  const clearInputState: InputModeState = {
    inputMode: 'normal',
    normalBuffer: '',
  };
  const [inputState, setInputState] = useState<InputModeState>(clearInputState);
  const [feedback, setFeedback] = useState<Feedback>();

  const [rowCount, setRowCount] = useState(0);
  const handleRowsChange = useCallback((nextRows: number): void => {
    setRowCount((currentRows) =>
      currentRows === nextRows ? currentRows : nextRows,
    );
  }, []);

  const view = useView(
    navEntry,
    state,
    appMethods.stateMethods,
    appMethods.navMethods,
    appMethods.stateMethods.cursorMethods,
    rowCount,
    appMethods.createNodePresenter({ nerdFonts: true }),
  );

  // ===========================================================================
  // Resync Subscriptions
  // ===========================================================================
  useEffect(() => {
    let active = true;
    const resync = createResync(appMethods.stateMethods, appMethods.navMethods);

    const unsubscribe = appMethods.subscribeToResync(() => {
      const oldState = stateRef.current;

      void resync(oldState, appMethods.loadChildren)
        .then((newState) => {
          if (!active) {
            return;
          }
          dispatch({
            kind: 'setState',
            oldState: oldState,
            newState: newState,
          });
        })
        .catch((error: unknown) => {
          const appError =
            error instanceof Error ? error : new Error(String(error));

          onError?.(appError);
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [appMethods, onError]);

  // ===========================================================================
  // App API
  // ===========================================================================

  const feedbackApi = useMemo(
    () =>
      createFeedbackApi((nextFeedback) => {
        setFeedback(nextFeedback);
      }),
    [],
  );

  const initialMessageShown = useRef(false);

  useEffect(() => {
    if (initialMessage === undefined || initialMessageShown.current) {
      return;
    }

    initialMessageShown.current = true;
    feedbackApi.addMessage(initialMessage.message, initialMessage.type);
    onInitialMessageShown();
  }, [feedbackApi, initialMessage, onInitialMessageShown]);

  const appApi = useMemo<AppApi>(
    () => ({
      pathAtCursor: () => appMethods.stateMethods.cursorPath(stateRef.current),
      // TODO: Implement with appMethods
      //valueAtCursor: () => 'test value',
      visiblePaths: () => {
        const state = stateRef.current;
        const root = appMethods.stateMethods.getRoot(state);
        const folds = appMethods.stateMethods.getFolds(state);
        const navigation = appMethods.navMethods.from(root, folds);

        if (navigation === undefined) {
          throw new Error('Tree-surfer state root must be a loaded branch.');
        }

        return navigation.children === null
          ? []
          : appMethods.navMethods.visiblePaths(navigation.children);
      },
      addMessage: (message: string, type?: FeedbackType) => {
        feedbackApi.addMessage(message, type);
      },
    }),
    [feedbackApi, appMethods.stateMethods, appMethods.navMethods],
  );

  // ===========================================================================
  // Code Execution
  // ===========================================================================
  
  const executeCode = useMemo(
    () => createExecuteCode(tools, { shell: shellApi, app: appApi }),
    [tools, shellApi, appApi],
  );

  const codeExecution = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    return () => {
      codeExecution.current?.abort();
      codeExecution.current = undefined;
    };
  }, [executeCode]);

  // ===========================================================================
  // Executing Effects
  // ===========================================================================
  const executeEffect = useCallback(
    (effect: Effect<Id, Value> | undefined): void => {
      if (effect === undefined) {
        return;
      }

      switch (effect.effectType) {
        case 'userNormalCommand': {
          setInputState(clearInputState);
          const command = normalCommands.get(effect.command);

          if (command === undefined) {
            appApi.addMessage(
              `Normal command is no longer registered: ${effect.command}`,
              'error',
            );
            return;
          }

          void Promise.resolve()
            .then(() => command.execute({ shell: shellApi, app: appApi }))
            .catch((error: unknown) => {
              const appError =
                error instanceof Error ? error : new Error(String(error));

              appApi.addMessage(
                `Normal command "${effect.command}" failed: ${appError.message}`,
                'error',
              );
            });

          return;
        }

        case 'userExCommand': {
          // setInputState(clearInputState);
          // const command = exCommands.get(effect.command);
          //
          // if (command === undefined) {
          //   appApi.addMessage(
          //     `Ex command is no longer registered: ${effect.command}`,
          //     'error',
          //   );
          //   return;
          // }
          //
          // void Promise.resolve()
          //   .then(() =>
          //     command.execute({ shell: shellApi, app: appApi }, effect.rawArgs),
          //   )
          //   .catch((error: unknown) => {
          //     const appError =
          //       error instanceof Error ? error : new Error(String(error));
          //
          //     appApi.addMessage(
          //       `Ex command "${effect.command}" failed: ${appError.message}`,
          //       'error',
          //     );
          //   });

          return;
        }

        case 'userCode': {
          setInputState(clearInputState);

          if (codeExecution.current !== undefined) {
            appApi.addMessage(
              'Code execution is already in progress.',
              'error',
            );
            return;
          }

          const controller = new AbortController();
          codeExecution.current = controller;

          void executeCode(effect.code, { signal: controller.signal })
            .then((result) => {
              // Ignore results from an execution canceled during cleanup.
              if (controller.signal.aborted) {
                return;
              }

              const lines = result.messages.map((message) =>
                message.type === 'text'
                  ? message.text
                  : `[Image: ${message.mimeType}]`,
              );

              if (result.kind === 'failure') {
                lines.push(
                  `Code ${result.error.kind}: ${result.error.message}`,
                );
                appApi.addMessage(lines.join('\n'), 'error');
                return;
              }

              if (result.value !== undefined) {
                lines.push(inspect(result.value));
              }

              if (lines.length > 0) {
                appApi.addMessage(lines.join('\n'));
              }
            })
            .catch((error: unknown) => {
              // Defensive: ExecuteCode normally returns failures as values.
              if (!controller.signal.aborted) {
                const message =
                  error instanceof Error ? error.message : String(error);
                appApi.addMessage(`Code execution failed: ${message}`, 'error');
              }
            })
            .finally(() => {
              if (codeExecution.current === controller) {
                codeExecution.current = undefined;
              }
            });

          return;
        }

        case 'quit':
          shellApi.quit(effect.exitMessage);
          return;

        case 'listApps': {
          const appIds = shellApi.listApps();
          setInputState(clearInputState);
          appApi.addMessage(['Apps:', ...appIds].join('\n'));
          return;
        }

        case 'switchApp':
          void shellApi.loadApp(effect.appId, effect.input).then((result) => {
            if (result.kind !== 'loaded') {
              appApi.addMessage(result.message, 'error');
            }
          });
          return;

        case 'dispatchEffectAction':
          const effectActionResult = effectToAction(
            effect.action,
            navEntry,
            state,
          );
          setInputState(clearInputState);

          switch (effectActionResult.kind) {
            case 'action':
              dispatch(effectActionResult.action);
              return;

            case 'rejected':
              appApi.addMessage(effectActionResult.message, 'error');
              return;

            case 'ignored':
              return;

            default:
              return;
          }

        case 'setInputState':
          setInputState(effect.inputState);
          return;

        case 'loadBranchEntries': {
          void appMethods
            .loadChildren(effect.path)
            .then((entries) => {
              dispatch({
                kind: 'updateBranch',
                path: effect.path,
                entries,
              });
            })
            .catch((error: unknown) => {
              const appError =
                error instanceof Error ? error : new Error(String(error));

              appApi.addMessage(
                `Unable to open directory: ${appError.message}`,
              );
            });

          return;
        }

        case 'listFolds': {
          const folds = appMethods.stateMethods.getFolds(state);

          const foldTrees = [
            ...appMethods.stateMethods.foldMethods.indexes(folds),
          ].map((index) => ({
            index,
            info: appMethods.stateMethods.foldMethods.getInfoAtIndex(
              folds,
              index,
            ),
            active: appMethods.stateMethods.foldMethods.isActiveAtIndex(
              folds,
              index,
            ),
          }));

          const indexWidth = Math.max(
            ...foldTrees.map(({ index }) => String(index).length),
          );

          const lines = foldTrees.map(({ index, info, active }) => {
            const status = active === true ? 'active' : 'inactive';
            const name = info?.name ?? '<unavailable>';

            return `${String(index).padStart(indexWidth)}  ${status.padEnd(8)}  ${name}`;
          });

          setInputState(clearInputState);
          appApi.addMessage(['Fold trees:', ...lines].join('\n'));

          return;
        }

        case 'emitError':
          appApi.addMessage(effect.message, 'error');
          return;
      }
    },
    [appMethods, effectToAction, navEntry, state, shellApi, appApi, clearInputState, normalCommands, executeCode],
  );

  // ===========================================================================
  // Input hook
  // ===========================================================================
  const handleInput = useCallback(
    (userInput: UserInput) => {
      const intent = userInputToIntent(userInput, inputState);
      if (intent === undefined) {
        return;
      }

      const effectResult = intentToEffect(intent, state);
      if (effectResult === undefined) {
        return;
      }

      setFeedback(undefined);
      executeEffect(effectResult);
    },
    [executeEffect, inputState, intentToEffect, state],
  );

  // ===========================================================================
  // Render
  // ===========================================================================
  return (
    <ScreenRenderer
      view={view}
      feedback={feedback}
      feedbackApi={feedbackApi}
      config={config}
      highlightResolver={highlightResolver}
      inputState={inputState}
      handleInput={handleInput}
      onRowsChange={handleRowsChange}
    />
  );
}
