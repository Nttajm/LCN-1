export const SCORE_STEPS = 9;
export const SCORE_FLOOR_RATIO = 0.12;
export const TIMER_BONUS_RATIO = 0.1;
export const BASE_LEVEL_SCORE = 5000;

export function formatScore(n) {
  return Math.round(n).toLocaleString("en-US");
}

export function scoreMultiplierLabel(maxRoundScore) {
  const m = maxRoundScore / BASE_LEVEL_SCORE;
  const text = Number.isInteger(m) ? String(m) : m.toFixed(1);
  return `×${text}`;
}

export function baseRoundScore(guessCount, maxRoundScore) {
  if (!(guessCount > 0) || !(maxRoundScore > 0)) return 0;
  if (guessCount === 1) return maxRoundScore;

  const penalty = maxRoundScore / SCORE_STEPS;
  const raw = maxRoundScore - (guessCount - 1) * penalty;
  const floor = Math.round(maxRoundScore * SCORE_FLOOR_RATIO);
  return Math.max(floor, Math.round(raw));
}

export function applyTimerBonus(base, timerSec, remainingMs) {
  if (!(base > 0) || !(timerSec > 0) || !(remainingMs > 0)) return base;
  return Math.round(base * (1 + TIMER_BONUS_RATIO));
}

export function scoreRound({ guessCount, won, maxRoundScore, timerSec, remainingMs }) {
  if (!won) {
    return { base: 0, bonus: 0, total: 0 };
  }

  const base = baseRoundScore(guessCount, maxRoundScore);
  const withBonus = applyTimerBonus(base, timerSec, remainingMs);
  return {
    base,
    bonus: withBonus - base,
    total: withBonus,
  };
}

export function maxSessionScore(maxRoundScore, totalRounds, timerSec = 0) {
  const perRound =
    timerSec > 0
      ? Math.round(maxRoundScore * (1 + TIMER_BONUS_RATIO))
      : maxRoundScore;
  return perRound * totalRounds;
}
