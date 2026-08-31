import React from 'react';
import { render, screen } from '@testing-library/react';
import { getLinkLabel, isSameOrigin, linkifyText } from './linkify';

describe('getLinkLabel', () => {
  it('should return the hostname for a domain-only URL', () => {
    expect(getLinkLabel('https://example.com')).toBe('example.com');
    expect(getLinkLabel('https://example.com/')).toBe('example.com');
  });

  it('should strip the www prefix', () => {
    expect(getLinkLabel('https://www.example.com')).toBe('example.com');
  });

  it('should append an ellipsis when a path, query or hash is omitted', () => {
    expect(getLinkLabel('https://example.com/a/b/c')).toBe('example.com/…');
    expect(getLinkLabel('https://example.com/?q=1')).toBe('example.com/…');
    expect(getLinkLabel('https://example.com/#section')).toBe('example.com/…');
  });

  it('should keep the subdomain', () => {
    expect(getLinkLabel('https://docs.example.co.jp/page')).toBe('docs.example.co.jp/…');
  });

  it('should show only the path, without the leading slash, for a URL on the current hostname', () => {
    expect(getLinkLabel(`${window.location.origin}/survey/abc`)).toBe('survey/abc');
    expect(getLinkLabel(`${window.location.origin}/survey/abc?tab=results#top`)).toBe(
      'survey/abc?tab=results#top'
    );
  });

  it('should show the hostname for the top page of the current hostname', () => {
    expect(getLinkLabel(window.location.origin)).toBe(window.location.hostname);
    expect(getLinkLabel(`${window.location.origin}/`)).toBe(window.location.hostname);
  });

  it('should fall back to the original string when parsing fails', () => {
    expect(getLinkLabel('not a url')).toBe('not a url');
  });
});

describe('isSameOrigin', () => {
  it('should return true for a URL on the current hostname', () => {
    expect(isSameOrigin(`${window.location.origin}/schedule/abc`)).toBe(true);
  });

  it('should return false for an external URL', () => {
    expect(isSameOrigin('https://example.com')).toBe(false);
  });

  it('should return false for an unparseable string', () => {
    expect(isSameOrigin('not a url')).toBe(false);
  });
});

describe('linkifyText', () => {
  it('should render plain text unchanged', () => {
    render(<p>{linkifyText('リンクなしのテキスト')}</p>);

    expect(screen.getByText('リンクなしのテキスト')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should render a link labeled with the domain and keep the full URL in href/title', () => {
    const url = 'https://www.example.com/very/long/path?a=1';
    render(<p>{linkifyText(`会場は ${url} です`)}</p>);

    const link = screen.getByRole('link', { name: 'example.com/…' });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('title', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render multiple URLs as separate links', () => {
    render(<p>{linkifyText('https://example.com/a と http://test.org/b')}</p>);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/a');
    expect(links[1]).toHaveAttribute('href', 'http://test.org/b');
  });

  it('should not open same-origin links in a new tab, and label them with the path', () => {
    render(<p>{linkifyText(`${window.location.origin}/schedule/abc`)}</p>);

    const link = screen.getByRole('link', { name: 'schedule/abc' });
    expect(link).toHaveAttribute('href', `${window.location.origin}/schedule/abc`);
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('should not swallow a multibyte character that follows the URL', () => {
    const { container } = render(<p>{linkifyText('会場はhttps://example.com/abcです')}</p>);

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/abc');
    expect(container.textContent).toBe('会場はexample.com/…です');
  });

  it('should not swallow a multibyte character that follows a same-origin URL', () => {
    const { container } = render(
      <p>{linkifyText(`${window.location.origin}/survey/abcです`)}</p>
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `${window.location.origin}/survey/abc`
    );
    expect(container.textContent).toBe('survey/abcです');
  });

  it('should accept a custom link class name', () => {
    render(<p>{linkifyText('https://example.com', 'custom-link')}</p>);

    expect(screen.getByRole('link')).toHaveClass('custom-link');
  });
});
