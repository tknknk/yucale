'use client';

import { useState, useRef, useEffect } from 'react';

interface CalendarSubscribeLinkProps {
  inline?: boolean;
}

export default function CalendarSubscribeLink({ inline = false }: CalendarSubscribeLinkProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Build ICS URL from environment variables
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  const icsFilename = process.env.NEXT_PUBLIC_ICS_FILENAME || 'calendar.ics';
  const baseUrl = apiUrl.replace(/\/api$/, '');
  const icsUrl = `${baseUrl}/${icsFilename}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={inline ? "relative" : "fixed bottom-6 right-6 z-50"} ref={popupRef}>
      {/* Popup content */}
      {isOpen && (
        <div className={`absolute ${inline ? 'top-full mt-2 right-0' : 'bottom-14 right-0'} w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-fade-in z-50`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-primary-600 mt-0.5"
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
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-800">
                カレンダーを購読
              </h3>
              <p className="text-xs text-gray-800 mt-1">
                このカレンダーをGoogleカレンダー、Appleカレンダー、その他のカレンダーアプリに追加できます。
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-800 truncate">
                  {icsUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 inline-flex items-center px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {copied ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      コピーしました
                    </>
                  ) : (
                    <>
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      コピー
                    </>
                  )}
                </button>
              </div>
              {/* Warning message */}
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                <svg
                  className="w-3 h-3 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  このリンクを外部に共有しないでください。
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center transition-all ${
          inline
            ? `w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 text-sm font-medium rounded-full sm:rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isOpen
                  ? 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-50'
                  : 'bg-white text-primary-600 border-primary-300 hover:bg-primary-50'
              }`
            : `w-10 h-10 rounded-full shadow-lg hover:scale-110 ${
                isOpen
                  ? 'bg-gray-600 text-white'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`
        }`}
        aria-label="カレンダーを購読"
        title="カレンダーを購読"
      >
        <svg
          className={inline ? "w-5 h-5 sm:mr-2" : "w-5 h-5"}
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
        {inline && <span className="hidden sm:inline">購読</span>}
      </button>
    </div>
  );
}
