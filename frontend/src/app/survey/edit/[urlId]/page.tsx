'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { CreateSurveyRequest, Survey } from '@/types/survey';
import { getSurvey, updateSurvey } from '@/lib/surveys';
import SurveyForm from '@/components/SurveyForm';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlId = params.urlId as string;
  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && !canEdit) {
      router.push('/survey');
    }
  }, [authLoading, isAuthenticated, canEdit, router]);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!isAuthenticated || !canEdit) return;

      try {
        setLoading(true);
        const data = await getSurvey(urlId);
        setSurvey(data);
      } catch (err) {
        console.error('Failed to fetch survey:', err);
        setError('出欠調査の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && canEdit) {
      fetchSurvey();
    }
  }, [urlId, isAuthenticated, canEdit]);

  const handleSubmit = async (data: CreateSurveyRequest) => {
    if (!survey) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateSurvey(survey.id, data);
      router.push(`/survey/${survey.urlId}`);
    } catch (err) {
      console.error('Failed to update survey:', err);
      setError('出欠調査の更新に失敗しました');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/survey/${urlId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !canEdit) {
    return null;
  }

  if (error && !survey) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">出欠調査を編集</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {survey && (
          <SurveyForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            initialData={survey}
          />
        )}
      </div>
    </div>
  );
}
