# Base UI components — `frontend/src/components/ui/`

KT-1880 (design-system lot 1). These components replace the parallel base
buttons, tab styles, menus and native `title=` tooltips. No screen is migrated
in KT-1880; the screens move to them in lots 2-5. KT-1882 adds the form
components (`Field`, `Select`, `Switch`, `FormFooter`); lot 5 migrates the
forms to them. KT-1883 adds the feedback components (`Notice`,
`EmptyState`, `LoadingState` with its `Skeleton`). KT-1884 adds the six
header kinds (`ListHeader`, `DetailHeader`, `TabHeader`, `SectionHeader`,
`DrawerHeader`, `CardHeader`), see [header-kinds.md](header-kinds.md). KT-1886
adds the dense-data components (`CopyButton`, `Table`, `KeyValueList`,
`StatTile` / `StatGrid`, `ProgressBar`); lots 2-5 migrate the existing tables,
lists, tiles, bars and copy actions to them. Pairs with
[design-tokens.md](design-tokens.md) and [ui-text.md](ui-text.md).

## Where they live

One folder, one file per component, with its stylesheet and its test next to
it (`Button.tsx`, `Button.css`, `Button.test.tsx`). `stylesheets.test.ts`
fails if a component lacks one of the three.
`[src: file: frontend/src/components/ui/stylesheets.test.ts:183]`

| Component | Use | Keyboard |
|---|---|---|
| `Button` | `variant` primary / neutral / ghost / danger, `size` sm / md / lg, optional `icon`. `type="button"` by default. | native |
| `IconButton` | An icon only; `label` is required and is its name and its tooltip. | native; tooltip on focus |
| `Menu` | Menu button. `items`, plus at most one `destructiveItem`, always rendered last after a separator. | Enter / Space / ↓ open on the first item, ↑ on the last; arrows, Home, End, type-ahead; Escape and Tab close and give focus back |
| `StatusBadge` | `tone` success / warning / danger / info / neutral (the `--kr-status-*` colours on the dot, border and tint; the label stays `--kr-text-primary` for 4.5:1), the status always written. | — |
| `Tabs` | `tablist` / `tab` / `tabpanel` roles, `label` names the list; with no `panel` the tabs only report the choice. | ← → move and select, Home / End, a disabled tab is skipped |
| `SearchField` | `type="search"` with a required `label` (hidden unless `showLabel`) and a clear button. | Escape clears a non-empty field and stops there |
| `Tooltip` | Wraps one focusable element; `describe` wires it as `aria-describedby`. | opens on hover and keyboard focus, Escape closes, hoverable (WCAG 1.4.13) |
| `Dialog` | Modal layer, centred. `title` (its name, an `h2`), optional `description`, `footer` for the actions, `size` sm / md / lg (480 / 640 / 960 px), `role` dialog / alertdialog. | focus on the first control of the body (or `initialFocus`), Tab kept inside, Escape / the cross / the scrim close it, focus back to the opener |
| `Drawer` | The same props and keyboard as `Dialog`, as a side panel the full height of the window at its end edge. | as `Dialog` |
| `ConfirmDialog` | In place of `window.confirm`: an alertdialog, `title` is the question, `message` what happens, `confirmLabel` the verb and the object ("Delete 3 projects", never "OK"), `tone` danger (default) or primary. `useConfirm()` gives it as a promise. | focus on Cancel (Enter at once answers no); Escape, the cross and the scrim cancel |
| `Field` | One form field: `label` above the control and bound to it, `required` (an asterisk) or `optional` (the word), `help` and `error` lines under the control, `disabled`. Wraps one control element, or a render function `control => …` for a control it cannot clone. | the control's own |
| `Select` | The native `<select>`, one look: `options` (an entry or a group), `value`, `onChange(value)`, `placeholder`, `size` sm / md. No label of its own: a `Field` names it, or an `aria-label`. | native |
| `Switch` | An on/off setting that applies at once: a checkbox with `role="switch"`, named by its visible `label` (`hideLabel` keeps it for assistive technology only), `description` under it. | Space; a click on the label |
| `FormFooter` | The end of a form: `blockers` (what still holds the action), then Cancel (`onCancel`), then the action (`submitLabel`, `tone` primary / danger, `busy`), on the right, `pinned` to the bottom of what scrolls (default). Without `onSubmit` the action submits the form around it. | a held action stays focusable |
| `Notice` | A message inside the page it concerns (see [feedback-channels.md](feedback-channels.md)): `tone` info / warning / danger / success, optional `title`, one `action` (`{ label, onClick }`), `onDismiss` adds a cross named "Dismiss". Tone on the icon, the inline-start border and the tint; text in `--kr-text-primary`. `role="alert"` for danger only, `status` otherwise. | native |
| `EmptyState` | `kind` firstUse (its `action`, the primary button, is required), noResult (`onClear`, required, "Clear the filters" unless `clearLabel`), nothingSelected (no action); `title`, `description`, `icon`. The type refuses a case without its way out. | native |
| `LoadingState` | `size` sm (a ring beside the text, inline) / md (the mark over its sentence, a panel; default) / lg (a whole page); `fullscreen` (the window, lg), `phase`, `onRetry`. md and lg keep the cold-start screen of `index.html` instead of drawing a second one, unless `holdsBootScreen={false}` (a loader shown as content); the hold follows the current props, so a loader that turns sm or stops holding releases that screen and draws itself. Same file: `Skeleton`, `kind` list (`rows`) / detail, one named status (not marked busy, so its label is read), shapes hidden from assistive technology. | — |
| `CopyButton` | `text` or `getText` (read at the click), required `label`; `form` icon (an `IconButton`) / text (a `Button`). A copy shows a check for 1.5 s and says "Copied" in a polite live region; a refused clipboard turns danger and says "Copy failed". | native |
| `Table` | Required `caption` (`hideCaption`); `columns` (`header`, `align`, `numeric`, `sortable`, `truncate` ellipsis / wrap, `rowHeader`); controlled `sort` / `onSortChange`; `stickyHeader`, `maxHeight` sm / md / lg, `density` compact / normal, `rowTone`, `hover`, `selection`, `actions`, `onRowOpen`, `empty`, `loading`, `footer`, `narrow` scroll / cards. | sort and open buttons, checkboxes; the bounded area is a Tab stop |
| `KeyValueList` | A `dl`; `items` (`label`, `value`, `mono`, `copyable`, `copyText`, `truncate`), `layout` grid / inline. | the copy buttons |
| `StatTile`, `StatGrid` | `label`, `value` (null: "—" and `unknownReason`), `unit`, `icon`, `hint`, `delta` (`text`, `direction`, `tone`), `loading`, `onClick` (a button) with `selected` (`aria-pressed`), `size` md / lg. `StatGrid` (`label` names the group) wraps its tiles by its own width. | native, when a button |
| `ProgressBar` | Required `label` (`hideLabel`); `value`, `max`, `valueText`; no value is indeterminate; `tone` accent / success / warning / danger / info; `size` sm / md. Stacked: `segments` (`id`, `label`, `value`, `tone`), `max`, `legend`. | — |
| `ListHeader`, `DetailHeader`, `TabHeader`, `SectionHeader`, `DrawerHeader`, `CardHeader` | One header per kind, one heading each at a fixed level (h1; h2 for detail, drawer, card; h3 for tab, section), slots `leading` / `title` / `meta` / `status` / `description` / `actions`, `compact`; `DrawerHeader` adds `onClose` + `closeLabel` (the last control), `titleId` names a drawer or a card. Which goes where: [header-kinds.md](header-kinds.md). | native |

`Menu` and `Tooltip` render into `document.body` at a fixed position
(`anchor.ts`), so a container with `overflow: hidden` does not clip them.
A floating layer never leaves the window: it is measured once rendered,
flips to the side with more room, is clamped `--kr-space-2` from the edges,
and a menu taller than the room scrolls inside a max-height
`[src: file: frontend/src/components/ui/anchor.ts:30#anchoredStyle]`.

## Dialog, Drawer and ConfirmDialog (KT-1881)

`Dialog` and `Drawer` are one frame, `OverlayFrame`, rendered in `<body>`:
a scrim, then a panel with `role`, `aria-modal="true"`, `aria-labelledby` on
its heading, `aria-describedby` on its description, and one cross (an
`IconButton` named "Close") at the top end, at the same size and place on
every dialog and drawer
`[src: file: frontend/src/components/ui/overlay.tsx:47#OverlayFrame]`.
Focus, Tab trap, Escape and focus return come from `useDialogFocus`: one
Escape closes one layer, the innermost first
`[src: file: frontend/src/hooks/useDialogFocus.ts:44#useDialogFocus]`.

- **Layers.** A `Drawer` sits on `--kr-z-drawer`, a `Dialog` on
  `--kr-z-modal`, a `ConfirmDialog` on `--kr-z-modal-nested`, so a
  confirmation opened from a drawer or a dialog is above it.
- **Sizes.** `--kr-overlay-w-sm / -md / -lg` (480 / 640 / 960 px, see
  [design-tokens.md](design-tokens.md)). Under the first breakpoint (639 px
  and less) both fill the screen. A component stylesheet writes no px length
  but a 1 or 2 px line and a `@media (max-width: <bp - 1>px)`.
- **A `ConfirmDialog` stays a card on a phone.** It is a short question, not
  content: under the first breakpoint it does not fill the screen but stays
  centred, as wide as the window minus `--kr-space-4` on each side, as tall
  as its content (never taller than the window minus that margin; a long
  message scrolls), the scrim visible around it. Its two buttons stack full
  width when they do not fit on one line, Cancel first
  `[src: file: frontend/src/components/ui/ConfirmDialog.css:22]`. The
  stylesheet test checks that it takes none of the full-screen rules of
  `Dialog`.
- **Tested once for both.** `describeOverlayContract` runs the same checks
  on `Dialog` and `Drawer` (role and name, initial focus, Tab, Escape, cross,
  scrim, nested layers, axe on the open layer)
  `[src: file: frontend/src/test/overlayContract.tsx:23#describeOverlayContract]`.
  `src/test/axe.ts` runs axe-core in vitest: it is the copy that
  `@axe-core/playwright` (already a devDependency) brings, so no new
  dependency.
- **A confirmation, not `window.confirm`.** Use `useConfirm()`:
  `if (!(await confirm({ title, message, confirmLabel }))) return;`, and
  render its `dialog` once in the component
  `[src: file: frontend/src/components/ui/useConfirm.tsx:27#useConfirm]`.
  `ConfirmDeleteButton` and `StrongConfirmDialog` stay as they are.
- **No new native `confirm()`.** ESLint refuses `confirm(…)` (scope-aware
  `no-restricted-globals`: a local function named `confirm` passes) and
  `window.` / `globalThis.` / `self.confirm(…)` (`no-restricted-properties`),
  in every file but the tests
  `[src: file: frontend/eslint.config.js:75]`. The calls that existed when the
  rule came in are its baseline, `frontend/eslint-suppressions.json` (ESLint
  bulk suppressions, read by `pnpm lint`): a call beyond the baseline fails,
  and once a call is migrated `pnpm lint` fails until its entry goes
  (`pnpm lint --prune-suppressions`). A vitest test checks that the baseline
  matches the calls each file still holds
  `[src: file: frontend/src/lib/__tests__/nativeConfirmLint.test.ts:57]`.
  First screens moved (KT-1456): the promotion of a shadow version
  (`LivePageResources`), the restore of a skill version
  (`SkillHistoryDrawer`), the deletion of a Quick Prompt version
  (`QPHistoryDrawer`).

## Form components (KT-1882)

- **A label is always bound.** `Field` gives its control an id (it keeps one
  the control already has) and renders `<label for>` on it, above it; a
  native `input`, `textarea` or `select` also takes the field style
  (`ui-field-control`), a component keeps its own
  `[src: file: frontend/src/components/ui/Field.tsx:39]`.
- **The asterisk means required, nothing else.** `required` prints it
  (hidden from assistive technology, the control gets `aria-required`);
  `optional` writes the word; the props are exclusive at the type level. A
  text label ending in `*` loses it: an asterisk for "advanced options are
  set" (`WorkflowWizard.tsx`) cannot pass through `Field`
  `[src: file: frontend/src/components/ui/Field.tsx:43#plainLabel]`.
- **The error is announced.** The error line sits in a polite live region
  rendered from the start; while there is an error the control is
  `aria-invalid` and its description reads the error first, then the help
  `[src: file: frontend/src/components/ui/Field.tsx:100]`. The error text is
  `--kr-text-primary` (4.5:1 in every theme), its icon carries the danger
  colour.
- **16 px on a coarse pointer.** A phone zooms into a field written under
  16 px when it takes the focus: `ui-field-control` and `Select` write
  `--kr-type-xl` (1rem) under `@media (pointer: coarse)`, and grow to
  `--kr-control-h-touch`
  `[src: file: frontend/src/components/ui/Field.css:106]`.
- **A held action says why.** `FormFooter` holds its action with
  `aria-disabled` (not `disabled`) while there are `blockers` or it is
  `busy`: the keyboard still reaches it, its description is the list of
  reasons, a click or Enter does nothing (and does not submit the form)
  `[src: file: frontend/src/components/ui/FormFooter.tsx:32#FormFooter]`.
- **One switch.** `Switch` is the native checkbox with the `switch` role,
  transparent over its track; the focus ring is drawn on the track. Its off
  thumb and border (`--kr-text-muted`), its on track (`--kr-accent`) and on
  thumb (`--kr-text-on-accent`) hold 3:1 in every theme, which the test
  measures.
- **Axe.** Each of the four has an axe run in its test, in every state, and
  the gallery test runs axe on their four sections.
- **`.ui-visually-hidden`** now lives in `visuallyHidden.css`, imported by
  each component that uses it (it was in `SearchField.css`, which `Switch`
  and `FormFooter` would otherwise depend on).

## Feedback components (KT-1883)

- **Which channel.** A toast answers a gesture just made, errors included;
  the bell holds what lasts or happens in the background; a banner (a
  `Notice`) stays inside the page it concerns, in its one slot under the
  page header. The rule and one example per channel:
  [feedback-channels.md](feedback-channels.md).
- **Notice reads at 4.5:1.** As `StatusBadge`, the tone colour never writes
  the text: the test composites the tint on every surface of the seven
  themes and measures the text on it
  `[src: file: frontend/src/components/ui/Notice.test.tsx:49]`.
- **An empty state always has its way out.** `EmptyState` is a union on
  `kind`: a first use without `action`, a no-result without `onClear`, or a
  nothing-selected with an action do not compile (`@ts-expect-error` lines
  in its test) `[src: file: frontend/src/components/ui/EmptyState.tsx:44#EmptyStateProps]`.
- **One LoadingState.** `components/LoadingState.tsx` re-exports
  `ui/LoadingState` (and `BootHold`) for its ten users; the sizes replace the
  14 sizes of `<Loader2>` as screens move (lots 2-5). Every animation stops
  under `prefers-reduced-motion`, which the test reads from the stylesheet
  `[src: file: frontend/src/components/ui/LoadingState.tsx:43#LoadingState]`.
  A loader shown as content, never waiting for anything (the gallery's
  demos), passes `holdsBootScreen={false}`: mounted for good, md and lg would
  otherwise hold the cold-start screen and leave Settings behind it when it
  is the first page opened
  `[src: file: frontend/src/components/settings/DesignSystemComponents.tsx:494]`.
- **Variants** live in `feedbackKinds.ts` (`NOTICE_TONES`,
  `EMPTY_STATE_KINDS`, `LOADING_SIZES`, `SKELETON_KINDS`), so the component
  files export components only (fast refresh).

## Header kinds (KT-1884)

- **One frame.** The six share `headerFrame.tsx` and `headerFrame.css`; each
  kind's own stylesheet sets only its title sizes (from the text scale,
  smaller when `compact`) and its padding. `describeHeaderContract` runs the
  same checks on each (one heading at its level in both forms, slot order,
  sizes, no `position` or `z-index`, axe)
  `[src: file: frontend/src/test/headerContract.tsx:32#describeHeaderContract]`.
- **Variants** live in `headerKinds.ts` (`HEADER_LEVELS`, `HEADER_KINDS`).
- **In the gallery** each kind shows its normal and compact form (the compact
  `[src: file: frontend/src/components/settings/DesignSystemComponents.tsx:499]`.
- **Variants** live in `feedbackKinds.ts` (`NOTICE_TONES`,
  `EMPTY_STATE_KINDS`, `LOADING_SIZES`, `SKELETON_KINDS`), so the component
  files export components only (fast refresh).

## Header kinds (KT-1884)

- **One frame.** The six share `headerFrame.tsx` and `headerFrame.css`; each
  kind's own stylesheet sets only its title sizes (from the text scale,
  smaller when `compact`) and its padding. `describeHeaderContract` runs the
  same checks on each (one heading at its level in both forms, slot order,
  sizes, no `position` or `z-index`, axe)
  `[src: file: frontend/src/test/headerContract.tsx:32#describeHeaderContract]`.
- **Variants** live in `headerKinds.ts` (`HEADER_LEVELS`, `HEADER_KINDS`).
- **In the gallery** each kind shows its normal and compact form (the compact
  one with a long title, to show it ellipsize). A demo renders its real
  heading, so the gallery's own `h3` after an `h1` or `h2` demo is the one
  `heading-order` jump its axe test allows.

## Dense-data components (KT-1886, KT-2004)

- **Narrow by the container, not the window.** `Table`, `KeyValueList` and
  `DiffViewer` are size containers (`container-type: inline-size`) and take
  their narrow form under a width of their own: `@container ui-table (width < 40rem)`
  (40rem is `--kr-bp-sm`), `@container ui-kv (width < 24rem)`,
  `@container ui-diff (width < 40rem)`. A table or side-by-side diff in a
  side panel turns into its narrow form on a wide screen too; no `@media` width query.
  A container query cannot read a custom property, so the threshold is
  written in rem, the one length besides a 1 or 2 px line.
  `[src: file: frontend/src/components/ui/Table.css:249]`
  `[src: file: frontend/src/components/ui/KeyValueList.css:91]`
  `[src: file: frontend/src/components/ui/DiffViewer.css:281]`
  `StatGrid` needs no query: `repeat(auto-fill, minmax(min(100%, …), 1fr))`
  wraps its tiles by its own width, never a fixed column count.
- **A table's narrow forms.** `narrow="scroll"` (default) keeps the columns
  and scrolls sideways in the wrapper that is always there. `narrow="cards"`
  makes each row a card in which every value follows its column header (a
  label hidden from assistive technology, which already has the header row);
  the header row is visually hidden and shows again when a control in it (a
  sort button, the select-all) takes the focus. Engines differ on whether a
  table keeps its roles once its display changes, so in cards form the roles
  are written out (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`,
  `cell`: the native ones, so the wide rendering is unchanged), the table is
  named by its caption with `aria-labelledby`, and each cell names its column
  header in `headers`.
  `[src: file: frontend/src/components/ui/Table.tsx:183]`
- **A selected row is a checked checkbox.** The row's checkbox is the only
  semantic of the selection: `aria-selected` belongs to a row of a `grid`,
  not of a plain table. The row carries `data-selected="true"` for its colour,
  the accent tint of the selected rows of the collection lists
  (`--kr-accent-bg`), laid over the row as a background image so a toned row
  keeps its tone tint and its inline-start border.
  `[src: file: frontend/src/components/ui/Table.css:160]`
- **A scroll area the keyboard reaches.** The wrapper becomes a `region`
  named by the caption, with `tabindex="0"`, when `maxHeight` bounds it or
  when its content is wider than it (measured with a `ResizeObserver`); a
  table that fits is no Tab stop.
  `[src: file: frontend/src/components/ui/Table.tsx:107#useOverflowsSideways]`
- **Sorting is controlled.** The table never reorders rows: a sortable header
  is a button that calls `onSortChange` with `nextSort` (ascending first,
  then the other way on the same column); `aria-sort` sits on the sorted
  header only. `[src: file: frontend/src/components/ui/dataKinds.ts:38#nextSort]`
- **A row opens from the keyboard.** With `onRowOpen` the first data cell
  (the `rowHeader` column, else the first) holds a real button. A click on
  the rest of the row is a mouse shortcut: it never fires from a control in
  the row (button, link, field, label, checkbox, anything focusable), from a
  portal (a menu, a tooltip, a dialog opened from the row), or when the
  reader is selecting text.
  `[src: file: frontend/src/components/ui/Table.tsx:165]`
- **Empty and loading inside the table.** One row spanning every column:
  `empty` (an `EmptyState`, or "Nothing to show") or a `LoadingState` sm with
  the table `aria-busy`. The select-all is disabled when there is no row.
- **12 px at least.** Both densities write `--kr-type-sm` or more; so do the
  tile labels, the delta, the progress label, its legend, and the log and
  diff gutters and lines.
- **A copy says what happened.** `CopyButton` keeps its name (focus does not
  re-announce), changes its icon, and writes "Copied" or "Copy failed" in a
  polite live region next to it, empty again after
  `COPY_FEEDBACK_MS` (1500). No clipboard, a refused permission or a
  `getText` that throws are all a failure.
  `[src: file: frontend/src/components/ui/CopyButton.tsx:42#CopyButton]`
  `[src: file: frontend/src/components/ui/dataKinds.ts:6]`
- **Never colour alone.** A delta's direction is written for assistive
  technology ("Up", "Down", "No change") and its tone colours the arrow
  only, the text stays `--kr-text-secondary`; an unknown value is "—" with
  its reason in a title and in hidden text; a missing key-value is "—" read
  as "No value". In `LogViewer`, `stderr` and `error` lines carry a visible
  text marker (`ERR` / `WARN`) in addition to the status tint; in `DiffViewer`,
  added, removed and changed lines write `+`, `-` and `~` in a text gutter
  column alongside the `--kr-diff-*` tokens.
- **A stacked bar is read once.** Without a legend it is a `role="img"`
  whose name lists every segment, its count and its share (percent in the UI
  locale, "<1 %" for a share that would round to 0). With `legend`, the
  legend is the readable list, named by `label`, and the image is named by
  `label` alone, so the breakdown is not heard twice. Each drawn segment keeps
  `--kr-space-1` of width at least.
  `[src: file: frontend/src/components/ui/ProgressBar.tsx:78]`
  A single bar with no `value` is indeterminate: it slides, and under
  `prefers-reduced-motion: reduce` it stands still, the whole track striped.
  `[src: file: frontend/src/components/ui/ProgressBar.css:130]`
- **One log region (`LogViewer`, KT-2004).** The scroll area is a focusable
  `role="log"` named by its required `label` (`tabIndex={0}`, `aria-live="off"`
  so a streaming log never floods assistive technology). Lines are strings or
  `{ text, stream, level, time }`; ANSI CSI and OSC sequences are stripped by
  `stripAnsi` before rendering or copying, and a timestamp sits in its own
  `<time>` column. When `follow` is on, new lines scroll to the bottom; scrolling
  up by hand pauses following and shows a "Jump to end" button that scrolls to
  the bottom and resumes following. The toolbar renders only the controls wired
  by the caller (`wrapToggle`, `copyable` via `CopyButton`, `onRefresh`,
  `onClear`, and the `note` slot).
  `[src: file: frontend/src/components/ui/LogViewer.tsx:60-64#LogViewer]`
  `[src: file: frontend/src/components/ui/logKinds.ts:36-37#stripAnsi]`
- **One diff model (`DiffViewer`, KT-2004).** `DiffViewer` takes a structured
  `DiffFileModel[]`, built either from a git patch with `parseUnifiedDiff` or
  from the positional row pairs of `qp-history-diff.ts` with `diffFileFromRows`
  (where a `changed` line carries both `text` and `otherText`, rendered as a
  `~` row in unified view and on the two sides in `side-by-side` view). Side by
  side falls back to unified under `@container ui-diff (width < 40rem)` by a
  `ResizeObserver` on the root plus CSS container rules. Per-file headers show
  `previousPath → path` for renames, status badge, `+added` / `-removed` counts,
  a per-file `CopyButton` (copying `newText(file)`), and replace the hunk body
  with a notice for `binary` or `truncated` files. The caller's `highlight`
  callback is skipped when a file's line count exceeds `highlightLimit`
  (default 800), and its `.diff-hl-*` classes take `--kr-code-*` tokens inside
  `DiffViewer.css`. When `selectable` is on, each content line renders a named
  toggle button with `aria-pressed`; shift-click extends the selected range up
  to `maxSelection` (default 50) in the same file.
  `[src: file: frontend/src/components/ui/DiffViewer.tsx:310-315#DiffViewer]`
  `[src: file: frontend/src/lib/diffModel.ts:78-82#parseUnifiedDiff]`
  `[src: file: frontend/src/lib/diffModel.ts:190-193#diffFileFromRows]`
- **Variants** live in `dataKinds.ts` (`TABLE_DENSITIES`,
  `TABLE_MAX_HEIGHTS`, `TABLE_NARROW_FORMS`, `TABLE_ROW_TONES`,
  `KEY_VALUE_LAYOUTS`, `STAT_TILE_SIZES`, `PROGRESS_TONES`,
  `PROGRESS_SIZES`, `nextSort`, `COPY_FEEDBACK_MS`), `logKinds.ts`
  (`LOG_MAX_HEIGHTS`, `LOG_STREAMS`, `LOG_LEVELS`, `stripAnsi`), and
  `diffKinds.ts` (`DIFF_LAYOUTS`, `DIFF_MAX_HEIGHTS`, `DIFF_FILE_STATUSES`,
  `DIFF_LINE_KINDS`, `DEFAULT_HIGHLIGHT_LIMIT`, `DEFAULT_MAX_SELECTION`).
- **In the gallery** each one is shown in a wide container on its own line,
  then its narrow demos together on the next line (`WideAndNarrow`: each
  narrow container is 20rem whatever the window and they wrap under each
  other in a narrow window; the Table shows its cards and its sideways
  scroll there; no padding on the containers), with sample data whose
  numbers are written with `Intl.NumberFormat` in the interface's locale;
  the test is `DesignSystemDataComponents.test.tsx`.
  `[src: file: frontend/src/components/settings/DesignSystemComponents.tsx:726#WideAndNarrow]`
- **A size container needs a width of its own.** Inline-size containment
  ignores the content, so a `Table`, `KeyValueList` or `DiffViewer` placed as a flex item
  with no width or flex-basis collapses to 0 px and vanishes. In the gallery
  each one sits directly in a `.ds-demo-container` whose form sets a width
  (`wide`: `width: 100%`; `narrow`: `flex: 0 1 20rem`); the gallery test
  checks both. A screen that hosts them in a flex row does the same.
  `[src: file: frontend/src/components/settings/DesignSystemSection.css:395]`

## Rules

- **An IconButton cannot be nameless.** `label` is required, the empty
  literal `""` does not compile, and `aria-label`, `aria-labelledby` and
  `title` are refused (declared `never`: JSX does not check a hyphenated
  attribute against the props unless the prop is declared). The test file
  holds `@ts-expect-error` lines that `tsc -b` turns into errors if the type
  ever accepts them.
  `[src: file: frontend/src/components/ui/IconButton.tsx:15-18#IconButtonNativeProps]`
- **Tokens only, no theme named.** The stylesheets take colours, text sizes,
  spacing, radii, control heights, durations and z-index from tokens; the
  only px written is a 1 or 2 px line. `stylesheets.test.ts` reads every
  `components/ui/*.css` for it.
- **40 px on a coarse pointer.** Every interactive part grows to
  `--kr-control-h-touch` (40 px) under `@media (pointer: coarse)`; an
  IconButton in width too. The test reads the media blocks, which jsdom
  cannot evaluate.
- **Primary text colour.** An accent fill writes its text in
  `--kr-text-on-accent`, never `--kr-bg-base`: the primary `Button` and the
  shared `.btn-primary` are pinned by `tokens-defined.test.ts`.
- **Text inside a component** goes through `useT()` (`ui.*` keys); the
  caller passes every other label.

## The gallery

Settings → appearance → "Design system" opens a sub-page of its own
(KT-1987): its page header (`ListHeader`, the page's one `h1`) with the way
back to the appearance section of Settings (`/config#settings-appearance`,
where the link sits), an index (the tokens, then one entry per component),
then two tabs. Under the `h1`, each tab's part is an `h2` (visually hidden:
the tab says it), the token groups and the entries are `h3`. Tokens is
`/config/design-system`; Components, `/config/design-system/components`,
shows each component under its own heading, with its variants and states, in
the current theme. An entry's address is its tab plus the heading in the hash
(`/config/design-system/components#ds-c-menu`). The old `/config#design-system`
and the old `/config#ds-…` entry anchors still land on the right tab and entry:
the table is `DESIGN_SYSTEM_ANCHOR_TABS`.
`[src: file: frontend/src/lib/routes.ts:167#DESIGN_SYSTEM_ANCHOR_TABS]`
`[src: file: frontend/src/lib/routes.ts:184#legacyDesignSystemLocation]`
The route is its own chunk, never preloaded, so Settings does not load the
gallery.
`[src: file: frontend/src/routes/lazyRoutes.ts:17#DesignSystemRoute]` Adding a component: add it to `UI_GALLERY_COMPONENTS`, a
demo in `DesignSystemComponents.tsx`, and its `designSystem.caption.<id>` in
the four locales; the gallery test fails if a component of the folder is
missing. A shared component built on those controls (the agent picker,
KT-1885) goes in `SHARED_GALLERY_COMPONENTS`, shown after them.
`[src: file: frontend/src/components/settings/designSystemGallery.ts:19#UI_GALLERY_COMPONENTS]`
`[src: file: frontend/src/components/settings/designSystemGallery.ts:56#SHARED_GALLERY_COMPONENTS]`
the window and never covers its trigger; opened above, its bottom is anchored
to the trigger. Never place it from an estimated size. It is 480 px wide at
most (580 px with four tracks, 520 px for the @ menu), never wider than the
window.
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:512#place]`
Availability always goes through
`AgentAvailabilityBadge` (`unavailable` and `disabled` block the choice,
`needs-full-access` and `not-listed` only warn, `catalog` is the neutral
« Détecté », « Cache à revérifier », « Configuration migrée »).
`[src: file: frontend/src/lib/agentAvailability.ts:14#AgentAvailabilityState]`
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:58#AgentAvailabilityBadge]`

**A row with tier choices** (field and chip modes, the API assistants, the @
palette: one implementation, `AgentPickerTierChoices`) is one line per agent
at desktop widths. On the left: the dot, the agent's name, its kind or role,
and ONE state badge. The dot and the name are one box (`kr-agent-switch-tier-id`,
[src: file: frontend/src/components/AgentSwitchPicker.tsx:834]), so they never
split across lines; the badge sits beside the name when there is room and
wraps under it only when there is not. On the right: the tiers, one-line buttons (icon and
name, 26 px high) on equal tracks shared by every row, so Éco / Standard /
Avancé line up from row to row. The state the tiers share (more than half of
them) is written once, in the row's badge; a tier carries its own state, as a
second line, only when it differs. The row's badge is the more serious of the
agent's own state and that shared one. Every tier keeps its full state in its
tooltip and its accessible description. The assistants' « agent default » is
a fourth track with a short visible label (`agentPicker.defaultTier`, « Défaut
»), its full name in its tooltip and accessible name. Under 420 px of viewport
the tiers go on their own line under the agent, in equal parts. Nothing in a
row is cut with an ellipsis: text wraps.
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:120#AgentPickerTierChoices]`
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:112#tierRowState]`
`[src: file: frontend/src/lib/agentAvailability.ts:62#sharedTierState]`
`[src: file: frontend/src/lib/agentAvailability.ts:82#rowAvailability]`

A menu a text field drives (the composer's @ menu) renders
`AgentPickerPalette` and keeps its own keys. The palette is a listbox: give it
an `id`, spread `agentPaletteFieldAria` on the field (`aria-controls`,
`aria-expanded`, `aria-activedescendant` while open); it keeps the highlighted
row in view and its tier choices are no Tab stops. Give it a `boundary`: its
height is then measured from its anchored edge to that area's far edge, minus
`--kr-space-2`, and it scrolls inside. The composer's boundary is the message
list (`composerMentionBoundary`), so the menu never slides under the
discussion header or a banner.
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:231#AgentPickerPalette]`
`[src: file: frontend/src/components/AgentSwitchPicker.tsx:250#boundary]`
`[src: file: frontend/src/lib/agentPickerPalette.ts:21#agentPaletteFieldAria]`
`[src: file: frontend/src/lib/agentPickerPalette.ts:11#composerMentionBoundary]`
The API assistants go through `AssistantAgentPicker` (installed agents,
external connections, tiers); a reopened conversation shows the connection
and tier it runs on (`assistantChoiceFromDiscussion`).
`[src: file: frontend/src/components/AssistantAgentPicker.tsx:14#AssistantAgentPicker]`
`[src: file: frontend/src/lib/assistantAgentChoice.ts:32#assistantChoiceFromDiscussion]`
Kept apart on purpose: the audit's card grid (a decision aid), the default-tier
radios of Settings (a preference) and the chips of agents detected in a prompt
(a read-only summary).
