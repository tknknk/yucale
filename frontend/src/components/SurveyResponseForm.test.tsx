import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SurveyResponseForm from './SurveyResponseForm';
import { Survey } from '@/types/survey';
import { submitSurveyResponses } from '@/lib/surveys';

jest.mock('@/lib/surveys', () => ({
  submitSurveyResponses: jest.fn(),
}));

const mockSubmit = submitSurveyResponses as jest.MockedFunction<typeof submitSurveyResponses>;

const mockSurvey: Survey = {
  id: 1,
  urlId: 'test-url-id',
  title: 'テスト出欠調査',
  belongingList: [],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
  ],
  enableFreetext: false,
  enableCheckbox: false,
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
  details: [
    {
      id: 1,
      scheduleId: 101,
      scheduleSummary: 'ミーティング',
      scheduleDtstart: '2099-02-01T10:00:00',
      scheduleDtend: '2099-02-01T11:00:00',
      mandatory: false,
      responses: [],
    },
  ],
};

// ユーザー名を入れて送信し、API のエラーを画面に出させる
const submitWithApiError = async (message: string) => {
  mockSubmit.mockRejectedValue({ response: { data: { message } } });

  render(<SurveyResponseForm survey={mockSurvey} />);

  fireEvent.change(screen.getByLabelText(/ユーザー名/), { target: { value: 'ゲスト' } });
  fireEvent.click(screen.getByRole('button', { name: /回答を送信|回答を更新/ }));

  await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
};

describe('SurveyResponseForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn();
  });

  describe('errors that logging in would resolve', () => {
    it('should offer a login link when the name has already responded', async () => {
      await submitWithApiError(
        'このユーザー名では既に回答済みです。回答を編集するにはログインしてください。'
      );

      expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute('href', '/login');
    });

    it('should offer a login link when the name belongs to a registered account', async () => {
      await submitWithApiError('このユーザー名は既に登録されています。ログインして回答してください。');

      expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute('href', '/login');
    });

    it('should not offer a login link for unrelated errors', async () => {
      await submitWithApiError('回答の送信に失敗しました');

      expect(screen.queryByRole('link', { name: 'ログイン' })).not.toBeInTheDocument();
    });
  });
});
