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

/**
 * One change between two versions, in line numbers of `cur` (1-based).
 * `added` lines from..to were inserted; `removed` lines were deleted just
 * before line `from` (a pure deletion has added = 0 and to = from - 1).
 */
export type Hunk = { from: number; to: number; added: number; removed: number };

export function changeHunks(prev: string, cur: string): Hunk[] {
  const a = prev ? prev.split("\n") : [];
  const b = cur.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  let open: Hunk | null = null;
  const close = () => {
    if (open) hunks.push(open);
    open = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      close();
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i + 1][j] < dp[i][j + 1])) {
      open ??= { from: j + 1, to: j, added: 0, removed: 0 };
      open.added++;
      open.to = j + 1;
      j++;
    } else {
      open ??= { from: j + 1, to: j, added: 0, removed: 0 };
      open.removed++;
      i++;
    }
  }
  close();
  return hunks;
}

/**
 * A brand-new file walked in readable pieces: blocks separated by blank
 * lines, merged so each piece has at least `min` lines.
 */
export function fileBlocks(text: string, min = 6): Hunk[] {
  const lines = text.split("\n");
  const out: Hunk[] = [];
  let start = 0;
  const push = (end: number) => {
    while (start < end && !lines[start].trim()) start++;
    let e = end;
    while (e > start && !lines[e - 1].trim()) e--;
    if (e > start) out.push({ from: start + 1, to: e, added: e - start, removed: 0 });
    start = end;
  };
  for (let k = 0; k < lines.length; k++) {
    const blank = !lines[k].trim() && k > 0 && lines[k - 1].trim();
    if (blank && k - start >= min && !/^\s/.test(lines[k + 1] ?? "")) push(k);
  }
  push(lines.length);
  return out;
}
