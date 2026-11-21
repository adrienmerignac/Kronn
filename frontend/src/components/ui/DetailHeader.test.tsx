import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailHeader } from './DetailHeader';
import { StatusBadge } from './StatusBadge';
import { describeHeaderContract } from '../../test/headerContract';

describeHeaderContract('DetailHeader', DetailHeader, 'detail');

describe('DetailHeader', () => {
  it('names the object (h2) with its id and state on the title line', () => {
    render(
      <DetailHeader
        title="Nightly digest"
        meta={<code>wf-42</code>}
        status={<StatusBadge tone="success">Active</StatusBadge>}
        description="Cron · every night"
        actions={<button type="button">Run now</button>}
      />,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Nightly digest');
    // The id and the state sit beside the heading, not inside its name.
    expect(heading).not.toHaveTextContent('wf-42');
    const row = heading.parentElement!;
    expect(row).toHaveTextContent('wf-42');
    expect(row).toHaveTextContent('Active');
  });

  it('keeps a long title on one line so the actions stay on screen', () => {
    const long = 'A very long discussion title '.repeat(10);
    render(<DetailHeader title={long} actions={<button type="button">Run now</button>} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('ui-header-title');
    expect(screen.getByRole('button', { name: 'Run now' }).closest('.ui-header-actions')).toBeTruthy();
  });
});
