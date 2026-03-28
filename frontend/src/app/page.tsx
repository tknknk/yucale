'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import RecentScheduleCard from '@/components/RecentScheduleCard';
import CalendarSubscribeLink from '@/components/CalendarSubscribeLink';
import ScheduleModal from '@/components/ScheduleModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import NoticeBoard from '@/components/NoticeBoard';
import { Schedule, ScheduleFormData, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/schedule';
import { useRecentSchedules, createSchedule, deleteSchedule as deleteScheduleSWR } from '@/hooks/useSchedulesSWR';
import { schedulesApi } from '@/lib/schedules';
import { Role } from '@/types/user';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthContext();

  // Recent schedules using SWR (past 1 + future 2)
  const { past: recentPast, future: recentFuture, isLoading: recentLoading, mutate: mutateRecent } = useRecentSchedules(1, 2);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user can edit (EDITOR or ADMIN role)
  const canEdit = isAuthenticated && user && ['ADMIN', 'EDITOR'].includes(user.role);

  // Check if user can view schedules (authenticated and not NO_ROLE)
  const canViewSchedules = isAuthenticated && user && user.role !== 'NO_ROLE';

  // Handle opening modal for new schedule
  const handleAddSchedule = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  // Handle form submission
  const handleSubmit = async (data: ScheduleFormData) => {
    try {
      setIsSubmitting(true);

      const scheduleData: CreateScheduleRequest | UpdateScheduleRequest = {
        title: data.summary,
        summary: data.summary,
        description: data.description,
        startTime: data.dtstart,
        endTime: data.dtend,
        dtstart: data.dtstart,
        dtend: data.dtend,
        allDay: data.allDay,
        location: data.location,
        song: data.song,
        recording: data.recording,
      };

      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, scheduleData as UpdateScheduleRequest);
      } else {
        await createSchedule(scheduleData as CreateScheduleRequest);
      }
      handleCloseModal();
      mutateRecent();
    } catch (err) {
      console.error('Failed to save schedule:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: number) => {
    setDeletingScheduleId(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!deletingScheduleId) return;

    try {
      setIsDeleting(true);
      await deleteScheduleSWR(deletingScheduleId);
      setIsDeleteDialogOpen(false);
      setDeletingScheduleId(null);
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeletingScheduleId(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Notice Board Section - only for VIEWER and above */}
      <NoticeBoard canEdit={!!canEdit} canView={!!canViewSchedules} />

      {/* Show login prompt for non-authenticated or NO_ROLE users */}
      {!canViewSchedules && (
        <section className="mb-8">
          <div className="bg-white border border-primary-100/50 rounded-2xl p-8 text-center shadow-soft">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              ゆカレへようこそ
            </h2>
            <p className="text-gray-800 mb-6">
              {!isAuthenticated
                ? 'すべての予定を表示するにはログインしてください。'
                : 'すべての予定を表示するにはロールをリクエストしてください。'}
            </p>
            {!isAuthenticated && (
              <div className="flex justify-center gap-4">
                <a
                  href="/login"
                  className="inline-block px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
                >
                  ログイン
                </a>
                <a
                  href="/register"
                  className="inline-block px-6 py-2.5 bg-white text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
                >
                  登録
                </a>
              </div>
            )}
            {isAuthenticated && user?.role === 'NO_ROLE' && (
              <a
                href="/user"
                className="inline-block px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
              >
                ロールをリクエスト
              </a>
            )}
          </div>
        </section>
      )}

      {/* Recent Schedules Section - visible to everyone */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            直近の予定
          </h2>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={handleAddSchedule}
                className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-full sm:rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                aria-label="予定を追加"
                title="予定を追加"
              >
                <svg
                  className="w-5 h-5 sm:mr-2"
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
                <span className="hidden sm:inline">予定を追加</span>
              </button>
            )}
            {canViewSchedules && <CalendarSubscribeLink inline />}
          </div>
        </div>

        {recentLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (recentPast.length > 0 || recentFuture.length > 0) ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Past schedules (gray) */}
            {recentPast.map((schedule) => (
              <RecentScheduleCard
                key={schedule.id}
                schedule={schedule}
                userRole={(user?.role as Role) || null}
                isPast={true}
                onEdit={canEdit ? handleEditSchedule : undefined}
                onDelete={canEdit ? handleDeleteClick : undefined}
              />
            ))}
            {/* Future schedules */}
            {recentFuture.map((schedule) => (
              <RecentScheduleCard
                key={schedule.id}
                schedule={schedule}
                userRole={(user?.role as Role) || null}
                isPast={false}
                onEdit={canEdit ? handleEditSchedule : undefined}
                onDelete={canEdit ? handleDeleteClick : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-800">
            予定がありません
          </div>
        )}

        {canViewSchedules && (recentPast.length > 0 || recentFuture.length > 0) && (
          <div className="mt-8 text-center">
            <Link
              href="/schedule"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-primary-600 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              すべての予定を見る
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}
      </section>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        schedule={editingSchedule}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="予定を削除"
        message="この予定を削除してもよろしいですか？この操作は取り消せません。"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
