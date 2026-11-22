/**
 * KT-1923 — Settings in five sub-pages, with a search.
 *
 * The inventory: per sub-page, the sections drawn and, per section, the
 * buttons, fields and links it holds, against the single page of the base
 * commit (df1ddcc0c). The base numbers were counted on that commit with this
 * same fixture (`settingsApiMock`, `settingsProps`); a nested section of
 * Agents was counted on the element that held it there. A fold adds its one
 * button; nothing else may move.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { dictionaries } from '../../lib/i18n/testing';
import { SETTINGS_SECTIONS, settingsSectionsOf, type SettingsSubPage } from '../../lib/routes';
import { normalizeSettingsText } from '../../lib/settingsSearch';
import { countControls, renderSettings, settingsProps, type ControlCount } from './settingsTestKit';

vi.mock('../../hooks/useWebSocket', () => ({ useWebSocket: vi.fn(() => ({ connected: false, connectionState: 'connecting' })) }));
vi.mock('../../lib/api', async () => (await import('./settingsApiMock')).settingsApiMock());

import { SettingsPage } from '../SettingsPage';

const fr = dictionaries.fr as Record<string, string>;

/** [buttons, fields, links] per section on the single page of the base commit. */
const BASE: Record<string, readonly [number, number, number]> = {
  'settings-identity': [7, 6, 1],
  'settings-appearance': [16, 0, 1],
  'settings-voice': [12, 0, 0],
  'settings-user-context': [1, 1, 0],
  'settings-agent-config': [18, 12, 8],
  'settings-local-models': [5, 7, 2],
  'settings-media': [4, 12, 1],
  'settings-compression': [3, 0, 1],
  'settings-catalogue': [1, 1, 0],
  'settings-usage': [5, 0, 1],
  'settings-capabilities': [13, 0, 0],
  'settings-scan': [6, 4, 0],
  'settings-workers': [2, 18, 0],
  'settings-worktrees': [3, 0, 0],
  'settings-sourcing': [3, 0, 0],
  'settings-continual-learning': [1, 0, 0],
  'settings-artifacts': [1, 1, 0],
  'settings-recovery': [1, 2, 1],
  'settings-authenticator': [2, 1, 0],
  'settings-trust': [3, 0, 1],
  'settings-server': [3, 2, 0],
  credentials: [1, 1, 0],
  'settings-database': [4, 2, 1],
  'settings-disk': [1, 0, 0],
  'settings-api-audit': [11, 2, 0],
  'settings-debug': [8, 3, 1],
  'settings-general': [2, 0, 0],
};
/** The base page held 137 buttons, 75 fields and 19 links in its content, all in one of these sections. */
const BASE_TOTAL: ControlCount = { buttons: 137, fields: 75, links: 19 };

/** The folds KT-1923 adds: one button each, in the section that holds it. */
const FOLD_BUTTONS: Record<string, number> = {
  'settings-catalogue': 1, 'settings-usage': 1, 'settings-api-audit': 1, 'settings-debug': 1,
};

/** The sections of each sub-page, as the owner validated the grouping on 2026-11-21. */
const GROUPING: Record<SettingsSubPage, readonly string[]> = {
  you: ['settings-identity', 'settings-appearance', 'settings-voice', 'settings-user-context'],
  agents: [
    'settings-agent-config', 'settings-local-models', 'settings-media', 'settings-compression', 'settings-catalogue',
    'settings-usage', 'settings-capabilities',
  ],
  work: ['settings-scan', 'settings-workers', 'settings-worktrees', 'settings-sourcing', 'settings-continual-learning', 'settings-artifacts'],
  security: ['settings-recovery', 'settings-authenticator', 'settings-trust', 'settings-server', 'credentials'],
  system: ['settings-database', 'settings-disk', 'settings-api-audit', 'settings-debug', 'settings-general'],
};

/**
 * The labels of the settings of the base page (the accessible names of its
 * fields, and the names of its choice groups), in French, by the section that
 * held them. Each must be found by the search, on its section.
 */
const FORMER_LABELS: readonly (readonly [string, string])[] = [
  ['settings-identity', 'Pseudo'],
  ['settings-identity', 'Email (Gravatar)'],
  ['settings-identity', 'Bio'],
  ['settings-identity', 'Adresse publique du proxy'],
  ['settings-identity', "Autres adresses de l'interface de ce Kronn"],
  ['settings-appearance', 'Thème'],
  ['settings-appearance', "Mode d'affichage"],
  ['settings-appearance', "Langue de l'interface"],
  ['settings-appearance', 'Langue de sortie'],
  ['settings-voice', 'Speech-to-Text (Whisper)'],
  ['settings-voice', 'Text-to-Speech (Piper)'],
  ['settings-user-context', 'Nom du nouveau fichier de contexte'],
  ['settings-agent-config', 'Agents locaux simultanés max'],
  ['settings-agent-config', "Durée maximale d'une exécution agent"],
  ['settings-agent-config', 'Durée maximale des agents locaux (Ollama)'],
  ['settings-agent-config', "Timeout d'inactivité agent"],
  ['settings-agent-config', 'Runs simultanés'],
  ['settings-local-models', 'Runs simultanés'],
  ['settings-media', 'Adresse du serveur'],
  ['settings-media', 'Dossier d’installation'],
  ['settings-media', 'Guidage (CFG)'],
  ['settings-media', 'Sampler'],
  ['settings-media', 'Scheduler'],
  ['settings-catalogue', 'Rechercher un modèle…'],
  ['settings-capabilities', 'Skills'],
  ['settings-capabilities', 'Profils agent'],
  ['settings-capabilities', 'Directives'],
  ['settings-scan', 'Profondeur de scan'],
  ['settings-scan', 'Dossiers à scanner'],
  ['settings-scan', 'Dossier par défaut de la documentation IA'],
  ['settings-scan', 'Patterns à ignorer'],
  ['settings-workers', 'Nombre maximal de tours de revue par défaut'],
  ['settings-workers', "Lancer les workers en priorité d'arrière-plan"],
  ['settings-workers', 'Maximum de workers de tâche locaux simultanés'],
  ['settings-workers', "Seuil de sortie lourde d'un workflow (Ko)"],
  ['settings-workers', 'Par défaut, par commande (min)'],
  ['settings-workers', 'Maximum par commande (min)'],
  ['settings-workers', 'Fichiers parasites du système'],
  ['settings-workers', 'Dossiers de worktrees gérés'],
  ['settings-workers', 'Aligner le build de base'],
  ['settings-workers', 'Environnement du compilateur C'],
  ['settings-workers', 'Commande du premier build'],
  ['settings-workers', 'Durée maximale du premier build (minutes)'],
  ['settings-artifacts', 'Origine du site'],
  ['settings-authenticator', 'Secret admin de Kronn'],
  ['settings-server', 'Domaine personnalisé'],
  ['settings-server', 'Fuseau horaire'],
  ['credentials', 'Secret admin ou identifiant humain'],
  ['settings-database', 'Conservation des valeurs d’exécution'],
  ['settings-database', 'Sorties des étapes des runs terminés'],
  ['settings-api-audit', 'Plugin'],
  ['settings-api-audit', 'Auto-refresh'],
  ['settings-debug', 'Seuil orange (Mio)'],
  ['settings-debug', 'Seuil rouge (Mio)'],
  ['settings-debug', 'Logs backend (temps réel)'],
  ['settings-general', 'Relancer le tour guidé'],
];

const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const visibleSubPage = () => document.querySelector<HTMLElement>('.set-subpage:not([hidden])')!;

/** Opens every fold of the visible sub-page, so its content is counted. */
async function openFolds() {
  const closed = [...visibleSubPage().querySelectorAll<HTMLButtonElement>('[data-testid^="fold-"][aria-expanded="false"]')];
  for (const button of closed) fireEvent.click(button);
  await settle();
  await settle();
}

/** Everything a reader can read in a region: its text and the names of its controls. */
function readable(region: Element): string {
  const names = [...region.querySelectorAll('[aria-label], [title], [placeholder]')]
    .flatMap(el => ['aria-label', 'title', 'placeholder'].map(name => el.getAttribute(name) ?? ''));
  return normalizeSettingsText([region.textContent ?? '', ...names].join(' '));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Settings sub-pages — the inventory against the single page of the base commit', () => {
  it('puts every section of the base page on exactly one sub-page', () => {
    expect(Object.values(GROUPING).flat().sort()).toEqual(Object.keys(BASE).sort());
    const sum = Object.values(BASE).reduce((acc, [b, f, l]) => ({ buttons: acc.buttons + b, fields: acc.fields + f, links: acc.links + l }), { buttons: 0, fields: 0, links: 0 });
    expect(sum).toEqual(BASE_TOTAL);
  });

  it.each(Object.entries(GROUPING) as [SettingsSubPage, readonly string[]][])(
    'draws the %s sub-page with its sections and every control they held',
    async (page, expected) => {
      await renderSettings(<SettingsPage {...settingsProps} subPage={page} />);
      await openFolds();
      const content = visibleSubPage();
      expect(content).toHaveAttribute('data-subpage', page);

      const drawn = [...content.children].map(child => child.id).filter(Boolean);
      expect(drawn).toEqual(expected);
      expect(settingsSectionsOf(page).map(section => section.id)).toEqual(expected);

      const sections = expected.map(id => document.getElementById(id)!);
      for (const [index, id] of expected.entries()) {
        const [buttons, fields, links] = BASE[id];
        expect({ id, ...countControls(sections[index]) }).toEqual({
          id, buttons: buttons + (FOLD_BUTTONS[id] ?? 0), fields, links,
        });
      }
      // Outside the sections, the sub-page holds only the links to them.
      expect(countControls(content, sections)).toEqual({ buttons: 0, fields: 0, links: expected.length });

      // What the search says a section holds, it holds.
      for (const id of expected) {
        const section = SETTINGS_SECTIONS.find(candidate => candidate.id === id)!;
        const keys = [...section.fields, ...(section.folds ?? []).flatMap(fold => fold.fields)];
        for (const key of keys) {
          expect({ id, key, found: readable(document.getElementById(id)!).includes(normalizeSettingsText(fr[key])) })
            .toEqual({ id, key, found: true });
        }
      }
    },
  );
});

describe('Settings sub-pages — the search', () => {
  const searchField = () => screen.getByRole('searchbox', { name: 'Rechercher un réglage' });
  const search = (query: string) => { fireEvent.change(searchField(), { target: { value: query } }); };
  const hitsTo = (sectionId: string) => [...document.querySelectorAll<HTMLAnchorElement>(
    `[data-testid="settings-search-hits"] a[data-section="${sectionId}"]`,
  )];

  it('finds every former section by its name, and every former setting by its label, on its section', async () => {
    await renderSettings(<SettingsPage {...settingsProps} />);

    for (const id of Object.keys(BASE)) {
      const title = fr[SETTINGS_SECTIONS.find(section => section.id === id)!.title];
      search(title);
      expect({ id, title, hits: hitsTo(id).length > 0 }).toEqual({ id, title, hits: true });
    }
    for (const [id, label] of FORMER_LABELS) {
      search(label);
      const hits = hitsTo(id);
      expect({ id, label, hits: hits.some(hit => normalizeSettingsText(hit.textContent ?? '').includes(normalizeSettingsText(label))) })
        .toEqual({ id, label, hits: true });
    }
  });

  it('lists the hits with their sub-page and section, announces their count, and says when nothing matches', async () => {
    await renderSettings(<SettingsPage {...settingsProps} />);

    search('fuseau');
    const [hit] = hitsTo('settings-server');
    expect(hit.textContent).toContain('Fuseau horaire');
    expect(hit.textContent).toContain('Sécurité › Serveur');
    expect(hit).toHaveAttribute('href', '/config/security#settings-server');
    expect(screen.getByTestId('settings-search-count')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('settings-search-count').textContent).toMatch(/^\d+ résultats?$/);

    search('zzz-aucun-réglage');
    expect(screen.getByTestId('settings-search-count').textContent).toBe('0 résultat');
    const none = screen.getByText('Aucun réglage ne correspond').closest('.ui-empty-state') as HTMLElement;
    expect(none).toHaveAttribute('data-kind', 'noResult');
    fireEvent.click(none.querySelector('button')!);
    expect(searchField()).toHaveValue('');
    expect(screen.getByTestId('settings-search-count').textContent).toBe('');
  });

  it('goes list → search → hit → section heading by keyboard, the folded section opened on the way', async () => {
    await renderSettings(<SettingsPage {...settingsProps} />);
    const nav = screen.getByRole('navigation', { name: 'Pages des réglages' });
    expect(nav).toContainElement(searchField());

    searchField().focus();
    search('catalogue de modèles');
    fireEvent.keyDown(searchField(), { key: 'ArrowDown' });
    const hit = document.activeElement as HTMLAnchorElement;
    expect(hit).toHaveAttribute('data-section', 'settings-catalogue');
    // Enter on a link is its click.
    await act(async () => { fireEvent.click(hit); });

    expect(screen.getByTestId('settings-subpage-agents')).toHaveAttribute('aria-current', 'page');
    expect(visibleSubPage()).toHaveAttribute('data-subpage', 'agents');
    expect(screen.getByTestId('fold-settings-catalogue')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('model-catalog-section')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement?.tagName).toBe('H3'));
    expect(document.getElementById('settings-catalogue')).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement?.textContent).toBe('Catalogue de modèles');
  });
});

describe('Settings sub-pages — the list, the folds and the state of an edit', () => {
  it('names the list, marks the current sub-page, counts its sections and keeps the design system apart', async () => {
    const onOpenDesignSystem = vi.fn();
    await renderSettings(<SettingsPage {...settingsProps} subPage="security" onOpenDesignSystem={onOpenDesignSystem} />);
    const nav = screen.getByRole('navigation', { name: 'Pages des réglages' });

    const pages = [...nav.querySelectorAll<HTMLAnchorElement>('.set-subnav-pages a')];
    expect(pages.map(link => link.getAttribute('href'))).toEqual([
      '/config/you', '/config/agents', '/config/work', '/config/security', '/config/system',
    ]);
    expect(pages.map(link => link.querySelector('.set-subnav-page-name')?.textContent)).toEqual([
      'Vous', 'Agents et modèles', 'Travail', 'Sécurité', 'Système',
    ]);
    expect(pages.map(link => link.querySelector('.set-subnav-page-count')?.textContent)).toEqual(['4', '7', '6', '5', '5']);
    expect(pages.filter(link => link.getAttribute('aria-current') === 'page')).toEqual([pages[3]]);
    expect(pages[3].textContent).toContain('5 sections');

    const designSystem = screen.getByTestId('settings-nav-design-system');
    expect(designSystem).toHaveAttribute('href', '/config/design-system');
    expect(designSystem.closest('.set-subnav-apart')?.textContent).toContain('Pour les contributeurs');
    fireEvent.click(designSystem);
    expect(onOpenDesignSystem).toHaveBeenCalledTimes(1);

    // Each sub-page opens on its name, its sentence and the links to its sections.
    const head = visibleSubPage().querySelector('.set-subpage-head')!;
    expect(head.querySelector('h2')?.textContent).toBe('Sécurité');
    expect(head.textContent).toContain('Ce qui protège vos secrets');
    expect([...head.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(
      GROUPING.security.map(id => `/config/security#${id}`),
    );
  });

  it('leaves the API call log out of the list when no API plugin has a config', async () => {
    await renderSettings(<SettingsPage {...settingsProps} hasConfiguredApi={false} subPage="system" />);
    expect(document.getElementById('settings-api-audit')).toBeNull();
    expect(screen.getByTestId('settings-subpage-system').querySelector('.set-subnav-page-count')?.textContent).toBe('4');
  });

  it('asks the route to open another sub-page, and an anchor of another sub-page as an arrival', async () => {
    const onOpenSubPage = vi.fn();
    const onOpenAnchor = vi.fn();
    const onAnchorFollowed = vi.fn();
    await renderSettings(
      <SettingsPage {...settingsProps} subPage="you" onOpenSubPage={onOpenSubPage} onOpenAnchor={onOpenAnchor} onAnchorFollowed={onAnchorFollowed} />,
    );
    fireEvent.click(screen.getByTestId('settings-subpage-system'));
    expect(onOpenSubPage).toHaveBeenCalledWith('system');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un réglage' }), { target: { value: 'fuseau' } });
    fireEvent.click(document.querySelector('[data-testid="settings-search-hits"] a[data-section="settings-server"]')!);
    expect(onOpenAnchor).toHaveBeenCalledWith('settings-server');

    // A link to a section of this sub-page moves in place.
    const voice = visibleSubPage().querySelector<HTMLAnchorElement>('.set-subpage-links a[href="/config/you#settings-voice"]')!;
    await act(async () => { fireEvent.click(voice); });
    expect(onAnchorFollowed).toHaveBeenCalledWith('settings-voice');
    await waitFor(() => expect(document.getElementById('settings-voice')).toContainElement(document.activeElement as HTMLElement));
  });

  it('opens a folded section an arrival lands on', async () => {
    await renderSettings(<SettingsPage {...settingsProps} subPage="agents" arrivalAnchor="settings-usage" arrivalToken="k1" />);
    expect(screen.getByTestId('fold-settings-usage')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('fold-settings-catalogue')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('usage-section')).toBeInTheDocument();
    expect(screen.queryByTestId('model-catalog-section')).toBeNull();
    await waitFor(() => expect(document.getElementById('settings-usage')).toContainElement(document.activeElement as HTMLElement));
  });

  it('opens the debug log viewer an arrival lands on', async () => {
    await renderSettings(<SettingsPage {...settingsProps} subPage="system" arrivalAnchor="settings-debug-logs" arrivalToken="k2" />);
    expect(screen.getByTestId('fold-settings-debug-logs')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('fold-settings-api-audit')).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.set-debug-viewer')).not.toBeNull();
  });

  it('keeps an edit in progress while the reader visits another sub-page', async () => {
    await renderSettings(<SettingsPage {...settingsProps} />);
    fireEvent.click(screen.getByTestId('settings-subpage-work'));
    await settle();
    const path = screen.getByLabelText('/home/user/projects') as HTMLInputElement;
    fireEvent.change(path, { target: { value: '/srv/half-typed' } });

    fireEvent.click(screen.getByTestId('settings-subpage-you'));
    expect(visibleSubPage()).toHaveAttribute('data-subpage', 'you');
    expect(document.querySelector('[data-subpage="work"]')).toHaveAttribute('hidden');

    fireEvent.click(screen.getByTestId('settings-subpage-work'));
    expect((screen.getByLabelText('/home/user/projects') as HTMLInputElement).value).toBe('/srv/half-typed');
  });
});
