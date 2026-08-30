import { createOrderComparator, createOrderRanker } from './surveySort';

describe('createOrderRanker', () => {
  const rank = createOrderRanker(['S', 'A', 'T', 'B']);

  it('should rank configured values by their position', () => {
    expect(rank('S')).toBe(0);
    expect(rank('A')).toBe(1);
    expect(rank('B')).toBe(3);
  });

  it('should rank values outside the configured list after all of them', () => {
    expect(rank('X')).toBeGreaterThan(rank('B'));
  });

  it('should rank missing values last', () => {
    expect(rank(undefined)).toBeGreaterThan(rank('X'));
    expect(rank('')).toBeGreaterThan(rank('X'));
    expect(rank(null)).toBeGreaterThan(rank('X'));
  });
});

describe('createOrderComparator', () => {
  const compare = createOrderComparator(['出席', '欠席', '未定']);

  const sorted = (values: (string | undefined)[]) => [...values].sort(compare);

  it('should sort by the configured order, not alphabetically', () => {
    expect(sorted(['未定', '出席', '欠席'])).toEqual(['出席', '欠席', '未定']);
  });

  it('should place options outside the configured list after the configured ones', () => {
    expect(sorted(['オンライン参加', '未定', '出席'])).toEqual([
      '出席',
      '未定',
      'オンライン参加',
    ]);
  });

  it('should order multiple unknown options among themselves', () => {
    const result = sorted(['遅刻', 'オンライン参加', '出席']);
    expect(result[0]).toBe('出席');
    expect(result.slice(1)).toEqual(['オンライン参加', '遅刻'].sort((a, b) => a.localeCompare(b, 'ja')));
  });

  it('should place missing values last', () => {
    expect(sorted([undefined, '未回答扱い', '欠席'])).toEqual(['欠席', '未回答扱い', undefined]);
  });

  it('should treat equal configured values as ties', () => {
    expect(compare('出席', '出席')).toBe(0);
  });
});
