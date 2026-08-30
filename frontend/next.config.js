/** @type {import('next').NextConfig} */

// headers() は `next build` 時に評価され routes-manifest.json に焼き込まれる
// （dev では next.config.js が都度読み直される）。そのため NODE_ENV も
// NEXT_PUBLIC_API_URL もビルド時の値が使われる。
const isProd = process.env.NODE_ENV === 'production';

// CSP の connect-src には API のオリジンを含める必要がある。
// 本番の NEXT_PUBLIC_API_URL は "/api"（相対パス＝同一オリジンなので 'self' で足りる）、
// 開発は http://localhost:8080/api のような絶対URLなのでそのオリジンを許可する。
function apiOrigin() {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null; // 相対パスはパースできない＝同一オリジン
  }
}

const connectSrc = ["'self'", apiOrigin()]
  // dev サーバはHMRのWebSocketを張る
  .concat(isProd ? [] : ['ws://localhost:*', 'http://localhost:*'])
  .filter(Boolean)
  .join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",

  // Next.js はハイドレーション用のインラインスクリプト（self.__next_f.push(...)）を
  // 出力するため 'unsafe-inline' が必要。nonce 方式にすれば外せるが、nonce は
  // リクエストごとに生成するため全ページが動的レンダリングになり、現在 static
  // prerender されている11ルートの利点を失う。本アプリは dangerouslySetInnerHTML を
  // 使わず、linkify も https? のみをリンク化して javascript: を弾いているため、
  // 現時点では静的生成を優先している。
  // dev は React Refresh が eval を使う。
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,

  // Tailwind / Next.js がインラインの <style> を出力する
  "style-src 'self' 'unsafe-inline'",

  // 画像は public/ 配下のみ。フォントは @fontsource で自己ホスト
  "img-src 'self' data: blob:",
  "font-src 'self' data:",

  `connect-src ${connectSrc}`,

  // Googleカレンダー埋め込み。app/embed-config/embed-url.ts 側でも
  // このオリジン以外は空文字に正規化している
  'frame-src https://calendar.google.com',

  // クリックジャッキング対策。X-Frame-Options は同等の意味を持つ後方互換用
  "frame-ancestors 'none'",

  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

if (isProd) {
  // HTTPS でのみ意味を持つ（HTTP で受け取ったブラウザは無視する仕様）が、
  // http://localhost の開発環境に誤って効かせないよう本番ビルドに限定する。
  // preload は付けない: 一度登録すると解除が難しく、CloudFront のドメインを
  // 変える余地を残しておきたい。
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  });
}

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
