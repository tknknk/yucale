'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Survey, SubmitSurveyResponseRequest, SurveyResponse } from '@/types/survey';
import { submitSurveyResponses } from '@/lib/surveys';
import { validateMandatoryFields } from '@/lib/surveyValidation';
import { format, parseISO, isPast } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface SurveyResponseFormProps {
  survey: Survey;
  existingResponses?: SurveyResponse[];
  defaultUserName?: string;
  isAuthenticated?: boolean;
  onSuccess?: () => void;
}

interface FormData {
  userName: string;
  belonging: string;
  responses: {
    [detailId: string]: {
      responseOption: string;
      freeText: string;
    };
  };
}

export default function SurveyResponseForm({
  survey,
  existingResponses = [],
  defaultUserName = '',
  isAuthenticated = false,
  onSuccess,
}: SurveyResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const isDeadlinePassed = survey.deadlineAt ? isPast(parseISO(survey.deadlineAt)) : false;
  const canRespondAfterDeadline = survey.softDue === true;
  const isResponseDisabled = isDeadlinePassed && !canRespondAfterDeadline;

  // Build form values from existing responses
  const formValues = useMemo(() => {
    const responses: FormData['responses'] = {};
    if (survey.details) {
      for (const detail of survey.details) {
        const existing = existingResponses.find((r) => r.surveyDetailId === detail.id);
        responses[detail.id.toString()] = {
          responseOption: existing?.responseOption || '',
          freeText: existing?.freeText || '',
        };
      }
    }
    const userName = existingResponses.length > 0 ? existingResponses[0].userName : '';
    const belonging = existingResponses.length > 0 ? existingResponses[0].belonging || '' : '';

    return {
      userName: userName || defaultUserName,
      belonging,
      responses,
    };
  }, [survey.details, existingResponses, defaultUserName]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: formValues,
  });

  // Reset form when existingResponses changes (e.g., after data is fetched)
  useEffect(() => {
    reset(formValues);
  }, [formValues, reset]);

  const onSubmit = async (data: FormData) => {
    if (isResponseDisabled) {
      setSubmitError('回答締切を過ぎています');
      return;
    }

    // Validate mandatory fields
    const validationResult = validateMandatoryFields(survey.details, data.responses);
    if (!validationResult.isValid) {
      setSubmitError(validationResult.errorMessage);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const request: SubmitSurveyResponseRequest = {
        userName: data.userName,
        belonging: data.belonging || undefined,
        responses: Object.entries(data.responses).map(([detailId, response]) => ({
          surveyDetailId: parseInt(detailId, 10),
          responseOption: response.responseOption || undefined,
          freeText: response.freeText || undefined,
        })),
      };

      await submitSurveyResponses(survey.urlId, request);
      setSubmitSuccess(true);
      setSubmittedData(data);
      // 画面を一番上にスクロール
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // ログイン状態の場合のみonSuccessを呼び出す（データ再取得のため）
      // 非ログイン状態では回答内容を表示するため、リロードしない
      if (onSuccess && isAuthenticated) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error('Failed to submit responses:', err);
      // APIからのエラーメッセージを取得
      let errorMessage = '回答の送信に失敗しました';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!survey.details || survey.details.length === 0) {
    return <div className="text-gray-800">対象スケジュールがありません</div>;
  }

  // 日付順（近い順）にソート
  const sortedDetails = [...survey.details].sort(
    (a, b) => new Date(a.scheduleDtstart).getTime() - new Date(b.scheduleDtstart).getTime()
  );

  // 送信成功した場合、回答内容を表示
  if (submitSuccess && submittedData) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700 font-medium">回答を受け付けました</p>
          {!isAuthenticated && (
            <div className="mt-3">
              <p className="text-green-600 text-sm mb-2">
                回答を編集するには、同じユーザー名（{submittedData.userName}）でアカウント作成してください。
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                アカウント作成
              </Link>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-md p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">送信した回答内容</h3>

          <div className="space-y-2 mb-4">
            <p className="text-sm">
              <span className="font-medium text-gray-800">ユーザー名:</span>{' '}
              <span className="text-gray-900">{submittedData.userName}</span>
            </p>
            {submittedData.belonging && (
              <p className="text-sm">
                <span className="font-medium text-gray-800">所属:</span>{' '}
                <span className="text-gray-900">{submittedData.belonging}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            {sortedDetails.map((detail) => {
              const response = submittedData.responses[detail.id.toString()];
              return (
                <div key={detail.id} className="border border-gray-200 rounded-md p-3 bg-white">
                  <div className="font-medium text-gray-900 text-sm">{detail.scheduleSummary}</div>
                  <div className="text-xs text-gray-800 mb-2">
                    {format(parseISO(detail.scheduleDtstart), 'yyyy/MM/dd (E) HH:mm', { locale: ja })}
                  </div>
                  <div className="flex items-center gap-2">
                    {response?.responseOption && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          (() => {
                            const opt = survey.responseOptions?.find(o => o.option === response.responseOption);
                            if (opt?.isAttending) return 'bg-green-100 text-green-800';
                            return 'bg-red-100 text-red-800';
                          })()
                        }`}
                      >
                        {response.responseOption}
                      </span>
                    )}
                    {response?.freeText && (
                      <span className="text-xs text-gray-800">{response.freeText}</span>
                    )}
                    {!response?.responseOption && !response?.freeText && (
                      <span className="text-xs text-gray-400">未回答</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ログイン済みの場合は回答編集ボタン、非ログインの場合は会員登録/ログインへの誘導 */}
        {isAuthenticated ? (
          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(false);
                setSubmittedData(null);
              }}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-md shadow-sm hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              回答を編集する
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {isDeadlinePassed && (
        <div className={`border rounded-md p-4 ${isResponseDisabled ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {isResponseDisabled
            ? 'この出欠調査は締め切りました'
            : '回答締切を過ぎていますが、回答/編集が可能です'}
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-700">
          回答を送信しました
        </div>
      )}

      {submitError && (
        submitError.includes('このユーザー名は既に登録されています') ? (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <p className="text-amber-700 mb-2">このユーザー名は既に登録されています。ログインして回答してください。</p>
            <Link
              href="/login"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              ログイン
            </Link>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            {submitError}
          </div>
        )
      )}

      {/* User Name */}
      <div>
        <label htmlFor="userName" className="block text-sm font-medium text-gray-800">
          ユーザー名(名字) <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            id="userName"
            {...register('userName', {
              required: 'ユーザー名は必須です',
              maxLength: { value: 100, message: 'ユーザー名は100文字以内で入力してください' },
            })}
            className={`block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 ${
              errors.userName ? 'border-red-500 border' : 'border border-gray-300'
            } ${isAuthenticated ? 'bg-gray-100 text-gray-600 pr-10 cursor-not-allowed' : 'focus:border-primary-500 focus:ring-primary-500'}`}
            placeholder="ユーザー名を入力"
            disabled={isSubmitting || isResponseDisabled || isAuthenticated}
            readOnly={isAuthenticated}
          />
          {isAuthenticated && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
        {isAuthenticated && (
          <p className="mt-1 text-xs text-gray-500">ログイン中のため変更できません</p>
        )}
        {errors.userName && (
          <p className="mt-1 text-sm text-red-600">{errors.userName.message}</p>
        )}
      </div>

      {/* Belonging */}
      {survey.belongingList && survey.belongingList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-800">
            所属 <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex flex-wrap gap-4">
            {survey.belongingList.map((belonging) => (
              <label key={belonging} className="flex items-center">
                <input
                  type="radio"
                  {...register('belonging', {
                    required: '所属は必須です',
                  })}
                  value={belonging}
                  className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  disabled={isSubmitting || isResponseDisabled}
                />
                <span className="ml-2 text-sm text-gray-800">{belonging}</span>
              </label>
            ))}
          </div>
          {errors.belonging && (
            <p className="mt-1 text-sm text-red-600">{errors.belonging.message}</p>
          )}
        </div>
      )}

      {/* Response for each schedule */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-800">出欠回答</h3>
        {sortedDetails.map((detail) => (
          <div
            key={detail.id}
            className="border border-gray-200 rounded-md p-4 space-y-3"
          >
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-900">{detail.scheduleSummary}</span>
              {detail.mandatory && (
                <span className="text-red-500">*</span>
              )}
            </div>
            <div className="text-sm text-gray-800">
              {format(parseISO(detail.scheduleDtstart), 'yyyy/MM/dd (E) HH:mm', { locale: ja })}
              {' - '}
              {format(parseISO(detail.scheduleDtend), 'HH:mm', { locale: ja })}
            </div>

            {/* Response Option */}
            {survey.responseOptions && survey.responseOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {survey.responseOptions.map((opt) => (
                  <label key={opt.option} className="flex items-center">
                    <input
                      type="radio"
                      {...register(`responses.${detail.id}.responseOption`)}
                      value={opt.option}
                      className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                      disabled={isSubmitting || isResponseDisabled}
                    />
                    <span className="ml-2 text-sm text-gray-800">{opt.option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Free Text */}
            {survey.enableFreetext && (
              <div>
                <input
                  type="text"
                  {...register(`responses.${detail.id}.freeText`)}
                  placeholder="備考（任意）"
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
                  disabled={isSubmitting || isResponseDisabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || isResponseDisabled}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
          {existingResponses.length > 0 ? '回答を更新' : '回答を送信'}
        </button>
      </div>
    </form>
  );
}
