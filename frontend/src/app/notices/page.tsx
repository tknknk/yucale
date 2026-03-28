'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { Notice, CreateNoticeRequest } from '@/types/notice';
import { useNotices, createNotice, updateNotice, deleteNotice } from '@/hooks/useNoticesSWR';
import NoticeCard from '@/components/NoticeCard';
import NoticeModal from '@/components/NoticeModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import PermissionRequiredCard from '@/components/PermissionRequiredCard';

export default function NoticesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Check if user can view notices (VIEWER, EDITOR, or ADMIN role)
  const canView = isAuthenticated && user && ['VIEWER', 'EDITOR', 'ADMIN'].includes(user.role);

  // Check if user can edit (EDITOR or ADMIN role)
  const canEdit = isAuthenticated && user && ['ADMIN', 'EDITOR'].includes(user.role);

  // Fetch notices using SWR - only when auth is loaded and user has permission
  const shouldFetch = !authLoading && !!canView;
  const { notices, isLoading, error, pagination, mutate: mutateNotices } = useNotices(currentPage, pageSize, shouldFetch);
  const totalPages = pagination.totalPages;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Show loading state first
  if (authLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Show permission required for users without view access
  if (!canView) {
    return (
      <PermissionRequiredCard
        title="お知らせ一覧"
        message={
          !isAuthenticated
            ? 'お知らせを閲覧するにはログインしてください。'
            : 'お知らせを閲覧するにはロールをリクエストしてください。'
        }
        isAuthenticated={isAuthenticated}
        isNoRole={user?.role === 'NO_ROLE'}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-800">
          <li>
            <Link href="/" className="hover:text-primary-600">
              ホーム
            </Link>
          </li>
          <li>
            <svg
              className="w-4 h-4"
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
          </li>
          <li className="text-gray-900 font-medium">お知らせ一覧</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <h2 className="text-3xl font-bold text-gray-800">お知らせ一覧</h2>
        {canEdit && (
          <button
            onClick={handleAddNotice}
            className="inline-flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:px-4 md:py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-full md:rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <svg
              className="w-5 h-5 md:mr-2"
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
            <span className="hidden md:inline">お知らせを作成</span>
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error.message || 'お知らせの取得に失敗しました'}</p>
          <button
            onClick={() => mutateNotices()}
            className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50 transition-colors"
          >
            再読み込み
          </button>
        </div>
      ) : notices.length > 0 ? (
        <>
          <div className="space-y-4">
            {notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onEdit={canEdit ? handleEditNotice : undefined}
                onDelete={canEdit ? handleDeleteClick : undefined}
                canEdit={!!canEdit}
                forceExpanded={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      page === currentPage
                        ? 'text-white bg-primary-600'
                        : 'text-gray-800 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-800">
          お知らせはありません
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
    </div>
  );
}
