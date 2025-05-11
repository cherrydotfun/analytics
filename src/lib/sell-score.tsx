export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function computeSellScore(
  sizeRatio: number,   // sizeX / μ_size
  holdRatio: number,   // holdX / μ_hold
  pnlDollarRatio: number,     // tProfitUSD / sizeX
  cashRatio: number            // cashUSD / sizeX
) {
  /* -------- AMM / bridge wallet -------- */
  if (!isFinite(sizeRatio) || sizeRatio === 0) {
    return 0.0; // must be AMM
  }
  const profitTaking = pnlDollarRatio > 0 ? sigmoid(pnlDollarRatio - 0.3) : 0;
  const capitulation = pnlDollarRatio < 0 ? sigmoid(-pnlDollarRatio - 0.1) : 0;
  const overTime     = sigmoid(holdRatio - 1);
  const oversize     = sigmoid(sizeRatio - 1);

  let score = 0.4 * (profitTaking + capitulation) +
              0.3 * overTime +
              0.3 * oversize;

  // cash modifier
  if (cashRatio < 0.3) score += 0.1;
  else if (cashRatio > 1.0) score -= 0.05;

  return Math.min(Math.max(score, 0), 1);
}

export function sellLabel(score: number, pnlDollarRatio: number, cashRatio: number, sizeRatio: number) {
    /* system / bridge */
    if (!isFinite(sizeRatio) || sizeRatio === 0) {
        return "Bridge / AMM wallet ⚙️";
    }
    const trend = pnlDollarRatio >= 0 ? 'profit' : 'loss';
    if (score < 0.25) return 'Diamond hands 💎';
    if (score < 0.50) return 'Likely holder 🟢';
    if (score < 0.70) return cashRatio > 1 ? 'Averaging-down zone 🟢' : 'Scale-out zone 🟢';
    if (score < 0.85) return trend === 'profit' ? 'Profit-taking likely 🟡' : 'Capitulation risk 🟡';
    return trend === 'profit' ? 'Exit-liquidity hunter 🔴' : 'Forced seller 🔴';
}
