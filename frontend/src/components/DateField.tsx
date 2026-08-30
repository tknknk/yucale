'use client';

import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// 日本語ロケールを登録（アプリ内の日付選択はすべてこのコンポーネント経由）
registerLocale('ja', ja);

interface DateFieldProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  isClearable?: boolean;
}

// アプリ共通の日付選択。予定作成と出欠調査で同じ見た目・操作になるよう、
// react-datepicker の設定とサイトに合わせたスタイルをここだけに置く。
//
// customInput の inputMode="none" は、カレンダーを開いている間にスマホの
// ソフトキーボードが出るのを防ぐためのもの。react-datepicker の readOnly は
// キーボードを抑止できる代わりにカレンダー自体が開かなくなるので使えない。
export default function DateField({
  selected,
  onChange,
  placeholderText,
  className,
  disabled,
  minDate,
  isClearable,
}: DateFieldProps) {
  return (
    <>
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat="yyyy/MM/dd"
        locale="ja"
        placeholderText={placeholderText}
        className={className}
        disabled={disabled}
        minDate={minDate}
        isClearable={isClearable}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        popperPlacement="bottom-start"
        customInput={<input inputMode="none" />}
      />

      {/* Custom styles for react-datepicker */}
      <style jsx global>{`
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .react-datepicker__header {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding-top: 0.75rem;
        }
        .react-datepicker__current-month {
          font-weight: 600;
          font-size: 1rem;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .react-datepicker__day-name {
          color: #6b7280;
          font-weight: 500;
        }
        .react-datepicker__day {
          color: #374151;
          border-radius: 0.375rem;
        }
        .react-datepicker__day:hover {
          background-color: #e5e7eb;
        }
        .react-datepicker__day--selected {
          background-color: #4f46e5 !important;
          color: white !important;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: #c7d2fe;
        }
        .react-datepicker__day--today {
          font-weight: 700;
          color: #4f46e5;
        }
        .react-datepicker__navigation {
          top: 0.75rem;
        }
        .react-datepicker__month-dropdown,
        .react-datepicker__year-dropdown {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }
        .react-datepicker__month-option,
        .react-datepicker__year-option {
          padding: 0.25rem 0.5rem;
        }
        .react-datepicker__month-option:hover,
        .react-datepicker__year-option:hover {
          background-color: #e5e7eb;
        }
        .react-datepicker__month-option--selected_month,
        .react-datepicker__year-option--selected_year {
          background-color: #4f46e5 !important;
          color: white;
        }
        .react-datepicker-popper {
          z-index: 50;
        }
      `}</style>
    </>
  );
}
