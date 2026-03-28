'use client';

import { useEffect, useState } from 'react';
import { Schedule } from '@/types/schedule';
import { schedulesApi } from '@/lib/schedules';
import { surveysApi } from '@/lib/surveys';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface ScheduleSelectorProps {
  selectedScheduleIds: number[];
  onSelectionChange: (scheduleIds: number[]) => void;
  mandatoryScheduleIds?: number[];
  onMandatoryChange?: (scheduleIds: number[]) => void;
  /** 編集モードで、この調査に既に含まれるスケジュールIDを除外する（選択可能にする） */
  editingScheduleIds?: number[];
}

export default function ScheduleSelector({
  selectedScheduleIds,
  onSelectionChange,
  mandatoryScheduleIds = [],
  onMandatoryChange,
  editingScheduleIds = [],
}: ScheduleSelectorProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesWithSurveys, setSchedulesWithSurveys] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schedulesResponse, surveyScheduleIds] = await Promise.all([
          schedulesApi.getSplit(true, 100),
          surveysApi.getScheduleIdsWithSurveys(),
        ]);

        // Start with future schedules (today onwards)
        let allSchedules = [...schedulesResponse.futureSchedules];

        // 編集モードの場合、過去スケジュールも含める（既存の調査対象スケジュール）
        if (editingScheduleIds.length > 0) {
          const editingScheduleSet = new Set(editingScheduleIds);
          const pastEditingSchedules = schedulesResponse.pastSchedules.filter(
            s => editingScheduleSet.has(s.id)
          );
          allSchedules = [...pastEditingSchedules, ...allSchedules];
        }

        // Sort by date
        allSchedules.sort(
          (a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime()
        );

        setSchedules(allSchedules);
        setSchedulesWithSurveys(new Set(surveyScheduleIds));
      } catch (err) {
        setError('スケジュールの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [editingScheduleIds]);

  const toggleSchedule = (scheduleId: number) => {
    // Skip if schedule already has a survey (except for schedules being edited)
    if (schedulesWithSurveys.has(scheduleId) && !editingScheduleIds.includes(scheduleId)) {
      return;
    }

    if (selectedScheduleIds.includes(scheduleId)) {
      onSelectionChange(selectedScheduleIds.filter((id) => id !== scheduleId));
      if (onMandatoryChange) {
        onMandatoryChange(mandatoryScheduleIds.filter((id) => id !== scheduleId));
      }
    } else {
      onSelectionChange([...selectedScheduleIds, scheduleId]);
      // Enable mandatory by default when selecting
      if (onMandatoryChange && !mandatoryScheduleIds.includes(scheduleId)) {
        onMandatoryChange([...mandatoryScheduleIds, scheduleId]);
      }
    }
  };

  const toggleMandatory = (scheduleId: number) => {
    if (!onMandatoryChange) return;
    if (mandatoryScheduleIds.includes(scheduleId)) {
      onMandatoryChange(mandatoryScheduleIds.filter((id) => id !== scheduleId));
    } else {
      onMandatoryChange([...mandatoryScheduleIds, scheduleId]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  if (schedules.length === 0) {
    return <div className="text-gray-800 text-sm">本日以降のスケジュールがありません</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
      {schedules.map((schedule) => {
        const isSelected = selectedScheduleIds.includes(schedule.id);
        const isMandatory = mandatoryScheduleIds.includes(schedule.id);
        const isEditingSchedule = editingScheduleIds.includes(schedule.id);
        const hasSurvey = schedulesWithSurveys.has(schedule.id) && !isEditingSchedule;

        return (
          <div
            key={schedule.id}
            className={`p-3 rounded-md border transition-colors ${
              hasSurvey
                ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                : isSelected
                ? 'border-primary-500 bg-primary-50 cursor-pointer'
                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}
            onClick={() => toggleSchedule(schedule.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSchedule(schedule.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                  disabled={hasSurvey}
                />
                <div>
                  <div className={`font-medium ${hasSurvey ? 'text-gray-800' : 'text-gray-900'}`}>
                    {schedule.summary}
                    {hasSurvey && <span className="ml-2 text-xs text-gray-400">(調査作成済)</span>}
                  </div>
                  <div className="text-sm text-gray-800">
                    {format(parseISO(schedule.dtstart), 'yyyy/MM/dd (E) HH:mm', { locale: ja })}
                    {' - '}
                    {format(parseISO(schedule.dtend), 'HH:mm', { locale: ja })}
                  </div>
                </div>
              </div>
              {isSelected && onMandatoryChange && !hasSurvey && (
                <label
                  className="flex items-center gap-1 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={() => toggleMandatory(schedule.id)}
                    className="h-3 w-3 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className={isMandatory ? 'text-red-600' : 'text-gray-800'}>必須</span>
                </label>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
