import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useAuthContext } from '@/contexts/AuthContext';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext');

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

describe('useAuth', () => {
  const mockAuthContext = {
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'VIEWER' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    isLoading: false,
    isAuthenticated: true,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue(mockAuthContext);
  });

  it('should return the auth context values', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual(mockAuthContext);
  });

  it('should return user from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockAuthContext.user);
  });

  it('should return isAuthenticated from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return isLoading from context', () => {
    mockUseAuthContext.mockReturnValue({
      ...mockAuthContext,
      isLoading: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return login function from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.login).toBe(mockAuthContext.login);
  });

  it('should return register function from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.register).toBe(mockAuthContext.register);
  });

  it('should return logout function from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.logout).toBe(mockAuthContext.logout);
  });

  it('should return checkAuth function from context', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.checkAuth).toBe(mockAuthContext.checkAuth);
  });

  it('should return error from context', () => {
    mockUseAuthContext.mockReturnValue({
      ...mockAuthContext,
      error: 'Test error',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.error).toBe('Test error');
  });

  it('should return null user when not authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      ...mockAuthContext,
      user: null,
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
