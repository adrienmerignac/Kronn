import {
  Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref, type RefObject,
} from 'react';
import { agentPaletteOptionId } from '../lib/agentPickerPalette';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import {
  resolveCatalogTier, matchesCatalogSearch, catalogTargetSearchTerms, modelRuntimeTargetId,
  type ResolvedCatalogTier,
} from '../lib/modelCatalogSelection';
import { useModelCatalogSnapshot } from '../hooks/useModelCatalogSnapshot';
import { useT } from '../lib/I18nContext';
import {
  AGENT_COLORS,
  AGENT_LABELS,
  ALL_AGENT_TYPES,
  MODEL_TIER_ICONS,
  agentTextColor,
} from '../lib/constants';
import { agentTransport, type AgentTransport } from '../lib/shadowMerge';
import {
  availabilityBlocks, rowAvailability, sameAvailability, sharedTierState, tierAvailability, tierChoiceState,
  type AgentAvailability, type AgentAvailabilityState,
} from '../lib/agentAvailability';
import { SearchField } from './ui/SearchField';
import { agentModelLabel } from './workflows/shadowRowModel';
import type {
  AgentType,
  ModelTier,
  ModelTierConfig,
  ModelTiersConfig,
  ShadowAgent,
} from '../types/generated';
import './AgentSwitchPicker.css';

type Translate = (key: string, ...args: (string | number)[]) => string;

export interface AgentSwitchTarget {
  agent: AgentType;
  connectionId?: string | null;
  label?: string;
  modelTiers?: ModelTierConfig;
}

// ─── Availability: one badge, the same everywhere (KT-1885) ──────────────

export type { AgentAvailability, AgentAvailabilityState };

const AVAILABILITY_TEST_IDS: Record<AgentAvailabilityState, string> = {
  'needs-full-access': 'agent-needs-full-access',
  unavailable: 'agent-unavailable',
  disabled: 'agent-disabled',
  'not-listed': 'agent-not-listed',
  catalog: 'agent-catalog-state',
};

export function AgentAvailabilityBadge({ availability, placement = 'inline' }: {
  availability?: AgentAvailability | null;
  /** `tier`: under a tier choice's label, inside its button. */
  placement?: 'inline' | 'tier';
}) {
  if (!availability) return null;
  return (
    <span
      className={placement === 'tier' ? 'kr-agent-switch-catalog-meta' : 'kr-agent-switch-badge'}
      data-state={availability.state}
      data-testid={AVAILABILITY_TEST_IDS[availability.state]}
      title={availability.title}
    >
      {availability.label}
    </span>
  );
}

// ─── Tier choices: the picker's and the mention menu's ───────────────────

export interface AgentPickerTierChoicesProps {
  /** Who the tiers belong to, first in each choice's name (`Claude Code · Reasoning`). */
  targetLabel: string;
  /** `null` is « the agent's own default », offered when the caller can go back to it. */
  tiers: readonly (ModelTier | null)[];
  currentTier?: ModelTier | null;
  /** The tier the keyboard points at, in a list driven from a text field. */
  keyboardTier?: ModelTier | null;
  resolve: (tier: ModelTier) => ResolvedCatalogTier;
  tierLabel: (tier: ModelTier) => string;
  /** The model named for a tier when the catalogue resolves none. */
  modelLabel: (tier: ModelTier) => string;
  /** How a tier is named in its title and accessible name (default `Tier · model`). */
  titleFor?: (tier: ModelTier) => string;
  defaultLabel: string;
  onSelect: (tier: ModelTier | null) => void;
  disabled?: boolean;
  /** The current choice cannot be chosen again (the popover's). */
  disableCurrent?: boolean;
  /**
   * The pointer chooses on press and keeps the focus where it is: the mention
   * menu's text field keeps its caret.
   */
  keepFocus?: boolean;
  itemRole?: 'menuitem';
  ariaLabel?: string;
  t: Translate;
}

/**
 * KT-1885 — the state a row's tiers share, written once next to the agent
 * (`rowAvailability`); `AgentPickerTierChoices` derives the same one, so a
 * tier only carries a state that differs from it.
 */
function tierRowState(
  tiers: readonly (ModelTier | null)[],
  resolve: (tier: ModelTier) => ResolvedCatalogTier,
  t: Translate,
): AgentAvailability | null {
  return sharedTierState(tiers.flatMap(tier => tier === null ? [] : [tierChoiceState(resolve(tier), t)]));
}

export function AgentPickerTierChoices({
  targetLabel, tiers, currentTier, keyboardTier, resolve, tierLabel, modelLabel, titleFor, defaultLabel, onSelect,
  disabled = false, disableCurrent = false, keepFocus = false, itemRole, ariaLabel, t,
}: AgentPickerTierChoicesProps) {
  const id = useId();
  const shared = tierRowState(tiers, resolve, t);
  return (
    <span
      className="kr-agent-switch-tier-choices"
      aria-label={ariaLabel}
      style={{ '--agent-switch-tier-count': tiers.length } as CSSProperties}
    >
      {tiers.map(tier => {
        const selected = tier === (currentTier ?? null) && (tier !== null || currentTier === null);
        const label = tier === null ? defaultLabel : tierLabel(tier);
        // « Modèle par défaut de l'agent » stays the name; the button shows « Défaut ».
        const visibleLabel = tier === null ? t('agentPicker.defaultTier') : label;
        const resolution = tier === null ? null : resolve(tier);
        const availability = tierAvailability(resolution, t);
        const state = tier === null ? null : tierChoiceState(resolution, t);
        // Written once on the row when the tiers share it; here only when this tier differs.
        const ownState = state && !sameAvailability(state, shared) ? state : null;
        const blocked = availabilityBlocks(availability);
        const name = tier === null ? label : titleFor?.(tier) ?? `${label} · ${modelLabel(tier)}`;
        const title = [
          name,
          state && state.state !== 'not-listed' ? state.label : '',
          resolution?.notice,
          resolution?.refusal,
        ].filter(Boolean).join(' — ');
        const provenance = resolution?.entry && resolution.provenance
          ? t(`modelCatalog.provenance.${resolution.provenance}`)
          : resolution?.configured ? t('modelCatalog.notInCatalog') : '';
        const descriptionId = `${id}-${tier ?? 'agent-default'}`;
        const choose = () => { if (!blocked) onSelect(tier); };
        return (
          <button
            key={tier ?? 'agent-default'}
            type="button"
            role={itemRole}
            className="kr-agent-switch-tier-option"
            data-tier={tier ?? 'agent-default'}
            data-current={selected}
            data-keyboard-selected={keyboardTier !== undefined && keyboardTier === tier ? 'true' : undefined}
            aria-label={`${targetLabel} · ${titleFor && tier !== null ? name : label}`}
            aria-describedby={descriptionId}
            title={title}
            disabled={disabled || (disableCurrent && selected) || blocked}
            // The text field driving the list keeps the keyboard: no Tab stop here.
            tabIndex={keepFocus ? -1 : undefined}
            onMouseDown={keepFocus ? event => {
              event.preventDefault();
              event.stopPropagation();
              choose();
            } : undefined}
            onClick={event => {
              // With keepFocus, a pointer already chose on press: only keyboard activation remains.
              if (keepFocus && event.detail !== 0) return;
              choose();
            }}
          >
            <span className="kr-agent-switch-tier-label">
              {tier !== null && <span aria-hidden="true">{MODEL_TIER_ICONS[tier]}</span>}
              <span>{visibleLabel}</span>
            </span>
            <span id={descriptionId} hidden>
              {[title, resolution?.entry?.model_id, provenance,
                availability?.state === 'unavailable' ? availability.label : '',
                resolution?.refusal ?? resolution?.entry?.unavailable_reason ?? '',
                resolution?.replacement
                  ? t('modelCatalog.runsInstead', resolution.replacement, resolution.configured || resolution.entry?.model_id || '')
                  : '',
                resolution?.notice ?? '',
                resolution?.entry ? t('modelCatalog.lastChecked', resolution.entry.last_checked_at) : '',
              ].filter(Boolean).join(' · ')}
            </span>
            {ownState && <AgentAvailabilityBadge availability={ownState} placement="tier" />}
            {selected && <Check size={8} aria-hidden="true" />}
          </button>
        );
      })}
    </span>
  );
}

// ─── Palette: the list a text field drives (the composer's @ menu) ───────

export interface AgentPickerPaletteRow {
  key: string;
  /** Colours the dot and the label; none for a row that is no agent (@all). */
  agent?: AgentType | null;
  label: ReactNode;
  detail?: ReactNode;
  /** A heading shown before the first row of each group. */
  group?: string;
  availability?: AgentAvailability | null;
  /** An icon after the label (a CLI session that manages its own model). */
  trailing?: ReactNode;
  highlighted?: boolean;
  onHover?: () => void;
  /** Choose the row as it stands; absent for a row that is only shown. */
  onSelect?: () => void;
  tiers?: Omit<AgentPickerTierChoicesProps, 'keepFocus' | 't' | 'tiers'> & { tiers?: readonly (ModelTier | null)[] };
}

/**
 * KT-1885 — the agent picker's list without its own trigger and search, for
 * a menu a text field drives: the composer types the query after « @ » and
 * moves the highlight with its own keys; the rows, the tier choices and the
 * availability badges are the picker's.
 */
export function AgentPickerPalette({ id, rows, status, ariaLabel, className, style, placement, listRef, boundary, t }: {
  /**
   * The list's id: its rows are `agentPaletteOptionId(id, row.key)`, which the
   * text field names in `aria-activedescendant` (see `agentPaletteFieldAria`).
   */
  id?: string;
  rows: readonly AgentPickerPaletteRow[];
  status?: ReactNode;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  /** Which side of its field the list opens on, for the caller's CSS. */
  placement?: 'above' | 'below';
  listRef?: Ref<HTMLDivElement>;
  /**
   * The area the list must stay in (the message list above the composer):
   * its height is measured against that area's edge on its open side, minus
   * `--kr-space-2`, and it scrolls inside. Without one, the window bounds it.
   */
  boundary?: () => Element | null | undefined;
  t: Translate;
}) {
  const fallbackId = useId();
  const listId = id ?? fallbackId;
  const ownRef = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ownRef.current = node;
    if (typeof listRef === 'function') listRef(node);
    else if (listRef) (listRef as { current: HTMLDivElement | null }).current = node;
  }, [listRef]);
  const highlightedKey = rows.find(row => row.highlighted)?.key;
  // The keys move the highlight past the list's fold: keep it in view.
  useEffect(() => {
    if (!highlightedKey) return;
    const row = ownRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightedKey]);
  // Never taller than the room it really has: from its anchored edge to the
  // boundary's far edge (or the window's), so its first row is always visible.
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const fit = useCallback(() => {
    const node = ownRef.current;
    if (!node || !boundaryRef.current) return;
    const own = node.getBoundingClientRect();
    const area = boundaryRef.current()?.getBoundingClientRect();
    const room = placement === 'below'
      ? Math.min(area?.bottom ?? window.innerHeight, window.innerHeight) - own.top - VIEWPORT_PADDING
      : own.bottom - Math.max(area?.top ?? 0, 0) - VIEWPORT_PADDING;
    node.style.maxHeight = `${Math.max(0, Math.floor(room))}px`;
  }, [placement]);
  // On every render: the query, the rows and the field's own height move it.
  useLayoutEffect(() => {
    fit();
  });
  const bounded = Boolean(boundary);
  useEffect(() => {
    if (!bounded) return;
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit, bounded]);
  return (
    <div
      ref={setRef}
      id={listId}
      className={['kr-agent-switch-palette', className].filter(Boolean).join(' ')}
      role="listbox"
      aria-label={ariaLabel}
      style={style}
      data-placement={placement}
    >
      {status &&<div role="status" className="kr-agent-switch-status">{status}</div>}
      {rows.map((row, index) => {
        const blocked = availabilityBlocks(row.availability);
        const badge = rowAvailability(
          row.availability,
          row.tiers ? tierRowState(row.tiers.tiers ?? TIER_CHOICES, row.tiers.resolve, t) : null,
        );
        return (
          <Fragment key={row.key}>
            {row.group && row.group !== rows[index - 1]?.group && (
              <div className="kr-agent-switch-group" role="presentation">{row.group}</div>
            )}
            <div
              id={agentPaletteOptionId(listId, row.key)}
              className="kr-agent-switch-palette-row"
              role="option"
              aria-selected={Boolean(row.highlighted)}
              aria-disabled={blocked || !row.onSelect || undefined}
              data-highlighted={Boolean(row.highlighted)}
              onMouseEnter={row.onHover}
              onMouseDown={event => {
                // A tier choice chooses itself; never turn a refused one into the row's default.
                if (event.target instanceof Element && event.target.closest('.kr-agent-switch-tier-option')) return;
                // The text field keeps its focus and caret.
                event.preventDefault();
                if (!blocked) row.onSelect?.();
              }}
            >
              <button
                type="button"
                className="kr-agent-switch-palette-main"
                disabled={blocked || !row.onSelect}
                tabIndex={-1}
              >
                <span
                  className="kr-agent-switch-option-dot"
                  style={{ background: row.agent ? AGENT_COLORS[row.agent] ?? 'var(--kr-text-faint)' : 'var(--kr-accent)' }}
                />
                <span className="kr-agent-switch-palette-label" style={row.agent ? { color: agentTextColor(row.agent) } : undefined}>
                  {row.label}
                </span>
                {row.detail && <span className="kr-agent-switch-palette-detail">{row.detail}</span>}
                <AgentAvailabilityBadge availability={badge} />
                {row.trailing}
              </button>
              {row.tiers && (
                <AgentPickerTierChoices
                  {...row.tiers}
                  tiers={row.tiers.tiers ?? TIER_CHOICES}
                  keepFocus
                  t={t}
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Exact model: an agent and one of its model ids ──────────────────────

/** The agent a step runs on, for what the exact-model mode greys out. */
export interface MainAgent {
  agent: AgentType;
  connectionId?: string | null;
  model?: string | null;
  /** The step's tier: it picks the model configured when none is explicit. */
  tier?: ModelTier | null;
}

/** CLI / HTTP / Local, the badge the agent lists carry. */
export function TransportBadge({ agent, connectionId, t }: { agent: string; connectionId?: string | null; t: Translate }) {
  const transport: AgentTransport = agentTransport(agent, connectionId);
  return <span className="wf-shadow-transport" data-transport={transport}>{t(`wf.shadow.rows.transport.${transport}`)}</span>;
}

export interface ExactModelSelection {
  /** `undefined` is « = principal »: the step's own agent and model. */
  value: ShadowAgent | undefined;
  onChange: (next: ShadowAgent | undefined) => void;
  main: MainAgent;
  /** Trigger's test id; the list is `${testId}-menu`, « = principal » `${testId}-same`. */
  testId: string;
  /** The trigger's content; the current agent and model by default. */
  children?: ReactNode;
  className?: string;
}

// ─── The picker ──────────────────────────────────────────────────────────

interface AgentSwitchPickerProps {
  currentAgent: AgentType;
  availableAgents: AgentType[];
  currentConnectionId?: string | null;
  currentTargetLabel?: string;
  availableTargets?: AgentSwitchTarget[];
  onChange?: (agent: AgentType) => Promise<void>;
  currentTier?: ModelTier | null;
  /** Saved per-discussion/QP override; alternative selections resolve their own tiers. */
  currentModel?: string | null;
  onSelectionChange?: (agent: AgentType, tier: ModelTier) => Promise<void>;
  onTargetSelectionChange?: (target: AgentSwitchTarget, tier: ModelTier) => Promise<void>;
  /** Optional, explicit return to the caller's agent default (no tier override). */
  onDefaultTierSelection?: (target: AgentSwitchTarget) => Promise<void>;
  tierLabels?: Record<ModelTier, string>;
  modelTiers?: ModelTiersConfig | null;
  defaultModelLabel?: string;
  disabled?: boolean;
  /** Shorthand for `variant="compact"`. */
  compact?: boolean;
  /**
   * KT-1885 — the trigger: `chip` (default, a bordered chip in a line of text),
   * `compact` (no border, in a dense row) or `field` (full width, a form field).
   */
  variant?: 'chip' | 'compact' | 'field';
  title: string;
  ariaLabel: string;
  staticClassName?: string;
  /** The model shown after the agent; defaults to the current tier's resolved model. */
  suffix?: string;
  /**
   * The agent's role, shown as its own label next to the name. A role is
   * never shown alone: the current model stays visible with it, in the
   * switchable and in the static form.
   */
  role?: string;
  /** Model named for the current selection when nothing resolves one (instead of `defaultModelLabel`). */
  currentModelFallback?: string;
  displayName?: string;
  /** Agents that cannot run until their full access is turned on (badged in the list). */
  needsFullAccess?: (agent: AgentType) => boolean;
  /** Why a target cannot be chosen, or runs with a warning: badged, and disabled when it blocks. */
  availability?: (target: AgentSwitchTarget) => AgentAvailability | null | undefined;
  /**
   * KT-1885 — multi-choice: several targets at once. The list stays open and
   * each target toggles; `currentAgent` only names the trigger when nothing is chosen.
   */
  multiple?: {
    selected: readonly AgentSwitchTarget[];
    onToggle: (target: AgentSwitchTarget) => void;
    /** The trigger's text, e.g. « 3 agents ». */
    summary?: (selected: readonly AgentSwitchTarget[]) => string;
  };
  /**
   * KT-1885 — exact model: the choice is an agent and one of its model ids
   * (the catalogue's, or one typed in the search), or « = principal ». The
   * principal's own model is greyed out: « = principal » already says it.
   */
  exactModel?: ExactModelSelection;
}

const TIER_CHOICES: readonly ModelTier[] = ['economy', 'default', 'reasoning'];
const targetKey = (target: Pick<AgentSwitchTarget, 'agent' | 'connectionId'>) => `${target.agent}:${target.connectionId ?? ''}`;
const defaultTargetLabel = (target: AgentSwitchTarget) => target.label ?? AGENT_LABELS[target.agent] ?? target.agent;

/** Arrows, Home and End between the enabled items; Escape closes. */
function usePopoverKeys(
  popoverRef: RefObject<HTMLElement | null>,
  searchRef: RefObject<HTMLInputElement | null>,
  close: () => void,
) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const options = Array.from(popoverRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)',
    ) ?? []);
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const inSearch = event.target === searchRef.current;
    // Home/End keep their normal caret behavior in the search field.
    if (inSearch && (event.key === 'Home' || event.key === 'End')) return;
    event.preventDefault();
    event.stopPropagation();
    if (!options.length) return;
    const index = options.indexOf(event.target as HTMLButtonElement);
    if (event.key === 'Home') options[0].focus();
    else if (event.key === 'End') options[options.length - 1].focus();
    else if (event.key === 'ArrowUp' && index === 0) searchRef.current?.focus();
    else if (event.key === 'ArrowUp') options[index < 0 ? options.length - 1 : index - 1].focus();
    else options[(index + 1) % options.length].focus();
  };
}

/** Between the trigger and its popover (`--kr-space-1`). */
const POPOVER_GAP = 4;
/** The popover never comes closer to the window's edge (`--kr-space-2`). */
const VIEWPORT_PADDING = 8;

/**
 * Open state, fixed position under (or above) the trigger, outside click and Escape.
 *
 * KT-1885 — the popover is placed from its rendered size, measured on open
 * and again whenever `layoutKey` changes (search, catalogue load), when it
 * resizes and when the window does: it stays inside the window and never
 * covers its trigger. Opened above, its bottom is anchored to the trigger.
 */
function usePopover(layoutKey: unknown, busy = false) {
  const [open, setOpen] = useState(false);
  const restoreFocusRef = useRef(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const place = useCallback(() => {
    const trigger = rootRef.current?.getBoundingClientRect();
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const box = popover.getBoundingClientRect();
    // Its height without the cap it may already carry: the list's hidden overflow added back.
    const results = popover.querySelector<HTMLElement>('.kr-agent-switch-results');
    const naturalHeight = box.height + (results ? Math.max(0, results.scrollHeight - results.clientHeight) : 0);
    const width = Math.min(box.width, viewportWidth - 2 * VIEWPORT_PADDING);
    const roomBelow = viewportHeight - trigger.bottom - POPOVER_GAP - VIEWPORT_PADDING;
    const roomAbove = trigger.top - POPOVER_GAP - VIEWPORT_PADDING;
    const below = naturalHeight <= roomBelow || roomBelow >= roomAbove;
    const left = Math.max(VIEWPORT_PADDING, Math.min(trigger.left, viewportWidth - width - VIEWPORT_PADDING));
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = below ? `${Math.round(trigger.bottom + POPOVER_GAP)}px` : '';
    popover.style.bottom = below ? '' : `${Math.round(viewportHeight - trigger.top + POPOVER_GAP)}px`;
    popover.style.maxHeight = `${Math.max(0, Math.floor(below ? roomBelow : roomAbove))}px`;
    popover.dataset.placement = below ? 'below' : 'above';
  }, []);

  const openRef = useRef(open);
  openRef.current = open;
  const close = useCallback((restoreFocus = true) => {
    // Already closed (an outside click while a choice was saving): the focus
    // stays where the user put it, no return to the trigger is scheduled.
    if (!openRef.current) return;
    restoreFocusRef.current = restoreFocus;
    openRef.current = false;
    setOpen(false);
  }, []);

  // Before the first paint, and again when what it shows changes.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, layoutKey]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!open || !popover || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => place());
    observer.observe(popover);
    return () => observer.disconnect();
  }, [open, place]);

  // Back on the trigger once it is enabled again (a save disables it).
  useEffect(() => {
    if (!open && !busy && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      rootRef.current?.querySelector('button')?.focus();
    }
  }, [open, busy]);

  useEffect(() => {
    if (!open) return;
    // The search field takes the focus, even when the picker sits in a dialog
    // (the popover is in <body>, above every overlay layer).
    searchRef.current?.focus();
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // The focus stays where the click put it: no later return to the trigger.
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) close(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) close();
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, close]);

  return { open, setOpen, place, close, rootRef, popoverRef, searchRef, restoreFocusRef };
}

/**
 * Shared agent picker: discussion headers, workflow steps, the API assistants,
 * the shadows' exact model, and (through `AgentPickerPalette` and
 * `AgentPickerTierChoices`) the composer's mention menu. It owns only the
 * popover interaction; callers remain responsible for persisting the selected
 * agent and surfacing any API error.
 */
export function AgentSwitchPicker(props: AgentSwitchPickerProps) {
  if (props.exactModel) return <ExactModelPicker {...props} exactModel={props.exactModel} />;
  return <TierPicker {...props} />;
}

function TierPicker({
  currentAgent,
  availableAgents,
  currentConnectionId,
  currentTargetLabel,
  availableTargets,
  onChange,
  currentTier,
  currentModel,
  onSelectionChange,
  onTargetSelectionChange,
  onDefaultTierSelection,
  tierLabels,
  modelTiers,
  defaultModelLabel = 'Default agent model',
  disabled = false,
  compact = false,
  variant,
  title,
  ariaLabel,
  staticClassName,
  suffix,
  role,
  currentModelFallback,
  displayName,
  needsFullAccess,
  availability,
  multiple,
}: AgentSwitchPickerProps) {
  const { t, tp } = useT();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const suppliedTargets: AgentSwitchTarget[] = availableTargets
    ?? availableAgents.map(agent => ({ agent }));
  const suppliedCurrent = suppliedTargets.find(target =>
    target.agent === currentAgent
    && (target.connectionId ?? null) === (currentConnectionId ?? null)
  );
  const currentTarget: AgentSwitchTarget = suppliedCurrent ?? {
    agent: currentAgent,
    connectionId: currentConnectionId,
    label: currentTargetLabel,
  };
  const choices = (multiple ? suppliedTargets : [currentTarget, ...suppliedTargets]).filter((target, index, targets) =>
    targets.findIndex(candidate => targetKey(candidate) === targetKey(target)) === index
  );
  const tierOptions: (ModelTier | null)[] = onDefaultTierSelection
    ? [null, ...TIER_CHOICES]
    : [...TIER_CHOICES];
  const tierPicker = !multiple && currentTier !== undefined
    && (onSelectionChange !== undefined || onTargetSelectionChange !== undefined);
  const canChange = multiple
    ? choices.length > 0
    : tierPicker
      ? choices.length > 1 || tierOptions.length > 1
      : Boolean(onChange) && choices.length > 1;
  const triggerVariant = variant ?? (compact ? 'compact' : 'chip');

  const popover = usePopover(query, saving);
  const { catalog, catalogError } = useModelCatalogSnapshot(popover.open);
  const { place } = popover;
  // The catalogue's models and states change the list's size: placed again.
  useLayoutEffect(() => {
    if (popover.open) place();
  }, [popover.open, place, catalog, catalogError]);
  const navigateChoices = usePopoverKeys(popover.popoverRef, popover.searchRef, popover.close);

  const targetLabel = defaultTargetLabel;
  const targetAvailability = (target: AgentSwitchTarget): AgentAvailability | null =>
    availability?.(target)
    ?? (needsFullAccess?.(target.agent)
      ? { state: 'needs-full-access', label: t('agentPicker.needsFullAccess') }
      : null);
  const resolvedTier = (target: AgentSwitchTarget, tier: ModelTier) => resolveCatalogTier(
    catalog, target, tier, modelTiers,
    targetKey(target) === targetKey(currentTarget) && tier === currentTier ? currentModel : null,
  );
  const targetModel = (target: AgentSwitchTarget, tier: ModelTier) =>
    resolvedTier(target, tier).model
    || (targetKey(target) === targetKey(currentTarget) && tier === currentTier
      ? currentModelFallback?.trim()
      : undefined)
    || defaultModelLabel;
  const tierLabel = (tier: ModelTier) => tierLabels?.[tier] ?? tier;
  const tierTitle = (target: AgentSwitchTarget, tier: ModelTier) =>
    `${tierLabel(tier)} · ${targetModel(target, tier)}`;
  const showsCurrentModel = Boolean(currentTier) && (tierPicker || role !== undefined);
  const effectiveSuffix = suffix
    ?? (showsCurrentModel && currentTier ? targetModel(currentTarget, currentTier) : undefined);
  const roleLabel = role && (
    <span className="kr-agent-switch-role" data-testid="agent-switch-role">{role}</span>
  );
  const visibleChoices = choices.filter(target => matchesCatalogSearch(query, [
    targetLabel(target),
    ...catalogTargetSearchTerms(target, TIER_CHOICES.map(tier => resolvedTier(target, tier))),
    ...(tierPicker ? tierOptions.flatMap(tier => tier === null
      ? [defaultModelLabel]
      : [tier, tierLabels?.[tier]]) : []),
  ]));
  const isSelected = (target: AgentSwitchTarget) =>
    multiple?.selected.some(selected => targetKey(selected) === targetKey(target)) ?? false;

  const select = async (target: AgentSwitchTarget, tier?: ModelTier | null) => {
    if (savingRef.current) return;
    if (tierPicker) {
      if (tier === undefined || (
        targetKey(target) === targetKey(currentTarget)
        && tier === currentTier
      )) return;
    } else if (!onChange || target.agent === currentAgent) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (tierPicker && tier === null && onDefaultTierSelection) {
        await onDefaultTierSelection(target);
      } else if (tierPicker && tier && onTargetSelectionChange) {
        await onTargetSelectionChange(target, tier);
      } else if (tierPicker && tier && onSelectionChange) {
        await onSelectionChange(target.agent, tier);
      } else if (onChange) {
        await onChange(target.agent);
      }
      popover.close();
    } catch {
      // The caller owns the user-facing error. Keep the picker open so
      // another available combination can be selected.
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!canChange) {
    return (
      <span
        className={staticClassName ?? 'kr-agent-switch-static'}
        style={{ color: agentTextColor(currentTarget.agent) }}
      >
        {displayName ?? targetLabel(currentTarget)}
        {roleLabel}
        {effectiveSuffix && <span className="kr-agent-switch-suffix"> · {effectiveSuffix}</span>}
      </span>
    );
  }

  // Multi-choice: « No agent », or a count with its own singular and plural form.
  const triggerText = multiple
    ? (multiple.summary?.(multiple.selected)
      ?? (multiple.selected.length === 0
        ? t('agentPicker.selectedNone')
        : tp('agentPicker.selectedCount', multiple.selected.length)))
    : displayName ?? targetLabel(currentTarget);

  return (
    <span
      ref={popover.rootRef}
      className="kr-agent-switch"
      data-compact={triggerVariant === 'compact'}
      data-variant={triggerVariant}
      data-open={popover.open}
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        className="kr-agent-switch-btn"
        style={multiple ? undefined : { color: agentTextColor(currentTarget.agent) }}
        title={tierPicker && currentTier
          ? `${title} · ${tierTitle(currentTarget, currentTier)}`
          : title}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={popover.open}
        disabled={disabled || saving}
        onClick={() => {
          if (!popover.open) setQuery('');
          popover.setOpen(value => !value);
        }}
      >
        {saving ? <Loader2 size={9} className="spin" /> : <RefreshCw size={9} />}
        <span className="kr-agent-switch-name">{triggerText}</span>
        {roleLabel}
        {tierPicker && currentTier && (
          <span
            className="kr-agent-switch-current-tier"
            data-tier={currentTier}
            title={tierTitle(currentTarget, currentTier)}
          >
            {MODEL_TIER_ICONS[currentTier]}
          </span>
        )}
        {effectiveSuffix && <span className="kr-agent-switch-suffix"> · {effectiveSuffix}</span>}
        <ChevronDown size={9} />
      </button>
      {popover.open && createPortal(
        <span
          ref={popover.popoverRef}
          className="kr-agent-switch-popover"
          role="dialog"
          aria-label={ariaLabel}
          onKeyDown={navigateChoices}
        >
          <SearchField
            ref={popover.searchRef}
            className="kr-agent-switch-search"
            size="sm"
            label={t('agentPicker.search')}
            placeholder={t('agentPicker.search')}
            value={query}
            onChange={setQuery}
          />
          {catalogError && <span role="status" className="kr-agent-switch-status">{t('modelCatalog.loadError')}</span>}
          {!visibleChoices.length && <span role="status" className="kr-agent-switch-status">{t('agentPicker.noMatch')}</span>}
          <span role="menu" aria-label={ariaLabel} className="kr-agent-switch-results">
          {visibleChoices.map(target => {
            const badge = targetAvailability(target);
            const blocked = availabilityBlocks(badge);
            if (tierPicker) {
              return (
                <span
                  key={targetKey(target)}
                  className="kr-agent-switch-tier-row"
                  role="group"
                  aria-label={targetLabel(target)}
                >
                  <span className="kr-agent-switch-tier-agent">
                    <span className="kr-agent-switch-tier-id">
                      <span
                        className="kr-agent-switch-option-dot"
                        style={{ background: AGENT_COLORS[target.agent] ?? 'var(--kr-text-faint)' }}
                      />
                      <span className="kr-agent-switch-tier-name">{targetLabel(target)}</span>
                    </span>
                    <AgentAvailabilityBadge
                      availability={rowAvailability(badge, tierRowState(tierOptions, tier => resolvedTier(target, tier), t))}
                    />
                  </span>
                  <AgentPickerTierChoices
                    targetLabel={targetLabel(target)}
                    tiers={tierOptions}
                    currentTier={targetKey(target) === targetKey(currentTarget) ? currentTier : undefined}
                    resolve={tier => resolvedTier(target, tier)}
                    tierLabel={tierLabel}
                    modelLabel={tier => targetModel(target, tier)}
                    defaultLabel={defaultModelLabel}
                    onSelect={tier => void select(target, tier)}
                    disabled={saving || blocked}
                    disableCurrent
                    itemRole="menuitem"
                    t={t}
                  />
                </span>
              );
            }
            if (multiple) {
              const checked = isSelected(target);
              return (
                <button
                  key={targetKey(target)}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  className="kr-agent-switch-option"
                  data-current={checked}
                  disabled={blocked}
                  onClick={() => multiple.onToggle(target)}
                >
                  <span className="kr-agent-switch-check" data-checked={checked} aria-hidden="true">
                    {checked && <Check size={9} />}
                  </span>
                  <span
                    className="kr-agent-switch-option-dot"
                    style={{ background: AGENT_COLORS[target.agent] ?? 'var(--kr-text-faint)' }}
                  />
                  {targetLabel(target)}
                  <AgentAvailabilityBadge availability={badge} />
                </button>
              );
            }
            const current = targetKey(target) === targetKey(currentTarget);
            return (
              <button
                key={targetKey(target)}
                type="button"
                role="menuitem"
                className="kr-agent-switch-option"
                data-current={current}
                disabled={saving || current || blocked}
                onClick={() => void select(target)}
              >
                <span
                  className="kr-agent-switch-option-dot"
                  style={{ background: AGENT_COLORS[target.agent] ?? 'var(--kr-text-faint)' }}
                />
                {targetLabel(target)}
                <AgentAvailabilityBadge availability={badge} />
                {current && <Check size={10} />}
              </button>
            );
          })}
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}

/** The agents offered when the page supplies none: every agent Kronn knows. */
const FALLBACK_TARGETS: readonly AgentSwitchTarget[] = [...ALL_AGENT_TYPES, 'Custom' as AgentType].map(agent => ({ agent }));

function ExactModelPicker({
  availableTargets, modelTiers, ariaLabel, disabled = false, compact = false, variant, availability,
  needsFullAccess, exactModel,
}: AgentSwitchPickerProps & { exactModel: ExactModelSelection }) {
  const { t } = useT();
  const { value, onChange, main, testId, children, className } = exactModel;
  const [query, setQuery] = useState('');
  const supplied = availableTargets?.length ? availableTargets : FALLBACK_TARGETS;
  // A saved connection the page no longer lists stays choosable, under its id.
  const targets: readonly AgentSwitchTarget[] = value?.connection_id
    && !supplied.some(target => targetKey(target) === targetKey({ agent: value.agent, connectionId: value.connection_id }))
    ? [...supplied, { agent: value.agent, connectionId: value.connection_id, label: value.connection_id }]
    : supplied;
  const popover = usePopover(query);
  const { catalog } = useModelCatalogSnapshot(popover.open);
  const { place } = popover;
  useLayoutEffect(() => {
    if (popover.open) place();
  }, [popover.open, place, catalog]);
  const navigate = usePopoverKeys(popover.popoverRef, popover.searchRef, popover.close);
  const triggerVariant = variant ?? (compact ? 'compact' : 'chip');

  const fullLabel = agentModelLabel(value, main, targets, t, modelTiers);
  const pick = (next: ShadowAgent | undefined) => {
    popover.close();
    onChange(next);
  };
  const isMain = (agent: AgentType, connectionId: string | null, model: string | null) =>
    agent === main.agent && connectionId === (main.connectionId ?? null) && (model ?? '') === (main.model ?? '');
  const isCurrent = (agent: AgentType, connectionId: string | null, model: string | null) =>
    !!value && value.agent === agent && (value.connection_id ?? null) === connectionId && (value.model ?? '') === (model ?? '');
  const typed = query.trim();

  const groups = targets.map(target => {
    const connectionId = target.connectionId ?? null;
    const models = catalog?.targets.find(view => view.runtime_target_id === modelRuntimeTargetId(target.agent, connectionId))?.models ?? [];
    const ids = models.map(model => model.model_id);
    const extra = value && value.agent === target.agent && (value.connection_id ?? null) === connectionId && value.model && !ids.includes(value.model)
      ? [value.model] : [];
    const options: { model: string | null; label: string; free?: boolean }[] = [
      { model: null, label: t('wf.shadow.rows.defaultModel') },
      ...extra.map(model => ({ model, label: model })),
      ...models.map(model => ({ model: model.model_id, label: model.display_alias ?? model.display_name ?? model.model_id })),
    ];
    const label = defaultTargetLabel(target);
    const labelHit = !typed || matchesCatalogSearch(typed, [label, target.agent, connectionId]);
    const shown = labelHit ? options : options.filter(option => matchesCatalogSearch(typed, [option.label, option.model]));
    // A model id the catalogue does not list is typed in the search: offered under each agent shown.
    const free = typed && !options.some(option => option.model === typed)
      ? [{ model: typed, label: t('agentPicker.freeModel', typed), free: true }] : [];
    return { target, connectionId, label, options: [...shown, ...free], free, hit: labelHit || shown.length > 0 };
  });
  const anyHit = groups.some(group => group.hit);
  const narrowed = Boolean(typed) && anyHit;
  const visible = narrowed ? groups.filter(group => group.hit) : groups;
  // The search hides the agents it does not match, but the typed id stays usable on each of them.
  const hidden = narrowed ? groups.filter(group => !group.hit && group.free.length > 0) : [];

  const renderGroup = ({ target, connectionId, label }: typeof groups[number], options: typeof groups[number]['options']) => {
    const badge = availability?.(target)
      ?? (needsFullAccess?.(target.agent) ? { state: 'needs-full-access' as const, label: t('agentPicker.needsFullAccess') } : null);
    const blocked = availabilityBlocks(badge);
    return (
      <span key={targetKey(target)} className="kr-agent-switch-group-block" role="group" aria-label={label}>
        <span className="kr-agent-switch-group">
          <span className="kr-agent-switch-option-dot" style={{ background: AGENT_COLORS[target.agent] ?? 'var(--kr-text-faint)' }} />
          <span>{label}</span>
          <TransportBadge agent={target.agent} connectionId={connectionId} t={t} />
          <AgentAvailabilityBadge availability={badge} />
        </span>
        {options.map(option => {
          const onMain = isMain(target.agent, connectionId, option.model);
          const current = isCurrent(target.agent, connectionId, option.model);
          return (
            <button
              key={`${option.free ? 'free:' : ''}${option.model ?? ''}`}
              type="button"
              role="menuitem"
              className="kr-agent-switch-option kr-agent-switch-model"
              data-current={current}
              data-main={onMain}
              data-free={option.free || undefined}
              disabled={onMain || blocked}
              title={onMain ? t('wf.shadow.rows.mainModel') : undefined}
              aria-label={option.free ? `${label} · ${option.model} — ${option.label}` : `${label} · ${option.label}`}
              onClick={() => pick({
                agent: target.agent,
                ...(option.model ? { model: option.model } : {}),
                ...(connectionId ? { connection_id: connectionId } : {}),
              })}
            >
              <span>{option.label}</span>
              {current && <Check size={10} aria-hidden />}
            </button>
          );
        })}
      </span>
    );
  };

  return (
    <span
      ref={popover.rootRef}
      className={`kr-agent-switch wf-shadow-picker${className ? ` ${className}` : ''}`}
      data-compact={triggerVariant === 'compact'}
      data-variant={triggerVariant}
      data-mode="exact-model"
      data-open={popover.open}
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        className="kr-agent-switch-btn wf-shadow-picker-btn"
        data-testid={testId}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={popover.open}
        title={children ? undefined : fullLabel}
        disabled={disabled}
        onClick={() => {
          if (!popover.open) setQuery('');
          popover.setOpen(open => !open);
        }}
      >
        {children ?? <span className="kr-agent-switch-name">{fullLabel}</span>}
        {!children && !value && <em className="wf-shadow-picker-hint">{t('wf.shadow.rows.sameAgent')}</em>}
        <ChevronDown size={9} aria-hidden />
      </button>
      {popover.open && createPortal(
        <span
          ref={popover.popoverRef}
          className="kr-agent-switch-popover"
          data-mode="exact-model"
          role="dialog"
          aria-label={ariaLabel}
          onKeyDown={navigate}
        >
          <SearchField
            ref={popover.searchRef}
            className="kr-agent-switch-search"
            size="sm"
            label={t('agentPicker.searchModel')}
            placeholder={t('agentPicker.searchModel')}
            value={query}
            onChange={setQuery}
          />
          <span role="menu" aria-label={ariaLabel} className="kr-agent-switch-results" data-testid={`${testId}-menu`}>
            <button
              type="button"
              role="menuitem"
              className="kr-agent-switch-option kr-agent-switch-model"
              data-current={!value}
              data-testid={`${testId}-same`}
              onClick={() => pick(undefined)}
            >
              <span>{t('wf.shadow.rows.sameAgent')}</span>
              <span className="kr-agent-switch-hint">{t('wf.shadow.rows.sameAgentHint')}</span>
              {!value && <Check size={10} aria-hidden />}
            </button>
            {visible.map(group => renderGroup(group, group.options))}
            {hidden.length > 0 && (
              <>
                <span className="kr-agent-switch-group" role="presentation">{t('agentPicker.otherTargets')}</span>
                {hidden.map(group => renderGroup(group, group.free))}
              </>
            )}
          </span>
        </span>,
        document.body,
      )}
    </span>
  );
}
