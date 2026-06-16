import { resolveEmbedUrl } from './embed-url';

const VALID_URL =
  'https://calendar.google.com/calendar/embed?src=xxxxx%40import.calendar.google.com&ctz=Asia%2FTokyo';

describe('resolveEmbedUrl', () => {
  it('有効なGoogleカレンダー埋め込みURLはそのまま返す', () => {
    expect(resolveEmbedUrl(VALID_URL)).toBe(VALID_URL);
  });

  it('未設定(undefined)の場合は空文字を返す', () => {
    expect(resolveEmbedUrl(undefined)).toBe('');
  });

  it('空文字の場合は空文字を返す', () => {
    expect(resolveEmbedUrl('')).toBe('');
  });

  it('信頼できないオリジンのURLは空文字を返す', () => {
    expect(resolveEmbedUrl('https://evil.example.com/calendar/embed?src=x')).toBe('');
  });

  it('http(非https)のGoogleカレンダーURLは空文字を返す', () => {
    expect(resolveEmbedUrl('http://calendar.google.com/calendar/embed?src=x')).toBe('');
  });
});
