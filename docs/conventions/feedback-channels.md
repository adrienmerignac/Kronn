# Feedback channels — toast, bell, banner

KT-1883 (design-system lot 1). Three ways to tell the user something; each
message goes in exactly one. The components are in
[ui-components.md](ui-components.md) (`Notice`, `EmptyState`,
`LoadingState`).

## The rule

| Channel | What it carries | Lifetime | Where |
|---|---|---|---|
| **Toast** | The answer to a gesture the user **just made** — its success **and its error**. | A few seconds; an error stays until dismissed. | Bottom right of the window. |
| **Bell** | What **lasts** or what happens **in the background**, without a gesture to answer: an outage, a server error, an update, a key or a token that needs attention, the end of a run the user is not watching. | Until its cause is gone or the user puts it away. | The notification bell of the header. |
| **Banner** (`Notice`) | A state of **the page it concerns**, true as long as the page shows it: read only, a setting that holds a feature, a load that failed. | As long as the state holds (dismissible if the user can live with it). | That page only, in its one notice slot under the page header. |

How to choose:

1. Did the user just click, type or drop something, and is this its result?
   → **toast**, whatever the outcome. An error the user can act on at once
   stays in the toast (persistent, with its copyable details), not in a
   banner elsewhere.
2. Otherwise, is it about the page on screen and only that page? → a
   **banner** (`Notice`) in that page.
3. Otherwise (it outlives the page, or nobody asked) → the **bell**.

Never two channels for one message: a toast does not repeat a banner, and a
bell entry does not toast — except the one short "see in the bell" pointer
below.

## One example per channel

- **Toast — a gesture and its two outcomes.** Copying a discussion id answers
  with a success toast, or an error toast when the clipboard refuses
  `[src: file: frontend/src/components/DiscussionIdPill.tsx:26-36]`.
- **Bell — something that lasts, found in the background.** A newer Kronn
  version is a bell notice of the `update` source, put away for that version
  only `[src: file: frontend/src/hooks/useSystemNotices.ts:81]`. Server errors
  (5xx) and an unreachable backend go to the bell too: a toast for them
  becomes a single "see in the bell" warning, at most once per 30 s
  `[src: file: frontend/src/hooks/useToast.tsx:68]`.
- **Banner — a state of this page.** While run payload retention is off,
  Settings and Workflows show a banner in the page, with a link to the
  setting `[src: file: frontend/src/components/settings/RunRetentionBanner.tsx:30#RunRetentionBanner]`.
  New banners are a `Notice` (`tone` info / warning / danger / success).

## The toast stack

- **Bottom right.** The bell and the "Details" button of a detail header sit
  at the top right; the stack used to cover them. It is now fixed at the
  bottom right, newest at the bottom, and a toast is never wider than the
  window less 16 px on each side (checked at 400 px)
  `[src: file: frontend/src/hooks/useToast.tsx:122]`.
- **A persistent toast is never evicted.** At most three transient toasts
  are on screen, the oldest goes first; a persistent one (an error, by
  default) stays until the user dismisses it, whatever comes after it
  `[src: file: frontend/src/hooks/useToast.tsx:44#withToast]`.

## Notice: one slot per page

A page has one place for its notices: under its header, above its content.
Several states at once are stacked there, the most severe first; a page does
not scatter banners through its sections. A `Notice` is an alert (read at
once) only in the danger tone; the others are a polite status, so a page that
opens with an information banner does not interrupt a screen reader.
