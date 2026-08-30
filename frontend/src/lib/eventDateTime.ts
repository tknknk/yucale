import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

// スケジュールの日時表示。終日イベントは dtstart / dtend とも 00:00:00 で
// 保存されるため、そのまま時刻を出すと「00:00 - 00:00」になってしまう。
// 終日かどうか・日跨ぎかどうかで表示を切り替える処理をここに集約する。
// 終日イベントの dtend は終了日そのもの（ScheduleForm が送る値）を指す。

/** 日付部分の既定フォーマット。曜日つき。 */
export const DEFAULT_EVENT_DATE_FORMAT = 'yyyy/MM/dd (E)';

const TIME_FORMAT = 'HH:mm';

export interface EventDateTimeOptions {
  /** 日付部分のフォーマット。既定は DEFAULT_EVENT_DATE_FORMAT */
  dateFormat?: string;
}

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  try {
    const date = parseISO(value);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

const formatWith = (date: Date, pattern: string) => format(date, pattern, { locale: ja });

const isSameDate = (a: Date, b: Date) => format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd');

/**
 * 開始日時を表示する。終日なら日付のみ、それ以外は日付＋開始時刻。
 * パースできない値はそのまま返す。
 */
export const formatEventStart = (
  start: string,
  allDay?: boolean,
  options: EventDateTimeOptions = {}
): string => {
  const startDate = toDate(start);
  if (!startDate) return start ?? '';

  const datePart = formatWith(startDate, options.dateFormat ?? DEFAULT_EVENT_DATE_FORMAT);
  return allDay ? datePart : `${datePart} ${formatWith(startDate, TIME_FORMAT)}`;
};

/**
 * 開始〜終了を表示する。
 * - 終日・1日のみ: 開始日のみ
 * - 終日・複数日: 開始日 - 終了日
 * - 時刻あり・同日: 開始日 開始時刻 - 終了時刻
 * - 時刻あり・日跨ぎ: 開始日 開始時刻 - 終了日 終了時刻
 * 終了日時が無い、またはパースできない場合は開始日時のみ。
 */
export const formatEventPeriod = (
  start: string,
  end?: string | null,
  allDay?: boolean,
  options: EventDateTimeOptions = {}
): string => {
  const startDate = toDate(start);
  if (!startDate) return start ?? '';

  const startText = formatEventStart(start, allDay, options);
  const endDate = toDate(end);
  if (!endDate) return startText;

  if (isSameDate(startDate, endDate)) {
    return allDay ? startText : `${startText} - ${formatWith(endDate, TIME_FORMAT)}`;
  }
  return `${startText} - ${formatEventStart(end as string, allDay, options)}`;
};
