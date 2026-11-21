// KT-1880 — Tooltip: reachable by keyboard, dismissible with Escape,
// hoverable, and wired as the description of what it explains (WCAG 1.4.13).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TOOLTIP_CLOSE_DELAY_MS } from './Tooltip';

const tip = () => document.querySelector('[role="tooltip"]');

afterEach(() => vi.useRealTimers());

describe('Tooltip', () => {
  it('is closed at first and leaves the anchor without a description', () => {
    render(<Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip>);
    expect(tip()).toBeNull();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby');
  });

  it('opens on keyboard focus and describes the anchor', async () => {
    const user = userEvent.setup();
    render(<Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip>);
    await user.tab();
    const button = screen.getByRole('button', { name: 'Schedule' });
    expect(button).toHaveFocus();
    expect(tip()).toHaveTextContent('Runs every hour');
    expect(button).toHaveAccessibleDescription('Runs every hour');
    await user.tab();
    expect(tip()).toBeNull();
  });

  it('closes on Escape without moving focus, and opens again on the next focus', async () => {
    const user = userEvent.setup();
    render(<><Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip><button type="button">Next</button></>);
    await user.tab();
    expect(tip()).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(tip()).toBeNull();
    expect(screen.getByRole('button', { name: 'Schedule' })).toHaveFocus();
    await user.tab();
    await user.tab({ shift: true });
    expect(tip()).not.toBeNull();
  });

  it('opens on hover and stays while the pointer moves onto it', () => {
    vi.useFakeTimers();
    render(<Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip>);
    const anchor = screen.getByRole('button').parentElement!;
    fireEvent.mouseEnter(anchor);
    expect(tip()).not.toBeNull();

    fireEvent.mouseLeave(anchor);
    fireEvent.mouseEnter(tip()!);
    act(() => { vi.advanceTimersByTime(TOOLTIP_CLOSE_DELAY_MS * 2); });
    expect(tip()).not.toBeNull();

    fireEvent.mouseLeave(tip()!);
    act(() => { vi.advanceTimersByTime(TOOLTIP_CLOSE_DELAY_MS); });
    expect(tip()).toBeNull();
  });

  it('closes on Escape when opened by hover too', () => {
    render(<Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button').parentElement!);
    expect(tip()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(tip()).toBeNull();
  });

  it('keeps a description the anchor already had', async () => {
    render(
      <>
        <p id="own">Own hint</p>
        <Tooltip content="Runs every hour"><button type="button" aria-describedby="own">Schedule</button></Tooltip>
      </>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-describedby', 'own');
    await userEvent.setup().tab();
    expect(button.getAttribute('aria-describedby')).toMatch(/^own \S+$/);
    expect(button).toHaveAccessibleDescription('Own hint Runs every hour');
  });

  it('is rendered in <body>, so a clipped container does not hide it', async () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <Tooltip content="Runs every hour"><button type="button">Schedule</button></Tooltip>
      </div>,
    );
    await userEvent.setup().tab();
    expect(container.contains(tip())).toBe(false);
    expect(tip()!.parentElement).toBe(document.body);
    expect((tip() as HTMLElement).style.position).toBe('fixed');
  });
});
