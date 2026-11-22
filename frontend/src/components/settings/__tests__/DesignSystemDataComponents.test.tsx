// KT-1886 — the gallery entries of the dense-data components: each one shows
// its normal form and its narrow form side by side, the narrow one in a
// narrow container (not a narrow window), with sample data; the demos work
// and pass axe.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act } from 'react';
import { DesignSystemPage } from '../../../pages/DesignSystemPage';
import { describeViolations, runAxe } from '../../../test/axe';
import { dictionaries } from '../../../lib/i18n/testing';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const t = (key: string) => key;
const ENTRIES = ['CopyButton', 'Table', 'KeyValueList', 'StatTile', 'ProgressBar'] as const;

afterEach(cleanup);

const section = (name: string) => screen.getByRole('region', { name });

describe('DesignSystemPage — dense-data components (KT-1886)', () => {
  it('shows each one in a wide and a narrow container, side by side', () => {
    render(<DesignSystemPage t={t} tab="components" />);
    for (const name of ENTRIES) {
      const pairs = [...section(name).querySelectorAll('.ds-demo-pair')];
      expect(pairs.length, name).toBeGreaterThan(0);
      for (const pair of pairs) {
        const forms = [...pair.querySelectorAll(':scope > .ds-demo-container')].map(c => c.getAttribute('data-form'));
        expect(forms, name).toEqual(['wide', 'narrow']);
        expect(within(pair as HTMLElement).getByText('designSystem.demo.data.narrow')).toBeInTheDocument();
      }
    }
  });

  it('makes the narrow container 20rem wide whatever the window, and the wide one at least 40rem', () => {
    const css = readFileSync(join(SRC, 'components', 'settings', 'DesignSystemSection.css'), 'utf8');
    expect(css).toMatch(/\.ds-demo-container\[data-form="narrow"\]\s*\{[^}]*max-width:\s*20rem/);
    expect(css).toMatch(/\.ds-demo-container\[data-form="wide"\]\s*\{[^}]*flex:\s*999 1 40rem/);
    // No padding on the container: it would take the wide Table under 40rem.
    expect(css.match(/\.ds-demo-container\s*\{([^}]*)\}/)?.[1] ?? '').not.toMatch(/padding/);
  });

  it('labels every caption and demo string in the four locales', () => {
    const keys = [
      'ui.copy.copied', 'ui.copy.failed', 'ui.table.selectAll', 'ui.table.selectRow', 'ui.table.actions',
      'ui.table.empty', 'ui.keyValue.missing', 'ui.keyValue.copy', 'ui.stat.unknown', 'ui.stat.up', 'ui.stat.down',
      'ui.stat.flat', 'designSystem.demo.data.statusFailed', 'designSystem.demo.data.statusDone',
      'designSystem.demo.data.statusRunning', 'designSystem.demo.data.statusCancelled',
      ...['copyButton', 'table', 'keyValueList', 'statTile', 'progressBar'].map(id => `designSystem.caption.${id}`),
    ];
    for (const [locale, dict] of Object.entries(dictionaries)) {
      expect(keys.filter(key => !(key in dict) || !dict[key].trim()), locale).toEqual([]);
    }
  });

  it('shows the CopyButton in its two forms and its failure', async () => {
    render(<DesignSystemPage t={t} tab="components" />);
    const copy = section('CopyButton');
    expect(within(copy).getAllByRole('button', { name: 'designSystem.demo.data.copyId' }).map(b => b.getAttribute('data-size')))
      .toEqual(['sm', 'md', 'lg']);
    expect(within(copy).getAllByRole('button', { name: 'designSystem.demo.data.copyCommand' }).some(b => b.classList.contains('ui-button'))).toBe(true);
    const broken = within(copy).getAllByRole('button', { name: 'designSystem.demo.data.copyBroken' })[0];
    await act(async () => { broken.click(); });
    expect(broken).toHaveAttribute('data-state', 'failed');
    expect(within(broken.closest('.ui-copy-button-wrap') as HTMLElement).getByRole('status')).toHaveTextContent('ui.copy.failed');
  });

  it('shows a Table that sorts, selects and opens a row, its cards form, the scroll form, empty and loading', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage t={t} tab="components" />);
    const table = section('Table');
    const tables = [...table.querySelectorAll('.ui-table')];
    expect(tables.map(tb => tb.getAttribute('data-narrow'))).toEqual(['cards', 'cards', 'scroll', 'scroll', 'scroll']);
    // The wide one is a bounded region named by its caption.
    expect(within(table).getByRole('region', { name: 'designSystem.demo.data.runsCaption' })).toHaveAttribute('data-max-height', 'md');

    const [wide] = within(table).getAllByRole('table');
    const tokens = within(wide).getByRole('columnheader', { name: 'designSystem.demo.data.colTokens' });
    expect(tokens).toHaveAttribute('aria-sort', 'descending');
    await user.click(within(tokens).getByRole('button'));
    expect(tokens).toHaveAttribute('aria-sort', 'ascending');

    const openButton = within(wide).getByRole('button', { name: 'designSystem.demo.data.run3' });
    openButton.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('ds-table-opened')).toHaveTextContent('designSystem.demo.data.opened');

    const all = within(wide).getByRole('checkbox', { name: 'ui.table.selectAll' });
    expect(all).toBePartiallyChecked();
    await user.click(all);
    expect(all).toBeChecked();

    expect(within(table).getAllByText('designSystem.demo.data.emptyTitle')).toHaveLength(1);
    expect(within(table).getByRole('status')).toHaveTextContent('designSystem.demo.data.loadingRuns');
  });

  it('shows KeyValueList in its two layouts, with a missing and a copyable value', () => {
    render(<DesignSystemPage t={t} tab="components" />);
    const kv = section('KeyValueList');
    const lists = [...kv.querySelectorAll('dl')];
    expect(lists.map(dl => dl.getAttribute('data-layout'))).toEqual(['grid', 'grid', 'inline', 'inline']);
    expect(kv.querySelectorAll('dd[data-missing="true"]')).toHaveLength(4);
    expect(within(kv).getAllByRole('button', { name: 'ui.keyValue.copy' })).toHaveLength(4);
  });

  it('shows StatTiles known, unknown, loading, with a delta, and one that toggles', async () => {
    const user = userEvent.setup();
    render(<DesignSystemPage t={t} tab="components" />);
    const stats = section('StatTile');
    expect(within(stats).getAllByRole('group', { name: 'designSystem.demo.data.statWeek' })).toHaveLength(2);
    expect(stats.querySelector('.ui-stat-value[data-unknown="true"]')).toBeTruthy();
    expect(stats.querySelector('.ui-stat-tile[aria-busy="true"]')).toBeTruthy();
    expect(stats.querySelector('.ui-stat-tile[data-size="lg"]')).toBeTruthy();
    const [toggle] = within(stats).getAllByRole('button');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(within(stats).getAllByRole('button').map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
  });

  it('shows ProgressBar determinate, indeterminate, stacked with its legend, and its five tones', () => {
    render(<DesignSystemPage t={t} tab="components" />);
    const progress = section('ProgressBar');
    const bars = within(progress).getAllByRole('progressbar');
    expect(bars.some(b => b.hasAttribute('aria-valuenow'))).toBe(true);
    expect(bars.some(b => !b.hasAttribute('aria-valuenow'))).toBe(true);
    expect(within(progress).getAllByRole('img').length).toBeGreaterThanOrEqual(2);
    expect(progress.querySelectorAll('.ui-progress-legend')).toHaveLength(2);
    expect(new Set([...progress.querySelectorAll('.ui-progress[data-tone]')].map(p => p.getAttribute('data-tone'))))
      .toEqual(new Set(['accent', 'success', 'warning', 'danger', 'info']));
  });

  it('passes axe on the five entries', async () => {
    render(<main><DesignSystemPage t={t} tab="components" /></main>);
    for (const name of ENTRIES) {
      const results = await act(() => runAxe(section(name)));
      expect(describeViolations(results), name).toEqual([]);
    }
  });
});
