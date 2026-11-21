// KT-1880 — where a Tooltip or a Menu sits next to its anchor.
import { describe, expect, it } from 'vitest';
import { ANCHOR_GAP, anchoredStyle } from './anchor';

const box = { top: 100, bottom: 130, left: 200, right: 240 };

describe('anchoredStyle', () => {
  it('puts a top layer above the anchor, centred', () => {
    expect(anchoredStyle(box, 'top', 'center')).toEqual({
      position: 'fixed', top: 100 - ANCHOR_GAP, left: 220, transform: 'translate(-50%, -100%)',
    });
  });

  it('puts a bottom layer below, lined up with the start or the end edge', () => {
    expect(anchoredStyle(box, 'bottom', 'start')).toEqual({
      position: 'fixed', top: 130 + ANCHOR_GAP, left: 200, transform: 'translateY(0)',
    });
    expect(anchoredStyle(box, 'bottom', 'end')).toEqual({
      position: 'fixed', top: 130 + ANCHOR_GAP, left: 240, transform: 'translate(-100%, 0)',
    });
  });

  it('flips a top layer below an anchor at the top of the window', () => {
    const high = { top: 8, bottom: 38, left: 0, right: 40 };
    expect(anchoredStyle(high, 'top', 'center')).toMatchObject({ top: 38 + ANCHOR_GAP, transform: 'translate(-50%, 0)' });
  });
});
