// スケジュールカードの左端に出す出席ラインのヘルパー。
//
// 出欠は schedules.attendees の文字列から読み取る。バックエンドが出席系の回答に
// 接尾辞を付けて書き込むため（ATTENDEE_SUFFIXES、既定は「遅刻:遅,早退:早」）、
// 自分の名前が「田中」なら出席、「田中(遅)」なら遅刻、「田中(早)」なら早退。
//
// クラス名は attendanceLineClass（カード本体）と attendanceHalfLineClass
// （遅刻・早退のときに重ねる枠）の2つに分かれる。
//
// ラインは出席なら全高、早退は上半分、遅刻は下半分。予定の前半にいるのが早退、
// 後半にいるのが遅刻なので、ラインの位置が滞在する時間帯と一致する。

/**
 * 出席者欄から読み取った、ログインユーザー自身の出欠。
 * 出席者に含まれない場合は null。
 */
export type AttendanceMark = 'full' | 'early-leave' | 'late';

// バックエンドの ATTENDEE_SUFFIXES と対になる表。既定値以外の接尾辞を設定した
// 場合は、ここにも同じ対応を追加する（未知の接尾辞は 'full' として扱われる）。
const MARK_BY_SUFFIX: Record<string, AttendanceMark> = {
  遅: 'late',
  早: 'early-leave',
};

interface AttendanceUser {
  username: string;
  email: string;
}

/**
 * 出席者欄にログインユーザーが含まれるかを調べ、含まれていればその出欠を返す。
 * 照合は従来どおり部分一致（大文字小文字は無視）で、名前の直後に接尾辞が
 * 続く場合だけ遅刻・早退として扱う。
 */
export const getAttendanceMark = (
  attendees: string | null | undefined,
  user: AttendanceUser | null | undefined
): AttendanceMark | null => {
  if (!user || !attendees) return null;

  const haystack = attendees.toLowerCase();
  for (const name of [user.username, user.email]) {
    if (!name) continue;
    const index = haystack.indexOf(name.toLowerCase());
    if (index === -1) continue;

    const suffix = /^\((.)\)/.exec(attendees.slice(index + name.length));
    return (suffix && MARK_BY_SUFFIX[suffix[1]]) || 'full';
  }
  return null;
};

// 強調の色。カードの種類（過去 / 終日 / 通常）ごとに使い分ける。
// line=閉じているときの左ライン、ring=展開時のリング、edge=重ねる枠の全辺。
const ACCENTS = {
  past: { line: 'border-l-gray-400', ring: 'ring-gray-400', edge: 'border-gray-400' },
  allDay: { line: 'border-l-rose-500', ring: 'ring-rose-500', edge: 'border-rose-500' },
  normal: { line: 'border-l-blue-500', ring: 'ring-blue-500', edge: 'border-blue-500' },
} as const;

type AccentOptions = { isPast?: boolean; allDay?: boolean };

const accentOf = ({ isPast, allDay }: AccentOptions) =>
  ACCENTS[isPast ? 'past' : allDay ? 'allDay' : 'normal'];

const CLIP_HALF = {
  'early-leave': '[clip-path:inset(0_0_50%_0)]',
  late: '[clip-path:inset(50%_0_0_0)]',
} as const;

// 半分の強調は、カードにもう一枚枠を重ねて clip-path で半分に切って描く。
// 背景を帯状に敷く方法だと角の弧（左端から右へ半径ぶん広がる部分）を覆えず、
// カーブの手前で切れてしまうため。
//
// 閉じているとき: カードの border ボックスにぴったり重ね、左辺だけを太くする。
// 角の丸みへの追従は全高のライン（border-l-4）とまったく同じになる。
const HALF_LINE_OVERLAY =
  'pointer-events-none absolute -left-1 -top-px -right-px -bottom-px rounded-2xl border border-transparent border-l-4';

// 展開しているとき: border ボックスの外4pxがリングの位置なので、そこへ全周4pxの
// 枠を重ねる。カード側は細いリング(ring-2)を全周に残すので、半分だけが太くなる。
// 角丸はリングの外周＝カードの角丸(rounded-2xl)＋枠の4px。px で決め打ちすると
// tailwind.config.ts の borderRadius を変えたときにカードの角とずれて輪郭が
// 二重に見えるので、テーマの値を直接参照する。
const HALF_RING_OVERLAY =
  'pointer-events-none absolute -inset-[5px] rounded-[calc(theme(borderRadius.2xl)_+_4px)] border-4';

/**
 * 閉じているカード本体に付けるクラス名を返す。出席していない場合は空文字。
 * 遅刻・早退のラインは重ねる枠（attendanceHalfLineClass）が描くので、ここでは
 * 位置決めと、ラインの有無で本文がずれないための透明な border だけを返す。
 */
export const attendanceLineClass = (
  mark: AttendanceMark | null,
  options: AccentOptions
): string => {
  if (!mark) return '';
  if (mark === 'full') return `border-l-4 ${accentOf(options).line}`;
  return 'relative border-l-4 border-l-transparent';
};

/**
 * 展開したカード本体に付けるリングのクラス名を返す。出席していない場合は空文字
 * （呼び出し側が「展開中」を示す既定のリングを付ける）。
 * 出席は全周を太く、遅刻・早退は全周を細くして、太い強調は重ねる枠が半分だけ描く。
 */
export const attendanceRingClass = (
  mark: AttendanceMark | null,
  options: AccentOptions
): string => {
  if (!mark) return '';
  const accent = accentOf(options);
  if (mark === 'full') return `ring-4 ${accent.ring}`;
  return `relative ring-2 ${accent.ring}`;
};

/**
 * 遅刻・早退のときにカードへ重ねる枠のクラス名を返す。
 * 早退は上半分、遅刻は下半分だけを残す。それ以外は空文字。
 */
export const attendanceHalfLineClass = (
  mark: AttendanceMark | null,
  { expanded, ...options }: AccentOptions & { expanded?: boolean }
): string => {
  if (mark !== 'early-leave' && mark !== 'late') return '';

  const accent = accentOf(options);
  const base = expanded
    ? `${HALF_RING_OVERLAY} ${accent.edge}`
    : `${HALF_LINE_OVERLAY} ${accent.line}`;
  return `${base} ${CLIP_HALF[mark]}`;
};
