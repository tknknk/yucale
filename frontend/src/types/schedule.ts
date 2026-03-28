import { User } from './user';

export interface Schedule {
  id: number;
  urlId?: string;
  title: string;
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  dtstart: string;
  dtend: string;
  allDay: boolean;
  location?: string;
  song?: string;
  recording?: string;
  attendees?: string;
  userId: number;
  user?: User;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CreateScheduleRequest {
  title: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  dtstart?: string;
  dtend?: string;
  allDay?: boolean;
  location?: string;
  song?: string;
  recording?: string;
}

export interface UpdateScheduleRequest {
  title?: string;
  summary?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  dtstart?: string;
  dtend?: string;
  allDay?: boolean;
  location?: string;
  song?: string;
  recording?: string;
}

export interface ScheduleFilters {
  startDate?: string;
  endDate?: string;
  userId?: number;
}

export interface ScheduleFormData {
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  allDay: boolean;
  location?: string;
  song?: string;
  recording?: string;
}

export interface SchedulesSplitResponse {
  pastSchedules: Schedule[];
  futureSchedules: Schedule[];
  totalPast: number;
  totalFuture: number;
  hiddenPastCount: number;
  hasMorePast: boolean;
  hasMoreFuture: boolean;
}
