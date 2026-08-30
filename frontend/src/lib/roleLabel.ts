import { Role } from '@/types/user';

// 画面に出すロール名の英語表記。ヘッダー・ユーザー一覧・ロールリクエストで
// 表記が揺れないよう、ここだけで定義する。
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
  NO_ROLE: 'No role',
};

/**
 * ロールの表示名を返す。未設定や未知の値は空文字。
 */
export const formatRoleName = (role?: string | null): string => {
  if (!role) return '';
  return ROLE_LABELS[role as Role] ?? role;
};
