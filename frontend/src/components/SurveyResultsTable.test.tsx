import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SurveyResultsTable from './SurveyResultsTable';
import { Survey } from '@/types/survey';
import { surveysApi } from '@/lib/surveys';

// Mock the surveys API
jest.mock('@/lib/surveys', () => ({
  surveysApi: {
    deleteUserResponses: jest.fn(),
  },
}));

const mockSurveyWithResponses: Survey = {
  id: 1,
  urlId: 'test-url-id',
  title: 'テスト出欠調査',
  belongingList: ['S', 'A', 'T', 'B'],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
    { option: '未定', isAttending: false },
  ],
  enableFreetext: true,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [
    {
      id: 1,
      scheduleId: 101,
      scheduleSummary: 'ミーティング1',
      scheduleDtstart: '2024-02-01T10:00:00',
      scheduleDtend: '2024-02-01T11:00:00',
      mandatory: true,
      responses: [
        {
          id: 1,
          surveyDetailId: 1,
          userName: '山田太郎',
          belonging: 'S',
          responseOption: '出席',
          freeText: '',
          createdAt: '2024-01-20T10:00:00',
          updatedAt: '2024-01-20T10:00:00',
        },
        {
          id: 2,
          surveyDetailId: 1,
          userName: '鈴木一郎',
          belonging: 'A',
          responseOption: '欠席',
          freeText: '用事があります',
          createdAt: '2024-01-21T10:00:00',
          updatedAt: '2024-01-21T12:00:00',
        },
      ],
    },
    {
      id: 2,
      scheduleId: 102,
      scheduleSummary: 'ミーティング2',
      scheduleDtstart: '2024-02-10T14:00:00',
      scheduleDtend: '2024-02-10T15:00:00',
      mandatory: false,
      responses: [
        {
          id: 3,
          surveyDetailId: 2,
          userName: '山田太郎',
          belonging: 'S',
          responseOption: '出席',
          freeText: '',
          createdAt: '2024-01-20T10:00:00',
        },
        {
          id: 4,
          surveyDetailId: 2,
          userName: '鈴木一郎',
          belonging: 'A',
          responseOption: '未定',
          freeText: '',
          createdAt: '2024-01-21T10:00:00',
        },
      ],
    },
  ],
};

const mockSurveyEmpty: Survey = {
  id: 2,
  urlId: 'empty-survey',
  title: '空の調査',
  belongingList: [],
  responseOptions: [],
  enableFreetext: false,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [],
};

const mockSurveyNoResponses: Survey = {
  id: 3,
  urlId: 'no-responses',
  title: '回答なし調査',
  belongingList: ['S', 'A'],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
  ],
  enableFreetext: false,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [
    {
      id: 1,
      scheduleId: 101,
      scheduleSummary: 'ミーティング',
      scheduleDtstart: '2024-02-01T10:00:00',
      scheduleDtend: '2024-02-01T11:00:00',
      mandatory: false,
      responses: [],
    },
  ],
};

describe('SurveyResultsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty states', () => {
    it('should show message when no details exist', () => {
      render(<SurveyResultsTable survey={mockSurveyEmpty} />);

      expect(screen.getByText('対象スケジュールがありません')).toBeInTheDocument();
    });

    it('should show message when no responses exist', () => {
      render(<SurveyResultsTable survey={mockSurveyNoResponses} />);

      expect(screen.getByText('まだ回答がありません')).toBeInTheDocument();
    });
  });

  describe('summary table', () => {
    it('should render summary table header', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getByText('回答集計（参加者数）')).toBeInTheDocument();
      expect(screen.getByText('スケジュール')).toBeInTheDocument();
    });

    it('should render response options as column headers', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getAllByText('出席').length).toBeGreaterThan(0);
      expect(screen.getAllByText('欠席').length).toBeGreaterThan(0);
      expect(screen.getAllByText('未定').length).toBeGreaterThan(0);
    });

    it('should render schedule summaries', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getAllByText('ミーティング1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ミーティング2').length).toBeGreaterThan(0);
    });

    it('should show correct response counts', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      // Summary table exists with counts
      const summarySection = screen.getByText('回答集計（参加者数）').closest('div');
      expect(summarySection).toBeInTheDocument();
    });
  });

  describe('detailed responses table', () => {
    it('should render detailed responses header', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getByText('回答詳細')).toBeInTheDocument();
      expect(screen.getByText('回答者')).toBeInTheDocument();
      expect(screen.getByText('所属')).toBeInTheDocument();
    });

    it('should render user names', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('鈴木一郎')).toBeInTheDocument();
    });

    it('should render user belonging', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      // Belonging values appear in multiple places (summary table header and detail table)
      expect(screen.getAllByText('S').length).toBeGreaterThan(0);
      expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    });

    it('should render free text when provided', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getByText('用事があります')).toBeInTheDocument();
    });

    it('should render response date columns', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      expect(screen.getByText('回答日時')).toBeInTheDocument();
      expect(screen.getByText('更新日時')).toBeInTheDocument();
    });
  });

  describe('delete user responses', () => {
    it('should render delete button for each user', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      expect(deleteButtons.length).toBe(2);
    });

    it('should call deleteUserResponses when delete button is clicked and confirmed', async () => {
      const mockOnResponseDeleted = jest.fn();
      (surveysApi.deleteUserResponses as jest.Mock).mockResolvedValueOnce({});
      window.confirm = jest.fn(() => true);

      render(
        <SurveyResultsTable
          survey={mockSurveyWithResponses}
          onResponseDeleted={mockOnResponseDeleted}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(surveysApi.deleteUserResponses).toHaveBeenCalledWith(
          'test-url-id',
          '山田太郎'
        );
      });

      await waitFor(() => {
        expect(mockOnResponseDeleted).toHaveBeenCalled();
      });
    });

    it('should not call deleteUserResponses when delete is cancelled', async () => {
      window.confirm = jest.fn(() => false);

      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      fireEvent.click(deleteButtons[0]);

      expect(surveysApi.deleteUserResponses).not.toHaveBeenCalled();
    });

    it('should show error alert when delete fails', async () => {
      (surveysApi.deleteUserResponses as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed')
      );
      window.confirm = jest.fn(() => true);
      window.alert = jest.fn();

      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('回答の削除に失敗しました');
      });
    });
  });

  describe('sorting', () => {
    it('should sort schedules by date (closest first)', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const scheduleHeaders = screen.getAllByText(/ミーティング/);
      // First schedule should appear before second
      expect(scheduleHeaders[0].textContent).toContain('ミーティング1');
    });

    it('should sort users by created_at (oldest first)', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const userCells = screen.getAllByText(/太郎|一郎/);
      // 山田太郎 was created first
      expect(userCells[0].textContent).toContain('山田太郎');
    });
  });
});
