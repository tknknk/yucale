import api from './api';
import { Notice, CreateNoticeRequest, UpdateNoticeRequest, NoticesResponse } from '@/types/notice';
import { ApiResponse, PaginatedResponse } from '@/types/api';

// Convert backend response to frontend PaginatedResponse format
const mapPaginatedResponse = (backendData: NoticesResponse): PaginatedResponse<Notice> => ({
  data: backendData.content,
  total: backendData.totalItems,
  page: backendData.currentPage + 1, // Backend uses 0-based, frontend uses 1-based
  limit: backendData.size,
  totalPages: backendData.totalPages,
});

export const noticesApi = {
  /**
   * Get the latest 3 notices for the top page
   */
  getLatest: async (): Promise<Notice[]> => {
    const response = await api.get<ApiResponse<Notice[]>>('/notices/latest');
    return response.data.data!;
  },

  /**
   * Get all notices with pagination
   */
  getAll: async (page: number = 1, size: number = 10): Promise<PaginatedResponse<Notice>> => {
    const params = new URLSearchParams();
    params.append('page', (page - 1).toString()); // Backend uses 0-based
    params.append('size', size.toString());

    const response = await api.get<ApiResponse<NoticesResponse>>(`/notices?${params.toString()}`);
    return mapPaginatedResponse(response.data.data!);
  },

  /**
   * Get a single notice by ID
   */
  getById: async (id: number): Promise<Notice> => {
    const response = await api.get<ApiResponse<Notice>>(`/notices/${id}`);
    return response.data.data!;
  },

  /**
   * Create a new notice
   */
  create: async (data: CreateNoticeRequest): Promise<Notice> => {
    const response = await api.post<ApiResponse<Notice>>('/notices', data);
    return response.data.data!;
  },

  /**
   * Update an existing notice
   */
  update: async (id: number, data: UpdateNoticeRequest): Promise<Notice> => {
    const response = await api.put<ApiResponse<Notice>>(`/notices/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a notice
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/notices/${id}`);
  },
};
