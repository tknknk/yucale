import AboutCTA from './AboutCTA';

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

      {/* CTA - Client Component for auth check */}
      <AboutCTA />
    </div>
  );
}
