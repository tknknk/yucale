import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GoogleCalendarEmbed from './GoogleCalendarEmbed';

const VALID_URL =
  'https://calendar.google.com/calendar/embed?src=xxxxx%40import.calendar.google.com&ctz=Asia%2FTokyo';

// /embed-config の fetch 応答をモックするヘルパー
const mockFetch = (impl: () => Promise<unknown>) => {
  (global.fetch as unknown) = jest.fn(impl);
};

describe('GoogleCalendarEmbed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('設定済みURLが返るとカレンダーのiframeを表示する', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ url: VALID_URL }) }));

    render(<GoogleCalendarEmbed />);

    const iframe = await screen.findByTitle('Google カレンダー');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', VALID_URL);
    expect(global.fetch).toHaveBeenCalledWith('/embed-config');
  });

  it('URLが空（未設定）の場合は何も表示しない', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ url: '' }) }));

    const { container } = render(<GoogleCalendarEmbed />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('fetchが失敗した場合は何も表示しない', async () => {
    mockFetch(async () => {
      throw new Error('network error');
    });

    const { container } = render(<GoogleCalendarEmbed />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('レスポンスがok以外の場合は何も表示しない', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({ url: VALID_URL }) }));

    const { container } = render(<GoogleCalendarEmbed />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
