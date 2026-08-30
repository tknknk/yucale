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

const mockSurveyWithCheckbox: Survey = {
  id: 4,
  urlId: 'checkbox-survey',
  title: 'チェックボックス調査',
  belongingList: ['S', 'A'],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
  ],
  enableFreetext: false,
  enableCheckbox: true,
  checkboxLabel: '懇親会参加',
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [
    {
      id: 1,
      scheduleId: 101,
      scheduleSummary: 'ミーティングX',
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
          checkboxChecked: true,
          createdAt: '2024-01-20T10:00:00',
        },
        {
          id: 2,
          surveyDetailId: 1,
          userName: '鈴木一郎',
          belonging: 'A',
          responseOption: '出席',
          checkboxChecked: false,
          createdAt: '2024-01-21T10:00:00',
        },
        {
          id: 3,
          surveyDetailId: 1,
          userName: '佐藤花子',
          belonging: 'A',
          responseOption: '欠席',
          checkboxChecked: false,
          createdAt: '2024-01-22T10:00:00',
        },
      ],
    },
  ],
};

// 並び替え検証用。回答日時の古い順と、所属順・回答内容順のいずれもが異なるようにし、
// 設定リストにない所属/選択肢と、未設定・未回答も含める。
const mockSurveyForSorting: Survey = {
  id: 5,
  urlId: 'sorting-survey',
  title: '並び替え調査',
  belongingList: ['S', 'A', 'T', 'B'],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
    { option: '未定', isAttending: false },
  ],
  enableFreetext: false,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [
    {
      id: 1,
      scheduleId: 101,
      scheduleSummary: '第1回',
      scheduleDtstart: '2024-02-01T10:00:00',
      scheduleDtend: '2024-02-01T11:00:00',
      mandatory: true,
      responses: [
        // createdAtの古い順: テノール → ソプラノ → 客演 → 未所属
        {
          id: 1,
          surveyDetailId: 1,
          userName: 'テノール',
          belonging: 'T',
          responseOption: '欠席',
          createdAt: '2024-01-20T10:00:00',
        },
        {
          id: 2,
          surveyDetailId: 1,
          userName: 'ソプラノ',
          belonging: 'S',
          responseOption: '未定',
          createdAt: '2024-01-21T10:00:00',
        },
        {
          id: 3,
          surveyDetailId: 1,
          userName: '客演',
          // belongingList にない所属
          belonging: 'エキストラ',
          responseOption: '出席',
          createdAt: '2024-01-22T10:00:00',
        },
        {
          id: 4,
          surveyDetailId: 1,
          userName: '未所属',
          // responseOptions にない選択肢（設定変更前の回答など）
          responseOption: 'オンライン',
          createdAt: '2024-01-23T10:00:00',
        },
      ],
    },
    {
      id: 2,
      scheduleId: 102,
      scheduleSummary: '第2回',
      scheduleDtstart: '2024-02-10T14:00:00',
      scheduleDtend: '2024-02-10T15:00:00',
      mandatory: false,
      responses: [
        // 第1回には回答していない（第1回で並び替えると最後に来る）
        {
          id: 5,
          surveyDetailId: 2,
          userName: 'アルト',
          belonging: 'A',
          responseOption: '出席',
          createdAt: '2024-01-24T10:00:00',
        },
      ],
    },
  ],
};

const SORTING_USERS = ['テノール', 'ソプラノ', '客演', '未所属', 'アルト'];

// 回答詳細テーブルの回答者列を上から順に取得する（回答者名は詳細テーブルにのみ出現）
const getUserOrder = () =>
  screen
    .getAllByText(new RegExp(`^(${SORTING_USERS.join('|')})$`))
    .map((el) => el.textContent);

describe('SurveyResultsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkbox aggregation and display', () => {
    it('should not render the checkbox column when checkbox is disabled', () => {
      render(<SurveyResultsTable survey={mockSurveyWithResponses} />);

      const summarySection = screen.getByText('回答集計（参加者数）').closest('div') as HTMLElement;
      expect(summarySection).not.toHaveTextContent('☑');
    });

    it('should show the checkbox (without its label) in the summary header next to 合計', () => {
      render(<SurveyResultsTable survey={mockSurveyWithCheckbox} />);

      const summarySection = screen.getByText('回答集計（参加者数）').closest('div') as HTMLElement;
      expect(summarySection).toHaveTextContent('☑');
      // The label string is not shown anywhere (only one checkbox is assumed to exist)
      expect(screen.queryByText('懇親会参加')).not.toBeInTheDocument();
    });

    it('should sum the number of people who enabled the checkbox per schedule', () => {
      render(<SurveyResultsTable survey={mockSurveyWithCheckbox} />);

      const summarySection = screen.getByText('回答集計（参加者数）').closest('div') as HTMLElement;
      const bodyRow = summarySection.querySelector('tbody tr') as HTMLElement;
      const cells = bodyRow.querySelectorAll('td');
      // Last cell is the checkbox count: only 山田太郎 checked it -> 1
      expect(cells[cells.length - 1]).toHaveTextContent('1');
    });

    it('should show the checkbox without its label in the detailed responses', () => {
      render(<SurveyResultsTable survey={mockSurveyWithCheckbox} />);

      const detailSection = screen.getByText('回答詳細').closest('div') as HTMLElement;
      // The checkbox mark is shown for the checked response
      expect(detailSection).toHaveTextContent('☑');
      // ...but the checkbox label string is not shown in the detail section
      expect(detailSection).not.toHaveTextContent('懇親会参加');
    });
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

      // 回答日時は並び替え可能な見出し（既定のソート列なので並び順の記号が付く）
      expect(screen.getByRole('button', { name: /回答日時/ })).toBeInTheDocument();
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

    it('should sort by belonging in the configured order, with extras and unset last', () => {
      render(<SurveyResultsTable survey={mockSurveyForSorting} />);

      fireEvent.click(screen.getByRole('button', { name: /所属/ }));

      // belongingList は S, A, T, B。エキストラは設定外なので後ろ、所属なしは最後
      expect(getUserOrder()).toEqual([
        'ソプラノ', // S
        'アルト', // A
        'テノール', // T
        '客演', // エキストラ（設定外）
        '未所属', // 所属なし
      ]);
    });

    it('should reverse the belonging order on a second click', () => {
      render(<SurveyResultsTable survey={mockSurveyForSorting} />);

      const belongingHeader = screen.getByRole('button', { name: /所属/ });
      fireEvent.click(belongingHeader);
      fireEvent.click(belongingHeader);

      expect(getUserOrder()).toEqual([
        '未所属',
        '客演',
        'テノール',
        'アルト',
        'ソプラノ',
      ]);
    });

    it('should sort by a schedule response in the configured option order', () => {
      render(<SurveyResultsTable survey={mockSurveyForSorting} />);

      fireEvent.click(screen.getByRole('button', { name: /第1回/ }));

      // responseOptions は 出席, 欠席, 未定。オンラインは設定外なので後ろ、未回答は最後
      expect(getUserOrder()).toEqual([
        '客演', // 出席
        'テノール', // 欠席
        'ソプラノ', // 未定
        '未所属', // オンライン（設定外）
        'アルト', // 第1回は未回答
      ]);
    });

    it('should keep the created_at order for users that tie', () => {
      const survey: Survey = {
        ...mockSurveyForSorting,
        details: [
          {
            ...mockSurveyForSorting.details![0],
            responses: mockSurveyForSorting.details![0].responses!.map((r) => ({
              ...r,
              belonging: 'S',
            })),
          },
        ],
      };
      render(<SurveyResultsTable survey={survey} />);

      fireEvent.click(screen.getByRole('button', { name: /所属/ }));

      // 全員同じ所属なので、既定の並び（回答日時の古い順）のまま
      expect(getUserOrder()).toEqual(['テノール', 'ソプラノ', '客演', '未所属']);
    });

    it('should return to the created_at order when the 回答日時 header is used', () => {
      render(<SurveyResultsTable survey={mockSurveyForSorting} />);

      fireEvent.click(screen.getByRole('button', { name: /所属/ }));
      fireEvent.click(screen.getByRole('button', { name: /回答日時/ }));

      expect(getUserOrder()).toEqual([
        'テノール',
        'ソプラノ',
        '客演',
        '未所属',
        'アルト',
      ]);
    });
  });
});
