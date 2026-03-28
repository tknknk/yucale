'use client';

import { useState } from 'react';
import { AuthRequest } from '@/lib/admin';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AuthRequestCardProps {
  request: AuthRequest;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, reason?: string) => Promise<void>;
}

const roleLabels: Record<string, string> = {
  NO_ROLE: 'ロールなし',
  VIEWER: '閲覧者',
  EDITOR: '編集者',
  ADMIN: '管理者',
};

const roleBadgeColors: Record<string, string> = {
  NO_ROLE: 'bg-gray-100 text-gray-800',
  VIEWER: 'bg-blue-100 text-blue-700',
  EDITOR: 'bg-green-100 text-green-700',
  ADMIN: 'bg-purple-100 text-purple-700',
};

const statusBadgeColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AuthRequestCard({ request, onApprove, onReject }: AuthRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(request.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(request.id);
      setShowRejectModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = request.status === 'PENDING';

  return (
    <>
      <div className={`rounded-2xl p-6 transition-all duration-300 ease-out shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 ${
        isPending
          ? 'bg-primary-50 border border-primary-200/50'
          : 'bg-gray-50 border border-gray-200/50'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{request.username}</h3>
            <p className="text-sm text-gray-800">
              {format(new Date(request.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[request.requestedRole]}`}>
              {roleLabels[request.requestedRole]}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColors[request.status]}`}>
              {request.status}
            </span>
          </div>
        </div>

        {request.requestMessage && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-800">{request.requestMessage}</p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {isLoading ? '処理中...' : '承認'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isLoading}
              className="flex-1 btn btn-secondary text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              拒否
            </button>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">リクエストを拒否</h3>
            <p className="text-sm text-gray-800 mb-4">
              <strong>{request.username}</strong> のリクエストを拒否してもよろしいですか？
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? '処理中...' : '拒否'}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={isLoading}
                className="flex-1 btn btn-secondary disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
