import { parseISO, startOfDay, isValid } from 'date-fns';
import api from './api';
import { Schedule, CreateScheduleRequest, UpdateScheduleRequest, ScheduleFilters, SchedulesSplitResponse } from '@/types/schedule';
import { PaginatedResponse, PaginationParams, ApiResponse } from '@/types/api';

/**
 * Check if a schedule is finished (past).
 * - For all-day events: finished if end date is before today AND start date is before today
 * - For regular events: finished if end time is before current time AND start time is before current time
 *
 * This function is used to determine whether to display a schedule as "past" (grayed out)
 * or "active" (highlighted). It should be used consistently across all schedule displays.
 *
 * Key principle: If an event starts today or later, it's always active regardless of end time.
 */
export const isScheduleFinished = (schedule: Schedule, now: Date = new Date()): boolean => {
  const startDateStr = schedule.dtstart || schedule.startTime;
  const endDateStr = schedule.dtend || schedule.endTime;
  if (!startDateStr || !endDateStr) return false;

  // Use parseISO for consistent parsing of ISO 8601 date strings
  let startDate = parseISO(startDateStr);
  let endDate = parseISO(endDateStr);
  if (!isValid(startDate)) startDate = new Date(startDateStr);
  if (!isValid(endDate)) endDate = new Date(endDateStr);
  if (!isValid(startDate) || !isValid(endDate)) return false;

  const todayStart = startOfDay(now);

  if (schedule.allDay) {
    // For all-day events:
    // Active if: start date is today or later, OR end date is today or later
    const startDateOnly = startOfDay(startDate);
    const endDateOnly = startOfDay(endDate);

    // If the event starts today or later, it's active
    if (startDateOnly >= todayStart) return false;

    // If the event ends today or later, it's still active (ongoing)
    return endDateOnly < todayStart;
  } else {
    // For regular events:
    // Active if: start time is in the future, OR end time is in the future (ongoing)

    // If the event starts in the future, it's active
    if (startDate >= now) return false;

    // If the event is still ongoing (end time is in the future), it's active
    return endDate < now;
  }
};

// Backend response structure for paginated schedules
interface BackendPaginatedResponse {
  content: Schedule[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Convert backend response to frontend PaginatedResponse format
const mapPaginatedResponse = (backendData: BackendPaginatedResponse): PaginatedResponse<Schedule> => ({
  data: backendData.content,
  total: backendData.totalItems,
  page: backendData.currentPage + 1, // Backend uses 0-based, frontend uses 1-based
  limit: backendData.size,
  totalPages: backendData.totalPages,
});

export const schedulesApi = {
  getAll: async (
    filters?: ScheduleFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Schedule>> => {
    const params = new URLSearchParams();

    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId.toString());

    // Backend uses 0-based page index
    if (pagination?.page) params.append('page', (pagination.page - 1).toString());
    if (pagination?.limit) params.append('size', pagination.limit.toString());

    const response = await api.get<ApiResponse<BackendPaginatedResponse>>(`/schedules?${params.toString()}`);
    return mapPaginatedResponse(response.data.data!);
  },

  getPublic: async (
    filters?: ScheduleFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Schedule>> => {
    const params = new URLSearchParams();

    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    // Backend uses 0-based page index
    if (pagination?.page) params.append('page', (pagination.page - 1).toString());
    if (pagination?.limit) params.append('size', pagination.limit.toString());

    const response = await api.get<ApiResponse<BackendPaginatedResponse>>(`/schedules?${params.toString()}`);
    return mapPaginatedResponse(response.data.data!);
  },

  getById: async (id: number): Promise<Schedule> => {
    const response = await api.get<ApiResponse<Schedule>>(`/schedules/${id}`);
    return response.data.data!;
  },

  getByUrlId: async (urlId: string): Promise<Schedule> => {
    const response = await api.get<ApiResponse<Schedule>>(`/schedules/url/${urlId}`);
    return response.data.data!;
  },

  getMySchedules: async (
    filters?: ScheduleFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Schedule>> => {
    const params = new URLSearchParams();

    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    // Backend uses 0-based page index
    if (pagination?.page) params.append('page', (pagination.page - 1).toString());
    if (pagination?.limit) params.append('size', pagination.limit.toString());

    // Use the same endpoint as getAll since there's no /my endpoint
    const response = await api.get<ApiResponse<BackendPaginatedResponse>>(`/schedules?${params.toString()}`);
    return mapPaginatedResponse(response.data.data!);
  },

  create: async (data: CreateScheduleRequest): Promise<Schedule> => {
    const response = await api.post<ApiResponse<Schedule>>('/schedules', data);
    return response.data.data!;
  },

  update: async (id: number, data: UpdateScheduleRequest): Promise<Schedule> => {
    const response = await api.put<ApiResponse<Schedule>>(`/schedules/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },

  getUpcoming: async (limit: number = 5): Promise<Schedule[]> => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const response = await api.get<ApiResponse<Schedule[]>>(`/schedules/upcoming?${params.toString()}`);
    return response.data.data!;
  },

  // Get recent schedules: past N items + future M items around current time
  getRecent: async (pastCount: number = 1, futureCount: number = 2): Promise<{ past: Schedule[]; future: Schedule[] }> => {
    // Fetch more schedules to ensure we have enough past and future items
    const params = new URLSearchParams();
    params.append('page', '0');
    params.append('size', '50');

    const response = await api.get<ApiResponse<BackendPaginatedResponse>>(`/schedules?${params.toString()}`);
    const allSchedules = response.data.data!.content;

    const now = new Date();
    const past: Schedule[] = [];
    const future: Schedule[] = [];

    // Sort schedules by start time
    const sorted = [...allSchedules].sort((a, b) => {
      const dateA = new Date(a.dtstart || a.startTime);
      const dateB = new Date(b.dtstart || b.startTime);
      return dateA.getTime() - dateB.getTime();
    });

    for (const schedule of sorted) {
      if (isScheduleFinished(schedule, now)) {
        past.push(schedule);
      } else {
        future.push(schedule);
      }
    }

    // Get the most recent past items and closest future items
    return {
      past: past.slice(-pastCount),
      future: future.slice(0, futureCount),
    };
  },

  // Get schedules split by past/future with 6n rule for past schedules
  getSplit: async (loadAllPast: boolean = false, futureSize: number = 100): Promise<SchedulesSplitResponse> => {
    const params = new URLSearchParams();
    params.append('loadAllPast', loadAllPast.toString());
    params.append('futureSize', futureSize.toString());

    const response = await api.get<ApiResponse<SchedulesSplitResponse>>(`/schedules/split?${params.toString()}`);
    return response.data.data!;
  },

  // Get distinct locations ordered by most recent usage
  getLocations: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/schedules/locations');
    return response.data.data!;
  },
};

// Helper functions for easier API access
export const getSchedules = async (page: number = 1, size: number = 10): Promise<PaginatedResponse<Schedule>> => {
  return schedulesApi.getPublic(undefined, { page, limit: size });
};

export const getSchedule = async (id: number): Promise<Schedule> => {
  return schedulesApi.getById(id);
};

export const createSchedule = async (data: CreateScheduleRequest): Promise<Schedule> => {
  return schedulesApi.create(data);
};

export const updateSchedule = async (id: number, data: UpdateScheduleRequest): Promise<Schedule> => {
  return schedulesApi.update(id, data);
};

export const deleteSchedule = async (id: number): Promise<void> => {
  return schedulesApi.delete(id);
};

export const getUpcomingSchedules = async (limit: number = 5): Promise<Schedule[]> => {
  return schedulesApi.getUpcoming(limit);
};
