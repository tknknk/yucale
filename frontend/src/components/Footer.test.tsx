import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('should render the footer component', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('should display the copyright notice with current year and MIT license', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear}.*ゆカレ.*MIT License`, 'i'))).toBeInTheDocument();
  });

  it('should display GitHub link with correct href', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: /github/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/tknknk/yucale');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should display about link with correct href', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: /ゆカレについて/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/about');
  });

  it('should have correct number of footer links', () => {
    render(<Footer />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });
});
