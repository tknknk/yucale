import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DateField from './DateField';

describe('DateField', () => {
  it('should suppress the mobile keyboard with inputMode="none"', () => {
    render(<DateField selected={null} onChange={jest.fn()} placeholderText="日付を選択" />);

    expect(screen.getByPlaceholderText('日付を選択')).toHaveAttribute('inputmode', 'none');
  });

  it('should still open the calendar when the input is clicked', () => {
    render(<DateField selected={null} onChange={jest.fn()} placeholderText="日付を選択" />);

    fireEvent.focus(screen.getByPlaceholderText('日付を選択'));

    // カレンダーが開くこと（readOnly だと開かなくなるため、その退行を防ぐ）
    expect(document.querySelector('.react-datepicker')).toBeInTheDocument();
  });

  it('should report the picked date to onChange', () => {
    const onChange = jest.fn();
    render(
      <DateField selected={new Date('2024-02-15T00:00:00')} onChange={onChange} placeholderText="日付を選択" />
    );

    fireEvent.focus(screen.getByPlaceholderText('日付を選択'));
    fireEvent.click(screen.getByLabelText('Choose 2024年2月20日火曜日'));

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('should show the selected date in yyyy/MM/dd', () => {
    render(<DateField selected={new Date('2024-02-15T00:00:00')} onChange={jest.fn()} />);

    expect(screen.getByDisplayValue('2024/02/15')).toBeInTheDocument();
  });

  it('should offer month and year dropdowns for jumping to a distant date', () => {
    render(<DateField selected={new Date('2024-02-15T00:00:00')} onChange={jest.fn()} placeholderText="日付を選択" />);

    fireEvent.focus(screen.getByPlaceholderText('日付を選択'));

    expect(document.querySelector('.react-datepicker__month-select')).toBeInTheDocument();
    expect(document.querySelector('.react-datepicker__year-select')).toBeInTheDocument();
  });
});
