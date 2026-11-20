# Design tokens — the scales new screens pick from

KT-1878 (design-system lot 1). The screens move to these scales in the later
lots (KT-1880 to KT-1886); this lot only defines and shows them.

## Where they live

- **Values:** `frontend/src/styles/tokens.css`, `:root` block "Design scales"
  and "Semantic colours". Light themes (`light`, `sakura`, `euronews`) override
  the code and diff text colours in one shared block.
  `[src: file: frontend/src/styles/tokens.css:111-163]`
  `[src: file: frontend/src/styles/tokens.css:285-322]`
- **Typed table:** `frontend/src/styles/designTokens.ts` lists every token of
  a scale with the i18n key of its use line (`designSystem.use.<name>`).
  `[src: file: frontend/src/styles/designTokens.ts:45-119#DESIGN_TOKEN_GROUPS]`
- **In the app:** Settings → appearance panel → "Design system"
  (`/config#design-system`), not in the section index. It reads each value
  with `getComputedStyle` on `<html>` and re-reads it when `data-theme` changes.
  `[src: file: frontend/src/components/settings/DesignSystemSection.tsx:66#DesignSystemSection]`

## The scales

| Scale | Tokens | Note |
|---|---|---|
| Text | `--kr-type-sm` … `--kr-type-2xl` (12, 13, 14, 16, 20 px) | rem on a 16 px root; 0.75rem is the floor |
| Spacing | `--kr-space-1` … `--kr-space-8` | 4 px grid |
| Radius | `--kr-radius-control`, `-surface`, `-overlay` | 4, 8, 12 px; a pill stays `--kr-radius-pill` |
| Breakpoint | `--kr-bp-sm`, `-md`, `-lg` | 560, 760, 900 px |
| Duration | `--kr-duration-fast`, `-base`, `-slow` | 120, 150, 300 ms |
| Weight | `--kr-weight-regular` … `-bold` | 400–700, the faces `reset.css` loads |
| Control height | `--kr-control-h-sm`, `-md`, `-lg` | 28, 34, 44 px, used as `min-height` |
| Text roles | `--kr-text-primary`, `-secondary`, `-muted` | existing tokens, distinct in every theme |
| Semantic colours | `--kr-status-*`, `--kr-diff-{added,removed}-{bg,border,text}`, `--kr-code-*` | no component names a theme |

## Rules

- **Adding a token to a scale:** add it to `tokens.css`, to the table in
  `designTokens.ts` and a `designSystem.use.*` line in the four locales.
  `designTokens.test.ts` fails if `tokens.css` declares a token matching a
  scale's prefix that the table omits, and the component test fails if the
  page does not show it.
  `[src: file: frontend/src/styles/__tests__/designTokens.test.ts:43]`
- **Breakpoints in `@media`:** a custom property cannot be read inside a
  media query; write the same px value and, in scripts, use `BREAKPOINTS`.
  `[src: file: frontend/src/styles/designTokens.ts:126#BREAKPOINTS]`
- **Legacy names stay valid.** `--kr-sp-*` and `--kr-r-*` that sit on a scale
  are mapped to it (`--kr-sp-4: var(--kr-space-2)`); the others, and every
  `--kr-fs-*` (px), keep their values. A test pins them.
- **Focus ring:** one global `*:focus-visible` rule, in `tokens.css`
  (`--kr-accent-ink` + halo). `reset.css` no longer has one; a test counts them.
  `[src: file: frontend/src/styles/__tests__/designTokens.test.ts:177]`
- **Contrast:** code and diff text colours hold 4.5:1 on `--kr-code-surface`
  and `--kr-bg-elevated` in every theme (diff text measured on its tinted row).
