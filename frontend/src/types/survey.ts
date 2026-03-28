export interface ResponseOption {
  option: string;
  isAttending: boolean;
}

export interface Survey {
  id: number;
  urlId: string;
  title: string;
  description?: string;
  belongingList: string[];
  responseOptions: ResponseOption[];
  enableFreetext: boolean;
  deadlineAt?: string;
  softDue?: boolean;
  createdByUsername?: string;
  details?: SurveyDetail[];
  createdAt: string;
  updatedAt: string;
  hasResponded?: boolean;
}

export interface SurveyDetail {
  id: number;
  scheduleId: number;
  scheduleSummary: string;
  scheduleDtstart: string;
  scheduleDtend: string;
  mandatory: boolean;
  responses?: SurveyResponse[];
}

export interface SurveyResponse {
  id: number;
  surveyDetailId: number;
  userName: string;
  belonging?: string;
  responseOption?: string;
  freeText?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  belongingList?: string[];
  responseOptions?: ResponseOption[];
  enableFreetext?: boolean;
  deadlineAt?: string;
  softDue?: boolean;
  details: SurveyDetailRequest[];
}

export interface SurveyDetailRequest {
  scheduleId: number;
  mandatory?: boolean;
}

export interface SubmitSurveyResponseRequest {
  userName: string;
  belonging?: string;
  responses: ResponseItem[];
}

export interface ResponseItem {
  surveyDetailId: number;
  responseOption?: string;
  freeText?: string;
}

export interface SurveyDefaults {
  belongingList: string[];
  responseOptions: ResponseOption[];
}
