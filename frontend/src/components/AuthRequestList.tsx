'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthRequest, getPendingRequests, getAllRequests, approveRequest, rejectRequest } from '@/lib/admin';
import AuthRequestCard from './AuthRequestCard';
import LoadingSpinner from './LoadingSpinner';

interface AuthRequestListProps {
  showAll?: boolean;
}

export default function AuthRequestList({ showAll = false }: AuthRequestListProps) {
  const [requests, setRequests] = useState<AuthRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = showAll ? await getAllRequests() : await getPendingRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setIsLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    try {
      await approveRequest(id);
      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: 'APPROVED' as const } : req))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleReject = async (id: number, reason?: string) => {
    try {
      await rejectRequest(id, reason);
      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: 'REJECTED' as const } : req))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={fetchRequests} className="btn btn-primary">
          再試行
        </button>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const processedRequests = requests.filter((r) => r.status !== 'PENDING');

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">保留中のリクエストはありません</h3>
        <p className="text-gray-800">すべてのロールリクエストは処理済みです。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            保留中のリクエスト ({pendingRequests.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingRequests.map((request) => (
              <AuthRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {showAll && processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            処理済みのリクエスト ({processedRequests.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {processedRequests.map((request) => (
              <AuthRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
