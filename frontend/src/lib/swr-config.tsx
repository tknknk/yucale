'use client';

import { SWRConfig } from 'swr';
import api from './api';
import { AxiosError } from 'axios';

// Default fetcher using axios instance
export async function fetcher<T>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}

// SWR global configuration
export const swrConfig = {
  fetcher,
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: (err: AxiosError) => {
    // Don't retry on 401/403/404 errors
    if (err.response?.status) {
      const status = err.response.status;
      if (status === 401 || status === 403 || status === 404) {
        return false;
      }
    }
    return true;
  },
};

interface SWRProviderProps {
  children: React.ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
