import type { ReactNode } from 'react';
import { AppLink } from '../AppLink';
import { DetailHeader } from '../ui/DetailHeader';
import { SectionHeader } from '../ui/SectionHeader';
import { useT } from '../../lib/I18nContext';
import { settingsSectionPath, type SettingsSectionDef, type SettingsSubPage } from '../../lib/routes';
import { SettingsFold } from './SettingsFold';
import './SettingsNav.css';

interface SettingsListedSectionProps {
  /** Its anchor (`settings-…`), on the card. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Folded until opened (the catalogue, the usage, the API call log). */
  folded?: boolean;
  testId?: string;
  children: ReactNode;
}

/**
 * KT-1923 — a section of Settings that used to sit inside another one (the
 * local models, the media sources, the catalogue and the usage were parts of
 * Agents) or that is folded: a card with its own anchor and a section header.
 */
export function SettingsListedSection({ id, title, description, folded = false, testId, children }: SettingsListedSectionProps) {
  if (folded) {
    return (
      <div id={id} className="set-card set-listed-section" data-testid={testId}>
        <div className="set-section">
          <SettingsFold id={id} title={title} description={description}>{children}</SettingsFold>
        </div>
      </div>
    );
  }
  const titleId = `${id}-title`;
  return (
    <section id={id} className="set-card set-listed-section" aria-labelledby={titleId} data-testid={testId}>
      <div className="set-section">
        <SectionHeader titleId={titleId} title={title} description={description} />
        {children}
      </div>
    </section>
  );
}

interface SettingsSubPageHeadProps {
  page: SettingsSubPage;
  sections: readonly SettingsSectionDef[];
  /** A plain click on one of the section links. */
  onSection: (anchor: string) => void;
}

/** KT-1923 — the head of a sub-page of Settings: its name, its sentence, then
 *  a row of links to its sections. */
export function SettingsSubPageHead({ page, sections, onSection }: SettingsSubPageHeadProps) {
  const { t } = useT();
  return (
    <div className="set-subpage-head">
      <DetailHeader
        titleId={`settings-subpage-${page}-title`}
        title={t(`settings.pages.${page}.title`)}
        description={t(`settings.pages.${page}.hint`)}
      />
      <nav aria-label={t('settings.subPage.sections', t(`settings.pages.${page}.title`))}>
        <ul className="set-subpage-links">
          {sections.map(section => (
            <li key={section.id}>
              <AppLink to={settingsSectionPath(section.id)} onNavigate={() => onSection(section.id)}>
                {t(section.title)}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
