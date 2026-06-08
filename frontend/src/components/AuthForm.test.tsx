import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from './AuthForm';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('AuthForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login mode', () => {
    it('should render login form title', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByText('ゆカレにログイン')).toBeInTheDocument();
    });

    it('should render email and password fields', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('パスワードを入力')).toBeInTheDocument();
    });

    it('should not render username field', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.queryByLabelText(/ユーザー名/)).not.toBeInTheDocument();
    });

    it('should not render confirm password field', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.queryByLabelText(/パスワード（確認）/)).not.toBeInTheDocument();
    });

    it('should render login button', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /^ログイン$/ })).toBeInTheDocument();
    });

    it('should render register link', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('link', { name: /新規登録/ })).toHaveAttribute('href', '/register');
    });

    describe('validation', () => {
      it('should show error when email is empty', async () => {
        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/メールアドレスは必須です/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should show error when email is invalid', async () => {
        const user = userEvent.setup();
        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await user.type(emailInput, 'invalid-email');

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/メールアドレスの形式が正しくありません/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should show error when password is empty', async () => {
        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/パスワードは必須です/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should show error when password is too short', async () => {
        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByPlaceholderText('パスワードを入力');
        await userEvent.type(passwordInput, '123');

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/パスワードは4文字以上で入力してください/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    describe('submission', () => {
      it('should call onSubmit with email and password when form is valid', async () => {
        mockOnSubmit.mockResolvedValue(undefined);

        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByPlaceholderText('パスワードを入力');
        await userEvent.type(passwordInput, 'password123');

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        });

        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      it('should display error message when submission fails', async () => {
        mockOnSubmit.mockRejectedValue(new Error('Invalid credentials'));

        render(<AuthForm mode="login" onSubmit={mockOnSubmit} />);

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByPlaceholderText('パスワードを入力');
        await userEvent.type(passwordInput, 'password123');

        const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
      });
    });
  });

  describe('register mode', () => {
    it('should render register form title', () => {
      render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

      expect(screen.getByText('アカウントを作成')).toBeInTheDocument();
    });

    it('should render all registration fields', () => {
      render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/ユーザー名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^パスワード$/)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード（確認）/)).toBeInTheDocument();
    });

    it('should render register button', () => {
      render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /^登録$/ })).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('link', { name: /ログイン/ })).toHaveAttribute('href', '/login');
    });

    describe('validation', () => {
      it('should show error when username is empty', async () => {
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/ユーザー名は必須です/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should accept single character username', async () => {
        mockOnSubmit.mockResolvedValue(undefined);
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'a');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, 'Password1');

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, 'Password1');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        });
      });

      it('should show error when username is too long', async () => {
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'a'.repeat(21));

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/ユーザー名は20文字以内で入力してください/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should show error when username contains symbols', async () => {
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'test@user');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/ユーザー名に記号は使用できません/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should accept Japanese username like 佐々木', async () => {
        mockOnSubmit.mockResolvedValue(undefined);
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, '佐々木');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'sasaki@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, 'Password1');

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, 'Password1');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        });

        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            username: '佐々木',
          })
        );
      });

      it('should show error when passwords do not match', async () => {
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'testuser');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, 'Password1');

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, 'Password2');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/パスワードが一致しません/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      it('should show error when password is too short in register form', async () => {
        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'testuser');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, '123'); // Too short (less than 4 characters)

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, '123');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/パスワードは4文字以上で入力してください/)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    describe('submission', () => {
      it('should call onSubmit with all fields when form is valid', async () => {
        mockOnSubmit.mockResolvedValue(undefined);

        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'testuser');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, 'Password1');

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, 'Password1');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        });

        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Password1',
            confirmPassword: 'Password1',
          })
        );
      });

      it('should display error message when registration fails', async () => {
        mockOnSubmit.mockRejectedValue(new Error('Email already exists'));

        render(<AuthForm mode="register" onSubmit={mockOnSubmit} />);

        const usernameInput = screen.getByLabelText(/ユーザー名/);
        await userEvent.type(usernameInput, 'testuser');

        const emailInput = screen.getByLabelText(/メールアドレス/);
        await userEvent.type(emailInput, 'test@example.com');

        const passwordInput = screen.getByLabelText(/^パスワード$/);
        await userEvent.type(passwordInput, 'Password1');

        const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
        await userEvent.type(confirmPasswordInput, 'Password1');

        const submitButton = screen.getByRole('button', { name: /^登録$/ });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('Email already exists')).toBeInTheDocument();
        });
      });
    });
  });

  describe('loading state', () => {
    it('should disable inputs when isLoading is true', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByLabelText(/メールアドレス/)).toBeDisabled();
      expect(screen.getByPlaceholderText('パスワードを入力')).toBeDisabled();
      expect(screen.getByRole('button', { name: /ログイン/ })).toBeDisabled();
    });

    it('should show loading text on submit button', () => {
      render(<AuthForm mode="login" onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByText(/ログイン中/)).toBeInTheDocument();
    });

    it('should show creating account text on register form', () => {
      render(<AuthForm mode="register" onSubmit={mockOnSubmit} isLoading={true} />);

      expect(screen.getByText(/アカウント作成中/)).toBeInTheDocument();
    });
  });
});
