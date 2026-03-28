'use client';

import { useState, ReactNode } from 'react';
import { Notice } from '@/types/notice';
import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

// URLが同じドメインかどうかを判定する関数
const isSameOrigin = (url: string): boolean => {
  try {
    const linkUrl = new URL(url);
    return linkUrl.hostname === window.location.hostname;
  } catch {
    return false;
  }
};

// URLを検出してリンクに変換する関数
const renderContentWithLinks = (content: string): ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?\])'">\-])/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset lastIndex because test() modifies it
      urlRegex.lastIndex = 0;
      const sameOrigin = isSameOrigin(part);
      return (
        <a
          key={index}
          href={part}
          target={sameOrigin ? undefined : '_blank'}
          rel={sameOrigin ? undefined : 'noopener noreferrer'}
          className="text-primary-600 hover:text-primary-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface NoticeCardProps {
  notice: Notice;
  onEdit?: (notice: Notice) => void;
  onDelete?: (id: number) => void;
  canEdit?: boolean;
  forceExpanded?: boolean;
}

export default function NoticeCard({
  notice,
  onEdit,
  onDelete,
  canEdit = false,
  forceExpanded = false,
}: NoticeCardProps) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false);

  // Use forceExpanded if set, otherwise use internal state
  const isExpanded = forceExpanded || isExpandedInternal;

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return dateString;
      }
      return format(date, 'M月d日(E)', { locale: ja });
    } catch {
      return dateString;
    }
  };

  const toggleExpand = () => {
    setIsExpandedInternal(!isExpandedInternal);
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 ease-out shadow-soft hover:shadow-soft-lg bg-primary-50 border border-primary-200/50 ${
        isExpanded ? 'ring-2 ring-primary-400 shadow-glow' : 'hover:-translate-y-0.5'
      }`}
    >
      {/* Main Card Content - Clickable */}
      <div
        className="p-4 cursor-pointer"
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand();
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-800 truncate">
              {notice.title}
            </h3>

            {/* Date and Author */}
            <div className="flex items-center text-sm text-gray-800 mt-1 gap-3">
              <span className="flex items-center gap-1">
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
                {formatDate(notice.createdAt)}
              </span>
              <span className="flex items-center gap-1">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                {notice.createdByUsername}
              </span>
            </div>
          </div>

          {/* Expand/Collapse Indicator - only show when not forceExpanded */}
          {!forceExpanded && (
            <div className="flex flex-col items-end gap-2 ml-4">
              <svg
                className={`w-5 h-5 transition-transform duration-200 text-gray-400 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 animate-fade-in">
          {/* Content */}
          <div className="mb-4">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {renderContentWithLinks(notice.content)}
            </p>
          </div>

          {/* Actions - Only for EDITOR and above */}
          {canEdit && (onEdit || onDelete) && (
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(notice);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notice.id);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
      )}
    </div>
  );
}
