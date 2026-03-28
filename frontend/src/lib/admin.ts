import api, { getApiErrorMessage } from './api';
import { ApiResponse } from '@/types/api';

export interface AuthRequest {
  id: number;
  userId: number;
  username: string;
  requestedRole: 'NO_ROLE' | 'VIEWER' | 'EDITOR' | 'ADMIN';
  requestMessage: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'NO_ROLE' | 'VIEWER' | 'EDITOR' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export async function getPendingRequests(): Promise<AuthRequest[]> {
  try {
    const response = await api.get<ApiResponse<AuthRequest[]>>('/admin/requests');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || '申請中のリクエストの取得に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, '申請中のリクエストの取得に失敗しました'));
  }
}

export async function getAllRequests(): Promise<AuthRequest[]> {
  try {
    const response = await api.get<ApiResponse<AuthRequest[]>>('/admin/requests/all');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'リクエスト一覧の取得に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'リクエスト一覧の取得に失敗しました'));
  }
}

export async function approveRequest(requestId: number): Promise<AuthRequest> {
  try {
    const response = await api.put<ApiResponse<AuthRequest>>(`/admin/requests/${requestId}/approve`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'リクエストの承認に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'リクエストの承認に失敗しました'));
  }
}

export async function rejectRequest(requestId: number, reason?: string): Promise<AuthRequest> {
  try {
    const response = await api.put<ApiResponse<AuthRequest>>(
      `/admin/requests/${requestId}/reject`,
      reason ? { reason } : {}
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'リクエストの却下に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'リクエストの却下に失敗しました'));
  }
}

export async function getAllUsers(): Promise<AdminUser[]> {
  try {
    const response = await api.get<ApiResponse<AdminUser[]>>('/admin/users');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'ユーザー一覧の取得に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'ユーザー一覧の取得に失敗しました'));
  }
}

export async function deleteUser(userId: number): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<void>>(`/admin/users/${userId}`);
    if (!response.data.success) {
      throw new Error(response.data.message || 'ユーザーの削除に失敗しました');
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'ユーザーの削除に失敗しました'));
  }
}
