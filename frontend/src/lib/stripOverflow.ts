// KT-1936 — the participants strip's overflow, measured on its list.

/** How many children of `list` end past its visible right edge, and whether
 *  it scrolls further right (the fade of ParticipantsStrip). */
export function measureStripOverflow(list: HTMLElement): { hidden: number; fadeEnd: boolean } {
  const edge = list.scrollLeft + list.clientWidth;
  const chips = Array.from(list.children) as HTMLElement[];
  const hidden = chips.filter(chip => chip.offsetLeft + chip.offsetWidth > edge + 1).length;
  return { hidden, fadeEnd: list.scrollWidth - edge > 1 };
}
