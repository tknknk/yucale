'use client';

import { useState } from 'react';
import { Survey, SurveyResponse } from '@/types/survey';
import { surveysApi } from '@/lib/surveys';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface SurveyResultsTableProps {
  survey: Survey;
  onResponseDeleted?: () => void;
}

export default function SurveyResultsTable({ survey, onResponseDeleted }: SurveyResultsTableProps) {
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  if (!survey.details || survey.details.length === 0) {
    return <div className="text-gray-800">対象スケジュールがありません</div>;
  }

  // 日付順（近い順）にソート
  const sortedDetails = [...survey.details].sort(
    (a, b) => new Date(a.scheduleDtstart).getTime() - new Date(b.scheduleDtstart).getTime()
  );

  // Collect all unique users across all details with timestamps
  const allUsers = new Map<string, {
    userName: string;
    belonging?: string;
    createdAt: string;
    updatedAt?: string;
  }>();
  for (const detail of sortedDetails) {
    if (detail.responses) {
      for (const response of detail.responses) {
        const existing = allUsers.get(response.userName);
        if (!existing) {
          allUsers.set(response.userName, {
            userName: response.userName,
            belonging: response.belonging,
            createdAt: response.createdAt,
            updatedAt: response.updatedAt,
          });
        } else {
          // 最も古いcreatedAtと最も新しいupdatedAtを保持
          if (response.createdAt < existing.createdAt) {
            existing.createdAt = response.createdAt;
          }
          // updatedAtがある場合のみ比較
          if (response.updatedAt) {
            if (!existing.updatedAt || response.updatedAt > existing.updatedAt) {
              existing.updatedAt = response.updatedAt;
            }
          }
        }
      }
    }
  }
  // created_at順（古い順）にソート
  const users = Array.from(allUsers.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Get attending options (isAttending = true)
  const attendingOptions = (survey.responseOptions || [])
    .filter((opt) => opt.isAttending)
    .map((opt) => opt.option);

  // Get attending counts by belonging for each detail
  const getAttendingCountsByBelonging = (detailId: number) => {
    const detail = survey.details?.find((d) => d.id === detailId);
    if (!detail?.responses) return { byBelonging: {}, total: 0 };

    const counts: { [belonging: string]: number } = {};
    // Initialize counts for all belongings
    for (const belonging of survey.belongingList || []) {
      counts[belonging] = 0;
    }
    counts['未設定'] = 0; // For responses without belonging

    let total = 0;
    for (const response of detail.responses) {
      // Only count if the response option is an attending option
      if (response.responseOption && attendingOptions.includes(response.responseOption)) {
        const belonging = response.belonging || '未設定';
        if (counts[belonging] !== undefined) {
          counts[belonging]++;
        } else {
          // Handle belonging not in the list
          counts[belonging] = 1;
        }
        total++;
      }
    }
    return { byBelonging: counts, total };
  };

  // Get all unique belongings from responses (including those not in belongingList)
  const getAllBelongings = () => {
    const belongings = new Set<string>(survey.belongingList || []);
    for (const detail of sortedDetails) {
      if (detail.responses) {
        for (const response of detail.responses) {
          if (response.belonging) {
            belongings.add(response.belonging);
          }
        }
      }
    }
    // Check if there are any responses without belonging
    const hasUnsetBelonging = sortedDetails.some(
      (detail) => detail.responses?.some((r) => !r.belonging && r.responseOption && attendingOptions.includes(r.responseOption))
    );
    const result = Array.from(belongings);
    if (hasUnsetBelonging) {
      result.push('未設定');
    }
    return result;
  };

  const allBelongings = getAllBelongings();

  const handleDeleteUserResponses = async (userName: string) => {
    if (!confirm(`${userName}さんの回答を全て削除しますか？`)) return;

    setDeletingUser(userName);
    try {
      await surveysApi.deleteUserResponses(survey.urlId, userName);
      if (onResponseDeleted) {
        onResponseDeleted();
      }
    } catch (err) {
      console.error('Failed to delete responses:', err);
      alert('回答の削除に失敗しました');
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Table - Attending counts by belonging */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">回答集計（参加者数）</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  スケジュール
                </th>
                {allBelongings.map((belonging) => (
                  <th
                    key={belonging}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    {belonging}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider bg-gray-100">
                  合計
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDetails.map((detail) => {
                const { byBelonging, total } = getAttendingCountsByBelonging(detail.id);
                return (
                  <tr key={detail.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {detail.scheduleSummary}
                      </div>
                      <div className="text-xs text-gray-800">
                        {format(parseISO(detail.scheduleDtstart), 'MM/dd (E) HH:mm', {
                          locale: ja,
                        })}
                      </div>
                    </td>
                    {allBelongings.map((belonging) => (
                      <td
                        key={belonging}
                        className="px-4 py-3 text-center text-sm text-gray-900"
                      >
                        {byBelonging[belonging] || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 bg-gray-50">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Responses Table */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">回答詳細</h3>
        {users.length === 0 ? (
          <div className="text-gray-800">まだ回答がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    回答者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    所属
                  </th>
                  {sortedDetails.map((detail) => (
                    <th
                      key={detail.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider"
                    >
                      <div>{detail.scheduleSummary}</div>
                      <div className="font-normal">
                        {format(parseISO(detail.scheduleDtstart), 'MM/dd', { locale: ja })}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                    回答日時
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                    更新日時
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.userName}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.userName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                      {user.belonging || '-'}
                    </td>
                    {sortedDetails.map((detail) => {
                      const response = detail.responses?.find(
                        (r) => r.userName === user.userName
                      );
                      return (
                        <td
                          key={detail.id}
                          className="px-4 py-3 text-center text-sm"
                        >
                          {response ? (
                            <div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  (() => {
                                    if (!response.responseOption) return 'bg-gray-100 text-gray-800';
                                    const opt = survey.responseOptions?.find(o => o.option === response.responseOption);
                                    if (opt?.isAttending) return 'bg-green-100 text-green-800';
                                    return 'bg-red-100 text-red-800';
                                  })()
                                }`}
                              >
                                {response.responseOption || '-'}
                              </span>
                              {response.freeText && (
                                <div className="text-xs text-gray-800 mt-1">
                                  {response.freeText}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-xs text-gray-800 whitespace-nowrap">
                      {format(parseISO(user.createdAt), 'MM/dd HH:mm', { locale: ja })}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-800 whitespace-nowrap">
                      {user.updatedAt ? format(parseISO(user.updatedAt), 'MM/dd HH:mm', { locale: ja }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteUserResponses(user.userName)}
                        disabled={deletingUser === user.userName}
                        className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                        title="この回答者の回答を全て削除"
                      >
                        {deletingUser === user.userName ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          '削除'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
