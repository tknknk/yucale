'use client';

import { ReactNode, useEffect, useState } from 'react';

interface GoogleCalendarEmbedProps {
  // 見出し行の右側に置く操作（カレンダー購読ボタンなど）
  action?: ReactNode;
}

// Google カレンダーの埋め込み URL を実行時に取得して表示する。
// URL はビルド時に焼き込まず、`/embed-config` Route Handler 経由でサーバの
// 起動時環境変数（GOOGLE_CALENDAR_EMBED_URL）から取得する。これにより
// イメージを再ビルドせず .env の変更＋再起動だけで反映できる。
// URL が空（未設定 or 不正）の場合はカレンダーの代わりに未登録メッセージを表示する。
export default function GoogleCalendarEmbed({ action }: GoogleCalendarEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState('');
  // 取得完了までは iframe も未登録メッセージも出さない（一瞬メッセージが見えるのを防ぐ）
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/embed-config')
      .then((res) => (res.ok ? res.json() : { url: '' }))
      .then((data: { url?: string }) => {
        if (!cancelled) setEmbedUrl(data.url ?? '');
      })
      .catch(() => {
        // 取得失敗時は URL 未設定と同じ扱い
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
          カレンダー
        </h2>
        {action}
      </div>
      {embedUrl ? (
        <div className="bg-white border border-primary-100/50 rounded-2xl p-2 sm:p-4 shadow-soft overflow-hidden">
          <iframe
            src={embedUrl}
            title="Google カレンダー"
            className="w-full h-[480px] sm:h-[600px] rounded-xl border-0"
            loading="lazy"
            scrolling="no"
          />
        </div>
      ) : isLoaded ? (
        <div className="bg-white border border-primary-100/50 rounded-2xl p-8 text-center text-gray-800 shadow-soft">
          Google Calendarの共有リンクが登録されていません
        </div>
      ) : null}
    </section>
  );
}
