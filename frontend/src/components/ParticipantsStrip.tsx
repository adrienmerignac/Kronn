import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  /** The accessible name of the « +N » counter, given the number of participants. */
  moreLabel: (total: number) => string;
  /** The name of the full list. */
  allLabel: string;
  /** Shown when there is no participant. */
  empty?: ReactNode;
}

/** How many chips end past the visible right edge of `list`, and whether it
 *  scrolls further right (the fade). */
export function measureStripOverflow(list: HTMLElement): { hidden: number; fadeEnd: boolean } {
  const edge = list.scrollLeft + list.clientWidth;
  const chips = Array.from(list.children) as HTMLElement[];
  const hidden = chips.filter(chip => chip.offsetLeft + chip.offsetWidth > edge + 1).length;
  return { hidden, fadeEnd: list.scrollWidth - edge > 1 };
}

/**
 * KT-1936 — the participants on ONE line that scrolls sideways (owner
 * decision 2026-11-20, option A): the right edge fades while chips are past
 * it, and a « +N » counter (the chips not in view) opens the full list. The
 * strip never wraps and is never replaced by a summary button; the same fade
 * applies on a wide screen when the chips do not all fit.
 */
export function ParticipantsStrip({ entries, moreLabel, allLabel, empty }: ParticipantsStripProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ hidden: 0, fadeEnd: false });
  const [open, setOpen] = useState(false);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const next = measureStripOverflow(list);
    setOverflow(current => (current.hidden === next.hidden && current.fadeEnd === next.fadeEnd ? current : next));
  }, []);

  useLayoutEffect(measure, [measure, entries]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="kr-participants-strip" data-fade-end={overflow.fadeEnd || undefined}>
      <div ref={listRef} className="disc-participants-list kr-participants-strip-list" onScroll={measure}>
        {entries.length === 0 ? empty : entries.map(entry => (
          <span key={entry.key} className="kr-participants-strip-item">{entry.chip}</span>
        ))}
      </div>
      {overflow.hidden > 0 && (
        <button
          type="button"
          className="kr-participants-strip-more"
          data-testid="participants-more"
          aria-label={moreLabel(entries.length)}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(value => !value)}
        >
          +{overflow.hidden}
        </button>
      )}
      {open && (
        <div className="kr-participants-strip-all" role="dialog" aria-label={allLabel} data-testid="participants-all">
          <ul>
            {entries.map(entry => (
              <li key={entry.key}>
                <button type="button" onClick={() => { setOpen(false); entry.onSelect(); }}>{entry.row}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
