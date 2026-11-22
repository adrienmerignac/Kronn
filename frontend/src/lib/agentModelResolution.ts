// KT-1936 — the model a discussion's agent runs, resolved ONE way for every
// surface that names it: the header's picker trigger, the discussion list row
// and the activity bubbles (pending, streaming, failed). Before this, the row
// and the bubbles read the exact model alone and announced « default model »
// while the header, on the same discussion, wrote the model of its mode.
import type { AgentIdentityModel } from '../components/ui/agentIdentityKinds';
import type { ExternalApiConnectionView } from './api';
import { modeModelId, resolveCatalogTier, type CatalogAgentTarget } from './modelCatalogSelection';
import type { AgentType, MessageTarget, ModelTier, ModelTiersConfig } from '../types/generated';

/** What the resolver reads of a message. */
interface ReplyModelSource {
  id?: string;
  role: string;
  agent_type?: AgentType | null;
  model_tier?: string | null;
  model?: string | null;
  /** The message that triggered the reply: its targets name the connection the turn ran on. */
  reply_to_message_id?: string | null;
}

/** The targets of each triggering message (`DiscussionDetail.message_targets`). */
type MessageTargets = Readonly<Record<string, readonly MessageTarget[]>>;

export interface IdentityModelSources {
  /** The discussion's exact model (« Personnalisé »), when one is held. */
  exact?: string | null;
  /** The model the discussion's mode points to (`modeModelIdFor`). */
  mode?: string | null;
  /** The model the agent last replied with, where the surface has the messages. */
  lastReply?: string | null;
}

/** Exact model, else the mode's model, else the last reply's, else the
 *  explicit « default model » state: a model nobody can name yet. */
export function resolveIdentityModel(sources: IdentityModelSources): AgentIdentityModel {
  for (const candidate of [sources.exact, sources.mode, sources.lastReply]) {
    const id = candidate?.trim();
    if (id) return { kind: 'id', id };
  }
  return { kind: 'providerDefault' };
}

/** The model id a mode points to, from the configuration (the family's mode
 *  models, or the connection's own): what the picker trigger writes. The
 *  catalogue is read only when the picker opens, so none of these surfaces
 *  reads it: their text does not change when the list opens (KT-1994). */
export function modeModelIdFor(
  target: CatalogAgentTarget,
  tier: ModelTier,
  familyTiers?: ModelTiersConfig | null,
  explicitModel?: string | null,
): string {
  return modeModelId(resolveCatalogTier(null, target, tier, familyTiers, explicitModel), tier);
}

/**
 * KT-2013 — what limits the last reply to a model the next turn runs. A reply
 * says neither whether it ran an exact model nor which connection it ran on:
 * the connection is read from the targets of the message that triggered it.
 */
export interface LastReplyScope {
  /**
   * The connection the agent runs on now. A reply counts only when its turn
   * names that very connection (none for an agent without one); a Custom
   * agent, whose every run is on a connection, needs one.
   */
  connectionId?: string | null;
  messageTargets?: MessageTargets | null;
  /** Models the next turn will not run: the exact models the discussion held and dropped. */
  exclude?: readonly string[];
}

/** The connection a reply's turn ran on, `undefined` when its turn names none. */
function replyConnection(
  message: ReplyModelSource,
  agent: AgentType,
  targets: MessageTargets | null | undefined,
): string | null | undefined {
  const trigger = message.reply_to_message_id;
  if (!trigger) return undefined;
  const turn = targets?.[trigger]?.find(target => target.agent_type === agent);
  return turn ? turn.connection_id ?? null : undefined;
}

/** The model the agent last replied with on this mode, newest first. */
export function lastReplyModel(
  messages: readonly ReplyModelSource[] | null | undefined,
  agent: AgentType,
  tier: ModelTier,
  scope: LastReplyScope = {},
): string | null {
  if (!messages) return null;
  const connectionId = scope.connectionId?.trim() || null;
  // A reply's connection is checked whenever the agent may run on one.
  const checksConnection = connectionId !== null || agent === 'Custom';
  if (agent === 'Custom' && !connectionId) return null;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== 'Agent' || message.agent_type !== agent) continue;
    if (message.model_tier && message.model_tier !== tier) continue;
    const model = message.model?.trim();
    if (!model || scope.exclude?.includes(model)) continue;
    if (checksConnection && replyConnection(message, agent, scope.messageTargets) !== connectionId) continue;
    return model;
  }
  return null;
}

export interface DiscussionModelInput {
  agent: AgentType;
  tier?: ModelTier | null;
  model?: string | null;
  messages?: readonly ReplyModelSource[] | null;
  message_targets?: MessageTargets | null;
}

/** The model of a discussion's main agent, as the header names it. */
export function discussionAgentModel(
  discussion: DiscussionModelInput,
  options: {
    familyTiers?: ModelTiersConfig | null;
    /** The discussion's HTTP connection, when it runs on one. */
    connection?: ExternalApiConnectionView | null;
  } = {},
): AgentIdentityModel {
  const tier = discussion.tier ?? 'default';
  const connection = options.connection ?? null;
  const target: CatalogAgentTarget = connection
    ? {
      agent: discussion.agent,
      connectionId: connection.id,
      modelTiers: {
        economy: connection.economy_model,
        default: connection.default_model,
        reasoning: connection.reasoning_model,
      },
    }
    : { agent: discussion.agent };
  return resolveIdentityModel({
    exact: discussion.model,
    mode: modeModelIdFor(target, tier, options.familyTiers),
    lastReply: lastReplyModel(discussion.messages, discussion.agent, tier, {
      connectionId: connection?.id ?? null,
      messageTargets: discussion.message_targets,
    }),
  });
}
