// KT-1880 — StatusBadge: one tone per --kr-status-* colour, the status always
// in words beside the colour.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StatusBadge } from './StatusBadge';
import { STATUS_TONES } from './statusTones';
import { DESIGN_TOKEN_GROUPS } from '../../styles/designTokens';

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'StatusBadge.css'), 'utf8');

describe('StatusBadge', () => {
  it('has one tone per status colour of the design tokens', () => {
    const status = DESIGN_TOKEN_GROUPS.find(g => g.scale === 'semanticColour')!.tokens
      .map(t => t.name).filter(n => n.startsWith('--kr-status-')).map(n => n.replace('--kr-status-', ''));
    expect([...STATUS_TONES].sort()).toEqual(status.sort());
    for (const tone of STATUS_TONES) expect(CSS, tone).toContain(`var(--kr-status-${tone})`);
  });

  it.each(STATUS_TONES)('shows the %s status in words, with a dot hidden from assistive technology', tone => {
    const { container } = render(<StatusBadge tone={tone}>State {tone}</StatusBadge>);
    const badge = container.firstElementChild!;
    expect(badge).toHaveAttribute('data-tone', tone);
    expect(badge).toHaveTextContent(`State ${tone}`);
    expect(badge.querySelector('.ui-status-badge-dot')).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes an icon instead of the dot', () => {
    render(<StatusBadge tone="success" icon={<svg data-testid="icon" />}>Merged</StatusBadge>);
    expect(screen.getByText('Merged').parentElement!.querySelector('.ui-status-badge-dot')).toBeNull();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});
