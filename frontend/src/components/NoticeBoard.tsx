'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Notice, CreateNoticeRequest } from '@/types/notice';
import { useLatestNotices, createNotice, updateNotice, deleteNotice } from '@/hooks/useNoticesSWR';
import NoticeCard from './NoticeCard';
import NoticeModal from './NoticeModal';
import ConfirmDialog from './ConfirmDialog';
import LoadingSpinner from './LoadingSpinner';

interface NoticeBoardProps {
  canEdit?: boolean;
  canView?: boolean;
}

export default function NoticeBoard({ canEdit = false, canView = false }: NoticeBoardProps) {
  // Fetch latest notices using SWR - only when user has permission
  const { notices, isLoading, error, mutate: mutateNotices } = useLatestNotices(canView);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Don't render if user can't view notices
  if (!canView) {
    return null;
  }

  // Handle opening modal for new notice
  const handleAddNotice = () => {
    setEditingNotice(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
  };

  // Handle form submission
  const handleSubmit = async (data: CreateNoticeRequest) => {
    try {
      setIsSubmitting(true);

      if (editingNotice) {
        await updateNotice(editingNotice.id, data);
      } else {
        await createNotice(data);
      }

      handleCloseModal();
    } catch (err) {
      console.error('Failed to save notice:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: number) => {
    setDeletingNoticeId(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!deletingNoticeId) return;

    try {
      setIsDeleting(true);
      await deleteNotice(deletingNoticeId);
      setIsDeleteDialogOpen(false);
      setDeletingNoticeId(null);
    } catch (err) {
      console.error('Failed to delete notice:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeletingNoticeId(null);
  };

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">お知らせ</h2>
        {canEdit && (
          <button
            onClick={handleAddNotice}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-full sm:rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            aria-label="お知らせを作成"
            title="お知らせを作成"
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
            <span className="hidden sm:inline">お知らせを作成</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error.message || 'お知らせの取得に失敗しました'}</div>
      ) : notices.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
          {notices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              onEdit={canEdit ? handleEditNotice : undefined}
              onDelete={canEdit ? handleDeleteClick : undefined}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-800">
          お知らせはありません
        </div>
      )}

      {notices.length > 0 && (
        <div className="mt-8 text-center">
          <Link
            href="/notices"
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-primary-600 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            すべてのお知らせを見る
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

      {/* Notice Modal */}
      <NoticeModal
        isOpen={isModalOpen}
        notice={editingNotice}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="お知らせを削除"
        message="このお知らせを削除してもよろしいですか？この操作は取り消せません。"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </section>
  );
}
