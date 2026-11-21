// KT-1885 — why an agent choice cannot run (or runs with a warning). Every
// place that chooses an agent shows it through `AgentAvailabilityBadge`
// (components/AgentSwitchPicker.tsx), so a state reads the same in a header, a
// step, an assistant and the composer's @ menu.
import type { ResolvedCatalogTier } from './modelCatalogSelection';

type Translate = (key: string, ...args: (string | number)[]) => string;

/** `unavailable` and `disabled` block the choice; the others only warn. */
export type AgentAvailabilityState = 'unavailable' | 'disabled' | 'needs-full-access' | 'not-listed';

export interface AgentAvailability {
  state: AgentAvailabilityState;
  label: string;
  /** The detail, in the badge's title (a refusal, a notice). */
  title?: string;
}

export const availabilityBlocks = (availability?: AgentAvailability | null) =>
  availability?.state === 'unavailable' || availability?.state === 'disabled';

/** What the catalogue says about one tier of one agent, as an availability. */
export function tierAvailability(resolution: ResolvedCatalogTier | null | undefined, t: Translate): AgentAvailability | null {
  if (!resolution) return null;
  if (resolution.unavailable) {
    return { state: 'unavailable', label: t('modelCatalog.unavailable'), title: resolution.refusal ?? undefined };
  }
  if (resolution.notice) {
    return { state: 'not-listed', label: `⚠ ${t('modelCatalog.notListedBadge')}`, title: resolution.notice };
  }
  return null;
}
