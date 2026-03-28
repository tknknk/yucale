'use client';

import { ReactNode } from 'react';
import { Schedule } from '@/types/schedule';
import { Role } from '@/types/user';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

// URL正規表現パターン
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

// テキスト内のURLをリンクに変換する関数
function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex for reuse
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface RecentScheduleCardProps {
  schedule: Schedule;
  userRole: Role | null;
  isPast: boolean;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (id: number) => void;
}

export default function RecentScheduleCard({
  schedule,
  userRole,
  isPast,
  onEdit,
  onDelete,
}: RecentScheduleCardProps) {
  const { user } = useAuth();

  const getStartDate = () => schedule.dtstart || schedule.startTime;
  const getEndDate = () => schedule.dtend || schedule.endTime;
  const getTitle = () => schedule.summary || schedule.title;

  // Check if current user is in attendees
  const isUserAttending = () => {
    if (!user || !schedule.attendees) return false;
    const attendeesLower = schedule.attendees.toLowerCase();
    return (
      attendeesLower.includes(user.username.toLowerCase()) ||
      attendeesLower.includes(user.email.toLowerCase())
    );
  };

  // Check if all-day event spans multiple days
  const isMultiDayAllDay = () => {
    if (!schedule.allDay) return false;
    try {
      const start = parseISO(getStartDate());
      const end = parseISO(getEndDate());
      if (!isValid(start) || !isValid(end)) return false;
      return format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd');
    } catch {
      return false;
    }
  };

  // Format date/time display based on event type
  const formatDateTime = () => {
    const startDateStr = getStartDate();
    const endDateStr = getEndDate();

    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);
      if (!isValid(start) || !isValid(end)) {
        return `${startDateStr} - ${endDateStr}`;
      }

      if (schedule.allDay) {
        // All-day event
        if (isMultiDayAllDay()) {
          // Multi-day: show start date - end date
          return `${format(start, 'M月d日(E)', { locale: ja })} - ${format(end, 'M月d日(E)', { locale: ja })}`;
        } else {
          // Single day: show only start date
          return format(start, 'M月d日(E)', { locale: ja });
        }
      } else {
        // Non-all-day event: show start date + time - end time only
        const startFormatted = format(start, 'M月d日(E) H:mm', { locale: ja });
        const endFormatted = format(end, 'H:mm');
        return `${startFormatted} - ${endFormatted}`;
      }
    } catch {
      return `${startDateStr} - ${endDateStr}`;
    }
  };

  // Role-based visibility
  const isNoRoleOrGuest = !userRole || userRole === 'NO_ROLE';
  const canEdit = userRole === 'ADMIN' || userRole === 'EDITOR';

  // Show location/description for VIEWER and above
  const showDetails = !isNoRoleOrGuest;

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-300 ease-out shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 ${
        isPast
          ? 'bg-gray-50 border border-gray-200/50 text-gray-800'
          : schedule.allDay
          ? 'bg-rose-50 border border-rose-200/50'
          : 'bg-primary-50 border border-primary-200/50'
      } ${
        isUserAttending()
          ? isPast
            ? 'border-l-4 border-l-gray-400'
            : schedule.allDay
            ? 'border-l-4 border-l-rose-500'
            : 'border-l-4 border-l-blue-500'
          : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`text-lg font-semibold truncate ${
              isPast ? 'text-gray-400' : 'text-gray-800'
            }`}
          >
            {getTitle()}
          </h3>

          {/* Date/Time */}
          <div
            className={`flex items-center gap-1.5 text-sm mt-1 ${
              isPast ? 'text-gray-400' : 'text-gray-800'
            }`}
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDateTime()}</span>
          </div>

          {/* Location - VIEWER and above */}
          {showDetails && schedule.location && (
            <p
              className={`text-sm mt-1 truncate flex items-center gap-1 ${
                isPast ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{linkifyText(schedule.location)}</span>
            </p>
          )}

          {/* Song - VIEWER and above */}
          {showDetails && schedule.song && (
            <div
              className={`text-sm mt-1 flex items-start gap-1 ${
                isPast ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <span className="line-clamp-2 whitespace-pre-wrap">{linkifyText(schedule.song)}</span>
            </div>
          )}

          {/* Description - VIEWER and above */}
          {showDetails && schedule.description && (
            <p
              className={`text-sm mt-1 flex items-start gap-1 ${
                isPast ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="line-clamp-2 whitespace-pre-wrap">{linkifyText(schedule.description)}</span>
            </p>
          )}

          {/* Attendees - VIEWER and above */}
          {showDetails && schedule.attendees && (
            <div
              className={`text-sm mt-1 flex items-start gap-1 ${
                isPast ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="whitespace-pre-wrap">{linkifyText(schedule.attendees)}</span>
            </div>
          )}

          {/* Recording - VIEWER and above */}
          {showDetails && schedule.recording && (
            <div
              className={`text-sm mt-1 flex items-start gap-1 ${
                isPast ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <span className="line-clamp-2 whitespace-pre-wrap">{linkifyText(schedule.recording)}</span>
            </div>
          )}
        </div>

      </div>

      {/* Actions - EDITOR and above */}
      {canEdit && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200/50">
          {onEdit && (
            <button
              onClick={() => onEdit(schedule)}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                isPast
                  ? 'text-gray-800 bg-gray-200/80 hover:bg-gray-300'
                  : 'text-primary-700 bg-primary-100/80 hover:bg-primary-200'
              }`}
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              編集
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(schedule.id)}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                isPast
                  ? 'text-gray-800 bg-gray-200/80 hover:bg-gray-300'
                  : 'text-red-700 bg-red-100/80 hover:bg-red-200'
              }`}
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              削除
            </button>
          )}
        </div>
      )}
    </div>
  );
}
