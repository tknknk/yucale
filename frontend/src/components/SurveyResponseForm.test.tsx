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

  describe('login guidance for guests', () => {
    it('should ask a guest to log in before responding', () => {
      render(<SurveyResponseForm survey={mockSurvey} />);

      expect(
        screen.getByText('アカウントを登録済みの場合はログインしてから回答してください。')
      ).toBeInTheDocument();
      // ログイン後は元の出欠調査へ戻す
      expect(screen.getByRole('link', { name: 'ログインする' })).toHaveAttribute(
        'href',
        '/login?redirect=%2F'
      );
    });

    it('should not ask a logged-in user to log in', () => {
      render(<SurveyResponseForm survey={mockSurvey} isAuthenticated />);

      expect(
        screen.queryByRole('link', { name: 'ログインする' })
      ).not.toBeInTheDocument();
    });

    it('should not ask for login on a closed survey', () => {
      const closedSurvey = { ...mockSurvey, deadlineAt: '2020-01-01T00:00:00' };
      render(<SurveyResponseForm survey={closedSurvey} />);

      expect(
        screen.queryByRole('link', { name: 'ログインする' })
      ).not.toBeInTheDocument();
    });
  });

  describe('after a guest submits', () => {
    it('should carry the entered name over to the register page', async () => {
      mockSubmit.mockResolvedValue([]);

      render(<SurveyResponseForm survey={mockSurvey} />);

      fireEvent.change(screen.getByLabelText(/ユーザー名/), {
        target: { value: 'ゆうと' },
      });
      fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));

      const registerLink = await screen.findByRole('link', { name: 'アカウント作成' });
      expect(registerLink).toHaveAttribute('href', '/register?username=%E3%82%86%E3%81%86%E3%81%A8');
    });
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
      // 上部のログイン案内と重複させない
      expect(
        screen.queryByRole('link', { name: 'ログインする' })
      ).not.toBeInTheDocument();
    });

    it('should not offer a login link for unrelated errors', async () => {
      await submitWithApiError('回答の送信に失敗しました');

      expect(screen.queryByRole('link', { name: 'ログイン' })).not.toBeInTheDocument();
    });
  });
});
