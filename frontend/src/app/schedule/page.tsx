'use client';

import { useState } from 'react';
import { useSchedulesSplit, createSchedule, updateSchedule, deleteSchedule } from '@/hooks/useSchedulesSWR';
import { useAuthContext } from '@/contexts/AuthContext';
import ScheduleList from '@/components/ScheduleList';
import CalendarSubscribeLink from '@/components/CalendarSubscribeLink';
import ScheduleModal from '@/components/ScheduleModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PermissionRequiredCard from '@/components/PermissionRequiredCard';
import { Schedule, ScheduleFormData, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/schedule';
import { Role } from '@/types/user';

export default function SchedulePage() {
  const { user, isAuthenticated } = useAuthContext();
  const {
    schedules,
    pastScheduleIds,
    isLoading,
    error,
    hasMorePast,
    hiddenPastCount,
    loadAllPastSchedules,
  } = useSchedulesSplit();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Expand all state
  const [expandAll, setExpandAll] = useState(false);

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
        await updateSchedule(editingSchedule.id, scheduleData as UpdateScheduleRequest);
      } else {
        await createSchedule(scheduleData as CreateScheduleRequest);
      }

      handleCloseModal();
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
      await deleteSchedule(deletingScheduleId);
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

  // Show access denied for users without permission
  if (!canViewSchedules) {
    return (
      <PermissionRequiredCard
        title="すべての予定"
        message={
          !isAuthenticated
            ? 'すべての予定を表示するにはログインしてください。'
            : 'すべての予定を表示するにはロールをリクエストしてください。'
        }
        isAuthenticated={isAuthenticated}
        isNoRole={user?.role === 'NO_ROLE'}
      />
    );
  }

  return (
    <>
    <div className="animate-fade-in">
      <section>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              すべての予定
            </h2>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={handleAddSchedule}
                className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
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
            )}
            <button
              onClick={() => setExpandAll(!expandAll)}
              className={`inline-flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 text-sm font-medium border rounded-full md:rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${
                expandAll
                  ? 'text-primary-700 bg-primary-50 border-primary-300 hover:bg-primary-100'
                  : 'text-gray-800 bg-white border-gray-300 hover:bg-gray-50'
              }`}
              aria-label={expandAll ? 'すべて折りたたむ' : 'すべて展開'}
              title={expandAll ? 'すべて折りたたむ' : 'すべて展開'}
            >
              <svg
                className={`w-5 h-5 md:mr-2 transition-transform ${expandAll ? 'rotate-180' : ''}`}
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
              <span className="hidden md:inline">{expandAll ? 'すべて折りたたむ' : 'すべて展開'}</span>
            </button>
            <CalendarSubscribeLink inline />
          </div>
        </div>

        <ScheduleList
          schedules={schedules}
          isLoading={isLoading}
          error={error?.message || null}
          onEdit={canEdit ? handleEditSchedule : undefined}
          onDelete={canEdit ? handleDeleteClick : undefined}
          showActions={!!canEdit}
          canEdit={!!canEdit}
          emptyMessage="まだ予定がありません。最初の予定を作成してください。"
          hasMore={false}
          hasMorePast={hasMorePast}
          hiddenPastCount={hiddenPastCount}
          onLoadMore={() => {}}
          onLoadMorePast={loadAllPastSchedules}
          onAddSchedule={handleAddSchedule}
          showAddButton={false}
          userRole={(user?.role as Role) || null}
          expandAll={expandAll}
          pastScheduleIds={pastScheduleIds}
        />
      </section>
    </div>

    {/* Floating Add Schedule Button - only for editors on mobile */}
    {canEdit && (
      <button
        onClick={handleAddSchedule}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all hover:scale-110 md:hidden z-40"
        aria-label="新しい予定を追加"
      >
        <svg
          className="w-8 h-8 mx-auto"
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
      </button>
    )}

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
  </>
  );
}
