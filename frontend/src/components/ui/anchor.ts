// KT-1880 — where a floating layer (Tooltip, Menu) sits next to its anchor.
//
// The layer is rendered into document.body with `position: fixed`, so a list
// with `overflow: hidden` or its own stacking context does not clip it. Its
// place is read from the anchor's box when it opens and again on scroll and
// resize while it stays open.
import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

export type Placement = 'top' | 'bottom';
export type Align = 'center' | 'start' | 'end';

/** Gap between the anchor and the layer, in px (= --kr-space-1). */
export const ANCHOR_GAP = 4;

export interface AnchorBox { top: number; bottom: number; left: number; right: number }

/** Fixed-position style of a layer next to `box`. A layer asked on top flips
 *  below when the anchor is closer than `room` px to the top of the window. */
export function anchoredStyle(box: AnchorBox, placement: Placement, align: Align, room = 40): CSSProperties {
  const side: Placement = placement === 'top' && box.top < room ? 'bottom' : placement;
  const style: CSSProperties = { position: 'fixed' };
  if (side === 'top') {
    style.top = box.top - ANCHOR_GAP;
  } else {
    style.top = box.bottom + ANCHOR_GAP;
  }
  const shiftY = side === 'top' ? '-100%' : '0';
  if (align === 'center') {
    style.left = (box.left + box.right) / 2;
    style.transform = `translate(-50%, ${shiftY})`;
  } else if (align === 'start') {
    style.left = box.left;
    style.transform = `translateY(${shiftY})`;
  } else {
    style.left = box.right;
    style.transform = `translate(-100%, ${shiftY})`;
  }
  return style;
}

/** The style of a layer anchored to `anchorRef`, kept in place while `open`. */
export function useAnchoredStyle(
  anchorRef: RefObject<HTMLElement | null>, open: boolean, placement: Placement, align: Align,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed' });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef.current;
      if (el) setStyle(anchoredStyle(el.getBoundingClientRect(), placement, align));
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorRef, open, placement, align]);
  return style;
}
