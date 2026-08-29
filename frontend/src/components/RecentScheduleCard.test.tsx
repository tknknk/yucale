import React from 'react';
import { render, screen } from '@testing-library/react';
import RecentScheduleCard from './RecentScheduleCard';
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
  urlId: 'abc12',
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

const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('RecentScheduleCard', () => {
  it('should link the title to /schedule/[urlId]', () => {
    renderWithAuth(
      <RecentScheduleCard schedule={mockSchedule} userRole="VIEWER" isPast={false} />
    );

    const titleLink = screen.getByRole('link', { name: 'Test Summary' });
    expect(titleLink).toHaveAttribute('href', '/schedule/abc12');
  });

  it('should link the title for guests too', () => {
    renderWithAuth(
      <RecentScheduleCard schedule={mockSchedule} userRole={null} isPast={false} />
    );

    expect(screen.getByRole('link', { name: 'Test Summary' })).toHaveAttribute(
      'href',
      '/schedule/abc12'
    );
  });

  it('should render a plain title when the schedule has no urlId', () => {
    const scheduleWithoutUrlId = { ...mockSchedule, urlId: undefined };
    renderWithAuth(
      <RecentScheduleCard schedule={scheduleWithoutUrlId} userRole="VIEWER" isPast={false} />
    );

    expect(screen.getByText('Test Summary')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Test Summary' })).not.toBeInTheDocument();
  });
});
