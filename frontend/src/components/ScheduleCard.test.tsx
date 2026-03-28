import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScheduleCard from './ScheduleCard';
import { Schedule } from '@/types/schedule';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the auth lib
jest.mock('@/lib/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn().mockResolvedValue(null),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock api module for SESSION_EXPIRED_EVENT
jest.mock('@/lib/api', () => ({
  SESSION_EXPIRED_EVENT: 'session-expired',
}));

const mockSchedule: Schedule = {
  id: 1,
  title: 'Test Schedule',
  summary: 'Test Summary',
  description: 'This is a test description',
  startTime: '2024-02-15T10:00:00',
  endTime: '2024-02-15T11:00:00',
  dtstart: '2024-02-15T10:00:00',
  dtend: '2024-02-15T11:00:00',
  allDay: false,
  location: 'Test Location',
  userId: 1,
  createdAt: '2024-02-01T00:00:00',
  updatedAt: '2024-02-01T00:00:00',
};

// Helper function to render with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('ScheduleCard', () => {
  it('should render the schedule title/summary', () => {
    renderWithAuth(<ScheduleCard schedule={mockSchedule} />);

    expect(screen.getByText('Test Summary')).toBeInTheDocument();
  });

  it('should display location when provided and user has VIEWER role', () => {
    renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

    // Click to expand the card first
    const cardButton = screen.getByRole('button');
    fireEvent.click(cardButton);

    expect(screen.getByText('Test Location')).toBeInTheDocument();
  });

  it('should not display location when userRole is not set', () => {
    renderWithAuth(<ScheduleCard schedule={mockSchedule} />);

    // Click to expand the card
    const cardButton = screen.getByRole('button');
    fireEvent.click(cardButton);

    // Location should not be visible without a role
    expect(screen.queryByText('Test Location')).not.toBeInTheDocument();
  });

  it('should display description when expanded and user has VIEWER role', () => {
    renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

    // Click to expand the card first
    const cardButton = screen.getByRole('button');
    fireEvent.click(cardButton);

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  describe('expansion behavior', () => {
    it('should expand when clicked and show details for VIEWER role', () => {
      renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      // After expansion, we should see description and location content
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
      expect(screen.getByText('Test Location')).toBeInTheDocument();
    });

    it('should toggle expansion on click', () => {
      renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

      const cardButton = screen.getByRole('button');

      // First click - expand
      fireEvent.click(cardButton);
      expect(screen.getByText('This is a test description')).toBeInTheDocument();

      // Second click - collapse
      fireEvent.click(cardButton);
      expect(screen.queryByText('This is a test description')).not.toBeInTheDocument();
    });

    it('should expand on Enter key press', () => {
      renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

      const cardButton = screen.getByRole('button');
      fireEvent.keyDown(cardButton, { key: 'Enter' });

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should expand on Space key press', () => {
      renderWithAuth(<ScheduleCard schedule={mockSchedule} userRole="VIEWER" />);

      const cardButton = screen.getByRole('button');
      fireEvent.keyDown(cardButton, { key: ' ' });

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should display update info when expanded and updatedAt is present', () => {
      const scheduleWithUpdatedBy = {
        ...mockSchedule,
        updatedBy: 'testuser',
      };
      renderWithAuth(<ScheduleCard schedule={scheduleWithUpdatedBy} userRole="VIEWER" />);

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.getByText(/最終更新/)).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not display action buttons when showActions is false', () => {
      renderWithAuth(
        <ScheduleCard
          schedule={mockSchedule}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={false}
          canEdit={true}
          userRole="EDITOR"
        />
      );

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
    });

    it('should not display action buttons when canEdit is false', () => {
      renderWithAuth(
        <ScheduleCard
          schedule={mockSchedule}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={true}
          canEdit={false}
          userRole="VIEWER"
        />
      );

      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.queryByRole('button', { name: /編集/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /削除/ })).not.toBeInTheDocument();
    });

    it('should display action buttons when showActions and canEdit are true', () => {
      renderWithAuth(
        <ScheduleCard
          schedule={mockSchedule}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={true}
          canEdit={true}
          userRole="EDITOR"
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      expect(screen.getByRole('button', { name: /編集/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /削除/ })).toBeInTheDocument();
    });

    it('should call onEdit with schedule when edit button is clicked', () => {
      renderWithAuth(
        <ScheduleCard
          schedule={mockSchedule}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={true}
          canEdit={true}
          userRole="EDITOR"
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      const editButton = screen.getByRole('button', { name: /編集/ });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(mockSchedule);
    });

    it('should call onDelete with schedule id when delete button is clicked', () => {
      renderWithAuth(
        <ScheduleCard
          schedule={mockSchedule}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={true}
          canEdit={true}
          userRole="EDITOR"
        />
      );

      // First expand the card
      const cardButton = screen.getByRole('button');
      fireEvent.click(cardButton);

      const deleteButton = screen.getByRole('button', { name: /削除/ });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockSchedule.id);
    });
  });

  describe('date formatting', () => {
    it('should display formatted date and time for non-all-day events', () => {
      renderWithAuth(<ScheduleCard schedule={mockSchedule} />);

      // The formatted date should contain month and day in Japanese format (2月15日)
      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });

    it('should display date without time for all-day events', () => {
      const allDaySchedule = { ...mockSchedule, allDay: true };
      renderWithAuth(<ScheduleCard schedule={allDaySchedule} />);

      // Should display date in Japanese format
      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });
  });

  describe('fallback values', () => {
    it('should use title if summary is not provided', () => {
      const scheduleWithTitle = { ...mockSchedule, summary: '', title: 'Fallback Title' };
      renderWithAuth(<ScheduleCard schedule={scheduleWithTitle} />);

      expect(screen.getByText('Fallback Title')).toBeInTheDocument();
    });

    it('should use startTime if dtstart is not provided', () => {
      const scheduleWithStartTime = { ...mockSchedule, dtstart: '', startTime: '2024-03-20T14:00:00' };
      renderWithAuth(<ScheduleCard schedule={scheduleWithStartTime} />);

      // Date should be in Japanese format (3月20日)
      expect(screen.getByText(/3月20日/)).toBeInTheDocument();
    });
  });
});
