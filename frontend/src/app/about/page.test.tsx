import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from './page';
import { useAuthContext } from '@/contexts/AuthContext';

// AboutCTA が useAuthContext を使うためモックする。
jest.mock('@/contexts/AuthContext');

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

describe('AboutPage - カレンダーの購読方法', () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
      refreshUser: jest.fn(),
    });
  });

  it('購読方法セクションをアンカー付きで表示する', () => {
    const { container } = render(<AboutPage />);

    expect(screen.getByRole('heading', { name: 'カレンダーの購読方法' })).toBeInTheDocument();
    expect(container.querySelector('#calendar-subscription')).toBeInTheDocument();
  });

  it('Google Calendar / iOS / TimeTree の3つの展開ブロックを表示する', () => {
    render(<AboutPage />);

    expect(screen.getByText('Google Calendar で購読する')).toBeInTheDocument();
    expect(screen.getByText('iOS のカレンダーで購読する')).toBeInTheDocument();
    expect(screen.getByText('TimeTree で確認する')).toBeInTheDocument();
  });

  it('Google Calendar はPCからのみ可能である注意書きを含む', () => {
    render(<AboutPage />);

    expect(screen.getByText(/登録はPCからのみ可能/)).toBeInTheDocument();
  });

  it('TimeTree はiOS限定・iOSカレンダー同期の注意書きを含む', () => {
    render(<AboutPage />);

    const note = screen.getByText(/TimeTree単体では購読できません/);
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent('iOSでのみ利用可能');
    expect(note).toHaveTextContent('同期');
  });
});
