import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleForm from './ScheduleForm';
import { Schedule } from '@/types/schedule';

describe('ScheduleForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all form fields', () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/終日/)).toBeInTheDocument();
      // Date and time are now using DatePicker and select elements
      expect(screen.getByText(/日付/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/日付を選択/)).toBeInTheDocument();
      expect(screen.getByLabelText(/場所/)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
    });

    it('should render submit button with "予定を作成" text for new schedule', () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      expect(screen.getByRole('button', { name: /予定を作成/ })).toBeInTheDocument();
    });

    it('should render submit button with "予定を更新" text when editing', () => {
      const mockSchedule: Schedule = {
        id: 1,
        title: 'Test',
        summary: 'Test Summary',
        description: '',
        startTime: '2024-02-15T10:00:00',
        endTime: '2024-02-15T11:00:00',
        dtstart: '2024-02-15T10:00:00',
        dtend: '2024-02-15T11:00:00',
        allDay: false,
        userId: 1,
        createdAt: '2024-02-01',
        updatedAt: '2024-02-01',
      };

      render(
        <ScheduleForm
          schedule={mockSchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /予定を更新/ })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      expect(screen.getByRole('button', { name: /キャンセル/ })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should show error when summary is empty on submit', async () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const submitButton = screen.getByRole('button', { name: /予定を作成/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/タイトルは必須です/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when start date is empty on submit', async () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      // Fill in summary to bypass that validation
      const summaryInput = screen.getByLabelText(/タイトル/);
      await userEvent.type(summaryInput, 'Test Summary');

      const submitButton = screen.getByRole('button', { name: /予定を作成/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/開始日は必須です/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when date is empty on submit', async () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const summaryInput = screen.getByLabelText(/タイトル/);
      await userEvent.type(summaryInput, 'Test Summary');

      // Do not fill date - just submit
      const submitButton = screen.getByRole('button', { name: /予定を作成/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/開始日は必須です/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when summary exceeds max length', async () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const summaryInput = screen.getByLabelText(/タイトル/);
      const longSummary = 'a'.repeat(256);
      fireEvent.change(summaryInput, { target: { value: longSummary } });

      const submitButton = screen.getByRole('button', { name: /予定を作成/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/タイトルは255文字以内で入力してください/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('all day toggle', () => {
    it('should change form layout when all day is toggled', async () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const allDayCheckbox = screen.getByLabelText(/終日/);

      // Initially (non-all-day) should have Date label and time selects
      expect(screen.getByText(/日付/)).toBeInTheDocument();
      // Time select has id="startTime" but no explicit label association
      expect(document.getElementById('startTime')).toBeInTheDocument();

      // Toggle all day
      fireEvent.click(allDayCheckbox);

      // Should now show Start Date label and hide time selects
      await waitFor(() => {
        expect(screen.getByText('開始日')).toBeInTheDocument();
        expect(document.getElementById('startTime')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should disable form inputs when isLoading is true', () => {
      render(
        <ScheduleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
      );

      expect(screen.getByLabelText(/タイトル/)).toBeDisabled();
      expect(screen.getByLabelText(/終日/)).toBeDisabled();
      expect(screen.getByLabelText(/場所/)).toBeDisabled();
      expect(screen.getByLabelText(/説明/)).toBeDisabled();
      expect(screen.getByRole('button', { name: /予定を作成/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /キャンセル/ })).toBeDisabled();
    });
  });

  describe('editing mode', () => {
    const existingSchedule: Schedule = {
      id: 1,
      title: 'Existing Title',
      summary: 'Existing Summary',
      description: 'Existing Description',
      startTime: '2024-02-15T10:00:00',
      endTime: '2024-02-15T12:00:00',
      dtstart: '2024-02-15T10:00:00',
      dtend: '2024-02-15T12:00:00',
      allDay: false,
      location: 'Existing Location',
      userId: 1,
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
    };

    it('should populate form fields with existing schedule data', () => {
      render(
        <ScheduleForm
          schedule={existingSchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toHaveValue('Existing Summary');
      expect(screen.getByLabelText(/説明/)).toHaveValue('Existing Description');
      expect(screen.getByLabelText(/場所/)).toHaveValue('Existing Location');
    });

    it('should populate all day checkbox correctly', () => {
      const allDaySchedule: Schedule = {
        ...existingSchedule,
        allDay: true,
        dtstart: '2024-02-15',
        dtend: '2024-02-16',
      };

      render(
        <ScheduleForm
          schedule={allDaySchedule}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/終日/)).toBeChecked();
    });
  });
});
