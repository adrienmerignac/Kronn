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
    expect(declaration(body, 'min-height')).toBe('var(--kr-space-6)');
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

describe('AgentSwitchPicker.css — triggers and popovers (KT-1885 review)', () => {
  it('the compact chip is a 24 px target', () => {
    expect(declaration(rule(PICKER, ".kr-agent-switch[data-compact='true'] > .kr-agent-switch-btn"), 'min-height'))
      .toBe('var(--kr-space-6)');
  });

  it('the exact-model popover is 320 px wide, within the window, and its placeholder is short enough for it', () => {
    expect(declaration(rule(PICKER, ".kr-agent-switch-popover[data-mode='exact-model']"), 'width'))
      .toBe('min(320px, calc(100vw - 2 * var(--kr-space-2)))');
    expect(declaration(rule(PICKER, '.kr-agent-switch-popover'), 'max-width')).toBe('calc(100vw - 16px)');
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

  it('the @ menu is bounded by the window only, as tall as the menu it replaced', () => {
    const body = rule(read('pages/DiscussionsPage.css'), '.disc-mention-popover.kr-agent-switch-palette');
    // 900 px high: 900 - 2 × 48 = 804 px, more than the 544 px the eleven rows took before.
    expect(declaration(body, 'max-height')).toBe('calc(100vh - 2 * var(--kr-space-8))');
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
