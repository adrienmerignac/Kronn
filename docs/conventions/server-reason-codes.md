# Reasons the server writes: a code for the interface, English for agents (KT-2003)

A reason Kronn itself writes for an unavailable agent or a refused model
(catalogue verdicts, preflight refusals) reaches the API twice: the English
sentence, unchanged, for agents and logs, and a `CatalogReasonCode` with its
parameters next to it (`detail_code`, `notice_code`, `unavailable_code`,
`last_error_code`). The interface writes the sentence from the four locale
files. See also [ui-text.md](ui-text.md).

- The codes: `[src: file: backend/src/models/model_catalog.rs:86#CatalogReasonCode]`
- The refresh log and the catalogue rows store only the English sentence; the
  code is read back from it when the row is read, so a sentence Kronn writes
  into the DB must be a constant the reader compares with:
  `[src: file: backend/src/core/model_catalog/mod.rs:469#refresh_error_code]`,
  `[src: file: backend/src/core/model_catalog/mod.rs:488#entry_reason_code]`
- The interface: `serverReasonText` writes a known code, falls back to the
  English sentence for an unknown one, and quotes a text without a code (a
  CLI's stderr, a provider's answer) under the sentence of its
  `ModelUnavailableReason` (`serverReason.lead.*`).
  `[src: file: frontend/src/lib/serverReason.ts:67#serverReasonText]`
- Every code needs a sentence: the `SENTENCES` table is typed on the code
  union, so a new backend code does not type-check until it is written.
  `[src: file: frontend/src/lib/serverReason.ts:37#SENTENCES]`
- A menu path inside a reason is built from the navigation's own keys
  (`nav.config`, `config.agents`, `config.fullAccessName`), never written in
  the sentence, so a tab rename follows.
  `[src: file: frontend/src/lib/serverReason.ts:26#fullAccessSettingsPath]`

## Adding a reason

1. Add the variant to `CatalogReasonCode`, set it where the English sentence
   is written (or recognise the stored sentence), and test it with a name that
   contains `reason_code` (`cargo test --lib reason_code`).
2. Regenerate `frontend/src/types/generated.ts`, then write the sentence in
   `SENTENCES` and its key in the four locales.

A text from a third party gets no code: it is a `detail` parameter or the
English `detail` itself, quoted as received.
