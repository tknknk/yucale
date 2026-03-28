'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import { Schedule } from '@/types/schedule';
import { schedulesApi } from '@/lib/schedules';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

// Copy icon component
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

// Check icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

// Convert URLs in text to links
function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
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

export default function ScheduleDetailPage() {
  const params = useParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();

  const urlId = params.urlId as string;

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isNoRoleOrGuest = !isAuthenticated || !user || user.role === 'NO_ROLE';
  const canViewDetails = !isNoRoleOrGuest;

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const data = await schedulesApi.getByUrlId(urlId);
        setSchedule(data);
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
        setError('予定の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchSchedule();
    }
  }, [urlId, authLoading]);

  const getStartDate = () => schedule?.dtstart || schedule?.startTime || '';
  const getEndDate = () => schedule?.dtend || schedule?.endTime || '';
  const getTitle = () => schedule?.summary || schedule?.title || '';

  const isMultiDayAllDay = () => {
    if (!schedule?.allDay) return false;
    try {
      const start = parseISO(getStartDate());
      const end = parseISO(getEndDate());
      if (!isValid(start) || !isValid(end)) return false;
      return format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd');
    } catch {
      return false;
    }
  };

  const formatDateTime = () => {
    const startDateStr = getStartDate();
    const endDateStr = getEndDate();

    try {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);
      if (!isValid(start) || !isValid(end)) {
        return `${startDateStr} - ${endDateStr}`;
      }

      if (schedule?.allDay) {
        if (isMultiDayAllDay()) {
          return `${format(start, 'M月d日(E)', { locale: ja })} - ${format(end, 'M月d日(E)', { locale: ja })}`;
        } else {
          return format(start, 'M月d日(E)', { locale: ja });
        }
      } else {
        const startFormatted = format(start, 'M月d日(E) H:mm', { locale: ja });
        const endFormatted = format(end, 'H:mm');
        return `${startFormatted} - ${endFormatted}`;
      }
    } catch {
      return `${startDateStr} - ${endDateStr}`;
    }
  };

  const formatClipboardContent = () => {
    const parts: string[] = ['【練習連絡】'];
    parts.push(`日時: ${formatDateTime()}`);
    if (schedule?.location) {
      parts.push(`場所: ${schedule.location}`);
    }
    if (schedule?.song) {
      parts.push(`曲目: ${schedule.song}`);
    }
    parts.push(''); // Empty line before description
    if (schedule?.description) {
      parts.push(schedule.description);
    }
    parts.push(''); // Empty line before attendees
    if (schedule?.attendees) {
      parts.push(schedule.attendees);
    }
    return parts.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatClipboardContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error || '予定が見つかりません'}
        </div>
        {canViewDetails && (
          <Link href="/schedule" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
            一覧に戻る
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Schedule Card */}
      <div
        className={`rounded-2xl p-5 shadow-soft ${
          schedule.allDay
            ? 'bg-rose-50 border border-rose-200/50'
            : 'bg-gradient-to-br from-primary-50 via-indigo-50 to-violet-50 border border-primary-200/50'
        }`}
      >
        {/* Title with Copy Button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-800">
            {getTitle()}
          </h2>
          {canViewDetails && (
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
              title="練習連絡をコピー"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3 h-3 mr-1" />
                  コピーしました
                </>
              ) : (
                <>
                  <CopyIcon className="w-3 h-3 mr-1" />
                  コピー
                </>
              )}
            </button>
          )}
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-1.5 text-sm text-gray-800 mb-3">
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

        {/* Details - only for VIEWER and above */}
        {canViewDetails ? (
          <div className="space-y-2">
            {/* Location */}
            {schedule.location && (
              <div className="flex items-start gap-1 text-sm text-gray-800">
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{linkifyText(schedule.location)}</span>
              </div>
            )}

            {/* Song */}
            {schedule.song && (
              <div className="flex items-start gap-1 text-sm text-gray-800">
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
                <span className="whitespace-pre-wrap">{linkifyText(schedule.song)}</span>
              </div>
            )}

            {/* Description */}
            {schedule.description && (
              <div className="flex items-start gap-1 text-sm text-gray-800">
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
                <span className="whitespace-pre-wrap">{linkifyText(schedule.description)}</span>
              </div>
            )}

            {/* Attendees */}
            {schedule.attendees && (
              <div className="flex items-start gap-1 text-sm text-gray-800">
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

            {/* Recording */}
            {schedule.recording && (
              <div className="flex items-start gap-1 text-sm text-gray-800">
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
                <span className="whitespace-pre-wrap">{linkifyText(schedule.recording)}</span>
              </div>
            )}

            {/* Update Info */}
            {schedule.updatedAt && (
              <div className="text-xs text-gray-400 mt-3">
                {schedule.updatedBy ? (
                  <span>最終更新: {schedule.updatedBy} ({format(parseISO(schedule.updatedAt), 'yyyy/MM/dd HH:mm')})</span>
                ) : (
                  <span>最終更新: {format(parseISO(schedule.updatedAt), 'yyyy/MM/dd HH:mm')}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Login prompt for non-authenticated or NO_ROLE users */
          <div className="mt-4 pt-4 border-t border-gray-200/50">
            <p className="text-gray-800 mb-4">
              {!isAuthenticated
                ? '詳細を表示するにはログインしてください。'
                : 'ロールをリクエストすると詳細を表示できます。'}
            </p>
            {!isAuthenticated ? (
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  className="inline-block px-4 py-2 bg-white text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm"
                >
                  登録
                </Link>
              </div>
            ) : (
              <Link
                href="/user"
                className="inline-block px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                ロールをリクエスト
              </Link>
            )}
          </div>
        )}
      </div>

      {/* All Schedules button - only for VIEWER and above */}
      {canViewDetails && (
        <div className="mt-8 text-center">
          <Link
            href="/schedule"
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-primary-600 bg-white border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            すべての予定を見る
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
