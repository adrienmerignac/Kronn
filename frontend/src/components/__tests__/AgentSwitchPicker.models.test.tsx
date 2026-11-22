// KT-1994 — disposition A of the agent picker: per agent a header (dot, name,
// kind, one state badge, model count), its three modes with the model id
// written, then its other models folded behind one control. A model outside
// the modes is « Personnalisé » / "Custom"; the search reaches every model
// without unfolding; a « Récents » section keeps the last three choices in the
// UI preferences; the composer's @ menu writes the model of each mode and
// offers no exact model.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApiMock } from '../../test/apiMock';
import type { CatalogModelEntry, ModelCatalogView, ModelTier } from '../../types/generated';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../lib/api', () => buildApiMock({ modelCatalogApi: { list: list as never } }));

import {
  AgentPickerPalette, AgentSwitchPicker, OTHER_MODELS_RENDER_LIMIT, type AgentSwitchTarget,
} from '../AgentSwitchPicker';
import { AGENT_PICKER_RECENTS_KEY, readAgentPickerRecents } from '../../lib/agentPickerRecents';
import { SYNCED_KEYS, isSyncedKey } from '../../lib/uiPreferences';
import { setStorageWriteListener } from '../../lib/safeStorage';
import type { ResolvedCatalogTier } from '../../lib/modelCatalogSelection';

function model(runtime: string, id: string, extra: Partial<CatalogModelEntry> = {}): CatalogModelEntry {
  return {
    id: `${runtime}/${id}`, runtime_target_id: runtime, agent_type: 'ClaudeCode', model_id: id, display_name: id,
    tier_assignment: null, provenance: 'live', availability: 'available', capabilities: ['chat'], reasoning_modes: [],
    manual_origin: false, first_seen_at: '2026-11-21T00:00:00Z', last_checked_at: '2026-11-21T00:00:00Z',
    created_at: '2026-11-21T00:00:00Z', updated_at: '2026-11-21T00:00:00Z', ...extra,
  } as CatalogModelEntry;
}

function view(runtime: string, agent: CatalogModelEntry['agent_type'], models: CatalogModelEntry[], extra: Partial<ModelCatalogView> = {}): ModelCatalogView {
  return { runtime_target_id: runtime, agent_type: agent, stale: false, live_refresh_ok: true, models, ...extra } as ModelCatalogView;
}

const OPENROUTER_MODELS = Array.from({ length: 120 }, (_, index) =>
  model('http:openrouter', `vendor/model-${String(index).padStart(3, '0')}`, { agent_type: 'Custom' }));

const CATALOG = {
  targets: [
    view('agent:claude-code', 'ClaudeCode', [
      model('agent:claude-code', 'claude-haiku-4-5', { display_name: 'Haiku', tier_assignment: 'economy' }),
      model('agent:claude-code', 'claude-sonnet-4-5', { display_name: 'Sonnet', tier_assignment: 'default' }),
      model('agent:claude-code', 'claude-opus-4-5', { display_name: 'Opus', tier_assignment: 'reasoning' }),
      model('agent:claude-code', 'claude-fable-a', { display_name: 'Fable' }),
      model('agent:claude-code', 'claude-fable-b', { display_name: 'Fable' }),
    ]),
    // No tier assignment: the backend's launch verdicts name each mode's model.
    view('agent:codex', 'Codex', [
      model('agent:codex', 'gpt-5.5-mini', { agent_type: 'Codex' }),
      model('agent:codex', 'gpt-5.5', { agent_type: 'Codex' }),
      model('agent:codex', 'gpt-5.5-codex-max', { agent_type: 'Codex' }),
    ], {
      tier_verdicts: [
        { tier: 'economy', requested_model: 'gpt-5.5-mini', effective_model: 'gpt-5.5-mini', launchable: true },
        { tier: 'default', requested_model: 'gpt-5.5-old', effective_model: 'gpt-5.5', launchable: true },
        { tier: 'reasoning', requested_model: 'gpt-5.5-codex-max', effective_model: null, launchable: true },
      ],
    } as Partial<ModelCatalogView>),
    view('http:openrouter', 'Custom', OPENROUTER_MODELS),
  ],
};

const OPENROUTER: AgentSwitchTarget = {
  agent: 'Custom', connectionId: 'openrouter', label: 'OpenRouter',
  modelTiers: { economy: 'vendor/model-001', default: 'vendor/model-002', reasoning: 'vendor/model-003' },
};
const TARGETS: AgentSwitchTarget[] = [{ agent: 'ClaudeCode' }, { agent: 'Codex' }, { agent: 'GeminiCli' }, OPENROUTER];
const TIER_LABELS: Record<ModelTier, string> = { economy: 'Éco', default: 'Standard', reasoning: 'Avancé' };

function FullList(props: {
  currentAgent?: AgentSwitchTarget['agent'];
  currentConnectionId?: string | null;
  currentTier?: ModelTier;
  model?: string | null;
  onTier?: (target: AgentSwitchTarget, tier: ModelTier) => Promise<void>;
  onModel?: (target: AgentSwitchTarget, model: string) => Promise<void>;
}) {
  return (
    <AgentSwitchPicker
      currentAgent={props.currentAgent ?? 'ClaudeCode'}
      currentConnectionId={props.currentConnectionId}
      currentTier={props.currentTier ?? 'default'}
      availableAgents={[]}
      availableTargets={TARGETS}
      tierLabels={TIER_LABELS}
      defaultModelLabel="Default agent model"
      onTargetSelectionChange={props.onTier ?? vi.fn().mockResolvedValue(undefined)}
      customModel={{ model: props.model ?? null, onSelect: props.onModel ?? vi.fn().mockResolvedValue(undefined) }}
      title="Agent"
      ariaLabel="Agent"
    />
  );
}

async function open() {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Agent' })); });
  const popover = screen.getByRole('dialog', { name: 'Agent' });
  await waitFor(() => expect(list).toHaveBeenCalled());
  await act(async () => {});
  return popover;
}

const group = (name: string) => screen.getByRole('group', { name });
const modelText = (row: HTMLElement) => row.querySelector('.kr-agent-switch-mode-model')?.textContent;

beforeEach(() => {
  localStorage.clear();
  list.mockReset().mockResolvedValue(CATALOG);
});
afterEach(() => {
  cleanup();
  setStorageWriteListener(null);
});

describe('mode rows write their model (KT-1994)', () => {
  it('each agent shows its header, then its three modes with the model id written in the code face', async () => {
    render(<FullList />);
    await open();
    const claude = group('Claude Code');
    const header = claude.querySelector('.kr-agent-switch-group-header')!;
    expect(header.querySelector('.kr-agent-switch-option-dot')).not.toBeNull();
    expect(header).toHaveTextContent('Claude Code');
    expect(within(header as HTMLElement).getByText('agentPicker.kind.cli')).toBeInTheDocument();
    expect(header.querySelector('.kr-agent-switch-model-count')).toHaveTextContent('agentPicker.modelCount');
    expect(header.querySelector('.kr-agent-switch-model-count')).toHaveAttribute('data-count', '5');
    const modes = ['economy', 'default', 'reasoning'] as const;
    const rows = modes.map(tier => within(claude).getByRole('menuitem', { name: `Claude Code · ${TIER_LABELS[tier]}` }));
    expect(rows.map(modelText)).toEqual(['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5']);
    for (const row of rows) expect(row.querySelector('.kr-agent-switch-mode-model')?.tagName).toBe('CODE');
    // The current mode carries the check and cannot be chosen again.
    expect(rows[1]).toHaveAttribute('data-current', 'true');
    expect(rows[1]).toBeDisabled();
    expect(rows[1].querySelector('svg')).not.toBeNull();
    // The display name is a secondary text, only when it differs from the id.
    expect(rows[0].querySelector('.kr-agent-switch-mode-name')).toHaveTextContent('Haiku');
  });

  it('a CLI agent takes its modes from the launch verdicts, an HTTP target from its connection', async () => {
    render(<FullList />);
    await open();
    const codex = group('Codex');
    expect(['economy', 'default', 'reasoning'].map(tier =>
      modelText(within(codex).getByRole('menuitem', { name: `Codex · ${TIER_LABELS[tier as ModelTier]}` }))))
      .toEqual(['gpt-5.5-mini', 'gpt-5.5', 'gpt-5.5-codex-max']);
    const openrouter = group('OpenRouter');
    expect(within(openrouter.querySelector('.kr-agent-switch-group-header') as HTMLElement).getByText('agentPicker.kind.api'))
      .toBeInTheDocument();
    expect(modelText(within(openrouter).getByRole('menuitem', { name: 'OpenRouter · Avancé' }))).toBe('vendor/model-003');
  });

  it('a mode without a declared model says « agent default model »', async () => {
    render(<FullList />);
    await open();
    const row = within(group('Gemini CLI')).getByRole('menuitem', { name: 'Gemini CLI · Éco' });
    expect(row.querySelector('.kr-agent-switch-mode-default')).toHaveTextContent('wf.shadow.rows.defaultModel');
    expect(row.querySelector('.kr-agent-switch-mode-model')).toBeNull();
  });

  it('lists the current agent first, then the configured order', async () => {
    render(<FullList currentAgent="Codex" />);
    await open();
    const names = screen.getAllByRole('group')
      .filter(node => node.classList.contains('kr-agent-switch-group-block'))
      .map(node => node.getAttribute('aria-label'));
    expect(names).toEqual(['Codex', 'Claude Code', 'Gemini CLI', 'OpenRouter']);
  });
});

describe('other models: folded, one agent at a time, bounded (KT-1994)', () => {
  it('are folded for every agent; unfolding one agent leaves the others folded', async () => {
    render(<FullList />);
    await open();
    expect(within(group('Claude Code')).queryByRole('menuitem', { name: 'Claude Code · claude-fable-a' })).toBeNull();
    const toggle = within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · agentPicker.otherModels' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Only the models no mode points to are « other ».
    expect(toggle.querySelector('.kr-agent-switch-model-count')).toHaveAttribute('data-count', '2');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const fable = within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · claude-fable-a' });
    expect(modelText(fable)).toBe('claude-fable-a');
    expect(fable.querySelector('.kr-agent-switch-mode-name')).toHaveTextContent('Fable');
    expect(within(group('Claude Code')).queryByRole('menuitem', { name: 'Claude Code · claude-sonnet-4-5' })).toBeNull();
    expect(within(group('OpenRouter')).getByRole('menuitem', { name: 'OpenRouter · agentPicker.otherModels' }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(within(group('OpenRouter')).queryByRole('menuitem', { name: 'OpenRouter · vendor/model-050' })).toBeNull();
    // Folded again on the same control.
    fireEvent.click(toggle);
    expect(within(group('Claude Code')).queryByRole('menuitem', { name: 'Claude Code · claude-fable-a' })).toBeNull();
  });

  it(`never mounts more than ${OTHER_MODELS_RENDER_LIMIT} other models per agent; the search reaches the rest`, async () => {
    expect(OTHER_MODELS_RENDER_LIMIT).toBeGreaterThan(0);
    expect(OTHER_MODELS_RENDER_LIMIT).toBeLessThan(117);
    render(<FullList />);
    await open();
    const openrouter = group('OpenRouter');
    fireEvent.click(within(openrouter).getByRole('menuitem', { name: 'OpenRouter · agentPicker.otherModels' }));
    const rendered = openrouter.querySelectorAll('[data-kind="model"]');
    expect(rendered).toHaveLength(OTHER_MODELS_RENDER_LIMIT);
    // 120 models, 3 of them behind a mode: the rest is announced, not mounted.
    const more = openrouter.querySelector('.kr-agent-switch-more')!;
    expect(more).toHaveAttribute('data-count', String(117 - OTHER_MODELS_RENDER_LIMIT));
    expect(within(openrouter).queryByRole('menuitem', { name: 'OpenRouter · vendor/model-119' })).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'model-119' } });
    expect(within(group('OpenRouter')).getByRole('menuitem', { name: 'OpenRouter · vendor/model-119' })).toBeInTheDocument();
  });

  it('the search finds a folded model without unfolding its agent, and keeps the bound', async () => {
    render(<FullList />);
    await open();
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'fable-b' } });
    const claude = group('Claude Code');
    expect(within(claude).getByRole('menuitem', { name: 'Claude Code · claude-fable-b' })).toBeInTheDocument();
    expect(within(claude).queryByRole('menuitem', { name: 'Claude Code · claude-fable-a' })).toBeNull();
    expect(within(claude).getByRole('menuitem', { name: 'Claude Code · agentPicker.otherModels' }))
      .toHaveAttribute('aria-expanded', 'false');
    // The three modes of a shown agent stay one click away.
    expect(within(claude).getByRole('menuitem', { name: 'Claude Code · Avancé' })).toBeInTheDocument();
    // An agent the search does not match keeps only the typed id, « as is ».
    expect(within(group('Codex')).getAllByRole('menuitem').map(item => item.dataset.kind)).toEqual(['free']);
    fireEvent.change(search, { target: { value: 'vendor/model' } });
    expect(group('OpenRouter').querySelectorAll('[data-kind="model"]')).toHaveLength(OTHER_MODELS_RENDER_LIMIT);
  });
});

describe('a custom model: chosen, saved, labelled (KT-1994)', () => {
  it('choosing another model saves it as an exact model, never as a mode', async () => {
    const onTier = vi.fn().mockResolvedValue(undefined);
    const onModel = vi.fn().mockResolvedValue(undefined);
    render(<FullList onTier={onTier} onModel={onModel} />);
    await open();
    fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · agentPicker.otherModels' }));
    await act(async () => {
      fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · claude-fable-a' }));
    });
    expect(onModel).toHaveBeenCalledWith({ agent: 'ClaudeCode' }, 'claude-fable-a');
    expect(onTier).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Agent' })).toBeNull();
  });

  it('a held custom model reads « Personnalisé » on the trigger and stays visible under its agent while folded', async () => {
    render(<FullList model="claude-fable-b" />);
    const trigger = screen.getByRole('button', { name: 'Agent' });
    const chip = trigger.querySelector('.kr-agent-switch-custom')!;
    expect(chip).toHaveTextContent('agentPicker.custom');
    expect(trigger.querySelector('.kr-agent-switch-current-tier')).toBeNull();
    expect(trigger.querySelector('.kr-agent-switch-suffix')).toHaveTextContent('· claude-fable-b');
    await open();
    const claude = group('Claude Code');
    const custom = within(claude).getByRole('menuitem', { name: 'Claude Code · agentPicker.custom · claude-fable-b' });
    expect(custom).toHaveAttribute('data-current', 'true');
    expect(modelText(custom)).toBe('claude-fable-b');
    expect(within(claude).getByRole('menuitem', { name: 'Claude Code · agentPicker.otherModels' }))
      .toHaveAttribute('aria-expanded', 'false');
    // No mode is checked; the current mode can be chosen again to leave the custom model.
    const standard = within(claude).getByRole('menuitem', { name: 'Claude Code · Standard' });
    expect(standard).toHaveAttribute('data-current', 'false');
    expect(standard).toBeEnabled();
  });

  it('choosing a mode while a custom model is held sends the mode, which clears the model', async () => {
    const onTier = vi.fn().mockResolvedValue(undefined);
    render(<FullList model="claude-fable-b" onTier={onTier} />);
    await open();
    await act(async () => {
      fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · Standard' }));
    });
    expect(onTier).toHaveBeenCalledWith({ agent: 'ClaudeCode' }, 'default');
  });

  it('a typed id that matches no model is offered as is; a refusal is shown next to it and the choice is kept', async () => {
    const onModel = vi.fn().mockRejectedValue(new Error('The model id must not start with "-"'));
    render(<FullList onModel={onModel} />);
    await open();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  -rogue  ' } });
    const free = within(group('Claude Code')).getByRole('menuitem', { name: /^Claude Code · -rogue — agentPicker\.freeModel/ });
    await act(async () => { fireEvent.click(free); });
    expect(onModel).toHaveBeenCalledWith({ agent: 'ClaudeCode' }, '-rogue');
    const alert = within(group('Claude Code')).getByRole('alert');
    expect(alert).toHaveTextContent('The model id must not start with "-"');
    expect(free.nextElementSibling).toBe(alert);
    // Still open, the previous choice untouched.
    expect(screen.getByRole('dialog', { name: 'Agent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agent' }).querySelector('.kr-agent-switch-custom')).toBeNull();
  });

  it('a typed id equal to a listed model is that model, not a free one', async () => {
    render(<FullList />);
    await open();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'claude-fable-a' } });
    expect(within(group('Claude Code')).queryByRole('menuitem', { name: /freeModel/ })).toBeNull();
    expect(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · claude-fable-a' })).toBeInTheDocument();
  });
});

describe('« Récents »: the last three choices, in the UI preferences (KT-1994)', () => {
  it('is a synced UI preference in the kronn namespace', () => {
    expect(AGENT_PICKER_RECENTS_KEY.startsWith('kronn:')).toBe(true);
    expect(SYNCED_KEYS).toContain(AGENT_PICKER_RECENTS_KEY);
    expect(isSyncedKey(AGENT_PICKER_RECENTS_KEY, false)).toBe(true);
  });

  it('a choice applied is written, mirrored to the server store, and read first on the next opening', async () => {
    const mirrored = vi.fn();
    setStorageWriteListener(mirrored);
    const onTier = vi.fn().mockResolvedValue(undefined);
    const onModel = vi.fn().mockResolvedValue(undefined);
    render(<FullList onTier={onTier} onModel={onModel} />);
    await open();
    // Nothing chosen yet: no section.
    expect(screen.queryByRole('group', { name: 'agentPicker.recent' })).toBeNull();
    await act(async () => {
      fireEvent.click(within(group('Codex')).getByRole('menuitem', { name: 'Codex · Avancé' }));
    });
    expect(mirrored).toHaveBeenCalledWith(AGENT_PICKER_RECENTS_KEY);
    expect(readAgentPickerRecents()).toEqual([{ agent: 'Codex', tier: 'reasoning' }]);
    await open();
    fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · agentPicker.otherModels' }));
    await act(async () => {
      fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · claude-fable-a' }));
    });
    await open();
    const recent = group('agentPicker.recent');
    const rows = within(recent).getAllByRole('menuitem');
    expect(rows.map(row => row.getAttribute('aria-label'))).toEqual([
      'agentPicker.recent: Claude Code · agentPicker.custom · claude-fable-a',
      'agentPicker.recent: Codex · Avancé · gpt-5.5-codex-max',
    ]);
    // On top of the list.
    expect(screen.getByRole('menu').firstElementChild).toBe(recent);
    await act(async () => { fireEvent.click(rows[1]); });
    expect(onTier).toHaveBeenLastCalledWith({ agent: 'Codex' }, 'reasoning');
  });

  it('keeps three distinct choices, most recent first, and hides them while searching', async () => {
    localStorage.setItem(AGENT_PICKER_RECENTS_KEY, JSON.stringify([
      { agent: 'Codex', tier: 'economy' },
      { agent: 'Codex', tier: 'economy' },
      { agent: 'Custom', connectionId: 'openrouter', model: 'vendor/model-077' },
      { agent: 'ClaudeCode', tier: 'reasoning' },
      { agent: 'GeminiCli', tier: 'default' },
      { agent: 'NotAnAgent', tier: 'default' },
    ]));
    render(<FullList />);
    await open();
    const rows = within(group('agentPicker.recent')).getAllByRole('menuitem');
    expect(rows.map(row => row.getAttribute('aria-label'))).toEqual([
      'agentPicker.recent: Codex · Éco · gpt-5.5-mini',
      'agentPicker.recent: OpenRouter · agentPicker.custom · vendor/model-077',
      'agentPicker.recent: Claude Code · Avancé · claude-opus-4-5',
    ]);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'codex' } });
    expect(screen.queryByRole('group', { name: 'agentPicker.recent' })).toBeNull();
  });
});

describe('the shadow editor: one list, custom labelled (KT-1994)', () => {
  it('modes first, other models after; a model outside the modes reads « Personnalisé »', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AgentSwitchPicker currentAgent="ClaudeCode" availableAgents={[]} availableTargets={TARGETS} title="Agent" ariaLabel="Agent"
        exactModel={{ value: { agent: 'ClaudeCode', model: 'claude-opus-4-5' }, onChange, main: { agent: 'Codex' }, testId: 'exact' }} />,
    );
    await open();
    // The catalogue names Opus as the Avancé mode: a mode, not a custom model.
    const trigger = screen.getByRole('button', { name: 'Agent' });
    expect(trigger.querySelector('.kr-agent-switch-custom')).toBeNull();
    expect(trigger.querySelector('.kr-agent-switch-current-tier')).toHaveAttribute('data-tier', 'reasoning');
    const claude = group('Claude Code');
    const items = within(claude).getAllByRole('menuitem');
    const names = items.map(item => item.getAttribute('aria-label'));
    const indexOf = (name: string) => names.indexOf(name);
    expect(indexOf('Claude Code · disc.tier.reasoning')).toBeGreaterThan(-1);
    expect(indexOf('Claude Code · agentPicker.otherModels')).toBeGreaterThan(indexOf('Claude Code · disc.tier.reasoning'));
    expect(items[indexOf('Claude Code · disc.tier.reasoning')]).toHaveAttribute('data-current', 'true');
    fireEvent.click(items[indexOf('Claude Code · agentPicker.otherModels')]);
    fireEvent.click(within(group('Claude Code')).getByRole('menuitem', { name: 'Claude Code · claude-fable-b' }));
    expect(onChange).toHaveBeenCalledWith({ agent: 'ClaudeCode', model: 'claude-fable-b' });
    // Saved, then shown again from the stored value.
    rerender(
      <AgentSwitchPicker currentAgent="ClaudeCode" availableAgents={[]} availableTargets={TARGETS} title="Agent" ariaLabel="Agent"
        exactModel={{ value: { agent: 'ClaudeCode', model: 'claude-fable-b' }, onChange, main: { agent: 'Codex' }, testId: 'exact' }} />,
    );
    expect(screen.getByRole('button', { name: 'Agent' }).querySelector('.kr-agent-switch-custom')).toHaveTextContent('agentPicker.custom');
  });

  it('a mode row picks the model that mode names', async () => {
    const onChange = vi.fn();
    render(
      <AgentSwitchPicker currentAgent="ClaudeCode" availableAgents={[]} availableTargets={TARGETS} title="Agent" ariaLabel="Agent"
        exactModel={{ value: undefined, onChange, main: { agent: 'ClaudeCode' }, testId: 'exact' }} />,
    );
    await open();
    fireEvent.click(within(group('Codex')).getByRole('menuitem', { name: 'Codex · disc.tier.economy' }));
    expect(onChange).toHaveBeenCalledWith({ agent: 'Codex', model: 'gpt-5.5-mini' });
  });
});

describe('the composer’s @ menu (KT-1994)', () => {
  const resolution = (id: string, name = id): ResolvedCatalogTier => ({
    configured: id, entry: { model_id: id, display_name: name, last_checked_at: '2026-11-21T00:00:00Z' },
    view: undefined, model: name, unavailable: false, replacement: null, refusal: null, notice: null, provenance: 'live',
  }) as unknown as ResolvedCatalogTier;
  const ids: Record<ModelTier, string> = { economy: 'claude-haiku-4-5', default: 'claude-sonnet-4-5', reasoning: 'claude-opus-4-5' };

  it('writes the model id next to each mode, and offers no other model nor a free id', () => {
    const t = (key: string) => key;
    render(<AgentPickerPalette ariaLabel="Mention" t={t} rows={[{
      key: 'claude', agent: 'ClaudeCode', label: '@claude', onSelect: vi.fn(),
      tiers: {
        targetLabel: '@claude', resolve: tier => resolution(ids[tier], 'Sonnet'), tierLabel: tier => TIER_LABELS[tier],
        modelLabel: tier => ids[tier], defaultLabel: 'default', onSelect: vi.fn(),
      },
    }]} />);
    const option = screen.getByRole('option');
    const tiers = Array.from(option.querySelectorAll<HTMLElement>('.kr-agent-switch-tier-option'));
    expect(tiers.map(tier => tier.querySelector('.kr-agent-switch-tier-model')?.textContent))
      .toEqual(['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5']);
    expect(tiers[0].querySelector('.kr-agent-switch-tier-model')?.tagName).toBe('CODE');
    expect(within(option).queryByText('agentPicker.otherModels')).toBeNull();
    expect(within(option).queryByText(/agentPicker\.(custom|freeModel)/)).toBeNull();
    expect(option.querySelector('[data-kind="model"], [data-free]')).toBeNull();
  });

  it('a mode without a declared model says « agent default model »', () => {
    render(<AgentPickerPalette ariaLabel="Mention" t={key => key} rows={[{
      key: 'gemini', agent: 'GeminiCli', label: '@gemini', onSelect: vi.fn(),
      tiers: {
        targetLabel: '@gemini', resolve: () => ({ ...resolution(''), entry: undefined, configured: '', model: '' }) as ResolvedCatalogTier,
        tierLabel: tier => TIER_LABELS[tier], modelLabel: () => 'default', defaultLabel: 'default', onSelect: vi.fn(),
      },
    }]} />);
    for (const tier of screen.getByRole('option').querySelectorAll('.kr-agent-switch-tier-option')) {
      expect(tier.querySelector('.kr-agent-switch-tier-model')).toHaveTextContent('wf.shadow.rows.defaultModel');
    }
  });
});
