import AboutCTA from './AboutCTA';
import { ReactNode } from 'react';

// 購読手順のスクリーンショット。public/images/subscribe 配下の画像を表示する。
// 縦長（スマホ）の画像は幅を抑えて中央寄せ、横長（PC）は本文幅いっぱいに表示する。
function Screenshot({ src, caption, portrait }: { src: string; caption: string; portrait?: boolean }) {
  return (
    <figure className="my-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption}
        loading="lazy"
        className={`rounded-lg border border-gray-200 shadow-sm ${portrait ? 'w-full max-w-xs mx-auto' : 'w-full'}`}
      />
      <figcaption className="mt-1 text-xs text-gray-500 text-center">{caption}</figcaption>
    </figure>
  );
}

// カレンダーアプリごとの購読手順を表示する展開ブロック（ネイティブ <details>）。
function SubscribeGuide({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
        <span>{title}</span>
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-1 text-sm text-gray-800 leading-relaxed border-t border-gray-100">
        {children}
      </div>
    </details>
  );
}

// 各手順内で使う注意書き（アンバー）。
function GuideNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// トップページの「カレンダーを購読」ボタンの見た目を文中にインラインで再現する。
// 実際のボタン（CalendarSubscribeLink）は表示幅で見た目が変わる
// （モバイル: アイコンのみの丸ボタン / PC: アイコン+「購読」ボタン）ため、同じ分岐で表示する。
function SubscribeButtonHint() {
  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  return (
    <>
      {/* モバイル: アイコンのみの丸ボタン */}
      <span
        className="sm:hidden inline-flex items-center justify-center align-middle w-7 h-7 mx-0.5 rounded-full border border-primary-300 bg-white text-primary-600 shadow-sm"
        aria-label="カレンダーを購読"
      >
        {icon}
      </span>
      {/* PC: アイコン+「購読」ボタン */}
      <span
        className="hidden sm:inline-flex items-center align-middle mx-0.5 px-2.5 py-1 rounded-md border border-primary-300 bg-white text-primary-600 text-xs font-medium shadow-sm"
        aria-label="カレンダーを購読"
      >
        <span className="mr-1">{icon}</span>
        購読
      </span>
    </>
  );
}

export default function AboutPage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">ゆカレについて</h2>

      {/* Overview */}
      <section className="mb-10">
        <p className="text-gray-800 leading-relaxed">
          ゆカレは、スケジュールを共有・管理できるサービスです。<br/>
          予定の確認、お知らせ機能、出欠調査機能など、グループでの活動をサポートします。
        </p>
      </section>

      {/* Features */}
      <section className="mb-10">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">主な機能</h3>

        <div className="space-y-6">
          {/* Schedule Management */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">スケジュール管理</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  予定の作成・編集・削除が可能です。終日イベントにも対応しており、
                  場所や詳細情報も登録できます。直近の予定はトップページで確認できます。
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Subscription */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">カレンダー購読</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  登録されたスケジュールをICS形式でカレンダーとして配信します。<br/>
                  Google Calendar、Apple Calendar、Outlookなどのカレンダーアプリに登録すると、
                  予定が自動的に同期されます。
                </p>
                <a
                  href="#calendar-subscription"
                  className="inline-flex items-center mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  購読方法を見る
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">お知らせ</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  重要な連絡事項やお知らせを確認できます。<br/>
                  最新のお知らせはトップページに表示され、過去のお知らせ一覧もお知らせ一覧から閲覧できます。
                </p>
              </div>
            </div>
          </div>

          {/* Survey */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">出欠調査</h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  日程調整用の出欠調査に回答できます。<br/>
                  スケジュールに紐づいた出欠調査で、参加可否や希望日程を簡単に回答できます。<br/>
                  URLを共有することで、サービスへのログインなしでも回答可能です。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-10">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">使い方</h3>

        <ol className="space-y-4">
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <p className="text-gray-800 font-medium">アカウントを登録</p>
              <p className="text-gray-800 text-sm">メールアドレスとパスワードで登録します。</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <p className="text-gray-800 font-medium">ロールをリクエスト</p>
              <p className="text-gray-800 text-sm">ユーザーページから閲覧権限をリクエストします。</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <p className="text-gray-800 font-medium">スケジュールを確認</p>
              <p className="text-gray-800 text-sm">承認後、すべての予定やお知らせを確認できます。</p>
            </div>
          </li>
        </ol>
      </section>

      {/* User Roles */}
      <section className="mb-10">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">ユーザーロール</h3>
        <p className="text-gray-800 mb-4">
          ゆカレでは、ロールに応じてアクセスできる機能が異なります。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800 border-b">ロール</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-800 border-b">できること</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">非ログイン</td>
                <td className="px-4 py-3 text-sm text-gray-800">直近のスケジュールの概要表示（タイトルと日付）、出欠調査への回答</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">NO_ROLE</td>
                <td className="px-4 py-3 text-sm text-gray-800">非ログインの権限 + 出欠調査回答の編集</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">VIEWER</td>
                <td className="px-4 py-3 text-sm text-gray-800">NO_ROLEの権限 + スケジュールの詳細・一覧表示、お知らせ表示</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">EDITOR</td>
                <td className="px-4 py-3 text-sm text-gray-800">VIEWERの権限 + スケジュール・お知らせ・出欠調査の作成・編集・削除、出欠調査結果の表示</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">ADMIN</td>
                <td className="px-4 py-3 text-sm text-gray-800">EDITORの権限 + ユーザー管理・権限管理</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-800 text-sm mt-4">
          新規登録後は管理者にロールをリクエストしてください。
        </p>
      </section>

      {/* Calendar Subscription How-to */}
      <section id="calendar-subscription" className="mb-10 scroll-mt-24">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">カレンダーの購読方法</h3>
        <p className="text-gray-800 mb-6 text-sm leading-relaxed">
          トップページや「すべての予定」ページの「カレンダーを購読」ボタンから購読URLをコピーし、
          お使いのカレンダーアプリに登録してください。各アプリでの手順は以下のとおりです。
        </p>

        <div className="space-y-3">
          {/* Google Calendar */}
          <SubscribeGuide title="Google Calendar で購読する">
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>トップページの<SubscribeButtonHint />から購読URLをコピーします。</li>
              <li>PCのブラウザで Google カレンダーを開き、左側の「他のカレンダー」の「＋」をクリックします（①）。</li>
              <li>メニューから「URL で追加」を選択します（②）。</li>
              <li>「カレンダーの URL」にコピーした購読URLを貼り付け（④）、「カレンダーを追加」をクリックします（③）。</li>
            </ol>
            <GuideNote>
              登録はPCからのみ可能です。スマートフォンのGoogleカレンダーアプリからはURLでの追加に対応していません。
            </GuideNote>
            <Screenshot src="/images/subscribe/google_1.png" caption="①「他のカレンダー」の「＋」をクリック" />
            <Screenshot src="/images/subscribe/google_2.png" caption="②「URL で追加」を選択" />
            <Screenshot src="/images/subscribe/google_3.png" caption="③④ 購読URLを貼り付けて「カレンダーを追加」" />
          </SubscribeGuide>

          {/* iOS Calendar */}
          <SubscribeGuide title="iOS のカレンダーで購読する">
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>トップページの<SubscribeButtonHint />から購読URLをコピーします。</li>
              <li>iOSの「カレンダー」アプリを開き、下部中央の「カレンダー」ボタンをタップします（①）。</li>
              <li>一覧の下部にある「カレンダーを追加」をタップします（②）。</li>
              <li>表示されるメニューから「照会カレンダーを追加」をタップします（③）。</li>
              <li>「照会先」にコピーした購読URLを貼り付け（④）、右上の完了（チェック）をタップします（⑤）。</li>
            </ol>
            <Screenshot src="/images/subscribe/ios1.png" caption="① 下部の「カレンダー」ボタンをタップ" portrait />
            <Screenshot src="/images/subscribe/ios2.png" caption="②「カレンダーを追加」をタップ" portrait />
            <Screenshot src="/images/subscribe/ios3.png" caption="③「照会カレンダーを追加」を選択" portrait />
            <Screenshot src="/images/subscribe/ios4.png" caption="④⑤ 購読URLを貼り付けて完了" portrait />
          </SubscribeGuide>

          {/* TimeTree */}
          <SubscribeGuide title="TimeTree で確認する">
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>先に上記「iOS のカレンダーで購読する」の手順で、iOSのカレンダーに購読を追加します。</li>
              <li>TimeTreeアプリを開き、右下の「その他」タブをタップします（①）。</li>
              <li>「外部カレンダーの表示」をタップします（②）。</li>
              <li>「フルアクセスを許可」をタップし、端末のカレンダーへのアクセスを許可します（③）。</li>
              <li>iOSのカレンダーで購読した予定がTimeTree上にも表示されます。</li>
            </ol>
            <GuideNote>
              TimeTree単体では購読できません。iOSでのみ利用可能で、先にiOSのカレンダーで購読し、
              iOSのカレンダーと同期させることでTimeTree上で確認できます。
            </GuideNote>
            <Screenshot src="/images/subscribe/time_tree1.png" caption="①「その他」タブ →②「外部カレンダーの表示」" portrait />
            <Screenshot src="/images/subscribe/time_tree2.png" caption="③「フルアクセスを許可」をタップ" portrait />
          </SubscribeGuide>
        </div>
      </section>

      {/* CTA - Client Component for auth check */}
      <AboutCTA />
    </div>
  );
}
