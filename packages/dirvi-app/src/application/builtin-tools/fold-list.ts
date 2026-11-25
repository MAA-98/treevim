import { z } from 'zod';
import type { ToolDefinition } from 'dirvi-apis';

const parameters = z.object({}).strict();

export const foldListTool = {
  name: 'fold.list',
  label: 'List fold trees',
  description: 'List fold trees in the current view.',
  parameters,
  createExecute: (api) => () =>
    api.app.folds.list().map((fold) => ({ ...fold })),
} satisfies ToolDefinition<typeof parameters>;
