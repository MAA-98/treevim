import { Type } from 'typebox';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

import { invokeTool } from './infrastructure/invoke-tool.js';

export default function (pi: ExtensionAPI) {
  pi.registerFlag('treevim-socket', {
    description: 'Unix socket for the running Treevim instance.',
    type: 'string',
  });
  
  pi.registerTool({
    name: 'treevim_fold_list',
    label: 'List Treevim folds',
    description: 'List the fold trees in the active Treevim app.',
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, signal) {
      const socketName = pi.getFlag('treevim-socket');

      if (typeof socketName !== 'string' || socketName.length === 0) {
        throw new Error('Start Pi with --treevim-socket <socketName>.');
      }
      
      const value = await invokeTool(socketName, 'fold.list', {}, signal);

      return {
        content: [{ type: 'text', text: JSON.stringify(value) }],
        details: {},
      };
    },
  });
}
