/**
 * KT-1883 — captures of the feedback components in the design-system gallery,
 * and of the toast stack beside the bell and the detail header actions, in
 * light and dark, at 1440 px and 400 px. Opt-in: it only runs when
 * `CAPTURE_DIR` is set, so it never weighs on CI.
 *
 *   CAPTURE_DIR=test-results/kt-1883 VITE_DEV_PORT=<port> pnpm exec playwright test e2e/specs/kt-1883-captures.spec.ts
 *
 * The whole API is mocked, so no backend is needed. The "before" of the toast
 * stack is the same page with the stack put back where it was (fixed 16 px
 * from the top right, the old inline style), so the two read side by side.
 */
import { test, expect, type Page } from '@playwright/test';
import { stubDiscussionPoll } from '../fixtures/discussion-poll';

test.skip(!process.env.CAPTURE_DIR, 'captures run on demand (set CAPTURE_DIR)');

const OUT = process.env.CAPTURE_DIR ?? 'test-results/kt-1883';
const ok = (data: unknown) => JSON.stringify({ success: true, data, error: null });
const DISC_ID = 'kt1883-demo-discussion';

const discussion = {
  id: DISC_ID,
  project_id: null,
  title: 'Weekly dependency check',
  agent: 'ClaudeCode',
  language: 'en',
  participants: ['ClaudeCode'],
  messages: [
    { id: 'm1', role: 'User', content: 'Which dependencies are out of date this week?', agent_type: null, timestamp: '2026-11-21T09:00:00Z', tokens_used: 0, auth_mode: null },
    { id: 'm2', role: 'Agent', content: 'Three packages have a new minor version; none has a security advisory.', agent_type: 'ClaudeCode', timestamp: '2026-11-21T09:01:00Z', tokens_used: 0, auth_mode: null },
  ],
  message_count: 2,
  non_system_message_count: 2,
  archived: false,
  pinned: false,
  pin_first_message: false,
  tier: 'default',
  summary_strategy: 'Auto',
  introspection_call_count: 0,
  workspace_mode: 'Direct',
  created_at: '2026-11-21T09:00:00Z',
  updated_at: '2026-11-21T09:01:00Z',
  awaiting_agent: false,
};

async function mockApi(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(name => {
    localStorage.setItem('kronn:tour-completed', 'true');
    localStorage.setItem('kronn:theme', name);
  }, theme);
  await page.routeWebSocket(/\/api\/ws/, () => { /* offline */ });
  // Everything unknown is an empty success; specifics are registered after (they win).
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: ok([]) }));
  await page.route('**/api/setup/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: ok({ is_first_run: false, current_step: 'Complete', agents_detected: [], scan_paths_set: true, repos_detected: [], default_scan_path: null }) }));
  await page.route('**/api/config/ui-language', route => route.fulfill({ status: 200, contentType: 'application/json', body: ok('en') }));
  await page.route('**/api/ui-preferences', route => route.fulfill({ status: 200, contentType: 'application/json', body: ok({}) }));
  await page.route('**/api/health', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, in_docker: false, version: '0.15.3' }) }));
  await page.route('**/api/discussions', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { success: true, data: [{ ...discussion, messages: [] }], error: null } })
    : route.fallback());
  await page.route(`**/api/discussions/${DISC_ID}`, route => route.request().method() === 'GET'
    ? route.fulfill({ json: { success: true, data: discussion, error: null } })
    : route.fallback());
  await stubDiscussionPoll(page, DISC_ID, () => discussion);
}

for (const theme of ['light', 'dark'] as const) {
  test(`gallery: Notice, EmptyState, LoadingState (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockApi(page, theme);
    await page.goto('/config#design-system');
    for (const name of ['Notice', 'EmptyState', 'LoadingState']) {
      const section = page.locator(`section.ds-component[data-component="${name[0].toLowerCase()}${name.slice(1)}"]`);
      await section.scrollIntoViewIfNeeded({ timeout: 20_000 });
      await expect(section).toBeVisible();
      await section.screenshot({ path: `${OUT}/gallery-${name}-${theme}.png` });
    }
  });

  for (const width of [1440, 400] as const) {
    test(`toast stack beside the bell and the detail header (${theme}, ${width} px)`, async ({ page, context }) => {
      test.setTimeout(90_000);
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width, height: 800 });
      await mockApi(page, theme);
      await page.goto(`/discussions/${DISC_ID}`);
      const pill = page.locator('.disc-id-pill').first();
      await expect(pill).toBeVisible({ timeout: 20_000 });

      // Three gestures: three toasts on screen at once.
      for (let i = 0; i < 3; i++) {
        await pill.click();
        await page.waitForTimeout(1_700); // past the 1.5 s dedup window
      }
      const stack = page.locator('.kr-toast-stack');
      await expect(stack.locator('.kr-toast').first()).toBeVisible();
      await page.waitForTimeout(400);

      const bell = page.locator('.activity-bell').first();
      const stackBox = (await stack.boundingBox())!;
      const viewport = page.viewportSize()!;
      // Bottom right, inside the window.
      expect(stackBox.x + stackBox.width).toBeLessThanOrEqual(viewport.width);
      expect(stackBox.x).toBeGreaterThanOrEqual(0);
      expect(stackBox.y + stackBox.height).toBeLessThanOrEqual(viewport.height);
      // The bell, when the layout shows it, is not under the stack.
      if (await bell.isVisible()) {
        const bellBox = (await bell.boundingBox())!;
        const overlaps = bellBox.x < stackBox.x + stackBox.width && stackBox.x < bellBox.x + bellBox.width
          && bellBox.y < stackBox.y + stackBox.height && stackBox.y < bellBox.y + bellBox.height;
        expect(overlaps, 'the stack covers the bell').toBe(false);
      }
      await page.screenshot({ path: `${OUT}/toast-after-${theme}-${width}.png` });

      // Before: the old inline placement, 16 px from the top right.
      await stack.evaluate(el => {
        el.style.top = '16px';
        el.style.bottom = '';
        for (const item of el.querySelectorAll<HTMLElement>('.kr-toast')) {
          item.style.maxWidth = '420px';
          item.style.minWidth = '240px';
        }
      });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/toast-before-${theme}-${width}.png` });
    });
  }
}
