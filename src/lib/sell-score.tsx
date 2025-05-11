export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function computeSellScore(
  sizeRatio: number,   // sizeX / μ_size
  holdRatio: number,   // holdX / μ_hold
  pnl: number,         // decimal (0.6 = +60 %)
  liqRatio = 1         // poolDepth / sizeX   (optional, default neutral)
) {
  const S = sigmoid(sizeRatio - 1);         // oversize pressure
  const H = sigmoid(holdRatio - 1);         // overtime pressure
  const G = sigmoid(pnl - 0.3);             // greed cushion
  const L = 1 - Math.min(1, liqRatio);      // 0 = plenty of depth

  return 0.35 * S + 0.25 * H + 0.25 * G + 0.15 * L;
}

export function sellLabel(score: number): 'Diamond hands' | 'Neutral' | 'Profit-taking likely' | 'Exit-liquidity hunter' {
  if (score < 0.3) return 'Diamond hands';
  if (score < 0.6) return 'Neutral';
  if (score < 0.8) return 'Profit-taking likely';
  return 'Exit-liquidity hunter';
}
