'use client';

import { useState, useEffect, useCallback } from 'react';
import { Schedule, ScheduleFilters, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/schedule';
import { PaginationParams, PaginatedResponse } from '@/types/api';
import { schedulesApi } from '@/lib/schedules';

interface UseSchedulesReturn {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  hasMore: boolean;
  hasMorePast: boolean;
  hiddenPastCount: number;
  fetchSchedules: (filters?: ScheduleFilters, pagination?: PaginationParams) => Promise<void>;
  fetchPublicSchedules: (filters?: ScheduleFilters, pagination?: PaginationParams) => Promise<void>;
  fetchMySchedules: (filters?: ScheduleFilters, pagination?: PaginationParams) => Promise<void>;
  fetchSplitSchedules: (loadAllPast?: boolean) => Promise<void>;
  loadAllPastSchedules: () => Promise<void>;
  createSchedule: (data: CreateScheduleRequest) => Promise<Schedule>;
  updateSchedule: (id: number, data: UpdateScheduleRequest) => Promise<Schedule>;
  deleteSchedule: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  setPage: (page: number) => void;
}

export const useSchedules = (
  initialFilters?: ScheduleFilters,
  initialPagination?: PaginationParams
): UseSchedulesReturn => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: initialPagination?.page || 1,
    limit: initialPagination?.limit || 10,
    totalPages: 0,
  });
  const [currentFilters, setCurrentFilters] = useState<ScheduleFilters | undefined>(initialFilters);
  const [currentPagination, setCurrentPagination] = useState<PaginationParams | undefined>(initialPagination);
  const [fetchType, setFetchType] = useState<'all' | 'public' | 'my' | 'split'>('public');
  const [hasMorePast, setHasMorePast] = useState(false);
  const [hiddenPastCount, setHiddenPastCount] = useState(0);
  const [allPastLoaded, setAllPastLoaded] = useState(false);

  const hasMore = pagination.page < pagination.totalPages;

  const handleResponse = (response: PaginatedResponse<Schedule>, append: boolean = false) => {
    if (append) {
      setSchedules(prev => [...prev, ...response.data]);
    } else {
      setSchedules(response.data);
    }
    setPagination({
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages,
    });
  };

  const fetchSchedules = useCallback(async (filters?: ScheduleFilters, paginationParams?: PaginationParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setFetchType('all');
      setCurrentFilters(filters);
      setCurrentPagination(paginationParams);
      const response = await schedulesApi.getAll(filters, paginationParams);
      handleResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPublicSchedules = useCallback(async (filters?: ScheduleFilters, paginationParams?: PaginationParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setFetchType('public');
      setCurrentFilters(filters);
      setCurrentPagination(paginationParams);
      const response = await schedulesApi.getPublic(filters, paginationParams);
      handleResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch public schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMySchedules = useCallback(async (filters?: ScheduleFilters, paginationParams?: PaginationParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setFetchType('my');
      setCurrentFilters(filters);
      setCurrentPagination(paginationParams);
      const response = await schedulesApi.getMySchedules(filters, paginationParams);
      handleResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch my schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSplitSchedules = useCallback(async (loadAllPast: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      setFetchType('split');
      const response = await schedulesApi.getSplit(loadAllPast);

      // Combine past and future schedules in chronological order
      const allSchedules = [...response.pastSchedules, ...response.futureSchedules];
      setSchedules(allSchedules);

      // Update state for past schedules visibility
      setHasMorePast(response.hasMorePast);
      setHiddenPastCount(response.hiddenPastCount);
      setAllPastLoaded(loadAllPast);

      // Update pagination info
      setPagination({
        total: response.totalPast + response.totalFuture,
        page: 1,
        limit: allSchedules.length,
        totalPages: 1, // With split API, we load all at once
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllPastSchedules = useCallback(async () => {
    await fetchSplitSchedules(true);
  }, [fetchSplitSchedules]);

  const refetch = useCallback(async () => {
    switch (fetchType) {
      case 'all':
        await fetchSchedules(currentFilters, currentPagination);
        break;
      case 'public':
        await fetchPublicSchedules(currentFilters, currentPagination);
        break;
      case 'my':
        await fetchMySchedules(currentFilters, currentPagination);
        break;
      case 'split':
        await fetchSplitSchedules(allPastLoaded);
        break;
    }
  }, [fetchType, currentFilters, currentPagination, fetchSchedules, fetchPublicSchedules, fetchMySchedules, fetchSplitSchedules, allPastLoaded]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    // Split mode doesn't use pagination-based loadMore
    if (fetchType === 'split') return;

    const nextPage = pagination.page + 1;
    const nextPagination = { ...currentPagination, page: nextPage, limit: pagination.limit };

    try {
      setIsLoading(true);
      setError(null);

      let response: PaginatedResponse<Schedule>;
      switch (fetchType) {
        case 'all':
          response = await schedulesApi.getAll(currentFilters, nextPagination);
          break;
        case 'public':
          response = await schedulesApi.getPublic(currentFilters, nextPagination);
          break;
        case 'my':
          response = await schedulesApi.getMySchedules(currentFilters, nextPagination);
          break;
        default:
          return;
      }
      handleResponse(response, true);
      setCurrentPagination(nextPagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more schedules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, pagination, currentFilters, currentPagination, fetchType]);

  const setPage = useCallback((page: number) => {
    // Split mode doesn't use pagination
    if (fetchType === 'split') return;

    const newPagination = { ...currentPagination, page, limit: pagination.limit };
    setCurrentPagination(newPagination);

    switch (fetchType) {
      case 'all':
        fetchSchedules(currentFilters, newPagination);
        break;
      case 'public':
        fetchPublicSchedules(currentFilters, newPagination);
        break;
      case 'my':
        fetchMySchedules(currentFilters, newPagination);
        break;
    }
  }, [fetchType, currentFilters, currentPagination, pagination.limit, fetchSchedules, fetchPublicSchedules, fetchMySchedules]);

  const createSchedule = async (data: CreateScheduleRequest): Promise<Schedule> => {
    const schedule = await schedulesApi.create(data);
    await refetch();
    return schedule;
  };

  const updateSchedule = async (id: number, data: UpdateScheduleRequest): Promise<Schedule> => {
    const schedule = await schedulesApi.update(id, data);
    await refetch();
    return schedule;
  };

  const deleteSchedule = async (id: number): Promise<void> => {
    await schedulesApi.delete(id);
    await refetch();
  };

  // Initial fetch - use split API to apply 6n rule
  useEffect(() => {
    fetchSplitSchedules(false);
  }, [fetchSplitSchedules]);

  return {
    schedules,
    isLoading,
    error,
    pagination,
    hasMore,
    hasMorePast,
    hiddenPastCount,
    fetchSchedules,
    fetchPublicSchedules,
    fetchMySchedules,
    fetchSplitSchedules,
    loadAllPastSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch,
    loadMore,
    setPage,
  };
};
