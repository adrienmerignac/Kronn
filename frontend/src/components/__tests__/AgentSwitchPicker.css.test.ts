// KT-1885 review — the picker's stylesheet: tier choices whose text wraps
// rather than being cut and never under 24 px, a 24 px compact chip, an
// exact-model popover wide enough for its placeholder, content-width shadow
// rows, an @ menu as tall as the one it replaced, and the rules this lot adds
// on the design tokens only (text on --kr-type-*, spacing on --kr-space-*).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import fr from '../../lib/i18n/locales/fr';
import en from '../../lib/i18n/locales/en';
import es from '../../lib/i18n/locales/es';
import zh from '../../lib/i18n/locales/zh';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const PICKER = read('components/AgentSwitchPicker.css');

/** The declarations of the rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `missing rule ${selector}`).not.toBeNull();
  return match?.[1] ?? '';
}

const declaration = (body: string, property: string) =>
  body.match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+);`))?.[1].trim();

describe('AgentSwitchPicker.css — tier choices (KT-1885 review)', () => {
  it('a tier choice is never under 24 px and has no fixed height', () => {
    const body = rule(PICKER, '.kr-agent-switch-tier-option');
    // 26 px, a margin over the 24 px floor whatever rounds it; border-box (reset.css).
    expect(declaration(body, 'min-height')).toBe('calc(var(--kr-space-6) + var(--kr-space-1) / 2)');
    expect(declaration(body, 'flex-shrink')).toBe('0');
    expect(declaration(body, 'height')).toBeUndefined();
    // No other rule shrinks it back to a fixed height (the @ menu's used to).
    for (const [, selectors, block] of PICKER.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (selectors.includes('.kr-agent-switch-tier-option')) expect(declaration(block, 'height')).toBeUndefined();
    }
  });

  it('its catalogue state wraps instead of being cut with an ellipsis', () => {
    const body = rule(PICKER, '.kr-agent-switch-catalog-meta');
    expect(body).not.toMatch(/text-overflow\s*:\s*ellipsis/);
    expect(body).not.toMatch(/white-space\s*:\s*nowrap/);
    expect(body).not.toMatch(/position\s*:\s*absolute/);
    expect(declaration(body, 'white-space')).toBe('normal');
  });
});

// KT-1885 review 2 — the row layout the principal decided: one line per agent
// (name and ONE state badge, then the tiers), tiers on equal tracks shared by
// every row, one-line tier buttons, a 480 px popover, stacked under 420 px.
describe('AgentSwitchPicker.css — one line per agent, tiers on equal tracks (KT-1885 review 2)', () => {
  it('a tier row and a palette row put the agent on the left and the tiers on the right', () => {
    for (const selector of ['.kr-agent-switch-tier-row', '.kr-agent-switch-palette-row']) {
      const body = rule(PICKER, selector);
      expect(declaration(body, 'display')).toBe('grid');
      expect(declaration(body, 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
      expect(body).not.toMatch(/min-height/);
    }
  });

  it('the tiers sit on equal tracks, the same in every row, as many as the component says', () => {
    const body = rule(PICKER, '.kr-agent-switch-tier-choices');
    expect(declaration(body, 'display')).toBe('grid');
    expect(declaration(body, 'grid-template-columns'))
      .toBe('repeat(var(--agent-switch-tier-count, 3), minmax(var(--agent-switch-tier-track), max-content))');
    expect(declaration(body, '--agent-switch-tier-track')).toBe('88px');
    // A button fills its track; its icon and name stay on one line.
    expect(declaration(rule(PICKER, '.kr-agent-switch-tier-option'), 'width')).toBe('100%');
    expect(declaration(rule(PICKER, '.kr-agent-switch-tier-label'), 'white-space')).toBe('nowrap');
    // A tier's own state wraps inside its track rather than widening it.
    expect(declaration(rule(PICKER, '.kr-agent-switch-tier-option > .kr-agent-switch-catalog-meta'), 'max-width'))
      .toBe('calc(var(--agent-switch-tier-track) - 2 * var(--kr-space-1) - 2px)');
  });

  it('the agent side never cuts its text: the name, the kind and the badge wrap', () => {
    for (const selector of ['.kr-agent-switch-tier-agent', '.kr-agent-switch-palette-main']) {
      expect(declaration(rule(PICKER, selector), 'flex-wrap')).toBe('wrap');
    }
    for (const selector of ['.kr-agent-switch-tier-name', '.kr-agent-switch-palette-label', '.kr-agent-switch-palette-detail']) {
      const body = rule(PICKER, selector);
      expect(body).not.toMatch(/text-overflow|white-space\s*:\s*nowrap|overflow\s*:\s*hidden/);
      expect(declaration(body, 'overflow-wrap')).toBe('anywhere');
    }
  });

  it('a catalogue state badge is neutral; unavailable keeps its danger colour', () => {
    const catalog = rule(PICKER, ".kr-agent-switch-badge[data-state='catalog']");
    expect(declaration(catalog, 'color')).toBe('var(--kr-text-tertiary)');
    expect(PICKER).toMatch(/\.kr-agent-switch-badge\[data-state='unavailable'\][^{]*\{[^}]*color: var\(--kr-danger\)/);
  });

  it('the popover is 480 px at most, never wider than the window', () => {
    expect(declaration(rule(PICKER, '.kr-agent-switch-popover'), 'max-width'))
      .toBe('min(480px, calc(100vw - 2 * var(--kr-space-2)))');
  });

  it('under 420 px the tiers go under the agent, in equal parts', () => {
    const media = PICKER.match(/@media \(max-width: 419px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(media).toMatch(/\.kr-agent-switch-tier-row,\s*\.kr-agent-switch-palette-row\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/);
    expect(media).toMatch(/\.kr-agent-switch-tier-choices\s*\{\s*grid-template-columns: repeat\(var\(--agent-switch-tier-count, 3\), minmax\(0, 1fr\)\);/);
  });
});

describe('AgentSwitchPicker.css — triggers and popovers (KT-1885 review)', () => {
  it('the compact chip is a 24 px target', () => {
    expect(declaration(rule(PICKER, ".kr-agent-switch[data-compact='true'] > .kr-agent-switch-btn"), 'min-height'))
      .toBe('var(--kr-space-6)');
  });

  it('the exact-model popover is 320 px wide, within the window, and its placeholder is short enough for it', () => {
    expect(declaration(rule(PICKER, ".kr-agent-switch-popover[data-mode='exact-model']"), 'width'))
      .toBe('min(320px, calc(100vw - 2 * var(--kr-space-2)))');
    for (const dictionary of [fr, en, es, zh]) {
      expect((dictionary as Record<string, string>)['agentPicker.searchModel'].length).toBeLessThanOrEqual(32);
    }
  });

  it('a shadow row’s picker is as wide as its text, not the step routing’s full width', () => {
    const rows = read('components/workflows/StepShadowRows.css');
    expect(declaration(rule(rows, '.wf-shadow-rows .kr-agent-switch.wf-shadow-picker'), 'width')).toBe('auto');
    expect(declaration(rule(rows, '.wf-shadow-rows .wf-shadow-picker .kr-agent-switch-btn'), 'width')).toBe('auto');
    // Three classes beat the two of `.wf-step-agent-routing .kr-agent-switch { width: 100% }`.
    expect(declaration(rule(read('pages/WorkflowsPage.css'), '.wf-step-agent-routing .kr-agent-switch'), 'width')).toBe('100%');
  });

  it('the @ menu scrolls inside; its stylesheet cap only holds until the palette measures its room', () => {
    const body = rule(read('pages/DiscussionsPage.css'), '.disc-mention-popover.kr-agent-switch-palette');
    // The real bound is measured (AgentPickerPalette `boundary`, see AgentSwitchPicker.modes.test.tsx).
    expect(declaration(body, 'max-height')).toBe('calc(100vh - 2 * var(--kr-space-8))');
    expect(declaration(body, 'overflow-y')).toBe('auto');
  });
});

describe('AgentSwitchPicker.css — the rules this lot adds stay on the tokens (KT-1885 review)', () => {
  const OWN_RULES: [file: string, selector: string][] = [
    ['components/AgentSwitchPicker.css', ".kr-agent-switch[data-variant='field'] .kr-agent-switch-btn"],
    ['components/AgentSwitchPicker.css', ".kr-agent-switch[data-compact='true'] > .kr-agent-switch-btn"],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-search'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-tier-option'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-tier-label'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-catalog-meta'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-check'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-group'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-group-block'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-model'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-results > .kr-agent-switch-model'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-hint'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-palette'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-palette-row'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-palette-main'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-palette-label'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-palette-detail'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-tier-row'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-tier-agent'],
    ['components/AgentSwitchPicker.css', '.kr-agent-switch-tier-choices'],
    ['components/AgentSwitchPicker.css', ".kr-agent-switch-badge[data-state='catalog']"],
    ['components/aiHelper.css', '.wf-apicall-ai-agent-selector .kr-agent-switch-btn'],
    ['pages/DiscussionsPage.css', '.disc-mention-popover.kr-agent-switch-palette'],
  ];

  it.each(OWN_RULES)('%s %s: text on --kr-type-*, spacing on --kr-space-*', (file, selector) => {
    const body = rule(read(file), selector);
    expect(body).not.toMatch(/--kr-fs-|--kr-sp-/);
    const fontSize = declaration(body, 'font-size');
    if (fontSize) expect(fontSize).toMatch(/^var\(--kr-type-(sm|md|lg|xl|2xl)\)$/);
    for (const [, , value] of body.matchAll(/(?:^|[;\s])((?:padding|margin|gap)[\w-]*)\s*:\s*([^;]+);/g)) {
      expect(value, `${selector}: raw spacing « ${value} »`).not.toMatch(/\b[1-9]\d*px\b/);
    }
  });

  it('the availability badge reads at the 12 px floor', () => {
    expect(declaration(rule(PICKER, '.kr-agent-switch-badge'), 'font-size')).toBe('var(--kr-type-sm)');
  });
});
