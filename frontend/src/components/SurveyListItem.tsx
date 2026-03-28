'use client';

import Link from 'next/link';
import { Survey } from '@/types/survey';
import { format, parseISO, isPast } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SurveyListItemProps {
  survey: Survey;
  showEditLink?: boolean;
}

export default function SurveyListItem({ survey, showEditLink = false }: SurveyListItemProps) {
  const isDeadlinePassed = survey.deadlineAt && isPast(parseISO(survey.deadlineAt));
  const hasResponded = survey.hasResponded === true;

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 ease-out shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 ${
        isDeadlinePassed
          ? 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/50 opacity-60'
          : 'bg-gradient-to-br from-primary-50 via-indigo-50 to-violet-50 border border-primary-200/50'
      }`}
    >
      {/* Title row - always visible */}
      <div className="flex justify-between items-start gap-2">
        <Link
          href={`/survey/${survey.urlId}`}
          className={`text-lg font-semibold truncate ${
            isDeadlinePassed ? 'text-gray-800' : 'text-gray-900 hover:text-primary-600'
          }`}
        >
          {survey.title}
        </Link>
        <div className="flex gap-2 flex-shrink-0">
          {/* Edit button - mobile only (icon only in title row) */}
          {showEditLink && (
            <Link
              href={`/survey/edit/${survey.urlId}`}
              className="p-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 inline-flex items-center sm:hidden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
          )}
          {/* Desktop buttons - hidden on mobile */}
          <div className="hidden sm:flex gap-2">
            {hasResponded ? (
              <Link
                href={`/survey/${survey.urlId}`}
                className="px-3 py-1 text-sm font-medium text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 whitespace-nowrap inline-flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                回答済
              </Link>
            ) : (
              <Link
                href={`/survey/${survey.urlId}`}
                className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 whitespace-nowrap inline-flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6h4l-1 8h-2l-1-8z" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
                未回答
              </Link>
            )}
            {showEditLink && (
              <>
                <Link
                  href={`/survey/${survey.urlId}?tab=results`}
                  className="px-3 py-1 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 whitespace-nowrap inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                  </svg>
                  結果
                </Link>
                <Link
                  href={`/survey/edit/${survey.urlId}`}
                  className="px-3 py-1 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 whitespace-nowrap inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  調査を編集
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Description row */}
      {survey.description && (
        <p className={`mt-2 text-sm whitespace-pre-wrap line-clamp-2 ${
          isDeadlinePassed ? 'text-gray-400' : 'text-gray-800'
        }`}>{survey.description}</p>
      )}
      {/* Metadata row */}
      <div className={`mt-2 flex flex-wrap gap-2 text-xs ${
        isDeadlinePassed ? 'text-gray-400' : 'text-gray-800'
      }`}>
        <span>作成者: {survey.createdByUsername}</span>
        <span>|</span>
        <span>
          作成日: {format(parseISO(survey.createdAt), 'yyyy/MM/dd', { locale: ja })}
        </span>
        {survey.deadlineAt && (
          <>
            <span>|</span>
            <span className={isDeadlinePassed ? 'text-red-400' : ''}>
              締切: {format(parseISO(survey.deadlineAt), 'yyyy/MM/dd', { locale: ja })}
              {isDeadlinePassed && ' (締切済)'}
            </span>
          </>
        )}
      </div>
      {/* Mobile buttons - visible only on mobile, at the bottom */}
      <div className="flex sm:hidden gap-2 mt-3 pt-3 border-t border-gray-100">
        {hasResponded ? (
          <Link
            href={`/survey/${survey.urlId}`}
            className="px-3 py-1 text-sm font-medium text-gray-800 bg-gray-100 rounded-md hover:bg-gray-200 whitespace-nowrap inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            回答済
          </Link>
        ) : (
          <Link
            href={`/survey/${survey.urlId}`}
            className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 whitespace-nowrap inline-flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6h4l-1 8h-2l-1-8z" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
            未回答
          </Link>
        )}
        {showEditLink && (
          <Link
            href={`/survey/${survey.urlId}?tab=results`}
            className="px-3 py-1 text-sm font-medium text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50 whitespace-nowrap inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
            </svg>
            結果
          </Link>
        )}
      </div>
    </div>
  );
}
