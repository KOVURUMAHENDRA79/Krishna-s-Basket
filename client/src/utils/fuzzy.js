export function substringEditDistance(query, text) {
  const m = query.length;
  const n = text.length;

  if (m === 0) return 0;
  if (n === 0) return m;

  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = query[i - 1].toLowerCase() === text[j - 1].toLowerCase() ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return Math.min(...prev);
}

export function similarity(query, text) {
  const maxLen = query.length;
  if (maxLen === 0) return 1;
  const dist = substringEditDistance(query, text);
  return Math.max(0, 1 - dist / maxLen);
}

export function findFuzzyMatches(items, query, minScore = 0.62) {
  const queryLower = query.toLowerCase();
  const scored = items.map((item) => ({
    item,
    score: similarity(query, item.name),
    isExactSubstring: item.name.toLowerCase().includes(queryLower),
  }));

  scored.sort((a, b) => b.score - a.score);

  return {
    matches: scored
      .filter((entry) => entry.isExactSubstring || entry.score >= minScore)
      .map((entry) => entry.item),
    best: scored[0] || null,
  };
}
