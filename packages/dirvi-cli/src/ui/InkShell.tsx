import { useCallback, useEffect, useState } from 'react';
import { useApp } from 'ink';

import type { ShellProps } from '@mak-98/dirvi-app';
import { Shell } from '@mak-98/dirvi-app';

type InkShellProps = Omit<ShellProps, 'onQuit'>;

/**
 * Marshalls methods for controlling dirvi at the shell-level that are specific
 * to Ink.
 *
 * @param props
 * @constructor
 */
export function InkShell(props: InkShellProps) {
  const { exit } = useApp();
  const [exiting, setExiting] = useState(false);

  const onQuit = useCallback(() => {
    setExiting(true);
  }, []);

  useEffect(() => {
    if (exiting) {
      exit();
    }
  }, [exit, exiting]);

  if (exiting) {
    return null;
  }

  return <Shell {...props} onQuit={onQuit} />;
}
