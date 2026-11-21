// KT-1884 — a panel's header, as it shows inside or outside `SidePanelShell`.
// Inside, the panel draws no header of its own: its `meta` and `actions` go
// into the shell's one header. Outside, it draws `standalone`, its own header.
import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SidePanelHeaderContext } from './sidePanelHeaderContext';

export interface SidePanelHeaderSlotProps {
  /** Shown after the panel's name, under the shell's title (a count, a progress, a path). */
  meta?: ReactNode;
  /** The panel's own actions, before the shell's menu and close button. */
  actions?: ReactNode;
  /** The panel's own header, drawn only outside a shell. */
  standalone: ReactNode;
}

export function SidePanelHeaderSlot({ meta, actions, standalone }: SidePanelHeaderSlotProps) {
  const targets = useContext(SidePanelHeaderContext);
  if (!targets) return <>{standalone}</>;
  return (
    <>
      {meta != null && targets.meta && createPortal(meta, targets.meta)}
      {actions != null && targets.actions && createPortal(actions, targets.actions)}
    </>
  );
}
