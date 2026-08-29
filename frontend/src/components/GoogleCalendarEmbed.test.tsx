import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GoogleCalendarEmbed from './GoogleCalendarEmbed';

const VALID_URL =
  'https://calendar.google.com/calendar/embed?src=xxxxx%40import.calendar.google.com&ctz=Asia%2FTokyo';

const NOT_CONFIGURED_MESSAGE = 'Google Calendarの共有リンクが登録されていません';

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

  it('action を見出し行に表示する', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ url: VALID_URL }) }));

    render(<GoogleCalendarEmbed action={<button>カレンダーを購読</button>} />);

    await screen.findByTitle('Google カレンダー');
    expect(screen.getByRole('button', { name: 'カレンダーを購読' })).toBeInTheDocument();
  });

  it('URLが未設定でも action は表示する', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ url: '' }) }));

    render(<GoogleCalendarEmbed action={<button>カレンダーを購読</button>} />);

    expect(await screen.findByText(NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'カレンダーを購読' })).toBeInTheDocument();
  });

  it('URLが空（未設定）の場合は未登録メッセージを表示する', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ url: '' }) }));

    render(<GoogleCalendarEmbed />);

    expect(await screen.findByText(NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
  });

  it('fetchが失敗した場合は未登録メッセージを表示する', async () => {
    mockFetch(async () => {
      throw new Error('network error');
    });

    render(<GoogleCalendarEmbed />);

    expect(await screen.findByText(NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
  });

  it('レスポンスがok以外の場合は未登録メッセージを表示する', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({ url: VALID_URL }) }));

    render(<GoogleCalendarEmbed />);

    expect(await screen.findByText(NOT_CONFIGURED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByTitle('Google カレンダー')).not.toBeInTheDocument();
  });

  it('取得完了前は未登録メッセージを表示しない', () => {
    mockFetch(() => new Promise(() => {}));

    render(<GoogleCalendarEmbed />);

    // 見出しは出るが、判定がつくまでメッセージは出さない
    expect(screen.getByRole('heading', { name: 'カレンダー' })).toBeInTheDocument();
    expect(screen.queryByText(NOT_CONFIGURED_MESSAGE)).not.toBeInTheDocument();
  });
});
