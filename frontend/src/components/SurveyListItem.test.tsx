import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyListItem from './SurveyListItem';
import { Survey } from '@/types/survey';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockSurvey: Survey = {
  id: 1,
  urlId: 'test-url-id',
  title: 'テスト出欠調査',
  description: 'これはテスト用の説明文です',
  belongingList: ['S', 'A', 'T', 'B'],
  responseOptions: [
    { option: '出席', isAttending: true },
    { option: '欠席', isAttending: false },
    { option: '未定', isAttending: false },
  ],
  enableFreetext: true,
  deadlineAt: '2025-12-31T23:59:59',
  createdByUsername: 'testuser',
  createdAt: '2024-01-15T10:00:00',
  updatedAt: '2024-01-15T10:00:00',
};

describe('SurveyListItem', () => {
  it('should render the survey title', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    expect(screen.getByText('テスト出欠調査')).toBeInTheDocument();
  });

  it('should render the survey description', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    expect(screen.getByText('これはテスト用の説明文です')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const surveyWithoutDescription = { ...mockSurvey, description: undefined };
    render(<SurveyListItem survey={surveyWithoutDescription} />);

    expect(screen.queryByText('これはテスト用の説明文です')).not.toBeInTheDocument();
  });

  it('should render the creator username', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    expect(screen.getByText(/作成者: testuser/)).toBeInTheDocument();
  });

  it('should render the created date', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    expect(screen.getByText(/作成日: 2024\/01\/15/)).toBeInTheDocument();
  });

  it('should render the deadline date when provided', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    expect(screen.getByText(/締切: 2025\/12\/31/)).toBeInTheDocument();
  });

  it('should not render deadline when not provided', () => {
    const surveyWithoutDeadline = { ...mockSurvey, deadlineAt: undefined };
    render(<SurveyListItem survey={surveyWithoutDeadline} />);

    expect(screen.queryByText(/締切:/)).not.toBeInTheDocument();
  });

  it('should show expired badge when deadline has passed', () => {
    const surveyWithPastDeadline = { ...mockSurvey, deadlineAt: '2020-01-01T23:59:59' };
    render(<SurveyListItem survey={surveyWithPastDeadline} />);

    expect(screen.getByText(/締切済/)).toBeInTheDocument();
  });

  it('should apply gray styling when deadline has passed', () => {
    const surveyWithPastDeadline = { ...mockSurvey, deadlineAt: '2020-01-01T23:59:59' };
    const { container } = render(<SurveyListItem survey={surveyWithPastDeadline} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('opacity-60');
    expect(card.className).toContain('from-gray-50');
  });

  it('should render response link when not responded', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    const responseLinks = screen.getAllByRole('link', { name: '未回答' });
    expect(responseLinks.length).toBeGreaterThan(0);
    expect(responseLinks[0]).toHaveAttribute('href', '/survey/test-url-id');
  });

  it('should show "回答済" link when hasResponded is true', () => {
    const respondedSurvey = { ...mockSurvey, hasResponded: true };
    render(<SurveyListItem survey={respondedSurvey} />);

    const respondedLinks = screen.getAllByRole('link', { name: '回答済' });
    expect(respondedLinks.length).toBeGreaterThan(0);
    expect(respondedLinks[0]).toHaveAttribute('href', '/survey/test-url-id');
    expect(screen.queryByRole('link', { name: '未回答' })).not.toBeInTheDocument();
  });

  it('should render title as link to survey page', () => {
    render(<SurveyListItem survey={mockSurvey} />);

    const titleLink = screen.getByRole('link', { name: 'テスト出欠調査' });
    expect(titleLink).toHaveAttribute('href', '/survey/test-url-id');
  });

  describe('when showEditLink is true', () => {
    it('should render edit link', () => {
      render(<SurveyListItem survey={mockSurvey} showEditLink={true} />);

      const editLinks = screen.getAllByRole('link', { name: '調査を編集' });
      expect(editLinks.length).toBeGreaterThan(0);
      expect(editLinks[0]).toHaveAttribute('href', '/survey/edit/test-url-id');
    });

    it('should render results link', () => {
      render(<SurveyListItem survey={mockSurvey} showEditLink={true} />);

      const resultsLinks = screen.getAllByRole('link', { name: '結果' });
      expect(resultsLinks.length).toBeGreaterThan(0);
      expect(resultsLinks[0]).toHaveAttribute('href', '/survey/test-url-id?tab=results');
    });
  });

  describe('when showEditLink is false', () => {
    it('should not render edit link', () => {
      render(<SurveyListItem survey={mockSurvey} showEditLink={false} />);

      expect(screen.queryByRole('link', { name: '調査を編集' })).not.toBeInTheDocument();
    });

    it('should not render results link', () => {
      render(<SurveyListItem survey={mockSurvey} showEditLink={false} />);

      expect(screen.queryByRole('link', { name: '結果' })).not.toBeInTheDocument();
    });
  });
});
