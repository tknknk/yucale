'use client';

import useSWR, { mutate } from 'swr';
import { Notice, CreateNoticeRequest, UpdateNoticeRequest } from '@/types/notice';
import { PaginatedResponse } from '@/types/api';
import { noticesApi } from '@/lib/notices';

// SWR keys
export const NOTICES_LATEST_KEY = '/notices/latest';
export const NOTICES_LIST_KEY = '/notices';

interface UseLatestNoticesReturn {
  notices: Notice[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Notice[] | undefined>;
}

// Fetcher for latest notices
const latestFetcher = async (): Promise<Notice[]> => {
  return noticesApi.getLatest();
};

export function useLatestNotices(enabled: boolean = true): UseLatestNoticesReturn {
  const { data, error, isLoading, mutate: mutateLatest } = useSWR<Notice[], Error>(
    enabled ? NOTICES_LATEST_KEY : null,
    latestFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    notices: data ?? [],
    isLoading: enabled ? isLoading : false,
    error,
    mutate: mutateLatest,
  };
}

interface UseNoticesReturn {
  data: PaginatedResponse<Notice> | undefined;
  notices: Notice[];
  isLoading: boolean;
  error: Error | undefined;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  mutate: () => Promise<PaginatedResponse<Notice> | undefined>;
}

// Fetcher for paginated notices
const noticesFetcher = async ([, page, size]: [string, number, number]): Promise<PaginatedResponse<Notice>> => {
  return noticesApi.getAll(page, size);
};

export function useNotices(page: number = 1, size: number = 10, enabled: boolean = true): UseNoticesReturn {
  const { data, error, isLoading, mutate: mutateNotices } = useSWR<PaginatedResponse<Notice>, Error>(
    enabled ? [NOTICES_LIST_KEY, page, size] : null,
    noticesFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    data,
    notices: data?.data ?? [],
    isLoading: enabled ? isLoading : false,
    error,
    pagination: {
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? size,
      totalPages: data?.totalPages ?? 0,
    },
    mutate: mutateNotices,
  };
}

interface UseNoticeReturn {
  notice: Notice | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Notice | undefined>;
}

// Fetcher for single notice
const noticeFetcher = async ([, id]: [string, number]): Promise<Notice> => {
  return noticesApi.getById(id);
};

export function useNotice(id: number | null): UseNoticeReturn {
  const { data, error, isLoading, mutate: mutateNotice } = useSWR<Notice, Error>(
    id ? [`/notices/${id}`, id] : null,
    noticeFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    notice: data,
    isLoading,
    error,
    mutate: mutateNotice,
  };
}

// Mutation helpers
export async function createNotice(data: CreateNoticeRequest): Promise<Notice> {
  const notice = await noticesApi.create(data);
  // Invalidate all notice-related caches
  await invalidateNoticesCaches();
  return notice;
}

export async function updateNotice(id: number, data: UpdateNoticeRequest): Promise<Notice> {
  const notice = await noticesApi.update(id, data);
  // Invalidate all notice-related caches
  await invalidateNoticesCaches();
  return notice;
}

export async function deleteNotice(id: number): Promise<void> {
  await noticesApi.delete(id);
  // Invalidate all notice-related caches
  await invalidateNoticesCaches();
}

// Invalidate all notice caches
export async function invalidateNoticesCaches(): Promise<void> {
  await mutate((key) => {
    if (typeof key === 'string') {
      return key.startsWith('/notices');
    }
    if (Array.isArray(key) && typeof key[0] === 'string') {
      return key[0].startsWith('/notices');
    }
    return false;
  });
}
