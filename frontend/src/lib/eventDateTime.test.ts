import { formatEventPeriod, formatEventStart } from './eventDateTime';

describe('formatEventStart', () => {
  it('時刻ありの予定は日付と開始時刻を表示する', () => {
    expect(formatEventStart('2026-09-21T10:30:00', false)).toBe('2026/09/21 (月) 10:30');
  });

  it('終日の予定は時刻を表示しない', () => {
    expect(formatEventStart('2026-09-21T00:00:00', true)).toBe('2026/09/21 (月)');
  });

  it('日付フォーマットを指定できる', () => {
    expect(
      formatEventStart('2026-09-21T00:00:00', true, { dateFormat: 'MM/dd (E)' })
    ).toBe('09/21 (月)');
  });

  it('パースできない値はそのまま返す', () => {
    expect(formatEventStart('not-a-date', true)).toBe('not-a-date');
  });
});

describe('formatEventPeriod', () => {
  it('終日・1日のみの予定は開始日だけを表示する', () => {
    expect(
      formatEventPeriod('2026-09-21T00:00:00', '2026-09-21T00:00:00', true)
    ).toBe('2026/09/21 (月)');
  });

  it('終日・複数日の予定は開始日と終了日を表示する', () => {
    expect(
      formatEventPeriod('2026-09-21T00:00:00', '2026-09-23T00:00:00', true)
    ).toBe('2026/09/21 (月) - 2026/09/23 (水)');
  });

  it('時刻あり・同日の予定は終了時刻だけを添える', () => {
    expect(
      formatEventPeriod('2026-09-21T10:00:00', '2026-09-21T12:00:00', false)
    ).toBe('2026/09/21 (月) 10:00 - 12:00');
  });

  it('時刻あり・日跨ぎの予定は終了日も表示する', () => {
    expect(
      formatEventPeriod('2026-09-21T22:00:00', '2026-09-22T02:00:00', false)
    ).toBe('2026/09/21 (月) 22:00 - 2026/09/22 (火) 02:00');
  });

  it('終了日時がない場合は開始日時だけを表示する', () => {
    expect(formatEventPeriod('2026-09-21T10:00:00', undefined, false)).toBe(
      '2026/09/21 (月) 10:00'
    );
    expect(formatEventPeriod('2026-09-21T00:00:00', 'not-a-date', true)).toBe(
      '2026/09/21 (月)'
    );
  });

  it('allDay未指定は時刻ありとして扱う', () => {
    expect(formatEventPeriod('2026-09-21T10:00:00', '2026-09-21T12:00:00')).toBe(
      '2026/09/21 (月) 10:00 - 12:00'
    );
  });
});
