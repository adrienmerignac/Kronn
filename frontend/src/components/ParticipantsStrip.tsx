import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { measureStripOverflow } from '../lib/stripOverflow';
import { useAnchoredStyle } from './ui/anchor';
import './ParticipantsStrip.css';

export interface ParticipantsStripEntry {
  key: string | number;
  /** The chip in the strip: a button that opens the participant's details. */
  chip: ReactNode;
  /** Its row in the full list the « +N » counter opens. */
  row: ReactNode;
  onSelect: () => void;
}

export interface ParticipantsStripProps {
  entries: readonly ParticipantsStripEntry[];
  /** The accessible name of the « +N » counter, given the number of
   *  participants: a plural form (`tp`), right for one and for several. */
  moreLabel: (total: number) => string;
  /** The name of the full list. */
  allLabel: string;
  /** Shown when there is no participant. */
  empty?: ReactNode;
}

/**
 * KT-1936 — the participants on ONE line that scrolls sideways (owner
 * decision 2026-11-20, option A): the right edge fades while chips are past
 * it, and a « +N » counter (the chips not in view) opens the full list. The
 * strip never wraps and is never replaced by a summary button; the same fade
 * applies on a wide screen when the chips do not all fit.
 *
 * The full list is a floating layer (portal and `useAnchoredStyle`, as Menu):
 * a header that clips its overflow cannot cut it, and it stays inside the
 * window. Focus moves into it on open; Escape closes it and gives focus back
 * to the counter; a press outside closes it.
 */
export function ParticipantsStrip({ entries, moreLabel, allLabel, empty }: ParticipantsStripProps) {
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ hidden: 0, fadeEnd: false });
  const [open, setOpen] = useState(false);
  const { style, placed } = useAnchoredStyle(moreRef, layerRef, open, 'bottom', 'end');

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const next = measureStripOverflow(list);
    setOverflow(current => (current.hidden === next.hidden && current.fadeEnd === next.fadeEnd ? current : next));
    // Every chip in view again (a wider window): the counter goes, its list too.
    if (next.hidden === 0) setOpen(false);
  }, []);

  useLayoutEffect(measure, [measure, entries]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) moreRef.current?.focus();
  }, []);

  // Into the list once it is placed: before, it is hidden to be measured and
  // a browser refuses focus on a hidden element.
  useLayoutEffect(() => {
    if (!open || !placed) return;
    layerRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [open, placed]);

  // A press outside the counter and the list closes it; focus stays where it lands.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (layerRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const showMore = overflow.hidden > 0;

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(layerRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    if (!buttons.length) return;
    event.preventDefault();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown'
      ? (at + 1) % buttons.length
      : (at - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  return (
    <div className="kr-participants-strip" data-fade-end={overflow.fadeEnd || undefined}>
      <div ref={listRef} className="disc-participants-list kr-participants-strip-list" onScroll={measure}>
        {entries.length === 0 ? empty : entries.map(entry => (
          <span key={entry.key} className="kr-participants-strip-item">{entry.chip}</span>
        ))}
      </div>
      {showMore && (
        <button
          ref={moreRef}
          type="button"
          className="kr-participants-strip-more"
          data-testid="participants-more"
          aria-label={moreLabel(entries.length)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? close(false) : setOpen(true))}
        >
          +{overflow.hidden}
        </button>
      )}
      {open && createPortal(
        <div
          ref={layerRef}
          id={listId}
          className="kr-participants-strip-all"
          role="dialog"
          aria-label={allLabel}
          data-testid="participants-all"
          style={style}
          onKeyDown={onListKeyDown}
        >
          <ul>
            {entries.map(entry => (
              <li key={entry.key}>
                <button type="button" onClick={() => { close(false); entry.onSelect(); }}>{entry.row}</button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
