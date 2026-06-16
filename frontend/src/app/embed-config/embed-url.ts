// 信頼できる Google カレンダーの埋め込み URL 以外は空文字に正規化する。
// next/server に依存しない純粋関数として切り出し、ルートハンドラとテストの双方から使う。
export function resolveEmbedUrl(value: string | undefined): string {
  return value?.startsWith('https://calendar.google.com/calendar/embed') ? value : '';
}
