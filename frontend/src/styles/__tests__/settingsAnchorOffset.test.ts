import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/pages/SettingsPage.css'), 'utf8');

/** The declarations of the rules for `selector`, in order (inside media queries too). */
const ruleBodies = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]+)\\}`, 'g'))].map(match => match[1]);
};

/**
 * KT-1923 — an anchor of Settings (`/config/system#settings-debug-logs`,
 * `#settings-languages`, an agent's row) once landed under the fixed top bar,
 * its heading covered while it held the focus. One rule gives every element
 * with an id inside Settings the offset of the top bar.
 */
describe('Settings anchor offset', () => {
  it('gives every element with an id inside Settings the offset of the top bar', () => {
    const [rule] = ruleBodies('.settings-page [id]');
    expect(rule).toBeDefined();
    expect(rule).toContain('scroll-margin-top: var(--set-anchor-offset)');
  });

  it('sets the offset on the page, taller when the list sits above the content', () => {
    const offsets = ruleBodies('.settings-page')
      .map(body => body.match(/--set-anchor-offset:\s*([^;]+);/)?.[1].trim())
      .filter(Boolean);
    expect(offsets).toEqual(['84px', '112px']);
    const narrow = css.indexOf('@media (max-width: 980px)');
    expect(css.lastIndexOf('--set-anchor-offset: 112px')).toBeGreaterThan(narrow);
  });

  it('leaves no card its own scroll margin that could drift from the shared one', () => {
    const own = [...css.matchAll(/scroll-margin-top:\s*([^;]+);/g)].map(match => match[1].trim());
    expect(own).toEqual(['var(--set-anchor-offset)']);
  });
});
