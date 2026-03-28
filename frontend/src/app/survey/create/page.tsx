'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { CreateSurveyRequest } from '@/types/survey';
import { createSurvey } from '@/lib/surveys';
import SurveyForm from '@/components/SurveyForm';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CreateSurveyPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && !canEdit) {
      router.push('/survey');
    }
  }, [authLoading, isAuthenticated, canEdit, router]);

  const handleSubmit = async (data: CreateSurveyRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const survey = await createSurvey(data);
      router.push(`/survey/${survey.urlId}`);
    } catch (err) {
      console.error('Failed to create survey:', err);
      setError('出欠調査の作成に失敗しました');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/survey');
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !canEdit) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">出欠調査を作成</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <SurveyForm onSubmit={handleSubmit} onCancel={handleCancel} isLoading={isSubmitting} />
      </div>
    </div>
  );
}
