// KT-1936 — the participants strip on a narrow screen (owner decision
// 2026-11-20, option A): one line that scrolls sideways, the right edge faded
// while chips are past it, a « +N » counter that opens the full list. jsdom
// has no layout: the chips' boxes are stubbed (80px each in a 200px strip).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { ParticipantsStrip, measureStripOverflow } from '../ParticipantsStrip';

const CHIP = 80;
const STRIP = 200;
const restore: Array<() => void> = [];

function stub(prop: 'offsetLeft' | 'offsetWidth' | 'clientWidth' | 'scrollWidth', get: (el: HTMLElement) => number) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
  Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get() { return get(this as HTMLElement); } });
  restore.push(() => { if (original) Object.defineProperty(HTMLElement.prototype, prop, original); });
}

const indexOf = (el: HTMLElement) => Array.from(el.parentElement?.children ?? []).indexOf(el);
const isList = (el: HTMLElement) => el.classList.contains('kr-participants-strip-list');

beforeEach(() => {
  stub('offsetLeft', el => (isList(el) ? 0 : indexOf(el) * CHIP));
  stub('offsetWidth', el => (isList(el) ? STRIP : CHIP));
  stub('clientWidth', el => (isList(el) ? STRIP : CHIP));
  stub('scrollWidth', el => (isList(el) ? el.children.length * CHIP : CHIP));
});
afterEach(() => { while (restore.length) restore.pop()!(); });

const entries = (n: number, onSelect = vi.fn()) => Array.from({ length: n }, (_, i) => ({
  key: i,
  chip: <button type="button" className="disc-participant-chip">{`agent-${i}`}</button>,
  row: <span>{`row-${i}`}</span>,
  onSelect: () => onSelect(i),
}));

describe('ParticipantsStrip', () => {
  it('counts the chips past the right edge and fades it', () => {
    render(<ParticipantsStrip entries={entries(5)} moreLabel={n => `all ${n}`} allLabel="All participants" />);
    // 200px shows chips 0 and 1 whole; 2 (160–240), 3 and 4 end past the edge.
    expect(screen.getByTestId('participants-more')).toHaveTextContent('+3');
    expect(screen.getByRole('button', { name: 'all 5' })).toBeInTheDocument();
    expect(document.querySelector('.kr-participants-strip')).toHaveAttribute('data-fade-end', 'true');
  });

  it('shows no counter and no fade when every chip fits', () => {
    render(<ParticipantsStrip entries={entries(2)} moreLabel={n => `all ${n}`} allLabel="All" />);
    expect(screen.queryByTestId('participants-more')).toBeNull();
    expect(document.querySelector('.kr-participants-strip')).not.toHaveAttribute('data-fade-end');
  });

  it('opens the full list of participants from the counter; a row opens that participant', async () => {
    const onSelect = vi.fn();
    render(<ParticipantsStrip entries={entries(4, onSelect)} moreLabel={n => `all ${n}`} allLabel="All participants" />);
    await act(async () => { fireEvent.click(screen.getByTestId('participants-more')); });
    const list = screen.getByRole('dialog', { name: 'All participants' });
    expect(list.querySelectorAll('li')).toHaveLength(4);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'row-3' })); });
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('measures what scrolled into view', () => {
    const list = document.createElement('div');
    list.className = 'kr-participants-strip-list';
    for (let i = 0; i < 4; i++) list.appendChild(document.createElement('span'));
    Object.defineProperty(list, 'scrollLeft', { value: 2 * CHIP });
    expect(measureStripOverflow(list)).toEqual({ hidden: 0, fadeEnd: false });
  });

  it('never wraps: one line that scrolls sideways', () => {
    const css = readFileSync('src/styles/components.css', 'utf8');
    const list = css.match(/\.disc-participants-list\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(list).toContain('flex-wrap: nowrap');
    expect(list).toContain('overflow-x: auto');
    const strip = readFileSync('src/components/ParticipantsStrip.css', 'utf8');
    expect(strip).toMatch(/\[data-fade-end\] \.kr-participants-strip-list \{\s*mask-image: linear-gradient\(to right/);
  });
});
