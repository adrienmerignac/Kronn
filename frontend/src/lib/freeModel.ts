/**
 * KT-2010 — a free model is a variant whose id ends with `:free` (OpenRouter
 * writes its free variants so: `vendor/model:free`). The catalogue entry
 * carries no price, so the id is the only fact; it is read for any agent or
 * connection, not for one named OpenRouter: a proxy that lists the same ids
 * says the same thing. If a provider later states prices in its listing, the
 * fact belongs to the catalogue entry, server-side.
 */
export const FREE_MODEL_SUFFIX = ':free';

/** Whether `modelId` names a free variant: something, then `:free`. */
export function isFreeModel(modelId: string | null | undefined): boolean {
  const id = modelId?.trim().toLowerCase() ?? '';
  return id.length > FREE_MODEL_SUFFIX.length && id.endsWith(FREE_MODEL_SUFFIX);
}
