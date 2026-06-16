'use client';

import { useEffect, useState } from 'react';

// Google カレンダーの埋め込み URL を実行時に取得して表示する。
// URL はビルド時に焼き込まず、`/embed-config` Route Handler 経由でサーバの
// 起動時環境変数（GOOGLE_CALENDAR_EMBED_URL）から取得する。これにより
// イメージを再ビルドせず .env の変更＋再起動だけで反映できる。
// URL が空（未設定 or 不正）の場合は何も表示しない。
export default function GoogleCalendarEmbed() {
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/embed-config')
      .then((res) => (res.ok ? res.json() : { url: '' }))
      .then((data: { url?: string }) => {
        if (!cancelled) setEmbedUrl(data.url ?? '');
      })
      .catch(() => {
        // 取得失敗時は非表示のまま
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!embedUrl) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-6">
        カレンダー
      </h2>
      <div className="bg-white border border-primary-100/50 rounded-2xl p-2 sm:p-4 shadow-soft overflow-hidden">
        <iframe
          src={embedUrl}
          title="Google カレンダー"
          className="w-full h-[480px] sm:h-[600px] rounded-xl border-0"
          loading="lazy"
          scrolling="no"
        />
      </div>
    </section>
  );
}
