// Line ranges (1-based, inclusive) present in `cur` but not in `prev` — the lines
// a step ADDS over the previous one. Computed with a classic LCS line diff so the
// highlight tracks real additions even when teaching comments are removed in between.
export type LineRange = { from: number; to: number };

export function addedLineRanges(prev: string, cur: string): LineRange[] {
  const a = prev ? prev.split("\n") : [];
  const b = cur.split("\n");
  const n = a.length;
  const m = b.length;

  // dp[i][j] = LCS length of a[i:] and b[j:]
  const dp: Int32Array[] = Array.from(
    { length: n + 1 },
    () => new Int32Array(m + 1),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Mark which lines of b are part of the common subsequence.
  const common = new Uint8Array(m);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      common[j] = 1;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  // Group the non-common (added) lines of b into contiguous ranges.
  const ranges: LineRange[] = [];
  let k = 0;
  while (k < m) {
    if (!common[k]) {
      const start = k;
      while (k < m && !common[k]) k++;
      ranges.push({ from: start + 1, to: k });
    } else {
      k++;
    }
  }
  return ranges;
}
