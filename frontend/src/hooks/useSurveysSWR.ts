'use client';

import useSWR, { mutate } from 'swr';
import { Survey, SurveyDefaults, SurveyResponse, CreateSurveyRequest, SubmitSurveyResponseRequest } from '@/types/survey';
import { surveysApi } from '@/lib/surveys';

// SWR keys
export const SURVEYS_LIST_KEY = '/surveys';
export const SURVEYS_DEFAULTS_KEY = '/surveys/defaults';
export const SURVEYS_SCHEDULE_IDS_KEY = '/surveys/schedule-ids-with-surveys';

interface UseSurveysReturn {
  surveys: Survey[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Survey[] | undefined>;
}

// Fetcher for all surveys
const surveysFetcher = async (): Promise<Survey[]> => {
  return surveysApi.getAll();
};

export function useSurveys(): UseSurveysReturn {
  const { data, error, isLoading, mutate: mutateSurveys } = useSWR<Survey[], Error>(
    SURVEYS_LIST_KEY,
    surveysFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    surveys: data ?? [],
    isLoading,
    error,
    mutate: mutateSurveys,
  };
}

interface UseSurveyDefaultsReturn {
  defaults: SurveyDefaults | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<SurveyDefaults | undefined>;
}

// Fetcher for survey defaults
const defaultsFetcher = async (): Promise<SurveyDefaults> => {
  return surveysApi.getDefaults();
};

export function useSurveyDefaults(): UseSurveyDefaultsReturn {
  const { data, error, isLoading, mutate: mutateDefaults } = useSWR<SurveyDefaults, Error>(
    SURVEYS_DEFAULTS_KEY,
    defaultsFetcher,
    {
      revalidateOnFocus: false, // Defaults rarely change
    }
  );

  return {
    defaults: data,
    isLoading,
    error,
    mutate: mutateDefaults,
  };
}

interface UseScheduleIdsWithSurveysReturn {
  scheduleIds: number[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<number[] | undefined>;
}

// Fetcher for schedule IDs with surveys
const scheduleIdsFetcher = async (): Promise<number[]> => {
  return surveysApi.getScheduleIdsWithSurveys();
};

export function useScheduleIdsWithSurveys(): UseScheduleIdsWithSurveysReturn {
  const { data, error, isLoading, mutate: mutateScheduleIds } = useSWR<number[], Error>(
    SURVEYS_SCHEDULE_IDS_KEY,
    scheduleIdsFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    scheduleIds: data ?? [],
    isLoading,
    error,
    mutate: mutateScheduleIds,
  };
}

interface UseSurveyReturn {
  survey: Survey | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Survey | undefined>;
}

// Fetcher for single survey by urlId
const surveyFetcher = async ([, urlId]: [string, string]): Promise<Survey> => {
  return surveysApi.getByUrlId(urlId);
};

export function useSurvey(urlId: string | null): UseSurveyReturn {
  const { data, error, isLoading, mutate: mutateSurvey } = useSWR<Survey, Error>(
    urlId ? [`/surveys/${urlId}`, urlId] : null,
    surveyFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    survey: data,
    isLoading,
    error,
    mutate: mutateSurvey,
  };
}

interface UseSurveyResultsReturn {
  survey: Survey | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<Survey | undefined>;
}

// Fetcher for survey results
const resultsFetcher = async ([, urlId]: [string, string]): Promise<Survey> => {
  return surveysApi.getResults(urlId);
};

export function useSurveyResults(urlId: string | null): UseSurveyResultsReturn {
  const { data, error, isLoading, mutate: mutateResults } = useSWR<Survey, Error>(
    urlId ? [`/surveys/${urlId}/results`, urlId] : null,
    resultsFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    survey: data,
    isLoading,
    error,
    mutate: mutateResults,
  };
}

interface UseMyResponsesReturn {
  responses: SurveyResponse[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<SurveyResponse[] | undefined>;
}

// Fetcher for my responses
const myResponsesFetcher = async ([, urlId]: [string, string]): Promise<SurveyResponse[]> => {
  return surveysApi.getMyResponses(urlId);
};

export function useMyResponses(urlId: string | null): UseMyResponsesReturn {
  const { data, error, isLoading, mutate: mutateResponses } = useSWR<SurveyResponse[], Error>(
    urlId ? [`/surveys/${urlId}/my-responses`, urlId] : null,
    myResponsesFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    responses: data ?? [],
    isLoading,
    error,
    mutate: mutateResponses,
  };
}

// Mutation helpers
export async function createSurvey(data: CreateSurveyRequest): Promise<Survey> {
  const survey = await surveysApi.create(data);
  await invalidateSurveysCaches();
  return survey;
}

export async function updateSurvey(id: number, data: CreateSurveyRequest): Promise<Survey> {
  const survey = await surveysApi.update(id, data);
  await invalidateSurveysCaches();
  return survey;
}

export async function deleteSurvey(id: number): Promise<void> {
  await surveysApi.delete(id);
  await invalidateSurveysCaches();
}

export async function submitSurveyResponses(urlId: string, data: SubmitSurveyResponseRequest): Promise<SurveyResponse[]> {
  const responses = await surveysApi.submitResponses(urlId, data);
  // Invalidate specific survey caches
  await mutate([`/surveys/${urlId}`, urlId]);
  await mutate([`/surveys/${urlId}/results`, urlId]);
  await mutate([`/surveys/${urlId}/my-responses`, urlId]);
  await mutate(SURVEYS_LIST_KEY);
  return responses;
}

export async function deleteUserResponses(urlId: string, userName: string): Promise<void> {
  await surveysApi.deleteUserResponses(urlId, userName);
  // Invalidate specific survey caches
  await mutate([`/surveys/${urlId}`, urlId]);
  await mutate([`/surveys/${urlId}/results`, urlId]);
  await mutate([`/surveys/${urlId}/my-responses`, urlId]);
}

// Invalidate all survey caches
export async function invalidateSurveysCaches(): Promise<void> {
  await mutate((key) => {
    if (typeof key === 'string') {
      return key.startsWith('/surveys');
    }
    if (Array.isArray(key) && typeof key[0] === 'string') {
      return key[0].startsWith('/surveys');
    }
    return false;
  });
}
