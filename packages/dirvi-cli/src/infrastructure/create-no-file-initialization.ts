import { highlightResolver as fsHlRes } from '@mak-98/posix-fs-dirvi-app/highlight';

import type { Initialization } from '@mak-98/dirvi-app';
import { createInitRuntime } from '@mak-98/dirvi-app';

export function createNoFileInitialization(): Initialization {
  const runtime = createInitRuntime();
  runtime.api.app.initial('fs');
  runtime.api.app.register({
    id: 'fs',
    create: async (input) => {
      const { app } = await import('@mak-98/posix-fs-dirvi-app/app');
      return app(input);
    },
    highlightResolver: (token: string) => {
      return fsHlRes(token);
    },
  });
  return runtime.finish();
}
