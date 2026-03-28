'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Schedule, ScheduleFormData } from '@/types/schedule';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LoadingSpinner from './LoadingSpinner';
import { schedulesApi } from '@/lib/schedules';

// Register Japanese locale
registerLocale('ja', ja);

// Generate time options in 15-minute intervals (00:00 - 23:45)
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      options.push(`${h}:${m}`);
    }
  }
  return options;
};

// Validate time format (HH:mm with 15-minute intervals)
const isValidTimeFormat = (time: string): boolean => {
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return false;
  const minutes = parseInt(match[2], 10);
  return minutes % 15 === 0;
};

// Get default start time from env or fall back to nearest hour
const getDefaultStartTime = (): string => {
  const envTime = process.env.NEXT_PUBLIC_DEFAULT_START_TIME;
  if (envTime && isValidTimeFormat(envTime)) {
    return envTime;
  }
  return getNearestHour();
};

// Get default end time from env or fall back to start time + 1 hour
const getDefaultEndTime = (startTime: string): string => {
  const envTime = process.env.NEXT_PUBLIC_DEFAULT_END_TIME;
  if (envTime && isValidTimeFormat(envTime)) {
    return envTime;
  }
  return addHoursToTime(startTime, 1);
};

// Get nearest hour (round to nearest hour)
const getNearestHour = (): string => {
  const now = new Date();
  const minutes = now.getMinutes();
  let hour = now.getHours();

  // Round to nearest hour: if minutes >= 30, round up
  if (minutes >= 30) {
    hour = (hour + 1) % 24;
  }

  return hour.toString().padStart(2, '0') + ':00';
};

// Add hours to a time string
const addHoursToTime = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map(Number);
  const newHour = (h + hours) % 24;
  return newHour.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
};

// Convert time string to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Convert minutes since midnight to time string
const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
};

// Add minutes to a time string with upper limit of 23:45
const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  const maxMinutes = 23 * 60 + 45; // 23:45
  const clampedMinutes = Math.min(totalMinutes, maxMinutes);
  return minutesToTime(clampedMinutes);
};

// Convert date string (yyyy-MM-dd) to Date object
const stringToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
};

// Convert Date object to string (yyyy-MM-dd)
const dateToString = (date: Date | null): string => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

const TIME_OPTIONS = generateTimeOptions();

interface ScheduleFormProps {
  schedule?: Schedule | null;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Internal form data type with separate date and time fields
interface InternalFormData {
  summary: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  song: string;
  recording: string;
}

export default function ScheduleForm({
  schedule,
  onSubmit,
  onCancel,
  isLoading = false,
}: ScheduleFormProps) {
  const isEditing = !!schedule;
  const prevStartDateRef = useRef<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  const defaultStartTime = getDefaultStartTime();
  const defaultEndTime = getDefaultEndTime(defaultStartTime);

  // Calculate default duration in minutes between start and end time
  const defaultDurationMinutes = timeToMinutes(defaultEndTime) - timeToMinutes(defaultStartTime);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InternalFormData>({
    defaultValues: {
      summary: '',
      description: '',
      startDate: '',
      startTime: defaultStartTime,
      endDate: '',
      endTime: defaultEndTime,
      allDay: false,
      location: '',
      song: '',
      recording: '',
    },
  });

  const allDay = watch('allDay');
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');

  // Fetch location suggestions on mount
  useEffect(() => {
    schedulesApi.getLocations()
      .then(setLocationSuggestions)
      .catch(() => setLocationSuggestions([]));
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (schedule) {
      const start = schedule.dtstart || schedule.startTime;
      const end = schedule.dtend || schedule.endTime;

      let parsedStartDate = '';
      let parsedStartTime = getDefaultStartTime();
      let parsedEndDate = '';
      let parsedEndTime = getDefaultEndTime(parsedStartTime);

      if (start) {
        try {
          const date = parseISO(start);
          parsedStartDate = format(date, 'yyyy-MM-dd');
          if (!schedule.allDay) {
            parsedStartTime = format(date, 'HH:mm');
            // Round to nearest 15 minutes if needed
            const [h, m] = parsedStartTime.split(':').map(Number);
            const roundedMinute = Math.round(m / 15) * 15;
            parsedStartTime = h.toString().padStart(2, '0') + ':' + (roundedMinute % 60).toString().padStart(2, '0');
          }
        } catch {
          // ignore parse errors
        }
      }

      if (end) {
        try {
          const date = parseISO(end);
          parsedEndDate = format(date, 'yyyy-MM-dd');
          if (!schedule.allDay) {
            parsedEndTime = format(date, 'HH:mm');
            // Round to nearest 15 minutes if needed
            const [h, m] = parsedEndTime.split(':').map(Number);
            const roundedMinute = Math.round(m / 15) * 15;
            parsedEndTime = h.toString().padStart(2, '0') + ':' + (roundedMinute % 60).toString().padStart(2, '0');
          }
        } catch {
          // ignore parse errors
        }
      }

      reset({
        summary: schedule.summary || schedule.title || '',
        description: schedule.description || '',
        startDate: parsedStartDate,
        startTime: parsedStartTime,
        endDate: parsedEndDate,
        endTime: parsedEndTime,
        allDay: schedule.allDay || false,
        location: schedule.location || '',
        song: schedule.song || '',
        recording: schedule.recording || '',
      });

      prevStartDateRef.current = parsedStartDate;
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }
  }, [schedule, reset]);

  // Track start date changes and update end date accordingly
  useEffect(() => {
    if (!isInitialized) return;

    if (startDate) {
      const prevStartDate = prevStartDateRef.current;

      if (allDay) {
        // For all-day events, keep the existing multi-day behavior
        if (prevStartDate && prevStartDate !== startDate) {
          const prevStart = stringToDate(prevStartDate);
          const newStart = stringToDate(startDate);
          const currentEnd = stringToDate(endDate);

          if (prevStart && newStart && currentEnd) {
            const daysDiff = differenceInDays(currentEnd, prevStart);
            const newEndDate = addDays(newStart, daysDiff);
            setValue('endDate', dateToString(newEndDate));
          } else if (newStart && !currentEnd) {
            setValue('endDate', startDate);
          }
        } else if (!prevStartDate && !endDate) {
          setValue('endDate', startDate);
        }
      } else {
        // For non-all-day events, always sync end date with start date
        setValue('endDate', startDate);
        if (!prevStartDate && !endDate) {
          const defaultStart = getDefaultStartTime();
          setValue('startTime', defaultStart);
          setValue('endTime', getDefaultEndTime(defaultStart));
        }
      }

      prevStartDateRef.current = startDate;
    }
  }, [startDate, endDate, allDay, setValue, isInitialized]);

  // When switching from all-day to non-all-day, sync end date with start date
  useEffect(() => {
    if (!isInitialized) return;
    if (!allDay && startDate) {
      setValue('endDate', startDate);
    }
  }, [allDay, startDate, setValue, isInitialized]);

  // Auto-update end time when start time changes (for new schedules only)
  // Maintains the duration between start and end time, with upper limit of 23:45
  useEffect(() => {
    if (startTime && !isEditing && isInitialized) {
      const newEndTime = addMinutesToTime(startTime, defaultDurationMinutes > 0 ? defaultDurationMinutes : 60);
      setValue('endTime', newEndTime);
    }
  }, [startTime, isEditing, setValue, isInitialized, defaultDurationMinutes]);

  const onFormSubmit = async (data: InternalFormData) => {
    // Convert internal form data to ScheduleFormData
    let dtstart: string;
    let dtend: string;

    if (data.allDay) {
      // For all-day events, send datetime format with 00:00:00 time
      dtstart = `${data.startDate}T00:00:00`;
      dtend = `${data.endDate}T00:00:00`;
    } else {
      dtstart = `${data.startDate}T${data.startTime}`;
      dtend = `${data.endDate}T${data.endTime}`;
    }

    const formData: ScheduleFormData = {
      summary: data.summary,
      description: data.description,
      dtstart,
      dtend,
      allDay: data.allDay,
      location: data.location,
      song: data.song || undefined,
      recording: data.recording || undefined,
    };

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-800">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="summary"
          {...register('summary', {
            required: 'タイトルは必須です',
            minLength: { value: 1, message: 'タイトルを入力してください' },
            maxLength: { value: 255, message: 'タイトルは255文字以内で入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.summary ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="予定のタイトルを入力"
          disabled={isLoading || isSubmitting}
        />
        {errors.summary && (
          <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>
        )}
      </div>

      {/* All Day Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="allDay"
          {...register('allDay')}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          disabled={isLoading || isSubmitting}
        />
        <label htmlFor="allDay" className="ml-2 block text-sm text-gray-900">
          終日
        </label>
      </div>

      {/* Date/Time Fields */}
      <div className="space-y-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            {allDay ? '開始日' : '日付'} <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <Controller
              control={control}
              name="startDate"
              rules={{ required: '開始日は必須です' }}
              render={({ field }) => (
                <DatePicker
                  selected={stringToDate(field.value)}
                  onChange={(date: Date | null) => field.onChange(dateToString(date))}
                  dateFormat="yyyy/MM/dd"
                  locale="ja"
                  placeholderText="日付を選択"
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.startDate ? 'border-red-500' : 'border'
                  } px-3 py-2`}
                  disabled={isLoading || isSubmitting}
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-start"
                />
              )}
            />
          </div>
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        {/* Start Time & End Time (for non-all-day events) */}
        {!allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              時間 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-row items-center gap-2">
              <div className="flex-1">
                <select
                  id="startTime"
                  {...register('startTime', {
                    required: !allDay ? '開始時間は必須です' : false,
                  })}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.startTime ? 'border-red-500' : 'border'
                  } px-3 py-2`}
                  disabled={isLoading || isSubmitting}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-gray-800">〜</span>
              <div className="flex-1">
                <select
                  id="endTime"
                  {...register('endTime', {
                    required: !allDay ? '終了時間は必須です' : false,
                    validate: (value) => {
                      if (allDay || !startDate) return true;
                      const startDateTime = new Date(`${startDate}T${startTime}`);
                      const endDateTime = new Date(`${startDate}T${value}`);
                      return endDateTime >= startDateTime || '終了時間は開始時間より後にしてください';
                    },
                  })}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.endTime ? 'border-red-500' : 'border'
                  } px-3 py-2`}
                  disabled={isLoading || isSubmitting}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
            )}
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
            )}
          </div>
        )}

        {/* End Date (for all-day events only) */}
        {allDay && (
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              終了日 <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <Controller
                control={control}
                name="endDate"
                rules={{
                  required: '終了日は必須です',
                  validate: (value) => {
                    if (!startDate || !value) return true;
                    return value >= startDate || '終了日は開始日以降にしてください';
                  },
                }}
                render={({ field }) => (
                  <DatePicker
                    selected={stringToDate(field.value)}
                    onChange={(date: Date | null) => field.onChange(dateToString(date))}
                    dateFormat="yyyy/MM/dd"
                    locale="ja"
                    placeholderText="日付を選択"
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                      errors.endDate ? 'border-red-500' : 'border'
                    } px-3 py-2`}
                    disabled={isLoading || isSubmitting}
                    minDate={stringToDate(startDate) || undefined}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    popperPlacement="bottom-start"
                  />
                )}
              />
            </div>
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-800">
          場所
        </label>
        <input
          type="text"
          id="location"
          list="location-suggestions"
          autoComplete="off"
          {...register('location', {
            maxLength: { value: 255, message: '場所は255文字以内で入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.location ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="場所を入力（任意）"
          disabled={isLoading || isSubmitting}
        />
        <datalist id="location-suggestions">
          {locationSuggestions.map((location) => (
            <option key={location} value={location} />
          ))}
        </datalist>
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      {/* Song */}
      <div>
        <label htmlFor="song" className="block text-sm font-medium text-gray-800">
          曲
        </label>
        <input
          type="text"
          id="song"
          {...register('song')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.song ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="曲を入力（任意）"
          disabled={isLoading || isSubmitting}
        />
        {errors.song && (
          <p className="mt-1 text-sm text-red-600">{errors.song.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-800">
          説明
        </label>
        <textarea
          id="description"
          rows={3}
          {...register('description', {
            maxLength: { value: 1000, message: '説明は1000文字以内で入力してください' },
          })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.description ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="説明を入力（任意）"
          disabled={isLoading || isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Recording */}
      <div>
        <label htmlFor="recording" className="block text-sm font-medium text-gray-800">
          録音
        </label>
        <input
          type="text"
          id="recording"
          {...register('recording')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
            errors.recording ? 'border-red-500' : 'border'
          } px-3 py-2`}
          placeholder="録音のリンクを入力（任意）"
          disabled={isLoading || isSubmitting}
        />
        {errors.recording && (
          <p className="mt-1 text-sm text-red-600">{errors.recording.message}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isLoading || isSubmitting) && (
            <LoadingSpinner size="sm" className="mr-2" />
          )}
          {isEditing ? '予定を更新' : '予定を作成'}
        </button>
      </div>

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
    </form>
  );
}
