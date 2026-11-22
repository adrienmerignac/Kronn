import { SETTINGS_SECTIONS, settingsSectionsOf, type SettingsSectionDef, type SettingsSubPage } from './routes';

/** The sections of a sub-page the reader can open, given what this Kronn has. */
export function visibleSettingsSections(page: SettingsSubPage, hasConfiguredApi: boolean): SettingsSectionDef[] {
  return settingsSectionsOf(page).filter(section => !section.requiresConfiguredApi || hasConfiguredApi);
}

/** One hit of the Settings search: a section, or one of its settings. */
export interface SettingsSearchHit {
  section: SettingsSectionDef;
  /** What matched, in the current locale: the section's name or a setting's label. */
  label: string;
  /** Where the hit leads: the section, or the fold that holds the setting. */
  anchor: string;
  kind: 'section' | 'field';
}

export interface SettingsSearchOptions {
  /** The API call log section exists (an API plugin has a config). */
  hasConfiguredApi?: boolean;
}

/** Lower case, accents and repeated spaces dropped, so « Thème » matches "theme". */
export function normalizeSettingsText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * KT-1923 — the sections and the settings whose name holds every word of the
 * query, in the current locale (`t`), in the order of the pages. A setting
 * named twice in one section is one hit.
 */
export function searchSettings(
  query: string,
  t: (key: string) => string,
  { hasConfiguredApi = false }: SettingsSearchOptions = {},
): SettingsSearchHit[] {
  const words = normalizeSettingsText(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const matches = (label: string) => {
    const text = normalizeSettingsText(label);
    return words.every(word => text.includes(word));
  };
  const hits: SettingsSearchHit[] = [];
  for (const section of SETTINGS_SECTIONS) {
    if (section.requiresConfiguredApi && !hasConfiguredApi) continue;
    const title = t(section.title);
    const seen = new Set<string>([normalizeSettingsText(title)]);
    if (matches(title)) hits.push({ section, label: title, anchor: section.id, kind: 'section' });
    const fields: { key: string; anchor: string }[] = [
      ...section.fields.map(key => ({ key, anchor: section.id })),
      ...(section.folds ?? []).flatMap(fold => fold.fields.map(key => ({ key, anchor: fold.id }))),
    ];
    for (const { key, anchor } of fields) {
      const label = t(key);
      const normalized = normalizeSettingsText(label);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      if (matches(label)) hits.push({ section, label, anchor, kind: 'field' });
    }
  }
  return hits;
}
