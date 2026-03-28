'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Notice, CreateNoticeRequest } from '@/types/notice';
import LoadingSpinner from './LoadingSpinner';

interface NoticeFormProps {
  notice?: Notice | null;
  onSubmit: (data: CreateNoticeRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  title: string;
  content: string;
}

export default function NoticeForm({
  notice,
  onSubmit,
  onCancel,
  isLoading = false,
}: NoticeFormProps) {
  const isEditing = !!notice;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      content: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (notice) {
      reset({
        title: notice.title || '',
        content: notice.content || '',
      });
    }
  }, [notice, reset]);

  const onFormSubmit = async (data: FormData) => {
    await onSubmit({
      title: data.title,
      content: data.content,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-800">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          {...register('title', {
            required: 'タイトルは必須です',
            minLength: { value: 1, message: 'タイトルを入力してください' },
            maxLength: { value: 255, message: 'タイトルは255文字以内で入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.title ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="お知らせのタイトルを入力"
          disabled={isLoading || isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-800">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          rows={6}
          {...register('content', {
            required: '内容は必須です',
            minLength: { value: 1, message: '内容を入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.content ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="お知らせの内容を入力"
          disabled={isLoading || isSubmitting}
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isLoading || isSubmitting) && (
            <LoadingSpinner size="sm" className="mr-2" />
          )}
          {isEditing ? 'お知らせを更新' : 'お知らせを作成'}
        </button>
      </div>
    </form>
  );
}
