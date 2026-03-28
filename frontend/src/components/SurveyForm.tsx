'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CreateSurveyRequest, SurveyDefaults, ResponseOption, Survey } from '@/types/survey';
import { getSurveyDefaults } from '@/lib/surveys';
import ScheduleSelector from './ScheduleSelector';
import LoadingSpinner from './LoadingSpinner';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('ja', ja);

interface SurveyFormData {
  title: string;
  description: string;
  belongingList: string;
  enableFreetext: boolean;
  deadlineAt: Date | null;
  softDue: boolean;
}

interface SurveyFormProps {
  onSubmit: (data: CreateSurveyRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  /** 編集モード時の初期データ */
  initialData?: Survey;
}

export default function SurveyForm({ onSubmit, onCancel, isLoading = false, initialData }: SurveyFormProps) {
  const isEditMode = !!initialData;
  const [defaults, setDefaults] = useState<SurveyDefaults | null>(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);
  const [mandatoryScheduleIds, setMandatoryScheduleIds] = useState<number[]>([]);
  const [responseOptions, setResponseOptions] = useState<ResponseOption[]>([]);
  const [newOptionText, setNewOptionText] = useState('');
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // editingScheduleIdsをメモ化して無限レンダリングループを防止
  const editingScheduleIds = useMemo(
    () => initialData?.details?.map(d => d.scheduleId) ?? [],
    [initialData?.details]
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SurveyFormData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      belongingList: initialData?.belongingList?.join(', ') || '',
      enableFreetext: initialData?.enableFreetext ?? true,
      deadlineAt: initialData?.deadlineAt ? new Date(initialData.deadlineAt) : null,
      softDue: initialData?.softDue ?? true,
    },
  });

  useEffect(() => {
    const initializeForm = async () => {
      try {
        if (isEditMode && initialData) {
          // 編集モード: 既存データで初期化
          setResponseOptions(initialData.responseOptions || []);
          if (initialData.details) {
            const scheduleIds = initialData.details.map(d => d.scheduleId);
            const mandatoryIds = initialData.details.filter(d => d.mandatory).map(d => d.scheduleId);
            setSelectedScheduleIds(scheduleIds);
            setMandatoryScheduleIds(mandatoryIds);
          }
        } else {
          // 新規作成モード: デフォルト値を取得
          const data = await getSurveyDefaults();
          setDefaults(data);
          setValue('belongingList', data.belongingList.join(', '));
          setResponseOptions(data.responseOptions);
        }
      } catch (err) {
        console.error('Failed to initialize form:', err);
      } finally {
        setLoadingDefaults(false);
      }
    };

    initializeForm();
  }, [setValue, isEditMode, initialData]);

  const handleAddOption = () => {
    const trimmed = newOptionText.trim();
    if (trimmed && !responseOptions.some(opt => opt.option === trimmed)) {
      setResponseOptions([...responseOptions, { option: trimmed, isAttending: false }]);
      setNewOptionText('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setResponseOptions(responseOptions.filter((_, i) => i !== index));
  };

  const handleToggleAttending = (index: number) => {
    setResponseOptions(responseOptions.map((opt, i) =>
      i === index ? { ...opt, isAttending: !opt.isAttending } : opt
    ));
  };

  const onFormSubmit = async (data: SurveyFormData) => {
    if (selectedScheduleIds.length === 0) {
      alert('少なくとも1つのスケジュールを選択してください');
      return;
    }

    if (responseOptions.length === 0) {
      alert('少なくとも1つの回答選択肢を設定してください');
      return;
    }

    const request: CreateSurveyRequest = {
      title: data.title,
      description: data.description || undefined,
      belongingList: data.belongingList
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      responseOptions: responseOptions,
      enableFreetext: data.enableFreetext,
      deadlineAt: data.deadlineAt
        ? new Date(data.deadlineAt.getFullYear(), data.deadlineAt.getMonth(), data.deadlineAt.getDate(), 23, 59, 59).toISOString()
        : undefined,
      softDue: data.deadlineAt ? data.softDue : undefined,
      details: selectedScheduleIds.map((scheduleId) => ({
        scheduleId,
        mandatory: mandatoryScheduleIds.includes(scheduleId),
      })),
    };

    await onSubmit(request);
  };

  if (loadingDefaults) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

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
            maxLength: { value: 255, message: 'タイトルは255文字以内で入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.title ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="出欠調査のタイトル"
          disabled={isLoading || isSubmitting}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-800">
          説明
        </label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
          placeholder="出欠調査の説明（任意）"
          disabled={isLoading || isSubmitting}
        />
      </div>

      {/* Schedule Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          対象スケジュール <span className="text-red-500">*</span>
        </label>
        <ScheduleSelector
          selectedScheduleIds={selectedScheduleIds}
          onSelectionChange={setSelectedScheduleIds}
          mandatoryScheduleIds={mandatoryScheduleIds}
          onMandatoryChange={setMandatoryScheduleIds}
          editingScheduleIds={editingScheduleIds}
        />
        {selectedScheduleIds.length === 0 && (
          <p className="mt-1 text-sm text-gray-800">スケジュールを選択してください</p>
        )}
      </div>

      {/* Belonging List */}
      <div>
        <label htmlFor="belongingList" className="block text-sm font-medium text-gray-800">
          所属リスト
        </label>
        <input
          type="text"
          id="belongingList"
          {...register('belongingList')}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
          placeholder="カンマ区切りで入力（例: S, A, T, B）"
          disabled={isLoading || isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-800">回答者が選択できる所属を設定します</p>
      </div>

      {/* Response Options */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          回答選択肢 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {responseOptions.map((opt, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <span className="flex-1 text-sm">{opt.option}</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={opt.isAttending}
                  onChange={() => handleToggleAttending(index)}
                  className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  disabled={isLoading || isSubmitting}
                />
                <span className={opt.isAttending ? 'text-green-600' : 'text-gray-800'}>出席扱い</span>
              </label>
              <button
                type="button"
                onClick={() => handleRemoveOption(index)}
                className="text-red-500 hover:text-red-700 text-xs"
                disabled={isLoading || isSubmitting}
              >
                削除
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              className="flex-1 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
              placeholder="新しい選択肢を入力"
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              onClick={handleAddOption}
              className="px-3 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-md hover:bg-primary-50"
              disabled={isLoading || isSubmitting || !newOptionText.trim()}
            >
              追加
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-800">
          「出席扱い」にチェックを入れると、その選択肢は出席としてカウントされます
        </p>
      </div>

      {/* Enable Freetext */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="enableFreetext"
          {...register('enableFreetext')}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          disabled={isLoading || isSubmitting}
        />
        <label htmlFor="enableFreetext" className="ml-2 block text-sm text-gray-900">
          自由記述欄を有効にする
        </label>
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">回答締切</label>
        <Controller
          control={control}
          name="deadlineAt"
          render={({ field }) => (
            <DatePicker
              selected={field.value}
              onChange={(date: Date | null) => field.onChange(date)}
              dateFormat="yyyy/MM/dd"
              locale="ja"
              placeholderText="締切日を選択（任意）"
              className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
              disabled={isLoading || isSubmitting}
              isClearable
            />
          )}
        />
        <p className="mt-1 text-xs text-gray-800">選択した日の23:59が締切となります。設定しない場合は締切なしになります</p>

        {/* Soft Due Option (only shown when deadline is set) */}
        {watch('deadlineAt') && (
          <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="softDue"
              {...register('softDue')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled={isLoading || isSubmitting}
            />
            <label htmlFor="softDue" className="ml-2 block text-sm text-gray-900">
              締切後の回答/編集を可能にする
            </label>
          </div>
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
          disabled={isLoading || isSubmitting || selectedScheduleIds.length === 0 || responseOptions.length === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isLoading || isSubmitting) && <LoadingSpinner size="sm" className="mr-2" />}
          {isEditMode ? '出欠調査を更新' : '出欠調査を作成'}
        </button>
      </div>
    </form>
  );
}
