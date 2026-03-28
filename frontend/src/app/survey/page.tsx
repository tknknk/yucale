'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { Survey } from '@/types/survey';
import { getSurveys } from '@/lib/surveys';
import SurveyListItem from '@/components/SurveyListItem';
import LoadingSpinner from '@/components/LoadingSpinner';
import PermissionRequiredCard from '@/components/PermissionRequiredCard';

export default function SurveyListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const isNoRole = user?.role === 'NO_ROLE';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSurveys = async () => {
      if (!isAuthenticated || isNoRole) return;

      try {
        setLoading(true);
        const data = await getSurveys();
        setSurveys(data);
      } catch (err) {
        console.error('Failed to fetch surveys:', err);
        setError('出欠調査の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && !isNoRole) {
      fetchSurveys();
    } else if (isNoRole) {
      setLoading(false);
    }
  }, [isAuthenticated, isNoRole]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isNoRole) {
    return (
      <PermissionRequiredCard
        title="出欠調査一覧"
        message="出欠調査一覧を表示するには、ロールをリクエストしてください。"
        isAuthenticated={true}
        isNoRole={true}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">出欠調査一覧</h2>
        {canEdit && (
          <Link
            href="/survey/create"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 text-gray-800">
          <p>出欠調査がありません</p>
          {canEdit && (
            <Link
              href="/survey/create"
              className="mt-4 inline-block text-primary-600 hover:text-primary-700"
            >
              新しい出欠調査を作成する
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <SurveyListItem key={survey.id} survey={survey} showEditLink={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
