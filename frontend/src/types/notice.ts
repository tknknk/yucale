export interface Notice {
  id: number;
  title: string;
  content: string;
  createdByUserId: number;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoticeRequest {
  title: string;
  content: string;
}

export interface UpdateNoticeRequest {
  title: string;
  content: string;
}

export interface NoticesResponse {
  content: Notice[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
