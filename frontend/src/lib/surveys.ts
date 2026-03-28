import api from './api';
import {
  Survey,
  SurveyResponse,
  CreateSurveyRequest,
  SubmitSurveyResponseRequest,
  SurveyDefaults,
} from '@/types/survey';
import { ApiResponse } from '@/types/api';

export const surveysApi = {
  getDefaults: async (): Promise<SurveyDefaults> => {
    const response = await api.get<ApiResponse<SurveyDefaults>>('/surveys/defaults');
    return response.data.data!;
  },

  getScheduleIdsWithSurveys: async (): Promise<number[]> => {
    const response = await api.get<ApiResponse<number[]>>('/surveys/schedule-ids-with-surveys');
    return response.data.data!;
  },

  getAll: async (): Promise<Survey[]> => {
    const response = await api.get<ApiResponse<Survey[]>>('/surveys');
    return response.data.data!;
  },

  getByUrlId: async (urlId: string): Promise<Survey> => {
    const response = await api.get<ApiResponse<Survey>>(`/surveys/${urlId}`);
    return response.data.data!;
  },

  getResults: async (urlId: string): Promise<Survey> => {
    const response = await api.get<ApiResponse<Survey>>(`/surveys/${urlId}/results`);
    return response.data.data!;
  },

  getMyResponses: async (urlId: string): Promise<SurveyResponse[]> => {
    const response = await api.get<ApiResponse<SurveyResponse[]>>(`/surveys/${urlId}/my-responses`);
    return response.data.data!;
  },

  create: async (data: CreateSurveyRequest): Promise<Survey> => {
    const response = await api.post<ApiResponse<Survey>>('/surveys', data);
    return response.data.data!;
  },

  update: async (id: number, data: CreateSurveyRequest): Promise<Survey> => {
    const response = await api.put<ApiResponse<Survey>>(`/surveys/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/surveys/${id}`);
  },

  submitResponses: async (urlId: string, data: SubmitSurveyResponseRequest): Promise<SurveyResponse[]> => {
    const response = await api.post<ApiResponse<SurveyResponse[]>>(`/surveys/${urlId}/responses`, data);
    return response.data.data!;
  },

  deleteResponse: async (responseId: number): Promise<void> => {
    await api.delete(`/surveys/responses/${responseId}`);
  },

  deleteUserResponses: async (urlId: string, userName: string): Promise<void> => {
    await api.delete(`/surveys/${urlId}/responses/${encodeURIComponent(userName)}`);
  },
};

// Helper functions for easier API access
export const getSurveyDefaults = async (): Promise<SurveyDefaults> => {
  return surveysApi.getDefaults();
};

export const getSurveys = async (): Promise<Survey[]> => {
  return surveysApi.getAll();
};

export const getSurvey = async (urlId: string): Promise<Survey> => {
  return surveysApi.getByUrlId(urlId);
};

export const getSurveyResults = async (urlId: string): Promise<Survey> => {
  return surveysApi.getResults(urlId);
};

export const createSurvey = async (data: CreateSurveyRequest): Promise<Survey> => {
  return surveysApi.create(data);
};

export const updateSurvey = async (id: number, data: CreateSurveyRequest): Promise<Survey> => {
  return surveysApi.update(id, data);
};

export const deleteSurvey = async (id: number): Promise<void> => {
  return surveysApi.delete(id);
};

export const submitSurveyResponses = async (urlId: string, data: SubmitSurveyResponseRequest): Promise<SurveyResponse[]> => {
  return surveysApi.submitResponses(urlId, data);
};
