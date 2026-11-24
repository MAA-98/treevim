import { useEffect, useMemo, useState } from 'react';

import type { FeedbackType, HighlightResolver, ShellApi, ToolDefinition } from 'dirvi-apis';
import type { AppMethods, State } from 'dirvi-lib';
import { createTreeMethods } from 'dirvi-lib';
import {
  createEffectToAction,
  createIntentToEffect,
  createReducer,
} from 'dirvi-lib';

import type { LoadingScreenRenderer } from './loading-screen-renderer.js';
import type { AppScreenRenderer } from './app-screen-renderer.js';
import type { Initialization } from '../domain/initialization.js';
import type { NormalCommand } from '../domain/command.js';
import { App } from './App.js';
import { defaultConfig } from '../domain/config.js';
import { defaultUiHighlightResolver } from '../domain/theme.js';
import { resolveWithFallback } from '../application/highlight-resolver.js';

// TODO Later: configuration watched for changes

const emptyTools: ReadonlyMap<string, ToolDefinition<any>> = new Map();
const emptyNormalCommands: ReadonlyMap<string, NormalCommand> = new Map();
const emptyHighlightResolver: HighlightResolver = (_string) => undefined;

type AppSetupProps<Id, Value> = {
  appScreenRenderer: AppScreenRenderer;
  loadingScreenRenderer: LoadingScreenRenderer;
  appId: string;
  initialization: Initialization;
  initialMessage?: { message: string; type: FeedbackType };
  onInitialMessageShown: () => void;
  shellApi: ShellApi;
  appMethods: AppMethods<Id, Value>;
  clipboard?: (value: string) => void;
};

type LoadState<Id, Value> =
  | {
      status: 'loading';
      appMethods: AppMethods<Id, Value>;
    }
  | {
      status: 'ready';
      appMethods: AppMethods<Id, Value>;
      initialState: State<Id, Value>;
    }
  | {
      status: 'error';
      appMethods: AppMethods<Id, Value>;
      error: Error;
    };

export function AppSetup<Id, Value>({
  appScreenRenderer,
  loadingScreenRenderer,
  appId,
  initialization,
  initialMessage,
  onInitialMessageShown,
  shellApi,
  appMethods,
  clipboard,
}: AppSetupProps<Id, Value>) {
  const [loadState, setLoadState] = useState<LoadState<Id, Value>>();

  useEffect(() => {
    let mounted = true;

    setLoadState({ status: 'loading', appMethods: appMethods });

    async function initialize() {
      try {
        const root = await appMethods.loadRoot();

        if (!mounted) {
          return;
        }

        const rootId = createTreeMethods<Id, Value>().id(root);
        const folds = appMethods.stateMethods.foldMethods.create(rootId, {
          name: 'default',
          description: null,
        });
        const initialState = appMethods.stateMethods.create(root, folds, {
          path: [],
        });

        if (initialState === undefined) {
          throw new Error('Cannot create initial app state');
        }

        setLoadState({
          status: 'ready',
          appMethods,
          initialState,
        });
      } catch (cause: unknown) {
        if (!mounted) {
          return;
        }

        const error = cause instanceof Error ? cause : new Error(String(cause));
        setLoadState({ status: 'error', appMethods, error });
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [appMethods]);

  // --- Pure function deps ---
  const config = useMemo(
    () => initialization.configs.get(appId) ?? defaultConfig,
    [initialization.configs, appId],
  );
  const normalCommands = useMemo(
    () => initialization.normalCommands.get(appId) ?? emptyNormalCommands,
    [initialization.normalCommands, appId],
  );
  const tools = useMemo(
    () => initialization.tools.get(appId) ?? emptyTools,
    [initialization.tools, appId],
  );

  const highlightResolver = useMemo(() => {
    const appHighlightResolver =
      initialization.highlightResolvers.get(appId) ?? emptyHighlightResolver;
    
    return (token: string) =>
      resolveWithFallback(appHighlightResolver, token) ??
      resolveWithFallback(defaultUiHighlightResolver, token);
  }, [initialization.highlightResolvers, appId]);

  const reducer = useMemo(
    () => createReducer(appMethods.stateMethods, appMethods.navMethods),
    [appMethods.stateMethods, appMethods.navMethods],
  );

  const intentToEffect = useMemo(
    () =>
      createIntentToEffect(
        new Set(normalCommands.keys()),
        appMethods.stateMethods,
      ),
    [appMethods.stateMethods, normalCommands],
  );

  const effectToAction = useMemo(
    () => createEffectToAction(appMethods.stateMethods, appMethods.navMethods),
    [appMethods.navMethods, appMethods.stateMethods],
  );

  // --- JSX ---
  const LoadingScreenRenderer = loadingScreenRenderer;

  if (loadState === undefined || loadState.appMethods !== appMethods) {
    return <LoadingScreenRenderer />;
  }

  if (loadState.status === 'loading') {
    return <LoadingScreenRenderer />;
  }

  if (loadState.status === 'error') {
    throw loadState.error;
  }

  return (
    <App
      screenRenderer={appScreenRenderer}
      shellApi={shellApi}
      appMethods={appMethods}
      tools={tools}
      normalCommands={normalCommands}
      highlightResolver={highlightResolver}
      config={config}
      initialState={loadState.initialState}
      {...(initialMessage === undefined ? {} : { initialMessage })}
      onInitialMessageShown={onInitialMessageShown}
      reducer={reducer}
      intentToEffect={intentToEffect}
      effectToAction={effectToAction}
      {...(clipboard === undefined ? {} : { clipboard })}
    />
  );
}
