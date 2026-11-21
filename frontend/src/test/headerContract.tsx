// KT-1884 — what each of the six header kinds guarantees, run against each:
// exactly one heading, at the level of its kind, in the normal and the
// compact form; the slots in their place (identity first, actions last);
// title sizes from the text scale, smaller when compact; plain content (never
// fixed or sticky); an axe run on both forms.
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HeaderSlots } from '../components/ui/headerFrame';
import { HEADER_LEVELS, type HeaderKind } from '../components/ui/headerKinds';
import { describeViolations, runAxe } from './axe';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'ui');
const TYPE_SCALE = ['sm', 'md', 'lg', 'xl', '2xl'];
const css = (file: string) => readFileSync(join(UI, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule whose selector is exactly `selector`. */
function rule(text: string, selector: string): string {
  const found = [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .find(([, sel]) => sel.split(',').map(s => s.trim()).includes(selector));
  return found ? found[2] : '';
}

function titleSize(text: string, selector: string): number {
  const size = rule(text, selector).match(/font-size:\s*var\(--kr-type-([a-z0-9]+)\)/)?.[1];
  return size ? TYPE_SCALE.indexOf(size) : -1;
}

export function describeHeaderContract(name: string, Header: ComponentType<HeaderSlots>, kind: HeaderKind) {
  const level = HEADER_LEVELS[kind];

  describe(`${name} — the shared header contract (KT-1884)`, () => {
    it.each([false, true])(`renders exactly one heading, an h${level}, compact=%s`, compact => {
      const { container } = render(
        <Header
          compact={compact}
          titleId="the-title"
          title="Nightly digest"
          description="Runs every night at 2:00"
          actions={<button type="button">Run now</button>}
        />,
      );
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(screen.getByRole('heading', { level, name: 'Nightly digest' })).toHaveAttribute('id', 'the-title');
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveAttribute('data-kind', kind);
      if (compact) expect(root).toHaveAttribute('data-compact');
      else expect(root).not.toHaveAttribute('data-compact');
    });

    it('puts the identity on the left and the actions last, each slot in its place', () => {
      const { container } = render(
        <Header
          leading={<span data-testid="leading">icon</span>}
          title="Nightly digest"
          meta={<span data-testid="meta">#42</span>}
          status={<span data-testid="status">Running</span>}
          description={<span data-testid="description">Every night</span>}
          actions={<button type="button">Run now</button>}
        />,
      );
      const root = container.firstElementChild as HTMLElement;
      const [identity, actions] = [...root.children];
      expect(identity).toHaveClass('ui-header-identity');
      expect(actions).toHaveClass('ui-header-actions');
      expect(root.children).toHaveLength(2);
      expect(identity.querySelector('.ui-header-leading')).toContainElement(screen.getByTestId('leading'));
      const titleRow = identity.querySelector('.ui-header-title-row')!;
      expect([...titleRow.children].map(child => child.className))
        .toEqual(['ui-header-title', 'ui-header-meta', 'ui-header-status']);
      expect(identity.querySelector('.ui-header-description')).toContainElement(screen.getByTestId('description'));
      expect(actions).toContainElement(screen.getByRole('button', { name: 'Run now' }));
    });

    it('draws no empty slot: a title alone is a title alone', () => {
      const { container } = render(<Header title="Nightly digest" />);
      const root = container.firstElementChild as HTMLElement;
      for (const slot of ['leading', 'meta', 'status', 'description', 'actions']) {
        expect(root.querySelector(`.ui-header-${slot}`), slot).toBeNull();
      }
    });

    it('takes its title sizes from the text scale, smaller in the compact form', () => {
      const own = css(`${name}.css`);
      const normal = titleSize(own, `.ui-${kind}-header .ui-header-title`);
      const compact = titleSize(own, `.ui-${kind}-header[data-compact] .ui-header-title`);
      expect(normal, 'normal title size').toBeGreaterThanOrEqual(0);
      expect(compact, 'compact title size').toBeGreaterThanOrEqual(0);
      expect(compact).toBeLessThan(normal);
    });

    it('is plain content: never fixed, sticky or above the page', () => {
      for (const file of [`${name}.css`, 'headerFrame.css']) {
        const text = css(file);
        expect(text, file).not.toMatch(/position:\s*(fixed|sticky|absolute)/);
        expect(text, file).not.toMatch(/z-index/);
      }
    });

    it.each([false, true])('passes axe, compact=%s', async compact => {
      render(
        <main>
          <Header
            compact={compact}
            title="Nightly digest"
            meta={<span>#42</span>}
            description="Every night"
            actions={<button type="button">Run now</button>}
          />
        </main>,
      );
      const results = await act(() => runAxe(document.body));
      // A lone h2 or h3 in a test page has no h1 above it: that page rule is
      // the page's, not the header's.
      const own = results.violations.filter(v => v.id !== 'page-has-heading-one');
      expect(describeViolations({ ...results, violations: own })).toEqual([]);
    });
  });
}
