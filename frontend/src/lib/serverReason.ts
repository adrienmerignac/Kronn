// KT-2003 — a reason the server writes (an unavailable agent, a refused
// model) comes with a stable code and its parameters next to its English
// sentence. The interface writes it from the locale files; the English
// sentence is what an unknown code (a newer server) falls back to. A text
// Kronn did not write (a provider's answer, a CLI's stderr) has no code: it
// is quoted as received under a localized sentence.
import type { CatalogReasonCode, ModelUnavailableReason } from '../types/generated';

type Translate = (key: string, ...args: (string | number)[]) => string;

/** One server reason as the API carries it. */
export interface ServerReason {
  /** The English sentence, kept for agents and logs. */
  detail?: string | null;
  /** The same reason as a code, when Kronn wrote it. */
  code?: CatalogReasonCode | null;
  /** The catalogue's normalized reason, for the sentence a third-party text is quoted under. */
  reason?: ModelUnavailableReason | null;
}

/**
 * Where an agent's full access is turned on, in the interface's own words:
 * the Settings tab, its Agents section, the agent, the switch. The tab and
 * section labels are the navigation's own keys, so a rename follows.
 */
export const fullAccessSettingsPath = (t: Translate, agent: string) =>
  [t('nav.config'), t('config.agents'), agent, t('config.fullAccessName')].join(' › ');

/** A third-party text, quoted as received after a localized sentence. */
const quoted = (t: Translate, lead: string, text: string) => t('serverReason.quoted', lead, text);

type Sentences = {
  [K in CatalogReasonCode['code']]: (t: Translate, code: Extract<CatalogReasonCode, { code: K }>) => string;
};

/** Every code the server can send: a new one does not type-check until it is written here. */
const SENTENCES: Sentences = {
  native_full_access_required: (t, c) =>
    t('serverReason.fullAccessRequired', c.agent, fullAccessSettingsPath(t, c.agent)),
  catalog_not_refreshed: t => t('serverReason.catalogNotRefreshed'),
  catalog_refresh_failed: (t, c) => quoted(t, t('serverReason.catalogRefreshFailed'), c.detail),
  catalog_lookup_failed: (t, c) => quoted(t, t('serverReason.catalogLookupFailed'), c.detail),
  discovery_timeout: t => t('serverReason.discoveryTimeout'),
  discovery_unsupported: t => t('serverReason.discoveryUnsupported'),
  model_disappeared: (t, c) => t('serverReason.modelDisappeared', c.model_id),
  model_disappeared_no_replacement: (t, c) =>
    t('serverReason.modelDisappearedNoReplacement', c.model_id, t(`disc.tier.${c.tier}`), c.agent),
  model_unavailable: (t, c) => t('serverReason.modelUnavailable', c.model_id),
  model_not_found: (t, c) => t('serverReason.modelNotFound', c.status),
  model_access_denied: (t, c) => t('serverReason.modelAccessDenied', c.status),
  model_not_chat: (t, c) => t('serverReason.modelNotChat', c.model_id, c.capabilities.join(', ')),
  model_not_listed: (t, c) =>
    t('serverReason.modelNotListed', c.model_id, c.version ? `${c.agent} v${c.version}` : c.agent),
};

const REASONS: readonly ModelUnavailableReason[] = [
  'disappeared', 'auth_required', 'timeout', 'cli_missing', 'invalid_catalog',
  'provider_error', 'unsupported', 'not_found', 'access_denied',
];

/**
 * The reason in the interface's language. A known code is written from the
 * locale files; an unknown code falls back to the English sentence; a text
 * without a code is quoted under the sentence of its catalogue reason. Empty
 * only when the server said nothing.
 */
export function serverReasonText(t: Translate, source: ServerReason | null | undefined): string {
  if (!source) return '';
  const { detail, code, reason } = source;
  if (code) {
    const sentence = (SENTENCES as Record<string, ((t: Translate, code: CatalogReasonCode) => string) | undefined>)[code.code];
    return sentence ? sentence(t, code) : detail ?? '';
  }
  if (!detail) return '';
  return reason && REASONS.includes(reason) ? quoted(t, t(`serverReason.lead.${reason}`), detail) : detail;
}

/** Why a catalogue entry is unavailable, in the interface's language. */
export const entryReasonText = (
  t: Translate,
  entry: { unavailable_detail?: string | null; unavailable_code?: CatalogReasonCode | null; unavailable_reason?: ModelUnavailableReason | null } | null | undefined,
) => serverReasonText(t, entry && {
  detail: entry.unavailable_detail, code: entry.unavailable_code, reason: entry.unavailable_reason,
});
