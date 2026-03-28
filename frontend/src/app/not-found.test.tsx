import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound', () => {
  it('should render the 404 heading', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should display "ページが見つかりません" message', () => {
    render(<NotFound />);

    expect(screen.getByText('ページが見つかりません')).toBeInTheDocument();
  });

  it('should display the description text', () => {
    render(<NotFound />);

    expect(
      screen.getByText('お探しのページは存在しないか、移動した可能性があります。')
    ).toBeInTheDocument();
  });

  it('should render a link to home page', () => {
    render(<NotFound />);

    const link = screen.getByRole('link', { name: /ホームに戻る/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('should have the home icon in the link', () => {
    render(<NotFound />);

    const link = screen.getByRole('link', { name: /ホームに戻る/ });
    const svg = link.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
