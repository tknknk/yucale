'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { Survey, SurveyResponse } from '@/types/survey';
import { getSurvey, getSurveyResults, surveysApi } from '@/lib/surveys';
import SurveyResponseForm from '@/components/SurveyResponseForm';
import SurveyResultsTable from '@/components/SurveyResultsTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isPast } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function SurveyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();

  const urlId = params.urlId as string;
  const initialTab = searchParams.get('tab') || 'response';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyWithResults, setSurveyWithResults] = useState<Survey | null>(null);
  const [myResponses, setMyResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'response' | 'results'>(
    initialTab === 'results' ? 'results' : 'response'
  );
  const [urlCopied, setUrlCopied] = useState(false);

  const canViewResults = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const canDelete = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  const fetchSurvey = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSurvey(urlId);
      setSurvey(data);

      // Fetch my responses if authenticated
      if (isAuthenticated) {
        try {
          const responses = await surveysApi.getMyResponses(urlId);
          setMyResponses(responses);
        } catch {
          // Ignore error if not authenticated or no responses
        }
      }

      // Fetch results if can view
      if (canViewResults) {
        try {
          const results = await getSurveyResults(urlId);
          setSurveyWithResults(results);
        } catch {
          // Ignore error
        }
      }
    } catch (err) {
      console.error('Failed to fetch survey:', err);
      setError('出欠調査の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [urlId, isAuthenticated, canViewResults]);

  useEffect(() => {
    if (!authLoading) {
      fetchSurvey();
    }
  }, [authLoading, fetchSurvey]);

  const handleDelete = async () => {
    if (!survey || !confirm('この出欠調査を削除しますか？')) return;

    try {
      await surveysApi.delete(survey.id);
      router.push('/survey');
    } catch (err) {
      console.error('Failed to delete survey:', err);
      alert('出欠調査の削除に失敗しました');
    }
  };

  const handleResponseSuccess = () => {
    fetchSurvey();
  };

  // 初回ロード時のみローディングスピナーを表示（データ更新時は既存コンテンツを維持）
  if ((loading && !survey) || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error || '出欠調査が見つかりません'}
        </div>
        {isAuthenticated && (
          <Link href="/survey" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
            一覧に戻る
          </Link>
        )}
      </div>
    );
  }

  const isDeadlinePassed = survey.deadlineAt && isPast(parseISO(survey.deadlineAt));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        {/* Title and buttons row */}
        <div className="flex justify-between items-start gap-2">
          <h2 className="text-2xl font-bold text-gray-800 truncate">{survey.title}</h2>
          {/* Desktop buttons - hidden on mobile */}
          <div className="hidden sm:flex gap-2 flex-shrink-0">
            {canViewResults && (
              <Link
                href={`/survey/edit/${survey.urlId}`}
                className="px-3 py-1 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 whitespace-nowrap"
              >
                編集
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap"
              >
                削除
              </button>
            )}
            {isAuthenticated && (
              <Link
                href="/survey"
                className="px-3 py-1 text-sm font-medium text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
              >
                一覧に戻る
              </Link>
            )}
          </div>
        </div>
        {/* Description row */}
        {survey.description && (
          <p className="mt-2 text-gray-800 whitespace-pre-wrap">{survey.description}</p>
        )}
        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-800">
          <span>作成者: {survey.createdByUsername}</span>
          {survey.deadlineAt && (
            <>
              <span>|</span>
              <span className={isDeadlinePassed ? 'text-red-500' : ''}>
                締切: {format(parseISO(survey.deadlineAt), 'yyyy/MM/dd', { locale: ja })}
                {isDeadlinePassed && ' (締切済)'}
              </span>
            </>
          )}
        </div>
        {/* Mobile buttons - visible only on mobile, at the bottom */}
        {(canViewResults || canDelete || isAuthenticated) && (
          <div className="flex sm:hidden gap-2 mt-3 pt-3 border-t border-gray-200">
            {canViewResults && (
              <Link
                href={`/survey/edit/${survey.urlId}`}
                className="px-3 py-1 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 whitespace-nowrap"
              >
                編集
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap"
              >
                削除
              </button>
            )}
            {isAuthenticated && (
              <Link
                href="/survey"
                className="px-3 py-1 text-sm font-medium text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
              >
                一覧に戻る
              </Link>
            )}
          </div>
        )}

        {/* Share URL - EDITOR以上のみ表示 */}
        {canViewResults && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <label className="block text-xs font-medium text-gray-800 mb-1">共有URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''}
                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href.split('?')[0]);
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  } catch (err) {
                    console.error('コピーに失敗しました:', err);
                  }
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  urlCopied
                    ? 'bg-green-600 text-white border border-green-600'
                    : 'text-gray-800 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {urlCopied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {canViewResults && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab('response')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'response'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-800 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              回答
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-800 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              結果
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'response' ? (
          <SurveyResponseForm
            survey={survey}
            existingResponses={myResponses}
            defaultUserName={user?.username}
            isAuthenticated={isAuthenticated}
            onSuccess={handleResponseSuccess}
          />
        ) : (
          surveyWithResults && (
            <SurveyResultsTable
              survey={surveyWithResults}
              onResponseDeleted={fetchSurvey}
            />
          )
        )}
      </div>
    </div>
  );
}
