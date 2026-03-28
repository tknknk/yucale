'use client';

import { Schedule } from '@/types/schedule';
import { Role } from '@/types/user';
import { isScheduleFinished } from '@/lib/schedules';
import ScheduleCard from './ScheduleCard';
import LoadingSpinner from './LoadingSpinner';

interface ScheduleListProps {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  canEdit?: boolean;
  emptyMessage?: string;
  hasMore?: boolean;
  hasMorePast?: boolean;
  hiddenPastCount?: number;
  onLoadMore?: () => void;
  onLoadMorePast?: () => void;
  onAddSchedule?: () => void;
  showAddButton?: boolean;
  userRole?: Role | null;
  expandAll?: boolean;
  pastScheduleIds?: Set<number>;
}

export default function ScheduleList({
  schedules,
  isLoading,
  error,
  onEdit,
  onDelete,
  showActions = false,
  canEdit = false,
  emptyMessage = 'No schedules found',
  hasMore = false,
  hasMorePast = false,
  hiddenPastCount = 0,
  onLoadMore,
  onLoadMorePast,
  onAddSchedule,
  showAddButton = false,
  userRole,
  expandAll = false,
  pastScheduleIds,
}: ScheduleListProps) {
  // Always use client-side calculation with local time for consistent display
  // This ensures the UI reflects the user's local timezone
  const now = new Date();
  const isPastSchedule = (schedule: Schedule): boolean => {
    return isScheduleFinished(schedule, now);
  };
  // Initial loading state (no schedules yet)
  if (isLoading && schedules.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">予定の読み込みに失敗しました</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      {showAddButton && canEdit && onAddSchedule && (
        <div className="flex justify-end">
          <button
            onClick={onAddSchedule}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            予定を追加
          </button>
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-800 mb-4">{emptyMessage}</p>
          {showAddButton && canEdit && onAddSchedule && (
            <button
              onClick={onAddSchedule}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              最初の予定を作成
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Load All Past Schedules Button (Top) */}
          {hasMorePast && onLoadMorePast && (
            <div className="flex justify-center pb-4">
              <button
                onClick={onLoadMorePast}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    読み込み中...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2 rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    過去の予定をすべて表示する ({hiddenPastCount}件)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Schedule Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            {schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={showActions}
                canEdit={canEdit}
                userRole={userRole}
                isPast={isPastSchedule(schedule)}
                forceExpanded={expandAll}
              />
            ))}
          </div>

          {/* Load More Future Button (Bottom) */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center pt-6">
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-primary-700 bg-white border border-primary-300 rounded-md shadow-sm hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    読み込み中...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    さらに読み込む
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
