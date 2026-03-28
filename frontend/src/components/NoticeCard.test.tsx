import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NoticeCard from './NoticeCard';
import { Notice } from '@/types/notice';

const mockNotice: Notice = {
  id: 1,
  title: 'Test Notice',
  content: 'This is a test notice content',
  createdByUserId: 1,
  createdByUsername: 'testuser',
  createdAt: '2024-02-15T10:00:00',
  updatedAt: '2024-02-15T10:00:00',
};

describe('NoticeCard', () => {
  it('should render the notice title', () => {
    render(<NoticeCard notice={mockNotice} />);

    expect(screen.getByText('Test Notice')).toBeInTheDocument();
  });

  it('should display creator username', () => {
    render(<NoticeCard notice={mockNotice} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should display formatted date', () => {
    render(<NoticeCard notice={mockNotice} />);

    // Date should be in Japanese format (2月15日)
    expect(screen.getByText(/2月15日/)).toBeInTheDocument();
  });

  describe('expansion behavior', () => {
    it('should not display content initially', () => {
      render(<NoticeCard notice={mockNotice} />);

      expect(screen.queryByText('This is a test notice content')).not.toBeInTheDocument();
    });

    it('should expand and show content when clicked', () => {
      render(<NoticeCard notice={mockNotice} />);

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();
    });

    it('should toggle expansion on click', () => {
      render(<NoticeCard notice={mockNotice} />);

      const cardButton = screen.getByRole('button');

      // First click - expand
      fireEvent.click(cardButton);
      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();

      // Second click - collapse
      fireEvent.click(cardButton);
      expect(screen.queryByText('This is a test notice content')).not.toBeInTheDocument();
    });

    it('should expand on Enter key press', () => {
      render(<NoticeCard notice={mockNotice} />);

      const cardButton = screen.getByRole('button');
      fireEvent.keyDown(cardButton, { key: 'Enter' });

      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();
    });

    it('should expand on Space key press', () => {
      render(<NoticeCard notice={mockNotice} />);

      const cardButton = screen.getByRole('button');
      fireEvent.keyDown(cardButton, { key: ' ' });

      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();
    });

  });

  describe('forceExpanded prop', () => {
    it('should display content when forceExpanded is true', () => {
      render(<NoticeCard notice={mockNotice} forceExpanded={true} />);

      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();
    });

    it('should hide expand/collapse indicator when forceExpanded is true', () => {
      const { container } = render(<NoticeCard notice={mockNotice} forceExpanded={true} />);

      // The expand indicator SVG should not be present
      const expandIndicator = container.querySelector('.flex.flex-col.items-end.gap-2.ml-4');
      expect(expandIndicator).not.toBeInTheDocument();
    });

    it('should show expand/collapse indicator when forceExpanded is false', () => {
      const { container } = render(<NoticeCard notice={mockNotice} forceExpanded={false} />);

      // The expand indicator SVG should be present
      const expandIndicator = container.querySelector('.flex.flex-col.items-end.gap-2.ml-4');
      expect(expandIndicator).toBeInTheDocument();
    });
  });

  describe('URL linking', () => {
    it('should render URLs as clickable links', () => {
      const noticeWithUrl: Notice = {
        ...mockNotice,
        content: 'Check out https://example.com for more info',
      };
      render(<NoticeCard notice={noticeWithUrl} forceExpanded={true} />);

      const link = screen.getByRole('link', { name: 'https://example.com' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render multiple URLs as separate links', () => {
      const noticeWithUrls: Notice = {
        ...mockNotice,
        content: 'Visit https://example.com and http://test.org',
      };
      render(<NoticeCard notice={noticeWithUrls} forceExpanded={true} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'https://example.com');
      expect(links[1]).toHaveAttribute('href', 'http://test.org');
    });

    it('should render text without URLs normally', () => {
      render(<NoticeCard notice={mockNotice} forceExpanded={true} />);

      expect(screen.getByText('This is a test notice content')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not display action buttons when canEdit is false', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          canEdit={false}
        />
      );

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
    });

    it('should display action buttons when canEdit is true and expanded', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          canEdit={true}
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.getByRole('button', { name: /編集/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /削除/ })).toBeInTheDocument();
    });

    it('should call onEdit with notice when edit button is clicked', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          canEdit={true}
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      const editButton = screen.getByRole('button', { name: /編集/ });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(mockNotice);
    });

    it('should call onDelete with notice id when delete button is clicked', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          canEdit={true}
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      const deleteButton = screen.getByRole('button', { name: /削除/ });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockNotice.id);
    });

    it('should not display edit button when onEdit is not provided', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onDelete={mockOnDelete}
          canEdit={true}
        />
      );

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument();
    });

    it('should not display delete button when onDelete is not provided', () => {
      render(
        <NoticeCard
          notice={mockNotice}
          onEdit={mockOnEdit}
          canEdit={true}
        />
      );

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
    });
  });

  describe('date formatting', () => {
    it('should display date in Japanese format', () => {
      render(<NoticeCard notice={mockNotice} />);

      // Date should be in Japanese format (2月15日(木))
      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });

    it('should handle different dates', () => {
      const noticeWithDifferentDate = {
        ...mockNotice,
        createdAt: '2024-03-20T14:00:00',
      };
      render(<NoticeCard notice={noticeWithDifferentDate} />);

      // Date should be in Japanese format (3月20日)
      expect(screen.getByText(/3月20日/)).toBeInTheDocument();
    });
  });
});
