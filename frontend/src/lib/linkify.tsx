import { ReactNode } from 'react';

// URL正規表現パターン
export const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

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
// 長いURLでレイアウトが崩れないよう、ドメイン（www.は除去）までに切り詰める。
// パス・クエリ・ハッシュが続く場合は省略されたことが分かるよう「/…」を付ける。
// パースできない場合は元のURLをそのまま表示する。
export function getLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const hasMore =
      (parsed.pathname && parsed.pathname !== '/') || !!parsed.search || !!parsed.hash;
    return hasMore ? `${hostname}/…` : hostname;
  } catch {
    return url;
  }
}

// テキスト内のURLを、ドメインまでを表示するリンクに変換する関数
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
