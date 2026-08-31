import { ReactNode } from 'react';

// URL正規表現パターン。
// 本文ではURLの直後にスペースなしで日本語が続くことがあるため（「…/abcです」など）、
// URLに使えるASCII文字だけを拾って全角文字を巻き込まないようにする。
export const URL_REGEX = /(https?:\/\/[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%]+)/g;

const DEFAULT_LINK_CLASS = 'text-primary-600 hover:text-primary-700 underline break-all';

// URLが同じドメインかどうかを判定する関数
export function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url).hostname === window.location.hostname;
  } catch {
    return false;
  }
}

// リンクの表示ラベルを取得する関数。
// 外部URLは長いとレイアウトが崩れるので、ドメイン（www.は除去）までに切り詰め、
// パス・クエリ・ハッシュが続く場合は省略されたことが分かるよう「/…」を付ける。
// 自サイトのURLはドメインが自明なので、逆にドメイン以降だけを
// 先頭のスラッシュと省略記号なしで表示する。
// パースできない場合は元のURLをそのまま表示する。
export function getLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    // ドメイン直下（パスなし）は自サイトでも表示するものがないのでホスト名を出す
    const hasPath = path !== '/';
    if (hasPath && isSameOrigin(url)) {
      return path.replace(/^\//, '');
    }
    const hostname = parsed.hostname.replace(/^www\./, '');
    return hasPath ? `${hostname}/…` : hostname;
  } catch {
    return url;
  }
}

// テキスト内のURLを、短縮表示（getLinkLabel）のリンクに変換する関数
export function linkifyText(text: string, linkClassName: string = DEFAULT_LINK_CLASS): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex for reuse
      URL_REGEX.lastIndex = 0;
      const sameOrigin = isSameOrigin(part);
      return (
        <a
          key={index}
          href={part}
          target={sameOrigin ? undefined : '_blank'}
          rel={sameOrigin ? undefined : 'noopener noreferrer'}
          className={linkClassName}
          title={part}
          onClick={(e) => e.stopPropagation()}
        >
          {getLinkLabel(part)}
        </a>
      );
    }
    return part;
  });
}
