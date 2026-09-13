import { colorFromDistance, formatDistance, distanceUnitLabel } from "./distance.js";

const ZONE_NEAR_KM = 1500;
const ZONE_MID_KM = 4000;
const GRAY_FILL = "rgb(140, 140, 145)";
const GRAY_STROKE = "#5a5a60";

export const LEVEL_MODES = {
  easy: {
    id: "easy",
    label: "Easy",
    summary:
      "Full assists — borders, exact distances, autocomplete, radius tool, unlimited guesses. Up to 3,500 pts/round (×0.7).",
    looseBorders: false,
    roundDistance: 0,
    showDistances: true,
    showDirection: true,
    autocomplete: true,
    radiusTool: true,
    maxGuesses: null,
    zones: null,
    flyGlobe: true,
    grayFill: false,
    pureDistance: false,
    maxRoundScore: 3500,
  },
  medium: {
    id: "medium",
    label: "Medium",
    summary:
      "No borders, distances rounded to 500 km, autocomplete on. Up to 5,000 pts/round (×1.0).",
    looseBorders: true,
    roundDistance: 500,
    showDistances: true,
    showDirection: true,
    autocomplete: true,
    radiusTool: false,
    maxGuesses: null,
    zones: null,
    flyGlobe: true,
    grayFill: false,
    pureDistance: false,
    maxRoundScore: 5000,
  },
  hard: {
    id: "hard",
    label: "Hard",
    summary:
      "No borders, no autocomplete, no distance text — 8 guesses, heat colors only. Up to 6,500 pts/round (×1.3).",
    looseBorders: true,
    roundDistance: 0,
    showDistances: false,
    showDirection: false,
    autocomplete: false,
    radiusTool: false,
    maxGuesses: 8,
    zones: null,
    flyGlobe: true,
    grayFill: false,
    pureDistance: false,
    maxRoundScore: 6500,
  },
  xtra: {
    id: "xtra",
    label: "Xtra",
    summary:
      "Hard rules, 5 guesses, Near/Mid/Far zones, no globe fly-to. Up to 7,500 pts/round (×1.5).",
    looseBorders: true,
    roundDistance: 0,
    showDistances: false,
    showDirection: true,
    autocomplete: false,
    radiusTool: false,
    maxGuesses: 5,
    zones: 3,
    flyGlobe: false,
    grayFill: false,
    pureDistance: false,
    maxRoundScore: 7500,
  },
  xtra2: {
    id: "xtra2",
    label: "Xtra II",
    summary:
      "Numeric distance only, 5 guesses, gray country fills, no fly-to. Up to 8,500 pts/round (×1.7).",
    looseBorders: true,
    roundDistance: 500,
    showDistances: true,
    showDirection: false,
    autocomplete: false,
    radiusTool: false,
    maxGuesses: 5,
    zones: null,
    flyGlobe: false,
    grayFill: true,
    pureDistance: true,
    maxRoundScore: 8500,
  },
};

export const LEVEL_ORDER = ["easy", "medium", "hard", "xtra", "xtra2"];

export function getLevelMode(id) {
  return LEVEL_MODES[id] ?? LEVEL_MODES.easy;
}

export function displayDistanceKm(mode, km) {
  if (!(km > 0)) return 0;
  const step = mode.roundDistance > 0 ? mode.roundDistance : 0;
  if (!step) return km;
  const rounded = Math.round(km / step) * step;
  return rounded === 0 ? step : rounded;
}

export function zoneLabel(km) {
  if (km <= ZONE_NEAR_KM) return "Near";
  if (km <= ZONE_MID_KM) return "Mid";
  return "Far";
}

export function distanceLabel(mode, km, unit = "km", direction = "") {
  if (mode.zones) {
    const zone = zoneLabel(km);
    return mode.showDirection && direction ? `${zone} ${direction}` : zone;
  }

  if (!mode.showDistances && !mode.pureDistance) {
    return "";
  }

  const shownKm = displayDistanceKm(mode, km);
  const value = formatDistance(shownKm, unit);
  const unitText = distanceUnitLabel(unit);
  const dist = `${value} ${unitText}`;

  if (mode.pureDistance || !mode.showDirection || !direction) {
    return dist;
  }

  return `${dist} ${direction}`;
}

export function guessFillColor(mode, km, correct, distancePack = "world") {
  if (correct) return "rgb(70, 140, 220)";
  if (mode.grayFill) return GRAY_FILL;
  return colorFromDistance(km, distancePack);
}

export function guessStrokeColor(mode, correct) {
  if (correct) return "#1e4a7a";
  if (mode.looseBorders) return "rgba(0,0,0,0)";
  if (mode.grayFill) return GRAY_STROKE;
  return "#1a1a1a";
}
