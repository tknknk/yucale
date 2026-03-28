'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Schedule, CreateScheduleRequest, UpdateScheduleRequest, SchedulesSplitResponse } from '@/types/schedule';
import { schedulesApi } from '@/lib/schedules';
import api from '@/lib/api';
import { ApiResponse } from '@/types/api';

// SWR keys
export const SCHEDULES_SPLIT_KEY = '/schedules/split';
export const SCHEDULES_UPCOMING_KEY = '/schedules/upcoming';
export const SCHEDULES_RECENT_KEY = '/schedules/recent';

interface UseSchedulesSplitOptions {
  initialLoadAllPast?: boolean;
  futureSize?: number;
}

interface UseSchedulesSplitReturn {
  data: SchedulesSplitResponse | undefined;
  schedules: Schedule[];
  pastScheduleIds: Set<number>;
  isLoading: boolean;
  error: Error | undefined;
  hasMorePast: boolean;
  hiddenPastCount: number;
  loadAllPastSchedules: () => void;
  mutate: () => Promise<SchedulesSplitResponse | undefined>;
}

// Fetcher for split schedules
const splitFetcher = async ([, loadAllPast, futureSize]: [string, boolean, number]): Promise<SchedulesSplitResponse> => {
  return schedulesApi.getSplit(loadAllPast, futureSize);
};

export function useSchedulesSplit(options: UseSchedulesSplitOptions = {}): UseSchedulesSplitReturn {
  const { initialLoadAllPast = false, futureSize = 100 } = options;

  // Track whether to load all past schedules
  const [loadAllPast, setLoadAllPast] = useState(initialLoadAllPast);

  const { data, error, isLoading, mutate: mutateSplit } = useSWR<SchedulesSplitResponse, Error>(
    [SCHEDULES_SPLIT_KEY, loadAllPast, futureSize],
    splitFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Combine and sort all schedules by start time to ensure correct chronological order
  const schedules = useMemo(() => {
    if (!data) return [];
    return [...data.pastSchedules, ...data.futureSchedules].sort((a, b) => {
      const dateA = new Date(a.dtstart || a.startTime);
      const dateB = new Date(b.dtstart || b.startTime);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data]);

  // Create a Set of past schedule IDs for efficient lookup
  // This uses the backend's classification which is authoritative
  const pastScheduleIds = useMemo(() => {
    return new Set(data?.pastSchedules.map(s => s.id) ?? []);
  }, [data?.pastSchedules]);

  // Update state to trigger SWR refetch with new key
  const loadAllPastSchedules = useCallback(() => {
    setLoadAllPast(true);
  }, []);

  return {
    data,
    schedules,
    pastScheduleIds,
    isLoading,
    error,
    hasMorePast: !loadAllPast && (data?.hasMorePast ?? false),
    hiddenPastCount: data?.hiddenPastCount ?? 0,
    loadAllPastSchedules,
    mutate: mutateSplit,
  };
}

interface UseUpcomingSchedulesReturn {
  schedules: Schedule[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Schedule[] | undefined>;
}

// Fetcher for upcoming schedules
const upcomingFetcher = async ([, limit]: [string, number]): Promise<Schedule[]> => {
  return schedulesApi.getUpcoming(limit);
};

export function useUpcomingSchedules(limit: number = 5): UseUpcomingSchedulesReturn {
  const { data, error, isLoading, mutate: mutateUpcoming } = useSWR<Schedule[], Error>(
    [SCHEDULES_UPCOMING_KEY, limit],
    upcomingFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    schedules: data ?? [],
    isLoading,
    error,
    mutate: mutateUpcoming,
  };
}

interface UseRecentSchedulesReturn {
  past: Schedule[];
  future: Schedule[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<{ past: Schedule[]; future: Schedule[] } | undefined>;
}

// Fetcher for recent schedules
const recentFetcher = async ([, pastCount, futureCount]: [string, number, number]): Promise<{ past: Schedule[]; future: Schedule[] }> => {
  return schedulesApi.getRecent(pastCount, futureCount);
};

export function useRecentSchedules(pastCount: number = 1, futureCount: number = 2): UseRecentSchedulesReturn {
  const { data, error, isLoading, mutate: mutateRecent } = useSWR<{ past: Schedule[]; future: Schedule[] }, Error>(
    [SCHEDULES_RECENT_KEY, pastCount, futureCount],
    recentFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    past: data?.past ?? [],
    future: data?.future ?? [],
    isLoading,
    error,
    mutate: mutateRecent,
  };
}

// Mutation helpers
export async function createSchedule(data: CreateScheduleRequest): Promise<Schedule> {
  const schedule = await schedulesApi.create(data);
  // Invalidate all schedule-related caches
  await Promise.all([
    mutate((key) => Array.isArray(key) && key[0]?.startsWith?.('/schedules')),
  ]);
  return schedule;
}

export async function updateSchedule(id: number, data: UpdateScheduleRequest): Promise<Schedule> {
  const schedule = await schedulesApi.update(id, data);
  // Invalidate all schedule-related caches
  await Promise.all([
    mutate((key) => Array.isArray(key) && key[0]?.startsWith?.('/schedules')),
  ]);
  return schedule;
}

export async function deleteSchedule(id: number): Promise<void> {
  await schedulesApi.delete(id);
  // Invalidate all schedule-related caches
  await Promise.all([
    mutate((key) => Array.isArray(key) && key[0]?.startsWith?.('/schedules')),
  ]);
}

// Invalidate all schedule caches (useful after login/logout)
export async function invalidateSchedulesCaches(): Promise<void> {
  await mutate((key) => Array.isArray(key) && key[0]?.startsWith?.('/schedules'));
}
