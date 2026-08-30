// 出欠調査の回答詳細テーブルの並び替えに使うヘルパー。
//
// 所属は調査の belongingList（既定値は DEFAULT_BELONGING_LIST）、回答内容は
// responseOptions（既定値は DEFAULT_RESPONSE_OPTIONS）に設定された順で並べる。
// 設定リストにない値（調査作成時に追加された選択肢や、設定変更前に登録された
// 回答など）は既知の値のあとにまとめ、その中では五十音・辞書順で並べる。
// 未回答・所属なしは常に最後。

// 設定リストにない値と、値が無い場合の順位。実際の選択肢数を超える十分大きな値。
const UNKNOWN_RANK = Number.MAX_SAFE_INTEGER - 1;
const EMPTY_RANK = Number.MAX_SAFE_INTEGER;

/**
 * 設定順の順位を返す関数を作る。
 * 設定リストにない値は UNKNOWN_RANK、未設定（undefined / 空文字）は EMPTY_RANK。
 */
export const createOrderRanker = (order: string[]) => {
  const ranks = new Map(order.map((value, index) => [value, index]));
  return (value?: string | null): number => {
    if (!value) return EMPTY_RANK;
    return ranks.get(value) ?? UNKNOWN_RANK;
  };
};

/**
 * 設定順で比較するコンパレータを作る。
 * 同じ順位（どちらも設定リスト外）の場合のみ値そのもので比較して安定させる。
 */
export const createOrderComparator = (order: string[]) => {
  const rank = createOrderRanker(order);
  return (a?: string | null, b?: string | null): number => {
    const rankA = rank(a);
    const rankB = rank(b);
    if (rankA !== rankB) return rankA - rankB;
    if (rankA === UNKNOWN_RANK) return (a ?? '').localeCompare(b ?? '', 'ja');
    return 0;
  };
};
