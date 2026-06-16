import { NextResponse } from 'next/server';
import { resolveEmbedUrl } from './embed-url';

// 起動時の環境変数を「実行時」に読み取って返す。
// NEXT_PUBLIC_* と違いビルド時に焼き込まれないため、イメージを再ビルドせず
// .env の変更＋コンテナ再起動だけで反映できる。
// 公開カレンダー想定のため値は秘匿情報ではないが、念のため信頼できる
// Google カレンダーの埋め込み URL 以外は空文字を返す。
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ url: resolveEmbedUrl(process.env.GOOGLE_CALENDAR_EMBED_URL) });
}
