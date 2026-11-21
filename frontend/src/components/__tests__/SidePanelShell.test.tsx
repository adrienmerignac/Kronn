import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SidePanelShell } from '../SidePanelShell';
import { SidePanelHeaderSlot } from '../SidePanelHeaderSlot';
import { cssText } from '../../test/cssBlocks';

function Harness({ onDelete = vi.fn(), onClose = vi.fn() }: { onDelete?: () => void; onClose?: () => void }) {
  const [active, setActive] = useState('settings');
  return (
    <SidePanelShell
      testId="shell"
      ariaLabel="Panels"
      title="My discussion"
      railLabel="Discussion panels"
      activeId={active}
      onSelect={setActive}
      onClose={onClose}
      closeLabel="Close"
      menuLabel="More actions"
      menuActions={[
        { id: 'export', label: 'Export', icon: null, onSelect: vi.fn() },
        { id: 'delete', label: 'Delete', icon: null, danger: true, onSelect: onDelete },
      ]}
      items={[
        { id: 'settings', label: 'Settings', description: 'Discussion settings', icon: null },
        { id: 'plan', label: 'Plan', icon: null, badge: 3 },
        { id: 'git', label: 'Git', icon: null },
      ]}
    >
      <p>body of {active}</p>
    </SidePanelShell>
  );
}

describe('SidePanelShell', () => {
  it('renders a vertical tablist named by the visible labels, with the title in the header', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'My discussion' })).toBeInTheDocument();
    const rail = screen.getByRole('tablist', { name: 'Discussion panels' });
    expect(rail).toHaveAttribute('aria-orientation', 'vertical');
    const settings = screen.getByRole('tab', { name: 'Settings' });
    expect(settings).toHaveAttribute('aria-selected', 'true');
    expect(settings).toHaveAttribute('title', 'Discussion settings');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('body of settings');
    expect(screen.getByRole('tab', { name: /Plan/ })).toHaveTextContent('3');
  });

  it('shows a badge only on the tab that has one, and carries no badge otherwise', () => {
    const { container } = render(<Harness />);
    const badges = container.querySelectorAll('.side-panel-shell-badge');
    expect(badges).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /Plan/ }).querySelector('.side-panel-shell-badge')?.textContent).toBe('3');
    expect(screen.getByRole('tab', { name: 'Git' }).querySelector('.side-panel-shell-badge')).toBeNull();
  });

  it('moves between tabs with the arrow keys, Home and End', () => {
    render(<Harness />);
    const rail = screen.getByRole('tablist');
    fireEvent.keyDown(rail, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: /Plan/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Plan/ })).toHaveFocus();
    fireEvent.keyDown(rail, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Git' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(rail, { key: 'ArrowDown' });
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(rail, { key: 'ArrowUp' });
    expect(screen.getByRole('tab', { name: 'Git' })).toHaveAttribute('aria-selected', 'true');
  });

  it('runs actions from the « ⋯ » menu and closes from the header', () => {
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(<Harness onDelete={onDelete} onClose={onClose} />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the menu on Escape without letting the key reach the page', () => {
    const pageEscape = vi.fn();
    window.addEventListener('keydown', pageEscape);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Export' }), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(pageEscape).not.toHaveBeenCalled();
    window.removeEventListener('keydown', pageEscape);
  });
});

/** A view as the six discussion panels are: its own header when it stands
 *  alone, its meta and actions handed to the shell inside it. */
function View({ name, count, onRefresh }: { name: string; count?: number; onRefresh?: () => void }) {
  return (
    <aside aria-label={name}>
      <SidePanelHeaderSlot
        meta={count != null ? <span>{count} items</span> : undefined}
        actions={onRefresh ? <button type="button" onClick={onRefresh}>Refresh</button> : undefined}
        standalone={<header className="view-own-header"><h2>{name}</h2></header>}
      />
      <p>content of {name}</p>
    </aside>
  );
}

function ViewsHarness({ onRefresh }: { onRefresh: () => void }) {
  const [active, setActive] = useState('files');
  return (
    <SidePanelShell
      testId="shell"
      ariaLabel="Panels"
      title="My discussion"
      railLabel="Discussion panels"
      activeId={active}
      onSelect={setActive}
      onClose={vi.fn()}
      closeLabel="Close"
      closeTestId="shell-close"
      menuLabel="More actions"
      menuActions={[
        { id: 'export', label: 'Export', icon: null, onSelect: vi.fn() },
        { id: 'copy-id', label: 'Copy the id', icon: null, onSelect: vi.fn() },
        { id: 'delete', label: 'Delete', icon: null, danger: true, onSelect: vi.fn() },
      ]}
      items={[
        { id: 'files', label: 'Files', icon: null },
        { id: 'git', label: 'Git', icon: null },
        { id: 'settings', label: 'Settings', icon: null },
      ]}
    >
      {active === 'files' && <View name="Files" count={3} />}
      {active === 'git' && <View name="Git" onRefresh={onRefresh} />}
      {active === 'settings' && <View name="Settings" />}
    </SidePanelShell>
  );
}

describe('SidePanelShell — one header above its tabs (KT-1884)', () => {
  it('shows one header, whatever the view: its title, the view name and meta, the view actions', () => {
    const onRefresh = vi.fn();
    render(<ViewsHarness onRefresh={onRefresh} />);
    const shell = screen.getByTestId('shell');
    for (const tab of within(shell).getAllByRole('tab')) {
      fireEvent.click(tab);
      expect(within(shell).getAllByRole('heading'), `${tab.textContent}: one heading`).toHaveLength(1);
      expect(within(shell).getByRole('heading', { level: 2 })).toHaveTextContent('My discussion');
      expect(shell.querySelector('.view-own-header'), `${tab.textContent}: no header of its own`).toBeNull();
      expect(shell.querySelectorAll('.ui-header')).toHaveLength(1);
      expect(shell.querySelector('.side-panel-shell-view')).toHaveTextContent(tab.textContent!);
    }

    // The header sits above the rail and the view, never inside them.
    const header = shell.querySelector('.ui-drawer-header')!;
    expect(header.nextElementSibling).toHaveClass('side-panel-shell-main');

    fireEvent.click(within(shell).getByRole('tab', { name: 'Files' }));
    expect(shell.querySelector('.side-panel-shell-meta')).toHaveTextContent('3 items');
    fireEvent.click(within(shell).getByRole('tab', { name: 'Git' }));
    expect(shell.querySelector('.side-panel-shell-meta')).toBeEmptyDOMElement();
    const refresh = within(header as HTMLElement).getByRole('button', { name: 'Refresh' });
    fireEvent.click(refresh);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    // The view's actions, then the menu, then the close button, last.
    const buttons = within(header as HTMLElement).getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Refresh', 'More actions', 'Close']);
  });

  it('draws the view\'s own header when the view stands alone', () => {
    render(<View name="Files" count={3} />);
    expect(screen.getByRole('heading', { name: 'Files' })).toBeInTheDocument();
  });

  it('opens the menu in <body>, out of the panel, so no view header can sit over its entries', () => {
    render(<ViewsHarness onRefresh={vi.fn()} />);
    const shell = screen.getByTestId('shell');
    fireEvent.click(screen.getByTestId('side-panel-menu-btn'));
    const menu = screen.getByRole('menu');
    expect(shell).not.toContainElement(menu);
    expect(menu.parentElement).toBe(document.body);
    // Delete is the one destructive entry: last, after a separator.
    expect(within(menu).getAllByRole('menuitem').map(i => i.textContent)).toEqual(['Export', 'Copy the id', 'Delete']);
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-destructive', 'true');
  });
});

// ── Reachability at every width (KT-1884) ─────────────────────────────────────
// happy-dom computes no layout, so the rule is read from the stylesheets: the
// shell's body is a positioned, isolated box, and the shell's rule on a view
// wins over every rule a view's root has for its own placement.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHELL_CSS = join(SRC, 'components', 'SidePanelShell.css');
/** The root classes of the six views of the discussion side panel. */
const VIEW_ROOTS = [
  'disc-tool-panel', 'disc-settings-panel', 'plan-panel', 'git-panel', 'terminal-panel',
  'disc-assets-panel', 'disc-notes-panel',
];

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : cssFiles(path);
    return name.endsWith('.css') ? [path] : [];
  });
}

function rulesOf(text: string): { selector: string; body: string }[] {
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, sel, body]) =>
    sel.replace(/@media[^{]*$/, '').split(',').map(s => s.trim()).filter(Boolean).map(selector => ({ selector, body })));
}

/** [ids, classes + attributes + pseudo-classes, elements]. */
function specificity(selector: string): [number, number, number] {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
  const elements = (selector.replace(/\[[^\]]*\]|[.#:][\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return [ids, classes, elements];
}

const greater = (a: number[], b: number[]) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];

describe('SidePanelShell — the rail, the header and the menu stay reachable (KT-1884)', () => {
  const shell = cssText(SHELL_CSS);
  const SHELL_VIEW = '.side-panel-shell .side-panel-shell-body > *';
  const shellView = rulesOf(shell).filter(r => r.selector === SHELL_VIEW).map(r => r.body).join(';');

  it('keeps each view inside the body: a positioned, isolated box', () => {
    const body = rulesOf(shell).filter(r => r.selector === '.side-panel-shell-body').map(r => r.body).join(';');
    expect(body).toMatch(/position:\s*relative/);
    expect(body).toMatch(/isolation:\s*isolate/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(shellView).toMatch(/position:\s*relative/);
    expect(shellView).toMatch(/inset:\s*auto/);
    expect(shellView).toMatch(/z-index:\s*auto/);
  });

  it('wins over every placement a view root takes for itself, at every width (the Files view under 768px)', () => {
    const placing = /(?:^|;)\s*(position|z-index|inset|top|left|right|bottom)\s*:/;
    const offenders = cssFiles(SRC).filter(file => file !== SHELL_CSS).flatMap(file =>
      rulesOf(cssText(file))
        .filter(({ selector, body }) => {
          const last = selector.split(/[\s>+~]+/).pop() ?? '';
          return VIEW_ROOTS.some(root => new RegExp(`\\.${root}(?![\\w-])`).test(last)) && placing.test(body);
        })
        .map(({ selector }) => ({ file: file.slice(SRC.length + 1), selector })));
    // The Files view's own full-screen rule is among them: the check is not vacuous.
    expect(offenders.map(o => o.selector)).toContain('.disc-assets-panel');
    for (const { file, selector } of offenders) {
      expect(greater(specificity(SHELL_VIEW), specificity(selector)), `${file}: ${selector}`).toBe(true);
    }
  });

  it('lets the view shrink to the window under 768px', () => {
    const narrow = shell.slice(shell.indexOf('@media (max-width: 767px)'));
    expect(narrow).toMatch(/\.side-panel-shell \.side-panel-shell-body > \*\s*\{[^}]*min-width:\s*0/);
  });
});
