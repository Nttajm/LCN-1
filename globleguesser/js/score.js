export const SCORE_STEPS = 9;
export const SCORE_FLOOR_RATIO = 0.12;
export const TIMER_BONUS_RATIO = 0.1;
export const BASE_LEVEL_SCORE = 5000;
export const FULL_SCORE_MAX_GUESSES = 2;
export const PERFECT_BONUS_RATIO = 0.2;
export const CONNECTOR_OVER_PAR_RATIO = 0.12;
export const CONNECTOR_MAX_ROUND_SCORE = 5000;

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
  if (guessCount <= FULL_SCORE_MAX_GUESSES) return maxRoundScore;

  const penalty = maxRoundScore / SCORE_STEPS;
  const stepsOver = guessCount - FULL_SCORE_MAX_GUESSES;
  const raw = maxRoundScore - stepsOver * penalty;
  const floor = Math.round(maxRoundScore * SCORE_FLOOR_RATIO);
  return Math.max(floor, Math.round(raw));
}

export function applyTimerBonus(base, timerSec, remainingMs) {
  if (!(base > 0) || !(timerSec > 0) || !(remainingMs > 0)) return base;
  return Math.round(base * (1 + TIMER_BONUS_RATIO));
}

export function scoreRound({ guessCount, won, maxRoundScore, timerSec, remainingMs }) {
  if (!won) {
    return {
      base: 0,
      perfect: 0,
      bonus: 0,
      total: 0,
      maxed: false,
      perfectClear: false,
    };
  }

  const base = baseRoundScore(guessCount, maxRoundScore);
  const perfectClear = guessCount === 1;
  const maxed = guessCount <= FULL_SCORE_MAX_GUESSES;
  const perfect = perfectClear
    ? Math.round(maxRoundScore * PERFECT_BONUS_RATIO)
    : 0;
  const beforeTimer = base + perfect;
  const withBonus = applyTimerBonus(beforeTimer, timerSec, remainingMs);
  return {
    base,
    perfect,
    bonus: withBonus - beforeTimer,
    total: withBonus,
    maxed,
    perfectClear,
  };
}

export function scoreConnectorRound({
  optimal,
  used,
  won,
  maxRoundScore = CONNECTOR_MAX_ROUND_SCORE,
  timerSec = 0,
  remainingMs = 0,
}) {
  if (!won) {
    return {
      base: 0,
      perfect: 0,
      bonus: 0,
      total: 0,
      maxed: false,
      perfectClear: false,
    };
  }

  const over = Math.max(0, (Number(used) || 0) - (Number(optimal) || 0));
  const raw = maxRoundScore * (1 - over * CONNECTOR_OVER_PAR_RATIO);
  const floor = Math.round(maxRoundScore * SCORE_FLOOR_RATIO);
  const base = Math.max(floor, Math.round(raw));
  const maxed = over === 0;
  const perfectClear = maxed;
  const perfect = perfectClear
    ? Math.round(maxRoundScore * PERFECT_BONUS_RATIO)
    : 0;
  const beforeTimer = base + perfect;
  const withBonus = applyTimerBonus(beforeTimer, timerSec, remainingMs);
  return {
    base,
    perfect,
    bonus: withBonus - beforeTimer,
    total: withBonus,
    maxed,
    perfectClear,
  };
}

export function maxSessionScore(maxRoundScore, totalRounds, timerSec = 0) {
  const perfectCap = Math.round(maxRoundScore * (1 + PERFECT_BONUS_RATIO));
  const perRound =
    timerSec > 0
      ? Math.round(perfectCap * (1 + TIMER_BONUS_RATIO))
      : perfectCap;
  return perRound * totalRounds;
}
