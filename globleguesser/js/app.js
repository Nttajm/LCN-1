import { loadCountries } from "./countries.js";
import { loadUsStates } from "./us-states.js";
import { loadCaProvinces } from "./ca-provinces.js";
import { loadUsCa } from "./us-ca.js";
import {
  closestBorder,
  bearing,
  formatDistance,
  distanceUnitLabel,
  DISTANCE_PACK_WORLD,
  DISTANCE_PACK_US,
} from "./distance.js";
import { createGlobe } from "./globe.js";
import { flagUrl } from "./flags.js";
import {
  getLevelMode,
  distanceLabel,
  guessFillColor,
  guessStrokeColor,
} from "./levels.js";
import {
  scoreRound,
  scoreConnectorRound,
  formatScore,
  scoreMultiplierLabel,
  maxSessionScore,
  TIMER_BONUS_RATIO,
  PERFECT_BONUS_RATIO,
  CONNECTOR_MAX_ROUND_SCORE,
} from "./score.js";
import { solveWithSet } from "./borders.js";
import {
  createParty,
  joinParty,
  leaveParty,
  setPartyStatus,
  subscribeParty,
  occupiedCount,
  startPartyGame,
  pushPlayerGuess,
  markPlayerEliminated,
  claimRoundWin,
  endRoundNoWinner,
  advanceRound,
  clearPartyGame,
  assignSeatTeam,
  teamsReady,
} from "./party.js";
import { burstConfetti } from "./confetti.js";

const GUEST_STORAGE_KEY = "globle-guest";
const GUEST_COLORS = ["#5b6cf0", "#3db88a", "#e08a3c", "#d45d8c", "#4aa3d9", "#c4a035"];

const app = document.getElementById("app");
const starsEl = document.getElementById("stars");
const globeStage = document.getElementById("globe-stage");
const gamePanel = document.getElementById("game-panel");
const multiplayerBtn = document.getElementById("btn-multiplayer");
const playBtn = document.getElementById("btn-play");
const practiceBtn = document.getElementById("btn-practice");
const startNickname = document.getElementById("start-nickname");
const playScreenBack = document.getElementById("play-screen-back");
const gameExitBtn = document.getElementById("game-exit");
const guestPrompt = document.getElementById("guest-prompt");
const guestPromptForm = document.getElementById("guest-prompt-form");
const guestNameInput = document.getElementById("guest-name-input");
const guestNameError = document.getElementById("guest-name-error");
const multiplayerLobby = document.getElementById("multiplayer-lobby");
const multiplayerMode = document.getElementById("multiplayer-mode");
const multiplayerPvpFormat = document.getElementById("multiplayer-pvp-format");
const multiplayerTeams = document.getElementById("multiplayer-teams");
const partyCodeBtn = document.getElementById("party-code");
const partyCodeValue = document.getElementById("party-code-value");
const partyCodeHint = document.getElementById("party-code-hint");
const lobbySeats = document.getElementById("lobby-seats");
const modeSeats = document.getElementById("mode-seats");
const pvpFormatSeats = document.getElementById("pvp-format-seats");
const teamsSeats = document.getElementById("teams-seats");
const lobbyStatus = document.getElementById("lobby-status");
const modeStatus = document.getElementById("mode-status");
const pvpFormatStatus = document.getElementById("pvp-format-status");
const teamsStatus = document.getElementById("teams-status");
const partyPlayBtn = document.getElementById("party-play-btn");
const partyJoinToggle = document.getElementById("party-join-toggle");
const partyJoinForm = document.getElementById("party-join-form");
const partyJoinInput = document.getElementById("party-join-input");
const partyJoinError = document.getElementById("party-join-error");
const modeCoopBtn = document.getElementById("mode-coop");
const modePvpBtn = document.getElementById("mode-pvp");
const formatNormalBtn = document.getElementById("format-normal");
const formatTeamsBtn = document.getElementById("format-teams");
const teamPickABtn = document.getElementById("team-pick-a");
const teamPickBBtn = document.getElementById("team-pick-b");
const teamAMembers = document.getElementById("team-a-members");
const teamBMembers = document.getElementById("team-b-members");
const teamsContinueBtn = document.getElementById("teams-continue-btn");
const regionPicker = document.getElementById("region-picker");
const modeCatalogue = document.getElementById("mode-catalogue");
const catalogueCountriesBtn = document.getElementById("catalogue-countries-btn");
const catalogueConnectorBtn = document.getElementById("catalogue-connector-btn");
const regionList = document.getElementById("region-list");
const regionListHeader = document.getElementById("region-list-header");
const regionListBack = document.getElementById("region-list-back");
const regionOptions = regionList.querySelectorAll("[data-region]");
const provincesPackBtn = document.getElementById("provinces-pack-btn");
const provinceList = document.getElementById("province-list");
const provinceListBack = document.getElementById("province-list-back");
const provinceOptions = provinceList.querySelectorAll("[data-region]");
const regionDetail = document.getElementById("region-detail");
const regionDetailTitle = document.getElementById("region-detail-title");
const regionDetailClose = document.getElementById("region-detail-close");
const gameSetup = document.getElementById("game-setup");
const setupLevelGroup = document.getElementById("setup-level-group");
const setupConnectorGroup = document.getElementById("setup-connector-group");
const setupConnectorLength = document.getElementById("setup-connector-length");
const setupConnectorHint = document.getElementById("setup-connector-hint");
const roundOptions = gameSetup.querySelectorAll("[data-rounds]");
const timerOptions = gameSetup.querySelectorAll("[data-timer]");
const levelOptions = gameSetup.querySelectorAll("[data-level]");
const levelDescEl = document.getElementById("level-desc");
const setupMaxScoreEl = document.getElementById("setup-max-score");
const setupTimerHintEl = document.getElementById("setup-timer-hint");
const setupPoolGroup = document.getElementById("setup-pool-group");
const setupPoolHint = document.getElementById("setup-pool-hint");
const setupAllCountriesBtn = document.getElementById("setup-all-countries");
const setupHostWaitEl = document.getElementById("setup-host-wait");
const gameModeEl = document.getElementById("game-mode");
const gameScorebarEl = document.getElementById("game-scorebar");
const scorebarRoundsEl = document.getElementById("scorebar-rounds");
const scorebarAwardEl = document.getElementById("scorebar-award");
const scorebarTotalEl = document.getElementById("scorebar-total");
const scorebarMaxEl = document.getElementById("scorebar-max");
const scorebarLevelEl = document.getElementById("scorebar-level");
const scorebarTimerEl = document.getElementById("scorebar-timer");
const connectorProgressEl = document.getElementById("connector-progress");
const connectorProgressValueEl = document.getElementById("connector-progress-value");
const mpRivalsEl = document.getElementById("mp-rivals");
const gameStatusEl = document.getElementById("game-status");
const guessesLeftEl = document.getElementById("guesses-left");
const gameTimerEl = document.getElementById("game-timer");
const gamePromptEl = document.getElementById("game-prompt");
const input = document.getElementById("country-input");
const enterBtn = document.getElementById("enter-btn");
const suggestionsEl = document.getElementById("suggestions");
const hintEl = document.getElementById("hint");
const guessesPanel = document.getElementById("guesses-panel");
const gameTools = document.getElementById("game-tools");
const radiusToolBtn = document.getElementById("radius-tool-btn");
const radiusClearBtn = document.getElementById("radius-clear-btn");
const radiusReadout = document.getElementById("radius-readout");
const guessesToolbar = document.getElementById("guesses-toolbar");
const guessesSort = document.getElementById("guesses-sort");
const guessesUnitGroup = document.getElementById("guesses-unit");
const guessesEl = document.getElementById("guesses");
const guessesPlaceholder = document.getElementById("guesses-placeholder");
const winPanel = document.getElementById("win-panel");
const practiceEndEl = document.getElementById("practice-end");
const winText = document.getElementById("win-text");
const newGameBtn = document.getElementById("new-game-btn");
const practiceExitBtn = document.getElementById("practice-exit-btn");
const scoreSheetRound = document.getElementById("score-sheet-round");
const roundSheetKicker = document.getElementById("round-sheet-kicker");
const roundSheetCountry = document.getElementById("round-sheet-country");
const roundSheetMeta = document.getElementById("round-sheet-meta");
const roundSheetPoints = document.getElementById("round-sheet-points");
const roundSheetMaxLabel = document.getElementById("round-sheet-max-label");
const roundSheetMaxBadge = document.getElementById("round-sheet-max-badge");
const roundSheetScoreEl = document.getElementById("round-sheet-score");
const roundSheetBreakdown = document.getElementById("round-sheet-breakdown");
const roundSheetChain = document.getElementById("round-sheet-chain");
const roundSheetRouteYours = document.getElementById("round-sheet-route-yours");
const roundSheetRouteOptimal = document.getElementById("round-sheet-route-optimal");
const roundSheetMeter = document.getElementById("round-sheet-meter");
const roundSheetMeterFill = document.getElementById("round-sheet-meter-fill");
const roundSheetMeterPointer = document.getElementById("round-sheet-meter-pointer");
const roundSheetMeterMax = document.getElementById("round-sheet-meter-max");
const roundSheetMeterSegments = document.getElementById("round-sheet-meter-segments");
const roundSheetMapBtn = document.getElementById("round-sheet-map-btn");
const roundSheetBody = document.getElementById("round-sheet-body");
const roundSheetPeek = document.getElementById("round-sheet-peek");
const roundSheetPeekScore = document.getElementById("round-sheet-peek-score");
const roundSheetBtn = document.getElementById("round-sheet-btn");
const roundExitBtn = document.getElementById("round-exit-btn");
const scoreSheetFinal = document.getElementById("score-sheet-final");
const finalSheetTotal = document.getElementById("final-sheet-total");
const finalSheetMax = document.getElementById("final-sheet-max");
const finalSheetBest = document.getElementById("final-sheet-best");
const finalSheetList = document.getElementById("final-sheet-list");
const finalSheetMeter = document.getElementById("final-sheet-meter");
const finalSheetMeterFill = document.getElementById("final-sheet-meter-fill");
const finalSheetMeterPointer = document.getElementById("final-sheet-meter-pointer");
const finalSheetMeterMax = document.getElementById("final-sheet-meter-max");
const finalSheetMeterSegments = document.getElementById("final-sheet-meter-segments");
const finalSheetBtn = document.getElementById("final-sheet-btn");
const finalExitBtn = document.getElementById("final-exit-btn");
const globeContainer = document.getElementById("globe-viz");
const loadingEl = document.getElementById("boot-loader");
const gameSetupStart = document.getElementById("game-setup-start");

const REGION_LABELS = {
  world: "World",
  asia: "Asia",
  americas: "Americas",
  europe: "Europe",
  africa: "Africa",
  "east-hemisphere": "East Hemisphere",
  islands: "Islands",
  "us-states": "United States",
  "ca-provinces": "Canada",
  "us-ca": "US & Canada",
};

const CONNECTOR_LENGTH_OPTIONS = [5, 6, 8, 10, "any"];
const CONNECTOR_ENDPOINT_COLOR = "rgb(70, 140, 220)";
const CONNECTOR_ENDPOINT_STROKE = "#1e4a7a";
const CONNECTOR_GUESS_COLOR = "#f5c542";
const CONNECTOR_GUESS_STROKE = "#b8891a";

const CONNECTOR_MODE = {
  id: "connector",
  label: "Connector",
  summary:
    "Link two countries with the fewest border-to-border nations. Islands cannot be used. Up to 5,000 pts/round.",
  looseBorders: false,
  roundDistance: 0,
  showDistances: false,
  showDirection: false,
  autocomplete: true,
  radiusTool: false,
  maxGuesses: null,
  zones: null,
  flyGlobe: true,
  grayFill: false,
  pureDistance: false,
  maxRoundScore: CONNECTOR_MAX_ROUND_SCORE,
};

let countriesPack = null;
let countries = null;
let activePackId = "countries";
let globe = null;
let target = null;
let guesses = [];
let won = false;
let lost = false;
let activeSuggestion = -1;
let errorEl = null;
let submitting = false;
let gameStarted = false;
let regionSelectActive = false;
let multiplayerActive = false;
let multiplayerPhase = null;
let guestProfile = null;
let currentParty = null;
let partyCode = null;
let unsubscribeParty = null;
let partyBusy = false;
let guestPromptResolver = null;
let mpRoundHandledKey = null;
let mpBoardFingerprint = "";
let mpAdvancing = false;
let guessSort = "distance";
let distanceUnit = "km";
let radiusToolOn = false;
let radiusCircleState = null;
let lastRoundAward = null;
let awaitingNextRound = false;
let displayedTotal = 0;
let totalTweenRaf = null;
let lastGuessAnimKey = null;
const ROW_STAGGER_MS = [40, 70, 55, 90, 60, 75, 50, 85];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const START_DEMO_STATS = [
  { name: "Canada", label: "Most overconfident" },
  { name: "United States of America", label: "Most guessed" },
  { name: "Iceland", label: "Trickiest outline" },
  { name: "Spain", label: "Most first guessed" },
  { name: "Egypt", label: "Best comeback" },
  { name: "India", label: "Closest calls" },
  { name: "Japan", label: "Least guessed" },
];

function showStartDemoStats() {
  if (!globe || !countriesPack) return;
  const items = START_DEMO_STATS.map(({ name, label }) => {
    const country = countriesPack.lookup(name);
    if (!country?.centroid) return null;
    return {
      kind: "stat",
      name: country.name,
      label,
      lat: country.centroid.lat,
      lng: country.centroid.lng,
    };
  }).filter(Boolean);
  globe.setStartStats(items);
}

function clearScoreAnimations() {
  if (totalTweenRaf) {
    cancelAnimationFrame(totalTweenRaf);
    totalTweenRaf = null;
  }
  scorebarAwardEl.classList.remove("game__scorebar-award--pop", "game__scorebar-award--shake");
  scoreSheetRound.classList.remove("game__sheet--enter");
  scoreSheetFinal.classList.remove("game__sheet--enter");
  practiceEndEl.classList.remove("game__sheet--enter");
}

function triggerAwardMotion(isZero) {
  scorebarAwardEl.classList.remove("game__scorebar-award--pop", "game__scorebar-award--shake");
  void scorebarAwardEl.offsetWidth;
  const cls = isZero ? "game__scorebar-award--shake" : "game__scorebar-award--pop";
  scorebarAwardEl.classList.add(cls);
  const onEnd = () => {
    scorebarAwardEl.classList.remove(cls);
    scorebarAwardEl.removeEventListener("animationend", onEnd);
  };
  scorebarAwardEl.addEventListener("animationend", onEnd);
}

function setScorebarTotalInstant(total, max) {
  displayedTotal = total;
  scorebarTotalEl.textContent = formatScore(total);
  scorebarMaxEl.textContent = `of ${formatScore(max)}`;
}

function tweenScorebarTotal(from, to, max) {
  if (totalTweenRaf) {
    cancelAnimationFrame(totalTweenRaf);
    totalTweenRaf = null;
  }
  if (prefersReducedMotion() || from === to) {
    setScorebarTotalInstant(to, max);
    return;
  }

  const duration = 420;
  const start = performance.now();
  const delta = to - from;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    // Ease-out with a tiny overshoot so totals feel punchy, not floaty.
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + delta * eased);
    scorebarTotalEl.textContent = formatScore(value);
    scorebarMaxEl.textContent = `of ${formatScore(max)}`;
    if (t < 1) {
      totalTweenRaf = requestAnimationFrame(frame);
    } else {
      displayedTotal = to;
      totalTweenRaf = null;
    }
  }

  totalTweenRaf = requestAnimationFrame(frame);
}

function fillRoundsSubFlags(sub, result) {
  sub.replaceChildren();
  sub.classList.add("game__rounds-sub--flags");
  sub.title = result.country || "";

  if (result.catalogue === "connector") {
    sub.classList.add("game__rounds-sub--route");
    appendSheetFlag(sub, result.iso2, "game__rounds-flag");
    const arrow = document.createElement("span");
    arrow.className = "game__rounds-arrow";
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    sub.appendChild(arrow);
    appendSheetFlag(sub, result.iso2b, "game__rounds-flag");
    return;
  }

  appendSheetFlag(sub, result.iso2, "game__rounds-flag");
}

function renderScorebarRounds({ animateLatest = false } = {}) {
  if (!scorebarRoundsEl) return;
  const totalRounds = Math.max(1, activeSession.totalRounds || 1);
  const byRound = new Map(
    (activeSession.roundResults || []).map((r) => [r.round, r])
  );
  const highlightRound =
    lastRoundAward != null
      ? activeSession.roundResults?.[activeSession.roundResults.length - 1]?.round
      : activeSession.currentRound;

  scorebarRoundsEl.innerHTML = "";
  scorebarRoundsEl.style.setProperty("--round-count", String(totalRounds));

  for (let i = 1; i <= totalRounds; i++) {
    const result = byRound.get(i);
    const cell = document.createElement("div");
    cell.className = "game__rounds-cell";
    cell.dataset.round = String(i);

    if (result) cell.classList.add("game__rounds-cell--done");
    if (i === highlightRound) cell.classList.add("game__rounds-cell--active");
    if (!result && i === activeSession.currentRound && lastRoundAward == null) {
      cell.classList.add("game__rounds-cell--current");
    }
    if (result && !result.won && !result.multiWin) {
      cell.classList.add("game__rounds-cell--miss");
    }
    if (
      animateLatest &&
      result &&
      i === highlightRound &&
      !prefersReducedMotion()
    ) {
      cell.classList.add("game__rounds-cell--pop");
    }

    const label = document.createElement("span");
    label.className = "game__rounds-label";
    label.textContent = `R${i}`;

    const pts = document.createElement("span");
    pts.className = "game__rounds-pts";
    pts.textContent = result ? formatScore(result.score.total) : "—";

    const sub = document.createElement("span");
    sub.className = "game__rounds-sub";
    if (result) {
      fillRoundsSubFlags(sub, result);
    } else if (i === activeSession.currentRound && lastRoundAward == null) {
      sub.textContent = "now";
    } else {
      sub.textContent = "—";
    }

    cell.appendChild(label);
    cell.appendChild(pts);
    cell.appendChild(sub);
    scorebarRoundsEl.appendChild(cell);
  }
}

function setScoreMeter(elFill, elPointer, elMaxLabel, score, max, { animate = false, segmentsEl = null, segmentCount = 0 } = {}) {
  if (!elFill || !elPointer) return;
  const safeMax = Math.max(1, max || 1);
  const pct = Math.max(0, Math.min(100, (score / safeMax) * 100));
  if (elMaxLabel) elMaxLabel.textContent = `${formatScore(max)} pts`;

  if (segmentsEl) {
    const count = Math.max(0, Math.min(12, segmentCount || activeSession.totalRounds || 0));
    segmentsEl.innerHTML = "";
    if (count > 1) {
      for (let i = 1; i < count; i++) {
        const tick = document.createElement("span");
        tick.className = "game__sheet-meter-tick";
        tick.style.left = `${(i / count) * 100}%`;
        segmentsEl.appendChild(tick);
      }
    }
  }

  const apply = () => {
    elFill.style.width = `${pct}%`;
    elPointer.style.left = `${pct}%`;
  };

  if (animate && !prefersReducedMotion()) {
    elFill.style.width = "0%";
    elPointer.style.left = "0%";
    void elFill.offsetWidth;
    apply();
  } else {
    apply();
  }
}

function appendSheetFlag(container, iso2, className = "game__sheet-flag") {
  const flagSrc = flagUrl(iso2);
  if (!flagSrc) return;
  const flag = document.createElement("img");
  flag.className = className;
  flag.src = flagSrc;
  flag.alt = "";
  flag.width = className === "game__rounds-flag" ? 20 : 40;
  flag.height = className === "game__rounds-flag" ? 15 : 30;
  flag.loading = "lazy";
  flag.decoding = "async";
  flag.addEventListener("error", () => flag.remove());
  container.appendChild(flag);
}

function renderCountryBlock(container, name, iso2, iso2b = null) {
  container.innerHTML = "";
  if (iso2b) {
    const start = document.createElement("span");
    start.className = "game__sheet-route-side";
    appendSheetFlag(start, iso2);
    const startName = document.createElement("span");
    startName.className = "game__sheet-country-name";
    startName.textContent = String(name).split("→")[0].trim() || name;
    start.appendChild(startName);

    const arrow = document.createElement("span");
    arrow.className = "game__sheet-route-arrow";
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");

    const end = document.createElement("span");
    end.className = "game__sheet-route-side";
    appendSheetFlag(end, iso2b);
    const endName = document.createElement("span");
    endName.className = "game__sheet-country-name";
    endName.textContent = String(name).split("→")[1]?.trim() || "";
    end.appendChild(endName);

    container.classList.add("game__sheet-country--route");
    container.appendChild(start);
    container.appendChild(arrow);
    container.appendChild(end);
    return;
  }

  container.classList.remove("game__sheet-country--route");
  appendSheetFlag(container, iso2);
  const label = document.createElement("span");
  label.className = "game__sheet-country-name";
  label.textContent = name;
  container.appendChild(label);
}

function playScorePunch(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove("game__sheet-score-value--punch");
  void el.offsetWidth;
  el.classList.add("game__sheet-score-value--punch");
  const onEnd = () => {
    el.classList.remove("game__sheet-score-value--punch");
    el.removeEventListener("animationend", onEnd);
  };
  el.addEventListener("animationend", onEnd);
}

function clearMaxRoundFx() {
  if (roundSheetMaxBadge) {
    roundSheetMaxBadge.hidden = true;
    roundSheetMaxBadge.textContent = "";
    roundSheetMaxBadge.className = "game__sheet-max-badge";
  }
  if (roundSheetScoreEl) {
    roundSheetScoreEl.classList.remove(
      "game__sheet-score--maxed",
      "game__sheet-score--perfect"
    );
  }
  if (roundSheetPoints) {
    roundSheetPoints.classList.remove(
      "game__sheet-score-value--maxed",
      "game__sheet-score-value--perfect"
    );
  }
  if (scorebarAwardEl) {
    scorebarAwardEl.classList.remove(
      "game__scorebar-award--maxed",
      "game__scorebar-award--perfect"
    );
  }
}

function playMaxRoundFx(score) {
  if (!score || (!score.maxed && !score.perfectClear)) {
    clearMaxRoundFx();
    return;
  }

  const perfect = Boolean(score.perfectClear);
  if (roundSheetScoreEl) {
    roundSheetScoreEl.classList.remove(
      "game__sheet-score--maxed",
      "game__sheet-score--perfect"
    );
    void roundSheetScoreEl.offsetWidth;
    roundSheetScoreEl.classList.add(
      perfect ? "game__sheet-score--perfect" : "game__sheet-score--maxed"
    );
  }

  if (roundSheetPoints) {
    roundSheetPoints.classList.toggle("game__sheet-score-value--perfect", perfect);
    roundSheetPoints.classList.toggle("game__sheet-score-value--maxed", !perfect);
  }

  if (roundSheetMaxBadge) {
    roundSheetMaxBadge.hidden = false;
    roundSheetMaxBadge.textContent = perfect ? "Perfect" : "Max round";
    roundSheetMaxBadge.className = perfect
      ? "game__sheet-max-badge game__sheet-max-badge--perfect"
      : "game__sheet-max-badge game__sheet-max-badge--maxed";
    if (!prefersReducedMotion()) {
      roundSheetMaxBadge.classList.remove("game__sheet-max-badge--stamp");
      void roundSheetMaxBadge.offsetWidth;
      roundSheetMaxBadge.classList.add("game__sheet-max-badge--stamp");
    }
  }

  if (scorebarAwardEl && !scorebarAwardEl.hidden) {
    scorebarAwardEl.classList.toggle("game__scorebar-award--perfect", perfect);
    scorebarAwardEl.classList.toggle("game__scorebar-award--maxed", !perfect);
  }
}

function playSheetEnter(sheetEl) {
  sheetEl.classList.remove("game__sheet--enter");
  if (prefersReducedMotion()) return;
  void sheetEl.offsetWidth;
  sheetEl.classList.add("game__sheet--enter");
  const onEnd = () => {
    sheetEl.classList.remove("game__sheet--enter");
    sheetEl.removeEventListener("animationend", onEnd);
  };
  sheetEl.addEventListener("animationend", onEnd);
}

let activeSession = {
  region: "world",
  level: "easy",
  timerSec: 0,
  mode: getLevelMode("easy"),
  isPractice: true,
  totalRounds: 1,
  currentRound: 1,
  roundResults: [],
  totalScore: 0,
  multiMode: null,
  allCountries: false,
};

const playSetup = {
  catalogue: "countries",
  region: "world",
  level: "easy",
  rounds: 5,
  timer: 0,
  allCountries: false,
  connectorLength: 5,
};

const HOVER_ACTIVATE_MS = 300;
const HOVER_CLEAR_MS = 220;

let hoverActivateTimer = null;
let hoverClearTimer = null;
let timerInterval = null;
let timerRemainingMs = 0;
let timerStarted = false;

const USA_COUNTRY_NAME = "United States of America";
const CANADA_COUNTRY_NAME = "Canada";
const CONUS_CENTROID = { lat: 39.5, lng: -98.35 };
const CANADA_CENTROID = { lat: 56.1, lng: -96.5 };

const US_CA_CENTROID = { lat: 48, lng: -96 };

const ADMIN_PACKS = {
  "us-states": {
    load: loadUsStates,
    countryNames: [USA_COUNTRY_NAME],
    label: "United States",
  },
  "ca-provinces": {
    load: loadCaProvinces,
    countryNames: [CANADA_COUNTRY_NAME],
    label: "Canada",
  },
  "us-ca": {
    load: loadUsCa,
    countryNames: [USA_COUNTRY_NAME, CANADA_COUNTRY_NAME],
    label: "US & Canada",
  },
};

function decorateCountriesPackForAdminPreview(pack) {
  pack.regionMembers.set("us-states", new Set([USA_COUNTRY_NAME]));
  pack.regionMembers.set("ca-provinces", new Set([CANADA_COUNTRY_NAME]));
  pack.regionMembers.set(
    "us-ca",
    new Set([USA_COUNTRY_NAME, CANADA_COUNTRY_NAME])
  );
  pack.regionCentroids.set("us-states", CONUS_CENTROID);
  pack.regionCentroids.set("ca-provinces", CANADA_CENTROID);
  pack.regionCentroids.set("us-ca", US_CA_CENTROID);
}

function buildAdminGameFeatures(adminPack, countryNames) {
  const strip = new Set(countryNames);
  const worldRest = countriesPack.features.filter(
    (feat) => !strip.has(feat.properties?.name || "")
  );
  return [...worldRest, ...adminPack.features];
}

function gameTransitionOptions(region) {
  return { region: region || "world" };
}

function updateGuessPlaceholder() {
  if (isConnectorSession() || playSetup.catalogue === "connector") {
    input.placeholder = "Enter a connecting country";
    return;
  }
  const region = activeSession?.region || playSetup?.region;
  if (region === "us-states") {
    input.placeholder = "Enter state name here";
  } else if (region === "ca-provinces") {
    input.placeholder = "Enter province name here";
  } else if (region === "us-ca") {
    input.placeholder = "Enter state or province name here";
  } else {
    input.placeholder = "Enter country name here";
  }
}

function distancePackForRegion(region) {
  return region === "us-states" ||
    region === "ca-provinces" ||
    region === "us-ca"
    ? DISTANCE_PACK_US
    : DISTANCE_PACK_WORLD;
}

function currentDistancePack() {
  return distancePackForRegion(activeSession?.region || playSetup?.region);
}

function fillColor(mode, km, correct) {
  return guessFillColor(mode, km, correct, currentDistancePack());
}

function isAdminRegion(region) {
  return Boolean(ADMIN_PACKS[region]);
}

function isProvinceListRegion(region) {
  return region === "provinces" || isAdminRegion(region);
}

/** UN-only pool when "All countries" is off (ignored for admin packs). */
function useUnOnly(region = activeSession?.region || playSetup?.region) {
  if (isAdminRegion(region)) return false;
  const all = gameStarted
    ? Boolean(activeSession.allCountries)
    : Boolean(playSetup.allCountries);
  return !all;
}

function poolOpts(region) {
  return { unOnly: useUnOnly(region) };
}

function setAllCountriesSwitch(on) {
  playSetup.allCountries = Boolean(on);
  setupAllCountriesBtn.setAttribute("aria-checked", playSetup.allCountries ? "true" : "false");
  setupPoolHint.textContent = playSetup.allCountries
    ? "On — every country & territory can appear."
    : "Off — UN countries only (~194).";
  if (countriesPack) countriesPack.connectorIndex = null;
}

function updateSetupPoolVisibility() {
  const admin = isAdminRegion(playSetup.region);
  setupPoolGroup.hidden = admin;
  if (admin) return;
  setAllCountriesSwitch(playSetup.allCountries);
}

async function setActivePack(packId) {
  if (!globe) return null;

  const admin = ADMIN_PACKS[packId];
  if (admin) {
    if (activePackId === packId && countries?.packId === packId) {
      return countries;
    }
    const pack = await admin.load();
    countries = pack;
    activePackId = packId;
    globe.setGeography({
      features: buildAdminGameFeatures(pack, admin.countryNames),
      regionMembers: pack.regionMembers,
      regionCentroids: pack.regionCentroids,
    });
    return pack;
  }

  if (!countriesPack) return null;
  if (activePackId === "countries" && countries === countriesPack) {
    return countriesPack;
  }
  countries = countriesPack;
  activePackId = "countries";
  globe.setGeography({
    features: countriesPack.features,
    regionMembers: countriesPack.regionMembers,
    regionCentroids: countriesPack.regionCentroids,
  });
  return countriesPack;
}

function resetProvincePickerUi({ showRegions = false, fromParty = false } = {}) {
  regionPicker.classList.remove(
    "region-picker--provinces",
    "region-picker--detail",
    "region-picker--regions",
    "region-picker--party"
  );
  provinceList.setAttribute("aria-hidden", "true");
  regionDetail.setAttribute("aria-hidden", "true");
  if (showRegions) {
    regionPicker.classList.add("region-picker--regions");
    if (fromParty) regionPicker.classList.add("region-picker--party");
    modeCatalogue.setAttribute("aria-hidden", "true");
    regionList.setAttribute("aria-hidden", "false");
    if (regionListHeader) {
      regionListHeader.hidden = Boolean(fromParty);
    }
  } else {
    modeCatalogue.setAttribute("aria-hidden", "false");
    regionList.setAttribute("aria-hidden", "true");
    if (regionListHeader) regionListHeader.hidden = false;
  }
}

function openCountriesCatalogue() {
  cancelRegionHoverTimers();
  playSetup.catalogue = "countries";
  regionPicker.classList.remove("region-picker--provinces", "region-picker--detail", "region-picker--party");
  regionPicker.classList.add("region-picker--regions");
  modeCatalogue.setAttribute("aria-hidden", "true");
  regionList.setAttribute("aria-hidden", "false");
  provinceList.setAttribute("aria-hidden", "true");
  regionDetail.setAttribute("aria-hidden", "true");
  if (regionListHeader) regionListHeader.hidden = false;
  updateSetupCatalogueUi();
  globe?.clearHoveredRegion({ restoreView: true });
}

function openConnectorSetup() {
  if (!globe) return;
  cancelRegionHoverTimers();
  playSetup.catalogue = "connector";
  playSetup.region = "world";
  regionDetailTitle.textContent = "Connector";
  regionDetailClose.setAttribute("aria-label", "Back to catalogues");
  regionDetail.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  provinceList.setAttribute("aria-hidden", "true");
  modeCatalogue.setAttribute("aria-hidden", "true");
  regionPicker.classList.remove("region-picker--regions", "region-picker--provinces", "region-picker--party");
  regionPicker.classList.add("region-picker--detail");
  updateSetupCatalogueUi();
  updateSetupHostGate();
  setActivePack("countries").catch((err) => console.error(err));
  globe.clearHoveredRegion({ restoreView: true });
  // Warm border graph in the background.
  ensureBordersReady().catch((err) => console.error(err));
}

function closeCountriesCatalogue() {
  cancelRegionHoverTimers();
  playSetup.catalogue = "countries";
  regionPicker.classList.remove(
    "region-picker--regions",
    "region-picker--provinces",
    "region-picker--detail",
    "region-picker--party"
  );
  modeCatalogue.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  provinceList.setAttribute("aria-hidden", "true");
  regionDetail.setAttribute("aria-hidden", "true");
  updateSetupCatalogueUi();
  globe?.clearHoveredRegion({ restoreView: true });
}

function cancelRegionHoverTimers() {
  clearTimeout(hoverActivateTimer);
  clearTimeout(hoverClearTimer);
  hoverActivateTimer = null;
  hoverClearTimer = null;
}

function scheduleRegionActivate(region) {
  cancelRegionHoverTimers();
  hoverActivateTimer = setTimeout(() => {
    if (!globe || !regionSelectActive || regionPicker.classList.contains("region-picker--detail")) {
      return;
    }
    if (regionPicker.classList.contains("region-picker--provinces") && !isProvinceListRegion(region)) {
      return;
    }
    activateRegionPreview(region).catch((err) => console.error(err));
  }, HOVER_ACTIVATE_MS);
}

async function activateRegionPreview(region) {
  if (!globe || !regionSelectActive) return;
  await setActivePack("countries");
  if (!regionSelectActive) return;
  // Provinces list itself stays normal; only a country option brightens that country.
  if (region === "provinces") {
    globe.clearHoveredRegion({ restoreView: true });
    return;
  }
  if (isAdminRegion(region)) {
    globe.setHoveredRegion(region);
    return;
  }
  globe.setHoveredRegion(region);
}

function scheduleRegionHighlightClear() {
  clearTimeout(hoverActivateTimer);
  hoverActivateTimer = null;
  clearTimeout(hoverClearTimer);
  hoverClearTimer = setTimeout(() => {
    if (!globe || !regionSelectActive || regionPicker.classList.contains("region-picker--detail")) {
      return;
    }
    globe.clearRegionHighlight();
    // In the provinces list, also return the camera to the default select view.
    if (regionPicker.classList.contains("region-picker--provinces")) {
      globe.clearHoveredRegion({ restoreView: true });
      return;
    }
    setActivePack("countries").catch((err) => console.error(err));
  }, HOVER_CLEAR_MS);
}

function createStars() {
  const count = 90;
  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "stars__star";
    const size = Math.random() * 2.2 + 0.6;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 4}s`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    starsEl.appendChild(star);
  }
}

function showError(msg) {
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.className = "game__error";
    hintEl.insertAdjacentElement("afterend", errorEl);
  }
  errorEl.textContent = msg;
}

function clearError() {
  if (errorEl) errorEl.textContent = "";
}

function hideSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = "";
  activeSuggestion = -1;
}

function currentMode() {
  if (activeSession?.catalogue === "connector") return CONNECTOR_MODE;
  return activeSession.mode;
}

function isConnectorSession() {
  return activeSession?.catalogue === "connector";
}

function connectorLengthLabel(value = playSetup.connectorLength) {
  return value === "any" ? "Any" : String(value);
}

function syncConnectorLengthUi() {
  if (!setupConnectorLength) return;
  const idx = CONNECTOR_LENGTH_OPTIONS.indexOf(playSetup.connectorLength);
  setupConnectorLength.value = String(idx >= 0 ? idx : 0);
  if (setupConnectorHint) {
    const label = connectorLengthLabel();
    setupConnectorHint.textContent =
      label === "Any"
        ? "Find the fewest border-to-border countries linking two nations. Any chain length."
        : `Find the fewest border-to-border countries linking two nations. Target chain: ${label}.`;
  }
}

function updateSetupCatalogueUi() {
  const connector = playSetup.catalogue === "connector";
  if (setupLevelGroup) setupLevelGroup.hidden = connector;
  if (setupConnectorGroup) setupConnectorGroup.hidden = !connector;
  if (connector) syncConnectorLengthUi();
  updateSetupHints();
  updateSetupPoolVisibility();
}

function formatRadiusReadout(km) {
  return `${formatDistance(km, distanceUnit)} ${distanceUnitLabel(distanceUnit)}`;
}

function syncRadiusUi(circle) {
  radiusCircleState = circle && circle.radiusKm > 0 ? circle : null;
  const has = Boolean(radiusCircleState);
  radiusClearBtn.hidden = !has;
  if (has) {
    radiusReadout.hidden = false;
    radiusReadout.textContent = formatRadiusReadout(radiusCircleState.radiusKm);
  } else {
    radiusReadout.hidden = true;
    radiusReadout.textContent = "";
  }
}

function setRadiusToolOn(on) {
  radiusToolOn = Boolean(on) && gameStarted && currentMode().radiusTool;
  radiusToolBtn.classList.toggle("game__tools-btn--active", radiusToolOn);
  radiusToolBtn.setAttribute("aria-pressed", String(radiusToolOn));
  globe?.setRadiusToolActive(radiusToolOn);
}

function updateRadiusTools() {
  const show = gameStarted && Boolean(currentMode().radiusTool);
  gameTools.hidden = !show;
  if (!show) {
    setRadiusToolOn(false);
    syncRadiusUi(null);
  }
}

function gameEnded() {
  return won || lost;
}

function usedTargetNames() {
  if (isConnectorSession()) {
    return activeSession.roundResults.map((r) => r.pairKey).filter(Boolean);
  }
  return activeSession.roundResults.map((r) => r.country);
}

function sessionMaxScore() {
  const maxRound = isConnectorSession()
    ? CONNECTOR_MAX_ROUND_SCORE
    : currentMode().maxRoundScore;
  return maxSessionScore(
    maxRound,
    activeSession.totalRounds,
    activeSession.timerSec
  );
}

function formatTimer(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!activeSession.timerSec) {
    gameTimerEl.hidden = true;
    return;
  }
  gameTimerEl.hidden = false;
  gameTimerEl.textContent = timerStarted
    ? `Time ${formatTimer(timerRemainingMs)}`
    : `Timer ${formatTimer(activeSession.timerSec * 1000)}`;
  gameTimerEl.classList.toggle(
    "game__status-item--urgent",
    timerStarted && timerRemainingMs <= 10000
  );
}

function updateGuessesLeftDisplay() {
  const max = currentMode().maxGuesses;
  if (!max) {
    guessesLeftEl.hidden = true;
    return;
  }
  const left = Math.max(0, max - guesses.length);
  guessesLeftEl.hidden = false;
  guessesLeftEl.textContent = `Guesses left: ${left}`;
  guessesLeftEl.classList.toggle("game__status-item--urgent", left <= 2 && !won);
}

function updateStatusBar() {
  const showGuesses = Boolean(currentMode().maxGuesses);
  const showTimer = activeSession.timerSec > 0;
  gameStatusEl.hidden = !(showGuesses || showTimer);
  updateGuessesLeftDisplay();
  updateTimerDisplay();
}

function updateModeLabel() {
  if (activeSession.isPractice) {
    gameModeEl.textContent = "You are playing a practice game.";
    return;
  }
  if (isConnectorSession()) {
    const len = connectorLengthLabel(activeSession.connectorLength);
    const timerPart = activeSession.timerSec ? ` · ${activeSession.timerSec}s` : "";
    gameModeEl.textContent = `Connector · chain ${len}${timerPart}`;
    return;
  }
  const region = REGION_LABELS[activeSession.region] || activeSession.region;
  const level = currentMode().label;
  const timerPart = activeSession.timerSec ? ` · ${activeSession.timerSec}s` : "";
  const modePart =
    activeSession.multiMode === "teams"
      ? " · Teams"
      : activeSession.multiMode === "pvp"
        ? " · PvP"
        : activeSession.multiMode === "coop"
          ? " · Co-op"
          : "";
  gameModeEl.textContent = `${region} · ${level}${timerPart}${modePart}`;
}

function isPartyHost() {
  return Boolean(guestProfile && currentParty && currentParty.hostId === guestProfile.id);
}

function isMultiplayerMatch() {
  return Boolean(multiplayerActive && activeSession.multiMode && !activeSession.isPractice);
}

function isCompetitiveMulti() {
  return activeSession.multiMode === "pvp" || activeSession.multiMode === "teams";
}

function updateSetupHostGate() {
  if (!setupHostWaitEl || !gameSetupStart) return;
  if (!multiplayerActive || multiplayerPhase !== "setup") {
    setupHostWaitEl.hidden = true;
    gameSetupStart.hidden = false;
    gameSetupStart.disabled = false;
    gameSetupStart.textContent = "Start game";
    return;
  }
  if (isPartyHost()) {
    setupHostWaitEl.hidden = true;
    gameSetupStart.hidden = false;
    gameSetupStart.disabled = false;
    gameSetupStart.textContent = "Start game";
  } else {
    gameSetupStart.hidden = true;
    gameSetupStart.disabled = true;
    setupHostWaitEl.hidden = false;
  }
}

function seatById(playerId) {
  return (currentParty?.seats || []).find((s) => s && s.id === playerId) || null;
}

function buildSharedTargets(region, rounds) {
  const names = [];
  const opts = poolOpts(region);
  for (let i = 0; i < rounds; i += 1) {
    const country = countries.randomTarget(region, names, opts);
    names.push(country.name);
  }
  return names;
}

function guessFingerprint(game) {
  if (!game?.players) return "";
  return Object.entries(game.players)
    .map(([id, p]) => `${id}:${(p.guesses || []).map((g) => g.name).join(",")}:${p.bestKm}:${p.eliminated}`)
    .join("|");
}

function collectBoardGuesses(game) {
  const mode = currentMode();
  const list = [];
  Object.entries(game.players || {}).forEach(([playerId, player]) => {
    (player.guesses || []).forEach((g, index) => {
      const country = countries.lookup(g.name);
      if (!country) return;
      const correct = Boolean(g.correct) || (target && g.name === target.name);
      const distance = typeof g.km === "number" ? g.km : 0;
      list.push({
        name: country.name,
        iso2: country.iso2,
        distance,
        direction: "",
        color: fillColor(mode, distance, correct),
        correct,
        centroid: country.centroid,
        orderIndex: index,
        playerId,
        playerName: player.name,
        playerColor: player.color,
        at: g.at || 0,
      });
    });
  });
  return list;
}

function visiblePlayerGuesses(game) {
  const all = collectBoardGuesses(game);
  if (!isCompetitiveMulti()) return all;
  if (game.status === "finished") return all;
  const myId = guestProfile?.id;
  return all.filter((g) => g.playerId === myId);
}

function buildMarkerGroups(game) {
  const byCountry = new Map();
  const showAll = !isCompetitiveMulti() || game.status === "finished";
  const myId = guestProfile?.id;

  Object.entries(game.players || {}).forEach(([playerId, player]) => {
    if (!showAll && playerId !== myId) return;
    (player.guesses || []).forEach((g) => {
      const country = countries.lookup(g.name);
      if (!country) return;
      if (!byCountry.has(country.name)) {
        byCountry.set(country.name, {
          name: country.name,
          lat: country.centroid.lat,
          lng: country.centroid.lng,
          players: [],
        });
      }
      const group = byCountry.get(country.name);
      if (!group.players.some((p) => p.id === playerId)) {
        group.players.push({
          id: playerId,
          name: player.name,
          color: player.color,
        });
      }
    });
  });
  if ((game.status === "roundEnd" || game.status === "finished") && target && game.roundWinnerId) {
    const winner = game.players?.[game.roundWinnerId];
    if (winner) {
      if (!byCountry.has(target.name)) {
        byCountry.set(target.name, {
          name: target.name,
          lat: target.centroid.lat,
          lng: target.centroid.lng,
          players: [],
        });
      }
      const group = byCountry.get(target.name);
      if (!group.players.some((p) => p.id === game.roundWinnerId)) {
        group.players.push({
          id: game.roundWinnerId,
          name: winner.name,
          color: winner.color,
        });
      }
    }
  }
  return [...byCountry.values()];
}

function paintBoardFromGame(game) {
  const mode = currentMode();
  const painted = new Map();
  visiblePlayerGuesses(game).forEach((guess) => {
    const prev = painted.get(guess.name);
    if (!prev || guess.correct || guess.distance < prev.distance) {
      painted.set(guess.name, guess);
    }
  });
  const entries = [...painted.values()].map((guess) => ({
    name: guess.name,
    color: fillColor(mode, guess.distance, guess.correct),
    stroke: guessStrokeColor(mode, guess.correct),
  }));
  if (game.status === "roundEnd" && target) {
    entries.push({
      name: target.name,
      color: "rgb(70, 140, 220)",
      stroke: "#1e4a7a",
    });
  }
  if (typeof globe.setGuesses === "function") {
    globe.setGuesses(entries);
  } else {
    globe.clearGuesses();
    entries.forEach((entry) => globe.setGuess(entry.name, entry.color, entry.stroke));
  }
  globe.setPlayerMarkers(buildMarkerGroups(game));
}

function updateRivalsHud(game) {
  if (!mpRivalsEl) return;
  if (!isMultiplayerMatch() || !isCompetitiveMulti() || !game || game.status !== "playing") {
    mpRivalsEl.hidden = true;
    mpRivalsEl.innerHTML = "";
    return;
  }

  const mode = currentMode();
  const myId = guestProfile?.id;
  const chips = [];
  Object.entries(game.players || {}).forEach(([id, player]) => {
    if (id === myId) return;
    const label =
      player.bestKm == null
        ? "—"
        : distanceLabel(mode, player.bestKm, distanceUnit, "") || "Hidden";
    chips.push({
      id,
      name: player.name,
      color: player.color,
      team: player.team || null,
      label,
    });
  });

  if (!chips.length) {
    mpRivalsEl.hidden = true;
    mpRivalsEl.innerHTML = "";
    return;
  }

  mpRivalsEl.hidden = false;
  mpRivalsEl.innerHTML = "";
  chips.forEach((chip) => {
    const el = document.createElement("div");
    el.className = "mp-rivals__chip";
    const avatar = document.createElement("span");
    avatar.className = "mp-rivals__avatar";
    avatar.style.background = chip.color;
    avatar.textContent = chip.name.charAt(0).toUpperCase();
    const name = document.createElement("span");
    name.textContent =
      activeSession.multiMode === "teams" && chip.team
        ? `${chip.name} · ${chip.team}`
        : chip.name;
    const dist = document.createElement("span");
    dist.className = "mp-rivals__dist";
    dist.textContent = chip.label;
    el.appendChild(avatar);
    el.appendChild(name);
    el.appendChild(dist);
    mpRivalsEl.appendChild(el);
  });
}

function syncLocalGuessesFromGame(game) {
  const mode = currentMode();
  if (activeSession.multiMode === "coop" || game.status === "finished") {
    guesses = collectBoardGuesses(game).map((g, index) => ({
      ...g,
      orderIndex: index,
    }));
  } else {
    const mine = game.players?.[guestProfile?.id];
    guesses = (mine?.guesses || []).map((g, index) => {
      const country = countries.lookup(g.name);
      const correct = Boolean(g.correct) || (target && g.name === target.name);
      const distance = typeof g.km === "number" ? g.km : 0;
      return {
        name: g.name,
        iso2: country?.iso2 || "",
        distance,
        direction: "",
        color: fillColor(mode, distance, correct),
        correct,
        centroid: country?.centroid || { lat: 0, lng: 0 },
        orderIndex: index,
        playerId: guestProfile?.id,
        playerName: mine?.name,
        playerColor: mine?.color,
      };
    });
  }
  if (game.status === "roundEnd" || game.status === "finished") {
    ensureAnswerInGuesses();
  }
  renderGuesses();
  updateGuessesLeftDisplay();
}

function showMultiplayerRoundSheet(game) {
  const winnerId = game.roundWinnerId;
  const winner = winnerId ? game.players?.[winnerId] : null;
  const iWon = winnerId && winnerId === guestProfile?.id;
  const myPlayer = game.players?.[guestProfile?.id];
  const myTeam = myPlayer?.team;
  const winnerTeam = winner?.team;
  const teamWon =
    activeSession.multiMode === "teams" &&
    Boolean(winnerId && myTeam && winnerTeam && myTeam === winnerTeam);
  const myGuesses = myPlayer?.guesses || [];
  const guessCount = myGuesses.length;

  const remainingForScore =
    (iWon || teamWon) && timerStarted ? timerRemainingMs : 0;
  const scored = scoreRound({
    guessCount: iWon || teamWon ? guessCount : myGuesses.length,
    won: Boolean(iWon || teamWon),
    maxRoundScore: currentMode().maxRoundScore,
    timerSec: activeSession.timerSec,
    remainingMs: remainingForScore,
  });

  if (activeSession.multiMode === "coop") {
    const anyWon = Boolean(winnerId);
    const result = {
      round: game.currentRound,
      country: target.name,
      iso2: target.iso2,
      guesses: collectBoardGuesses(game).length,
      won: anyWon,
      timedOut: false,
      score: anyWon
        ? scoreRound({
            guessCount: collectBoardGuesses(game).length,
            won: true,
            maxRoundScore: currentMode().maxRoundScore,
            timerSec: activeSession.timerSec,
            remainingMs: 0,
          })
        : scored,
      multiStatus: iWon
        ? "Found it"
        : winner
          ? `${winner.name} found it`
          : "Nobody found it",
      multiWin: anyWon,
    };
    if (!activeSession.roundResults.some((r) => r.round === result.round)) {
      activeSession.roundResults.push(result);
      activeSession.totalScore += result.score.total;
      lastRoundAward = result.score.total;
    }
    updateScorebar({ animateAward: true });
    showRoundSheet(result);
    return;
  }

  if (activeSession.multiMode === "teams") {
    const firebasePoints = Number(myPlayer?.roundScore) || 0;
    const teamScore = {
      total: teamWon ? firebasePoints : 0,
      base: teamWon ? firebasePoints : 0,
      bonus: 0,
    };
    const result = {
      round: game.currentRound,
      country: target.name,
      iso2: target.iso2,
      guesses: guessCount,
      won: Boolean(teamWon),
      timedOut: false,
      score: teamScore,
      multiStatus: iWon
        ? "Found it"
        : teamWon
          ? `${winner.name} scored for your team`
          : winner
            ? `Team ${winnerTeam} scored · ${winner.name}`
            : "Nobody found it",
      multiWin: Boolean(teamWon),
    };
    if (!activeSession.roundResults.some((r) => r.round === result.round)) {
      activeSession.roundResults.push(result);
      activeSession.totalScore += teamScore.total;
      lastRoundAward = teamScore.total;
    }
    updateScorebar({ animateAward: true });
    showRoundSheet(result);
    return;
  }

  const result = {
    round: game.currentRound,
    country: target.name,
    iso2: target.iso2,
    guesses: guessCount,
    won: Boolean(iWon),
    timedOut: false,
    score: scored,
    multiStatus: iWon
      ? "Found it"
      : winner
        ? `${winner.name} beat you to it`
        : "Nobody found it",
    multiWin: Boolean(iWon),
  };
  if (!activeSession.roundResults.some((r) => r.round === result.round)) {
    activeSession.roundResults.push(result);
    activeSession.totalScore += scored.total;
    lastRoundAward = scored.total;
  }
  updateScorebar({ animateAward: true });
  showRoundSheet(result);
}

async function maybeEndRoundIfAllEliminated(game) {
  if (!game || game.status !== "playing" || !isPartyHost()) return;
  const players = Object.values(game.players || {});
  if (!players.length) return;
  if (!players.every((p) => p.eliminated)) return;
  try {
    await endRoundNoWinner(partyCode);
  } catch (err) {
    console.error(err);
  }
}

function beginMultiplayerGame(game) {
  if (!countriesPack || !globe || !game) return;

  ensurePackForRegion(game.region)
    .then(() => {
      startMultiplayerGameUi(game);
    })
    .catch((err) => {
      console.error(err);
      showError("Failed to load map data for this game.");
    });
}

async function ensurePackForRegion(region) {
  if (isAdminRegion(region)) {
    await setActivePack(region);
  } else {
    await setActivePack("countries");
  }
}

function startMultiplayerGameUi(game) {
  if (!countries || !globe || !game) return;

  multiplayerActive = true;
  multiplayerPhase = "playing";
  mpRoundHandledKey = null;
  mpBoardFingerprint = "";

  const alreadyInGameUi = gameStarted && app.classList.contains("app--game");
  if (!alreadyInGameUi) {
    gameStarted = true;
    regionSelectActive = false;
    playScreenBack.hidden = true;
    gameExitBtn.hidden = false;
    app.classList.remove("app--start", "app--region-select", "app--multiplayer");
    app.classList.add("app--game");
    gamePanel.hidden = false;
    guessesPanel.hidden = false;
    regionPicker.hidden = true;
    multiplayerLobby.hidden = true;
    multiplayerMode.hidden = true;
    multiplayerPvpFormat.hidden = true;
    multiplayerTeams.hidden = true;
    closeRegionDetail({ restoreProvinces: false });
    resetProvincePickerUi();
    globeStage.removeAttribute("role");
    globeStage.removeAttribute("tabindex");
    globeStage.removeAttribute("aria-label");
    globe.transitionToGame(1300, gameTransitionOptions(game.region));
    setTimeout(() => input.focus(), 1350);
  }

  const multiMode =
    game.mode || currentParty?.mode || activeSession.multiMode || null;

  activeSession = {
    region: game.region,
    level: game.level,
    timerSec: game.timerSec,
    mode: getLevelMode(game.level),
    isPractice: false,
    totalRounds: game.rounds,
    currentRound: game.currentRound,
    roundResults: alreadyInGameUi ? activeSession.roundResults : [],
    totalScore: alreadyInGameUi ? activeSession.totalScore : 0,
    multiMode,
    allCountries: Boolean(game.allCountries),
  };

  if (guestProfile?.id && game.players && !game.players[guestProfile.id]) {
    showError("You were not added to this game. Leave and rejoin the party.");
  }

  startMultiplayerRound(game);
  updateGuessPlaceholder();
}

function startMultiplayerRound(game) {
  stopTimer();
  timerStarted = false;
  timerRemainingMs = activeSession.timerSec * 1000;
  awaitingNextRound = false;
  clearScoreAnimations();

  const targetName = game.targets[game.currentRound - 1];
  target = countries.lookup(targetName);
  if (!target) {
    showError("Shared target missing. Ask host to restart.");
    return;
  }

  guesses = [];
  won = false;
  lost = false;
  submitting = false;
  mpRoundHandledKey = null;
  mpBoardFingerprint = "";
  globe.clearGuesses();
  if (isAdminRegion(activeSession.region)) {
    globe.setHoveredRegion(activeSession.region, { locked: true });
  }
  globe.setRadiusCircle(null);
  globe.clearPlayerMarkers();
  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  hideAllSheets();
  setPromptVisible(true);
  hintEl.classList.remove("game__hint--hidden");
  clearError();
  hideSuggestions();
  renderGuesses();
  paintBoardFromGame(game);
  syncLocalGuessesFromGame(game);
  updateRivalsHud(game);
  updateModeLabel();
  updateStatusBar();
  updateScorebar();
  updateRadiusTools();
}

function applyMultiplayerGameSnapshot(game) {
  if (!game) return;
  if (!multiplayerActive) {
    if (!partyCode) return;
    multiplayerActive = true;
  }

  if (game.status === "finished") {
    if (gameStarted) {
      stopTimer();
      input.disabled = true;
      enterBtn.disabled = true;
      paintBoardFromGame(game);
      syncLocalGuessesFromGame(game);
      updateRivalsHud(game);
      if (!awaitingNextRound) showFinalSheet();
    }
    return;
  }

  if (!gameStarted || activeSession.multiMode == null || !app.classList.contains("app--game")) {
    beginMultiplayerGame(game);
    return;
  }

  if (activeSession.currentRound !== game.currentRound && game.status === "playing") {
    activeSession.currentRound = game.currentRound;
    lastRoundAward = null;
    startMultiplayerRound(game);
    setTimeout(() => input.focus(), 50);
    return;
  }

  const fingerprint = `${game.status}|${game.currentRound}|${game.roundWinnerId}|${guessFingerprint(game)}`;
  if (fingerprint !== mpBoardFingerprint) {
    mpBoardFingerprint = fingerprint;
    paintBoardFromGame(game);
    syncLocalGuessesFromGame(game);
    updateRivalsHud(game);
  }

  if (game.status === "roundEnd") {
    const key = `${game.currentRound}:${game.roundWinnerId || "none"}`;
    if (mpRoundHandledKey !== key) {
      mpRoundHandledKey = key;
      won = game.roundWinnerId === guestProfile?.id;
      lost = !won;
      stopTimer();
      input.disabled = true;
      enterBtn.disabled = true;
      hideSuggestions();
      showMultiplayerRoundSheet(game);
    }
    return;
  }

  if (game.status === "playing") {
    const me = game.players?.[guestProfile?.id];
    if (me?.eliminated && !won && !lost) {
      input.disabled = true;
      enterBtn.disabled = true;
    }
    maybeEndRoundIfAllEliminated(game);
  }
}

async function hostStartMultiplayerGame() {
  if (!isPartyHost() || !currentParty || partyBusy || !countries) return;
  partyBusy = true;
  gameSetupStart.disabled = true;
  try {
    await ensurePackForRegion(playSetup.region);
    const targets = buildSharedTargets(playSetup.region, playSetup.rounds);
    await startPartyGame(currentParty.code, {
      region: playSetup.region,
      level: playSetup.level,
      rounds: playSetup.rounds,
      timerSec: playSetup.timer,
      allCountries: isAdminRegion(playSetup.region) ? false : playSetup.allCountries,
      targets,
      mode: currentParty.mode,
    });
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not start multiplayer game.");
  } finally {
    partyBusy = false;
    updateSetupHostGate();
  }
}

async function handleMultiplayerAdvance() {
  if (!isMultiplayerMatch() || mpAdvancing) return;
  if (!isPartyHost()) {
    roundSheetBtn.textContent = "Waiting for host…";
    roundSheetBtn.disabled = true;
    return;
  }
  mpAdvancing = true;
  roundSheetBtn.disabled = true;
  try {
    const result = await advanceRound(partyCode);
    if (result?.finished) {
      showFinalSheet();
    }
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not advance round.");
    roundSheetBtn.disabled = false;
  } finally {
    mpAdvancing = false;
  }
}

function updateScorebar({ animateAward = false } = {}) {
  if (activeSession.isPractice) {
    gameScorebarEl.hidden = true;
    return;
  }

  gameScorebarEl.hidden = false;
  if (isConnectorSession()) {
    scorebarLevelEl.textContent = `Chain ${connectorLengthLabel(activeSession.connectorLength)}`;
  } else {
    scorebarLevelEl.textContent = `${currentMode().label} ${scoreMultiplierLabel(currentMode().maxRoundScore)}`;
  }

  if (activeSession.timerSec > 0) {
    scorebarTimerEl.hidden = false;
    scorebarTimerEl.textContent = `Timer +${Math.round(TIMER_BONUS_RATIO * 100)}%`;
  } else {
    scorebarTimerEl.hidden = true;
  }

  const max = sessionMaxScore();
  const targetTotal = activeSession.totalScore;

  renderScorebarRounds({ animateLatest: animateAward });

  if (animateAward && lastRoundAward != null) {
    tweenScorebarTotal(displayedTotal, targetTotal, max);
  } else {
    setScorebarTotalInstant(targetTotal, max);
  }

  if (lastRoundAward != null) {
    scorebarAwardEl.hidden = false;
    const lastScore =
      activeSession.roundResults?.[activeSession.roundResults.length - 1]?.score;
    const awardPrefix =
      lastRoundAward > 0 && lastScore?.perfectClear
        ? "PERFECT +"
        : lastRoundAward > 0 && lastScore?.maxed
          ? "MAX +"
          : lastRoundAward > 0
            ? "+"
            : "+";
    scorebarAwardEl.textContent =
      lastRoundAward > 0
        ? `${awardPrefix}${formatScore(lastRoundAward)}`
        : "+0";
    scorebarAwardEl.classList.toggle("game__scorebar-award--zero", lastRoundAward === 0);
    scorebarAwardEl.classList.toggle(
      "game__scorebar-award--perfect",
      Boolean(lastScore?.perfectClear)
    );
    scorebarAwardEl.classList.toggle(
      "game__scorebar-award--maxed",
      Boolean(lastScore?.maxed && !lastScore?.perfectClear)
    );
    if (animateAward) {
      triggerAwardMotion(lastRoundAward === 0);
    }
  } else {
    scorebarAwardEl.hidden = true;
    scorebarAwardEl.textContent = "";
    scorebarAwardEl.classList.remove(
      "game__scorebar-award--zero",
      "game__scorebar-award--pop",
      "game__scorebar-award--shake",
      "game__scorebar-award--maxed",
      "game__scorebar-award--perfect"
    );
  }
}

function setRoundSheetMapPeek(collapsed) {
  if (!scoreSheetRound) return;
  scoreSheetRound.classList.toggle("game__sheet--map-peek", collapsed);
  if (roundSheetBody) roundSheetBody.hidden = collapsed;
  if (roundSheetPeek) roundSheetPeek.hidden = !collapsed;
  if (roundSheetMapBtn) {
    roundSheetMapBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    roundSheetMapBtn.setAttribute(
      "aria-label",
      collapsed ? "Show round results" : "Hide results to view map"
    );
    roundSheetMapBtn.title = collapsed ? "Show results" : "View map";
  }
  if (collapsed && roundSheetPeekScore && roundSheetPoints) {
    roundSheetPeekScore.textContent = roundSheetPoints.textContent;
  }
}

function clearRoundSheetMapPeek() {
  setRoundSheetMapPeek(false);
}

function hideAllSheets() {
  practiceEndEl.hidden = true;
  scoreSheetRound.hidden = true;
  scoreSheetFinal.hidden = true;
  winPanel.hidden = true;
  practiceEndEl.classList.remove("game__sheet--enter");
  scoreSheetRound.classList.remove("game__sheet--enter");
  scoreSheetFinal.classList.remove("game__sheet--enter");
  clearMaxRoundFx();
  clearRoundSheetMapPeek();
  clearRoundSheetRoutes();
}

function setPromptVisible(visible) {
  gamePromptEl.hidden = !visible;
}

function showPracticeEnd(message) {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  practiceEndEl.hidden = false;
  winText.textContent = message;
  playSheetEnter(practiceEndEl);
  if (won) burstConfetti();
}

function showRoundSheet(result) {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  scoreSheetRound.hidden = false;
  awaitingNextRound = true;

  const isLast = activeSession.currentRound >= activeSession.totalRounds;
  const sessionMax = sessionMaxScore();
  roundSheetKicker.textContent = "Your score";

  if (result.catalogue === "connector") {
    renderCountryBlock(
      roundSheetCountry,
      `${result.startName || "A"} → ${result.endName || "B"}`,
      result.iso2,
      result.iso2b
    );
  } else {
    renderCountryBlock(roundSheetCountry, result.country, result.iso2);
  }

  if (result.catalogue === "connector") {
    const usedWord = result.used === 1 ? "country" : "countries";
    if (result.won) {
      roundSheetMeta.textContent = `${result.used} ${usedWord} · par ${result.optimal}`;
    } else if (result.timedOut) {
      roundSheetMeta.textContent = `Time's up · par was ${result.optimal}`;
    } else {
      roundSheetMeta.textContent = `Missed · par was ${result.optimal}`;
    }
  } else {
    const guessWord = result.guesses === 1 ? "guess" : "guesses";
    if (result.won || result.multiWin) {
      roundSheetMeta.textContent = `${result.guesses} ${guessWord}`;
    } else if (result.timedOut) {
      roundSheetMeta.textContent = `Time's up · ${result.guesses} ${guessWord}`;
    } else if (result.multiStatus && !result.multiWin) {
      roundSheetMeta.textContent = `${result.multiStatus} · ${result.guesses} ${guessWord}`;
    } else {
      roundSheetMeta.textContent = `Out of guesses · ${result.guesses} ${guessWord}`;
    }
  }

  clearRoundSheetMapPeek();
  roundSheetPoints.textContent = formatScore(result.score.total);
  roundSheetPoints.classList.toggle("game__sheet-score-value--zero", result.score.total === 0);
  if (roundSheetMaxLabel) {
    const roundMax =
      result.catalogue === "connector"
        ? CONNECTOR_MAX_ROUND_SCORE
        : currentMode().maxRoundScore;
    roundSheetMaxLabel.textContent = `of ${formatScore(roundMax)} points`;
  }

  if (roundSheetMeter) {
    roundSheetMeter.hidden = false;
    setScoreMeter(
      roundSheetMeterFill,
      roundSheetMeterPointer,
      roundSheetMeterMax,
      activeSession.totalScore,
      sessionMax,
      {
        animate: true,
        segmentsEl: roundSheetMeterSegments,
        segmentCount: activeSession.totalRounds,
      }
    );
  }
  playScorePunch(roundSheetPoints);
  playMaxRoundFx(result.score);

  if (result.catalogue === "connector") {
    if (result.won) {
      const parts = [`${formatScore(result.score.base)} base`];
      if (result.score.perfect > 0) {
        parts.push(`+ ${formatScore(result.score.perfect)} perfect`);
      }
      if (result.score.bonus > 0) {
        parts.push(`+ ${formatScore(result.score.bonus)} timer`);
      }
      roundSheetBreakdown.textContent = parts.join(" · ");
    } else if (result.timedOut) {
      roundSheetBreakdown.textContent = "Timed out — 0 points this round";
    } else {
      roundSheetBreakdown.textContent = "Missed — 0 points this round";
    }
    renderRoundSheetRoutes(result.playerChainNames, result.optimalChainNames);
  } else {
    clearRoundSheetRoutes();
    if (result.won || result.multiWin) {
      const parts = [`${formatScore(result.score.base)} base`];
      if (result.score.perfect > 0) {
        parts.push(`+ ${formatScore(result.score.perfect)} perfect`);
      }
      if (result.score.bonus > 0) {
        parts.push(`+ ${formatScore(result.score.bonus)} timer`);
      }
      roundSheetBreakdown.textContent = parts.join(" · ");
    } else if (result.timedOut) {
      roundSheetBreakdown.textContent = "Timed out — 0 points this round";
    } else if (result.multiStatus && !result.multiWin) {
      roundSheetBreakdown.textContent = "0 points this round";
    } else {
      roundSheetBreakdown.textContent = "Missed — 0 points this round";
    }
  }

  const isMp = isMultiplayerMatch();
  if (isMp && !isPartyHost()) {
    roundSheetBtn.textContent = "Waiting for host…";
    roundSheetBtn.disabled = true;
  } else {
    roundSheetBtn.disabled = false;
    roundSheetBtn.textContent = isLast ? "View results" : "Next round";
  }
  playSheetEnter(scoreSheetRound);
  if (result.won || result.multiWin) burstConfetti();
}

function showFinalSheet() {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  scoreSheetFinal.hidden = false;
  awaitingNextRound = false;

  const max = sessionMaxScore();
  finalSheetTotal.textContent = formatScore(activeSession.totalScore);
  finalSheetMax.textContent = `of ${formatScore(max)} points`;
  playScorePunch(finalSheetTotal);

  if (finalSheetMeter) {
    finalSheetMeter.hidden = false;
    setScoreMeter(
      finalSheetMeterFill,
      finalSheetMeterPointer,
      finalSheetMeterMax,
      activeSession.totalScore,
      max,
      {
        animate: true,
        segmentsEl: finalSheetMeterSegments,
        segmentCount: activeSession.totalRounds,
      }
    );
  }

  const scores = activeSession.roundResults.map((r) => r.score.total);
  const best = scores.length ? Math.max(...scores) : 0;
  const wins = activeSession.roundResults.filter((r) => r.won).length;
  const winWord = isConnectorSession() || activeSession.roundResults.some((r) => r.catalogue === "connector")
    ? "connected"
    : "found";
  finalSheetBest.textContent = `Best round ${formatScore(best)} · ${wins}/${activeSession.totalRounds} ${winWord}`;

  finalSheetList.innerHTML = "";

  if (isMultiplayerMatch() && activeSession.multiMode === "teams" && currentParty?.game?.players) {
    const teamTotals = { A: 0, B: 0 };
    Object.values(currentParty.game.players).forEach((player) => {
      if (player.team === "A" || player.team === "B") {
        teamTotals[player.team] = Math.max(
          teamTotals[player.team],
          Number(player.totalScore) || 0
        );
      }
    });
    ["A", "B"].forEach((team, index) => {
      const li = document.createElement("li");
      li.className = "game__sheet-row";
      if (!prefersReducedMotion()) {
        li.classList.add("game__sheet-row--enter");
        li.style.setProperty("--i", String(ROW_STAGGER_MS[index % ROW_STAGGER_MS.length]));
      }
      const left = document.createElement("div");
      left.className = "game__sheet-row-left";
      const name = document.createElement("span");
      name.className = "game__sheet-row-name";
      name.textContent = `Team ${team}`;
      left.appendChild(name);
      const right = document.createElement("div");
      right.className = "game__sheet-row-right";
      const pts = document.createElement("span");
      pts.className = "game__sheet-row-pts";
      pts.textContent = formatScore(teamTotals[team]);
      right.appendChild(pts);
      li.appendChild(left);
      li.appendChild(right);
      finalSheetList.appendChild(li);
    });
  }

  activeSession.roundResults.forEach((result, index) => {
    const li = document.createElement("li");
    li.className = "game__sheet-row";
    if (!result.won) li.classList.add("game__sheet-row--miss");
    if (!prefersReducedMotion()) {
      li.classList.add("game__sheet-row--enter");
      li.style.setProperty("--i", String(ROW_STAGGER_MS[index % ROW_STAGGER_MS.length]));
    }

    const left = document.createElement("div");
    left.className = "game__sheet-row-left";

    const num = document.createElement("span");
    num.className = "game__sheet-row-num";
    num.textContent = String(result.round);
    left.appendChild(num);

    const flagSrc = flagUrl(result.iso2);
    if (flagSrc) {
      const flag = document.createElement("img");
      flag.className = "game__sheet-row-flag";
      flag.src = flagSrc;
      flag.alt = "";
      flag.width = 20;
      flag.height = 15;
      flag.loading = "lazy";
      flag.decoding = "async";
      flag.addEventListener("error", () => flag.remove());
      left.appendChild(flag);
    }

    const name = document.createElement("span");
    name.className = "game__sheet-row-name";
    name.textContent = result.country;
    left.appendChild(name);

    const right = document.createElement("div");
    right.className = "game__sheet-row-right";

    const tries = document.createElement("span");
    tries.className = "game__sheet-row-tries";
    tries.textContent = result.won ? `${result.guesses}` : "—";
    right.appendChild(tries);

    const pts = document.createElement("span");
    pts.className = "game__sheet-row-pts";
    pts.textContent = formatScore(result.score.total);
    right.appendChild(pts);

    li.appendChild(left);
    li.appendChild(right);
    finalSheetList.appendChild(li);
  });

  playSheetEnter(scoreSheetFinal);
  if (isMultiplayerMatch()) {
    finalSheetBtn.textContent = "Back to setup";
  } else {
    finalSheetBtn.textContent = "Play again";
  }
}

function completeRound({ wonRound, timedOut = false, message = "" }) {
  if (gameEnded()) return;

  won = wonRound;
  lost = !wonRound;
  stopTimer();
  hideSuggestions();
  updateGuessesLeftDisplay();
  input.disabled = true;
  enterBtn.disabled = true;

  if (isConnectorSession()) {
    completeConnectorRound({ wonRound, timedOut, message });
    return;
  }

  if (!wonRound && target) {
    globe.setGuess(target.name, "rgb(70, 140, 220)", "#1e4a7a");
  }
  // Always surface the answer as the closest entry in the guess list.
  ensureAnswerInGuesses();
  renderGuesses();

  if (activeSession.isPractice) {
    showPracticeEnd(
      wonRound
        ? `You found ${target.name} in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}!`
        : message || `The country was ${target.name}.`
    );
    return;
  }

  const remainingForScore = wonRound && timerStarted ? timerRemainingMs : 0;
  const scored = scoreRound({
    guessCount: guesses.length,
    won: wonRound,
    maxRoundScore: currentMode().maxRoundScore,
    timerSec: activeSession.timerSec,
    remainingMs: remainingForScore,
  });

  const result = {
    round: activeSession.currentRound,
    country: target.name,
    iso2: target.iso2,
    guesses: guesses.length,
    won: wonRound,
    timedOut,
    score: scored,
  };

  activeSession.roundResults.push(result);
  activeSession.totalScore += scored.total;
  lastRoundAward = scored.total;
  updateScorebar({ animateAward: true });
  showRoundSheet(result);
}

function chainDisplayNames(isoChain) {
  if (!Array.isArray(isoChain)) return [];
  const resolve = (iso) =>
    countriesPack?.countryByIso2(iso) || countries?.countryByIso2(iso);
  return isoChain
    .map((iso) => resolve(iso)?.name || String(iso).toUpperCase())
    .filter(Boolean);
}

function clearRoundSheetRoutes() {
  if (roundSheetChain) roundSheetChain.hidden = true;
  if (scoreSheetRound) scoreSheetRound.classList.remove("game__sheet--routes");
  if (roundSheetRouteYours) roundSheetRouteYours.innerHTML = "";
  if (roundSheetRouteOptimal) roundSheetRouteOptimal.innerHTML = "";
}

function fillRouteList(listEl, names) {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!names?.length) {
    const empty = document.createElement("li");
    empty.className = "game__sheet-route-item game__sheet-route-item--empty";
    empty.textContent = "—";
    listEl.appendChild(empty);
    return;
  }
  names.forEach((name, i) => {
    const li = document.createElement("li");
    li.className = "game__sheet-route-item";
    if (i === 0 || i === names.length - 1) {
      li.classList.add("game__sheet-route-item--end");
    }
    li.textContent = name;
    listEl.appendChild(li);
  });
}

function renderRoundSheetRoutes(yours, optimal) {
  if (!roundSheetChain) return;
  fillRouteList(roundSheetRouteYours, yours);
  fillRouteList(roundSheetRouteOptimal, optimal);
  roundSheetChain.hidden = false;
  if (scoreSheetRound) scoreSheetRound.classList.add("game__sheet--routes");
}

function completeConnectorRound({ wonRound, timedOut = false, message = "" }) {
  const c = activeSession.connector;
  renderGuesses();
  paintConnectorMap();
  updateConnectorProgress();

  const startName = c?.start?.name || "A";
  const endName = c?.end?.name || "B";
  const used = c?.bestUsed ?? 0;
  const optimal = c?.optimal ?? 0;
  const playerNames = wonRound
    ? chainDisplayNames(c?.playerChain)
    : [startName, ...guesses.map((g) => g.name), endName];
  const optimalNames = chainDisplayNames(c?.optimalChain);

  if (activeSession.isPractice) {
    showPracticeEnd(
      wonRound
        ? `Connected ${startName} → ${endName} with ${used} ${used === 1 ? "country" : "countries"} (par ${optimal}).`
        : message || `Could not connect ${startName} to ${endName}.`
    );
    return;
  }

  const remainingForScore = wonRound && timerStarted ? timerRemainingMs : 0;
  const scored = scoreConnectorRound({
    optimal,
    used,
    won: wonRound,
    maxRoundScore: CONNECTOR_MAX_ROUND_SCORE,
    timerSec: activeSession.timerSec,
    remainingMs: remainingForScore,
  });

  const result = {
    round: activeSession.currentRound,
    catalogue: "connector",
    country: `${startName} → ${endName}`,
    iso2: c?.start?.iso2 || null,
    iso2b: c?.end?.iso2 || null,
    startName,
    endName,
    guesses: guesses.length,
    used,
    optimal,
    playerChainNames: playerNames,
    optimalChainNames: optimalNames,
    pairKey: c?.pairKey,
    won: wonRound,
    timedOut,
    score: scored,
  };

  activeSession.roundResults.push(result);
  activeSession.totalScore += scored.total;
  lastRoundAward = scored.total;
  updateScorebar({ animateAward: true });
  showRoundSheet(result);
}

function endWin() {
  completeRound({ wonRound: true });
}

function endLose(message, timedOut = false) {
  completeRound({ wonRound: false, timedOut, message });
}

function onTimerExpired() {
  if (gameEnded()) return;
  stopTimer();
  timerRemainingMs = 0;
  updateTimerDisplay();
  if (isMultiplayerMatch() && partyCode && guestProfile) {
    markPlayerEliminated(partyCode, guestProfile.id).catch((err) => console.error(err));
    input.disabled = true;
    enterBtn.disabled = true;
    showError("Time's up — waiting for the round to finish.");
    return;
  }
  if (isConnectorSession()) {
    const startName = activeSession.connector?.start?.name || "A";
    const endName = activeSession.connector?.end?.name || "B";
    endLose(`Time's up! Could not connect ${startName} to ${endName}.`, true);
    return;
  }
  endLose(`Time's up! The country was ${target.name}.`, true);
}

function startTimerIfNeeded() {
  if (timerStarted || !activeSession.timerSec || gameEnded()) return;
  timerStarted = true;
  timerRemainingMs = activeSession.timerSec * 1000;
  updateTimerDisplay();
  const startedAt = performance.now();
  const duration = timerRemainingMs;
  stopTimer();
  timerInterval = setInterval(() => {
    timerRemainingMs = Math.max(0, duration - (performance.now() - startedAt));
    updateTimerDisplay();
    if (timerRemainingMs <= 0) onTimerExpired();
  }, 100);
}

function renderSuggestions(results) {
  suggestionsEl.innerHTML = "";
  if (!results.length) {
    hideSuggestions();
    return;
  }
  if (activeSuggestion >= results.length) {
    activeSuggestion = results.length - 1;
  }
  results.forEach((country, idx) => {
    const li = document.createElement("li");
    li.className = "game__suggestion";
    li.dataset.name = country.name;

    const nameSpan = document.createElement("span");
    nameSpan.className = "game__suggestion-name";
    nameSpan.textContent = country.name;
    li.appendChild(nameSpan);

    const aliases = Array.isArray(country.aliases) ? country.aliases.slice(0, 2) : [];
    if (aliases.length) {
      const aliasSpan = document.createElement("span");
      aliasSpan.className = "game__suggestion-aliases";
      aliasSpan.textContent = aliases.join(" · ");
      li.appendChild(aliasSpan);
    }

    if (idx === activeSuggestion) li.classList.add("game__suggestion--active");
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      submitGuess(country.name);
    });
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.hidden = false;
}

function updateSuggestions() {
  if (!countries || gameEnded() || !currentMode().autocomplete) {
    hideSuggestions();
    return;
  }
  const query = input.value.trim();
  if (!query) {
    hideSuggestions();
    return;
  }
  const results = countries.search(query, 8, poolOpts());
  if (activeSuggestion < 0 && results.length) {
    activeSuggestion = 0;
  }
  renderSuggestions(results);
}

function resolveCountry(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = countries.lookup(trimmed, poolOpts());
  if (direct) return direct;

  if (!currentMode().autocomplete) return null;

  if (!suggestionsEl.hidden && activeSuggestion >= 0) {
    const items = suggestionsEl.querySelectorAll(".game__suggestion");
    const item = items[activeSuggestion];
    if (item) {
      return countries.lookup(item.textContent, poolOpts());
    }
  }

  return null;
}

function sortedGuesses() {
  const list = [...guesses];
  if (guessSort === "order") {
    return list.sort((a, b) => b.orderIndex - a.orderIndex);
  }
  // Closest first — the correct answer always wins the top spot.
  return list.sort((a, b) => {
    if (a.correct !== b.correct) return a.correct ? -1 : 1;
    return a.distance - b.distance;
  });
}

function renderGuessPill(guess, { animate = false } = {}) {
  const mode = currentMode();
  const connector = isConnectorSession();
  const pill = document.createElement(connector ? "div" : "button");
  if (!connector) pill.type = "button";
  pill.className = "game__guess-pill";
  if (guess.correct) pill.classList.add("game__guess-pill--correct");
  if (connector) pill.classList.add("game__guess-pill--connector");
  if (guess.playerId && guestProfile && guess.playerId !== guestProfile.id) {
    pill.classList.add("game__guess-pill--remote");
  }
  if (animate && !prefersReducedMotion()) {
    pill.classList.add("game__guess-pill--enter");
  }

  if (guess.playerColor) {
    const owner = document.createElement("span");
    owner.className = "game__guess-owner";
    owner.style.background = guess.playerColor;
    owner.title = guess.playerName || "";
    pill.appendChild(owner);
  }

  const flagSrc = flagUrl(guess.iso2);
  if (flagSrc) {
    const flag = document.createElement("img");
    flag.className = "game__guess-flag";
    flag.src = flagSrc;
    flag.alt = "";
    flag.width = 20;
    flag.height = 15;
    flag.loading = "lazy";
    flag.decoding = "async";
    flag.addEventListener("error", () => flag.remove());
    pill.appendChild(flag);
  }

  const name = document.createElement("span");
  name.className = "game__guess-name";
  name.textContent = guess.name;
  pill.appendChild(name);

  if (connector) {
    if (!gameEnded()) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "game__guess-remove";
      remove.setAttribute("aria-label", `Remove ${guess.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeConnectorGuess(guess.name);
      });
      pill.appendChild(remove);
    }
  } else if (!guess.correct) {
    const label = distanceLabel(mode, guess.distance, distanceUnit, guess.direction);
    if (label) {
      const dist = document.createElement("span");
      dist.className = "game__guess-dist";
      dist.style.color = mode.grayFill ? "rgba(255,255,255,0.75)" : guess.color;
      dist.textContent = label;
      pill.appendChild(dist);
    }
  }

  if (!connector) {
    pill.addEventListener("click", () => {
      if (!mode.flyGlobe) return;
      globe.flyTo(guess.centroid.lat, guess.centroid.lng);
    });
  }
  guessesEl.appendChild(pill);
}

function renderGuesses() {
  guessesEl.innerHTML = "";
  if (!guesses.length) {
    guessesPanel.hidden = false;
    guessesToolbar.hidden = true;
    guessesEl.hidden = true;
    guessesPlaceholder.hidden = false;
    guessesPlaceholder.textContent = isConnectorSession()
      ? "Connecting countries will appear here."
      : "Guesses will appear here.";
    lastGuessAnimKey = null;
    return;
  }
  guessesPanel.hidden = false;
  guessesToolbar.hidden = isConnectorSession();
  guessesPlaceholder.hidden = true;
  guessesEl.hidden = false;

  const newest = guesses.reduce((best, g) =>
    !best || (g.orderIndex ?? 0) > (best.orderIndex ?? 0) ? g : best
  , null);
  const newestKey = newest
    ? `${newest.orderIndex}:${newest.name}:${newest.playerId || ""}`
    : null;
  const shouldAnimate =
    newestKey && newestKey !== lastGuessAnimKey && !gameEnded();
  lastGuessAnimKey = newestKey;

  const list = isConnectorSession() ? guesses : sortedGuesses();
  list.forEach((guess) => {
    const isNewest =
      shouldAnimate &&
      guess === newest;
    renderGuessPill(guess, { animate: isNewest });
  });
}

function removeConnectorGuess(name) {
  if (!isConnectorSession() || gameEnded()) return;
  const next = guesses.filter((g) => g.name !== name);
  if (next.length === guesses.length) return;
  guesses = next;
  paintConnectorMap();
  renderGuesses();
  revalidateConnector();
  clearError();
}

function ensureAnswerInGuesses() {
  if (!target) return;
  if (guesses.some((g) => g.name === target.name)) {
    guesses.forEach((g) => {
      if (g.name === target.name) {
        g.correct = true;
        g.distance = 0;
        g.direction = "";
        g.color = "rgb(70, 140, 220)";
      }
    });
    return;
  }
  guesses.push({
    name: target.name,
    iso2: target.iso2,
    distance: 0,
    direction: "",
    color: "rgb(70, 140, 220)",
    correct: true,
    centroid: target.centroid,
    orderIndex: guesses.length,
  });
}

function submitGuess(forcedName) {
  if (submitting || gameEnded() || !countries || !globe || !gameStarted) return;

  submitting = true;
  startTimerIfNeeded();

  clearError();
  const country = resolveCountry(forcedName ?? input.value);
  if (!country) {
    submitting = false;
    showError("Country not found. Try a different spelling.");
    return;
  }

  if (isConnectorSession()) {
    submitConnectorGuess(country);
    submitting = false;
    return;
  }

  if (isMultiplayerMatch()) {
    submitMultiplayerGuess(country).finally(() => {
      submitting = false;
    });
    return;
  }

  if (guesses.some((g) => g.name === country.name)) {
    submitting = false;
    showError("You already guessed that country.");
    return;
  }

  const mode = currentMode();
  const correct = country.name === target.name;
  const proximity = correct
    ? { distance: 0, from: country.centroid, to: target.centroid }
    : closestBorder(country, target);
  const distance = proximity.distance;
  const color = fillColor(mode, distance, correct);
  const outline = guessStrokeColor(mode, correct);
  const dir = correct ? "" : `→ ${bearing(proximity.from, proximity.to)}`;

  guesses.push({
    name: country.name,
    iso2: country.iso2,
    distance,
    direction: dir,
    color,
    correct,
    centroid: country.centroid,
    orderIndex: guesses.length,
  });

  globe.setGuess(country.name, color, outline);
  input.value = "";
  hideSuggestions();
  hintEl.classList.add("game__hint--hidden");
  renderGuesses();
  updateGuessesLeftDisplay();

  if (mode.flyGlobe) {
    const { lat, lng } = country.centroid;
    requestAnimationFrame(() => {
      if (!globe || gameEnded()) return;
      globe.flyTo(lat, lng);
    });
  }

  if (correct) {
    endWin();
  } else if (mode.maxGuesses && guesses.length >= mode.maxGuesses) {
    endLose(`Out of guesses! The country was ${target.name}.`);
  }

  submitting = false;
}

function submitConnectorGuess(country) {
  const c = activeSession.connector;
  const graph = countriesPack?.borderGraph || countries?.borderGraph;
  if (!c || !graph) {
    showError("Connector puzzle is not ready.");
    return;
  }

  if (country.name === c.start.name || country.name === c.end.name) {
    showError("That is one of the endpoint countries.");
    return;
  }

  if (guesses.some((g) => g.name === country.name)) {
    showError("You already added that country.");
    return;
  }

  if (graph.degree(country.iso2) === 0) {
    showError("Island nations have no land borders — they cannot connect.");
    return;
  }

  guesses.push({
    name: country.name,
    iso2: country.iso2,
    distance: 0,
    direction: "",
    color: CONNECTOR_GUESS_COLOR,
    correct: false,
    centroid: country.centroid,
    orderIndex: guesses.length,
  });

  paintConnectorMap();
  input.value = "";
  hideSuggestions();
  hintEl.classList.add("game__hint--hidden");
  renderGuesses();

  if (currentMode().flyGlobe) {
    const { lat, lng } = country.centroid;
    requestAnimationFrame(() => {
      if (!globe || gameEnded()) return;
      globe.flyTo(lat, lng);
    });
  }

  const result = revalidateConnector();
  if (result.solved) {
    endWin();
  }
}

async function submitMultiplayerGuess(country) {
  if (!partyCode || !guestProfile || !currentParty?.game) return;
  const game = currentParty.game;
  if (game.status !== "playing") return;

  const allGuesses = collectBoardGuesses(game);
  if (activeSession.multiMode === "coop") {
    if (allGuesses.some((g) => g.name === country.name)) {
      showError("Someone already guessed that country.");
      return;
    }
  } else {
    const mine = game.players?.[guestProfile.id]?.guesses || [];
    if (mine.some((g) => g.name === country.name)) {
      showError("You already guessed that country.");
      return;
    }
  }

  const mode = currentMode();
  const correct = country.name === target.name;
  const proximity = correct
    ? { distance: 0, from: country.centroid, to: target.centroid }
    : closestBorder(country, target);
  const distance = proximity.distance;
  const color = fillColor(mode, distance, correct);
  const outline = guessStrokeColor(mode, correct);
  const dir = correct ? "" : `→ ${bearing(proximity.from, proximity.to)}`;

  try {
    await pushPlayerGuess(partyCode, guestProfile.id, {
      name: country.name,
      km: distance,
      at: Date.now(),
      correct,
    });

    input.value = "";
    hideSuggestions();
    hintEl.classList.add("game__hint--hidden");

    globe.setGuess(country.name, color, outline);

    if (mode.flyGlobe) {
      const { lat, lng } = country.centroid;
      requestAnimationFrame(() => {
        if (!globe || gameEnded()) return;
        globe.flyTo(lat, lng);
      });
    }

    const localGuess = {
      name: country.name,
      iso2: country.iso2,
      distance,
      direction: dir,
      color,
      correct,
      centroid: country.centroid,
      orderIndex: guesses.length,
      playerId: guestProfile.id,
      playerName: guestProfile.name,
      playerColor: guestProfile.color,
    };
    if (activeSession.multiMode === "coop") {
      if (!guesses.some((g) => g.name === country.name && g.playerId === guestProfile.id)) {
        guesses.push(localGuess);
      }
    } else if (!guesses.some((g) => g.name === country.name)) {
      guesses.push(localGuess);
    }
    renderGuesses();
    updateGuessesLeftDisplay();

    const markerMap = new Map();
    guesses
      .filter((g) => !g.playerId || g.playerId === guestProfile.id)
      .forEach((g) => {
        if (!markerMap.has(g.name)) {
          markerMap.set(g.name, {
            name: g.name,
            lat: g.centroid.lat,
            lng: g.centroid.lng,
            players: [{
              id: guestProfile.id,
              name: guestProfile.name,
              color: guestProfile.color,
            }],
          });
        }
      });
    if (activeSession.multiMode === "coop" && currentParty?.game) {
      globe.setPlayerMarkers(buildMarkerGroups({
        ...currentParty.game,
        players: {
          ...currentParty.game.players,
          [guestProfile.id]: {
            ...(currentParty.game.players?.[guestProfile.id] || {
              name: guestProfile.name,
              color: guestProfile.color,
            }),
            guesses: [
              ...((currentParty.game.players?.[guestProfile.id]?.guesses) || []),
              { name: country.name, km: distance, at: Date.now(), correct },
            ],
          },
        },
      }));
    } else {
      globe.setPlayerMarkers([...markerMap.values()]);
    }

    if (correct) {
      const remainingForScore = timerStarted ? timerRemainingMs : 0;
      const myCount =
        (game.players?.[guestProfile.id]?.guesses?.length || 0) + 1;
      const scored = scoreRound({
        guessCount: activeSession.multiMode === "coop"
          ? allGuesses.length + 1
          : myCount,
        won: true,
        maxRoundScore: mode.maxRoundScore,
        timerSec: activeSession.timerSec,
        remainingMs: remainingForScore,
      });
      await claimRoundWin(partyCode, guestProfile.id, scored.total);
    } else if (mode.maxGuesses) {
      if (activeSession.multiMode === "coop") {
        if (allGuesses.length + 1 >= mode.maxGuesses) {
          await endRoundNoWinner(partyCode);
        }
      } else {
        const myCount =
          (game.players?.[guestProfile.id]?.guesses?.length || 0) + 1;
        if (myCount >= mode.maxGuesses) {
          await markPlayerEliminated(partyCode, guestProfile.id);
          input.disabled = true;
          enterBtn.disabled = true;
        }
      }
    }
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not sync guess.");
  }
}

function pairKeyFor(aIso, bIso) {
  return [aIso, bIso].sort().join("|");
}

function clearConnectorProgress() {
  if (!connectorProgressEl) return;
  connectorProgressEl.hidden = true;
  connectorProgressEl.classList.remove("connector-progress--on");
  connectorProgressEl.setAttribute("aria-hidden", "true");
  if (connectorProgressValueEl) {
    connectorProgressValueEl.textContent = "0/0";
    connectorProgressValueEl.classList.remove(
      "connector-progress__value--solved",
      "connector-progress__value--over"
    );
  }
}

function updateConnectorProgress() {
  if (!connectorProgressEl || !connectorProgressValueEl) return;
  if (!isConnectorSession() || !activeSession.connector) {
    clearConnectorProgress();
    return;
  }
  const c = activeSession.connector;
  const optimal = c.optimal || 0;
  const shown = c.solved ? c.bestUsed : guesses.length;
  connectorProgressEl.hidden = false;
  connectorProgressEl.classList.add("connector-progress--on");
  connectorProgressEl.setAttribute("aria-hidden", "false");
  connectorProgressValueEl.textContent = `${shown}/${optimal}`;
  connectorProgressValueEl.classList.toggle(
    "connector-progress__value--solved",
    Boolean(c.solved) && c.bestUsed <= optimal
  );
  connectorProgressValueEl.classList.toggle(
    "connector-progress__value--over",
    shown > optimal
  );
}

function paintConnectorMap() {
  if (!globe || !activeSession.connector) return;
  const { start, end } = activeSession.connector;
  const entries = [
    {
      name: start.name,
      color: CONNECTOR_ENDPOINT_COLOR,
      stroke: CONNECTOR_ENDPOINT_STROKE,
    },
    {
      name: end.name,
      color: CONNECTOR_ENDPOINT_COLOR,
      stroke: CONNECTOR_ENDPOINT_STROKE,
    },
    ...guesses.map((g) => ({
      name: g.name,
      color: CONNECTOR_GUESS_COLOR,
      stroke: CONNECTOR_GUESS_STROKE,
    })),
  ];
  globe.setGuesses(entries);
}

function revalidateConnector() {
  const c = activeSession.connector;
  const graph = countriesPack?.borderGraph || countries?.borderGraph;
  if (!c || !graph) return { solved: false };
  const guessedIsos = guesses.map((g) => g.iso2);
  const result = solveWithSet(graph, c.start.iso2, c.end.iso2, guessedIsos);
  if (result.solved) {
    c.solved = true;
    c.bestUsed = result.used;
    c.playerChain = result.chain;
  } else {
    c.solved = false;
    c.bestUsed = 0;
    c.playerChain = null;
  }
  updateConnectorProgress();
  return result;
}

async function ensureBordersReady() {
  if (!countriesPack) return null;
  if (countriesPack.borderGraph) return countriesPack.borderGraph;
  if (countriesPack.bordersReady) {
    await countriesPack.bordersReady;
  }
  return countriesPack.borderGraph;
}

function pickUnusedConnectorPair(index, length) {
  const used = new Set(usedTargetNames());
  const resolve = (iso) => countriesPack?.countryByIso2?.(iso) || countries?.countryByIso2?.(iso);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const pair = index.pick(length);
    if (!pair) return null;
    if (!resolve(pair.a) || !resolve(pair.b)) continue;
    const key = pairKeyFor(pair.a, pair.b);
    if (!used.has(key)) return pair;
  }
  // Last resort: any resolvable pair at this length (even if reused).
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pair = index.pick(length);
    if (!pair) return null;
    if (resolve(pair.a) && resolve(pair.b)) return pair;
  }
  return null;
}

function midpointCentroid(a, b) {
  return {
    lat: (a.centroid.lat + b.centroid.lat) / 2,
    lng: (a.centroid.lng + b.centroid.lng) / 2,
  };
}

function startRoundPlay() {
  stopTimer();
  timerStarted = false;
  timerRemainingMs = activeSession.timerSec * 1000;
  awaitingNextRound = false;
  clearScoreAnimations();

  guesses = [];
  lastGuessAnimKey = null;
  won = false;
  lost = false;
  submitting = false;
  globe.clearGuesses();
  if (isAdminRegion(activeSession.region)) {
    globe.setHoveredRegion(activeSession.region, { locked: true });
  }
  globe.setRadiusCircle(null);
  globe.clearPlayerMarkers?.();
  updateRadiusTools();
  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  hideAllSheets();
  setPromptVisible(true);
  hintEl.classList.remove("game__hint--hidden");
  clearError();
  hideSuggestions();

  if (isConnectorSession()) {
    startConnectorRound();
    return;
  }

  const exclude = activeSession.isPractice ? [] : usedTargetNames();
  target = countries.randomTarget(activeSession.region, exclude, poolOpts(activeSession.region));
  clearConnectorProgress();
  renderGuesses();
  updateModeLabel();
  updateStatusBar();
  updateScorebar();
}

async function startConnectorRound() {
  hintEl.textContent = "Loading border map…";
  try {
    await ensureBordersReady();
  } catch (err) {
    console.error(err);
  }

  // Always use the world countries pack for Connector (not admin packs).
  const pack = countriesPack;
  const graph = pack?.borderGraph;
  if (!graph) {
    showError("Border data failed to load. Try again in a moment.");
    hintEl.textContent = "Could not load border data.";
    return;
  }

  if (countries !== pack) {
    countries = pack;
    activePackId = "countries";
  }

  const unOnly = useUnOnly("world");
  const index = pack.ensureConnectorIndex({ unOnly });
  if (!index || !index.pool.length) {
    showError("Could not build Connector puzzles.");
    return;
  }

  const length = activeSession.connectorLength ?? playSetup.connectorLength;
  const pair = pickUnusedConnectorPair(index, length);
  if (!pair) {
    showError("No puzzles available for that chain length.");
    return;
  }

  const start = pack.countryByIso2(pair.a);
  const end = pack.countryByIso2(pair.b);
  if (!start || !end) {
    console.error("[connector] unresolved pair", pair);
    showError("Could not resolve Connector countries.");
    return;
  }

  target = null;
  activeSession.connector = {
    start,
    end,
    optimal: pair.length,
    optimalChain: pair.chain,
    bestUsed: 0,
    solved: false,
    playerChain: null,
    pairKey: pairKeyFor(pair.a, pair.b),
  };

  paintConnectorMap();
  const mid = midpointCentroid(start, end);
  globe.flyTo?.(mid.lat, mid.lng);
  hintEl.textContent = `Connect ${start.name} to ${end.name} with border-to-border countries.`;
  renderGuesses();
  updateModeLabel();
  updateStatusBar();
  updateScorebar();
  updateConnectorProgress();
  updateGuessPlaceholder();
}

function startNextRound() {
  if (activeSession.isPractice) return;
  if (activeSession.currentRound >= activeSession.totalRounds) {
    showFinalSheet();
    return;
  }
  activeSession.currentRound += 1;
  lastRoundAward = null;
  startRoundPlay();
  setTimeout(() => input.focus(), 50);
}

function restartSession() {
  if (activeSession.isPractice) {
    lastRoundAward = null;
    displayedTotal = 0;
    startRoundPlay();
    return;
  }

  activeSession.currentRound = 1;
  activeSession.roundResults = [];
  activeSession.totalScore = 0;
  lastRoundAward = null;
  displayedTotal = 0;
  startRoundPlay();
  setTimeout(() => input.focus(), 50);
}

function beginGame(options = {}) {
  if (!countriesPack || !globe) return;

  const isPractice = Boolean(options.practice);
  const region = isPractice ? "world" : playSetup.region;
  const needsBorders = !isPractice && playSetup.catalogue === "connector";

  const ready = needsBorders
    ? ensureBordersReady().then(() => ensurePackForRegion(region))
    : ensurePackForRegion(region);

  ready
    .then(() => {
      startSoloGameUi(options);
    })
    .catch((err) => {
      console.error(err);
      showError("Failed to load map data.");
    });
}

function startSoloGameUi(options = {}) {
  if (!countries || !globe) return;

  const isPractice = Boolean(options.practice);
  const region = isPractice ? "world" : playSetup.region;
  const catalogue = isPractice ? "countries" : playSetup.catalogue;
  if (!gameStarted) {
    gameStarted = true;
    regionSelectActive = false;
    playScreenBack.hidden = true;
    gameExitBtn.hidden = false;

    app.classList.remove("app--start", "app--region-select", "app--multiplayer");
    app.classList.add("app--game");
    gamePanel.hidden = false;
    guessesPanel.hidden = false;
    regionPicker.hidden = true;
    multiplayerLobby.hidden = true;
    multiplayerMode.hidden = true;
    multiplayerPvpFormat.hidden = true;
    multiplayerTeams.hidden = true;
    // Preserve catalogue before teardown (closeRegionDetail resets connector → countries).
    const savedCatalogue = playSetup.catalogue;
    const savedConnectorLength = playSetup.connectorLength;
    closeRegionDetail({ restoreProvinces: false });
    resetProvincePickerUi();
    playSetup.catalogue = savedCatalogue;
    playSetup.connectorLength = savedConnectorLength;
    globeStage.removeAttribute("role");
    globeStage.removeAttribute("tabindex");
    globeStage.removeAttribute("aria-label");
    globe.transitionToGame(1300, gameTransitionOptions(region));
    setTimeout(() => input.focus(), 1350);
  }

  if (isPractice) {
    activeSession = {
      catalogue: "countries",
      region: "world",
      level: "easy",
      timerSec: 0,
      mode: getLevelMode("easy"),
      isPractice: true,
      totalRounds: 1,
      currentRound: 1,
      roundResults: [],
      totalScore: 0,
      allCountries: false,
      connector: null,
    };
  } else if (catalogue === "connector") {
    activeSession = {
      catalogue: "connector",
      region: "world",
      level: "connector",
      timerSec: playSetup.timer,
      mode: CONNECTOR_MODE,
      isPractice: false,
      totalRounds: playSetup.rounds,
      currentRound: 1,
      roundResults: [],
      totalScore: 0,
      allCountries: Boolean(playSetup.allCountries),
      connectorLength: playSetup.connectorLength,
      connector: null,
    };
  } else {
    activeSession = {
      catalogue: "countries",
      region: playSetup.region,
      level: playSetup.level,
      timerSec: playSetup.timer,
      mode: getLevelMode(playSetup.level),
      isPractice: false,
      totalRounds: playSetup.rounds,
      currentRound: 1,
      roundResults: [],
      totalScore: 0,
      allCountries: isAdminRegion(playSetup.region)
        ? false
        : Boolean(playSetup.allCountries),
      connector: null,
    };
  }

  lastRoundAward = null;
  displayedTotal = 0;
  updateGuessPlaceholder();
  if (catalogue !== "connector") clearConnectorProgress();
  startRoundPlay();
}

function exitGame() {
  if (!gameStarted || !globe) return;

  const wasConnector = isConnectorSession();
  const savedConnectorLength = activeSession.connectorLength ?? playSetup.connectorLength;

  stopTimer();
  timerStarted = false;
  timerRemainingMs = 0;
  awaitingNextRound = false;
  lastRoundAward = null;
  displayedTotal = 0;
  clearScoreAnimations();
  submitting = false;
  won = false;
  lost = false;
  guesses = [];
  target = null;
  gameStarted = false;

  hideSuggestions();
  clearError();
  hideAllSheets();
  globe.clearGuesses();
  globe.setRadiusCircle(null);
  globe.clearPlayerMarkers?.();
  if (mpRivalsEl) {
    mpRivalsEl.hidden = true;
    mpRivalsEl.innerHTML = "";
  }
  clearConnectorProgress();

  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  hintEl.classList.remove("game__hint--hidden");
  hintEl.textContent = "Enter the name of any country to make your first guess.";
  guessesPanel.hidden = true;
  updateRadiusTools();
  gameStatusEl.hidden = true;
  gameScorebarEl.hidden = true;
  gameExitBtn.hidden = true;
  gamePanel.hidden = true;
  setPromptVisible(true);
  mpRoundHandledKey = null;
  mpBoardFingerprint = "";

  const wasMulti = multiplayerActive;
  activeSession = {
    catalogue: "countries",
    region: "world",
    level: "easy",
    timerSec: 0,
    mode: getLevelMode("easy"),
    isPractice: true,
    totalRounds: 1,
    currentRound: 1,
    roundResults: [],
    totalScore: 0,
    multiMode: null,
    connector: null,
  };

  regionSelectActive = true;
  cancelRegionHoverTimers();
  closeRegionDetail({ restoreProvinces: false });
  resetProvincePickerUi({ showRegions: !wasConnector, fromParty: wasMulti });
  setActivePack("countries").catch((err) => console.error(err));

  app.classList.remove("app--game", "app--start", "app--multiplayer");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  if (wasMulti) {
    multiplayerPhase = "setup";
    const backLabel =
      currentParty?.mode === "teams"
        ? "Back to team pick"
        : currentParty?.mode === "pvp"
          ? "Back to PvP format"
          : "Back to mode select";
    playScreenBack.setAttribute("aria-label", backLabel);
    if (partyCode && isPartyHost()) {
      clearPartyGame(partyCode).catch((err) => console.error(err));
    }
    updateSetupHostGate();
    resetProvincePickerUi({ showRegions: true, fromParty: true });
  } else if (wasConnector) {
    playSetup.connectorLength = savedConnectorLength;
    openConnectorSetup();
    playScreenBack.setAttribute("aria-label", "Back to catalogues");
  } else {
    playScreenBack.setAttribute("aria-label", "Back to catalogues");
  }

  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");

  globe.transitionToRegionSelect(1300);
}

function loadGuestProfile() {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.name || !parsed?.color) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGuestProfile(profile) {
  guestProfile = profile;
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  updateStartNickname();
}

function updateStartNickname() {
  const name = guestProfile?.name?.trim();
  if (!name) {
    startNickname.hidden = true;
    startNickname.textContent = "";
    return;
  }
  startNickname.hidden = false;
  startNickname.textContent = name;
}

function showGuestNameError(message) {
  if (!message) {
    guestNameError.hidden = true;
    guestNameError.textContent = "";
    return;
  }
  guestNameError.hidden = false;
  guestNameError.textContent = message;
}

function openGuestPrompt() {
  return new Promise((resolve) => {
    guestPromptResolver = resolve;
    showGuestNameError("");
    guestNameInput.value = guestProfile?.name || "";
    guestPrompt.hidden = false;
    setTimeout(() => guestNameInput.focus(), 50);
  });
}

function closeGuestPrompt(profile) {
  guestPrompt.hidden = true;
  const resolve = guestPromptResolver;
  guestPromptResolver = null;
  if (resolve) resolve(profile);
}

function submitGuestNickname(event) {
  if (event) event.preventDefault();
  const name = guestNameInput.value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 12) {
    showGuestNameError("Use 2–12 characters.");
    guestNameInput.focus();
    return;
  }
  const profile = {
    id: guestProfile?.id || crypto.randomUUID(),
    name,
    color: guestProfile?.color || GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)],
  };
  saveGuestProfile(profile);
  closeGuestPrompt(profile);
}

async function ensureGuestProfile() {
  guestProfile = loadGuestProfile();
  if (guestProfile) return guestProfile;
  return openGuestPrompt();
}

function stopPartySubscription() {
  if (unsubscribeParty) {
    unsubscribeParty();
    unsubscribeParty = null;
  }
}

async function detachFromParty({ deleteSeat = true } = {}) {
  const code = partyCode;
  const guestId = guestProfile?.id;
  stopPartySubscription();
  partyCode = null;
  currentParty = null;
  if (deleteSeat && code && guestId) {
    try {
      await leaveParty(code, guestId);
    } catch (err) {
      console.error(err);
    }
  }
}

function renderSeatRow(container, party) {
  if (!container) return;
  const seats = party?.seats || [null, null, null, null];
  const hostId = party?.hostId;
  container.innerHTML = "";
  seats.forEach((seat, index) => {
    const el = document.createElement("div");
    const isSelf = seat && guestProfile && seat.id === guestProfile.id;
    const isHost = seat && seat.id === hostId;
    el.className = `party-seat${seat ? "" : " party-seat--empty"}${isSelf ? " party-seat--self" : ""}${isHost ? " party-seat--host" : ""}`;

    const avatar = document.createElement("div");
    avatar.className = "party-seat__avatar";
    if (seat) {
      avatar.style.background = seat.color || GUEST_COLORS[index % GUEST_COLORS.length];
      const initial = document.createElement("span");
      initial.className = "party-seat__initial";
      initial.textContent = (seat.name || "?").charAt(0).toUpperCase();
      avatar.appendChild(initial);
      if (isHost) {
        const badge = document.createElement("span");
        badge.className = "party-seat__badge";
        badge.textContent = "Host";
        avatar.appendChild(badge);
      }
    }

    const name = document.createElement("p");
    name.className = "party-seat__name";
    name.textContent = seat ? seat.name : "Open";

    el.appendChild(avatar);
    el.appendChild(name);
    container.appendChild(el);
  });
}

function updateLobbyControls(party) {
  const count = occupiedCount(party?.seats);
  const isHost = party && guestProfile && party.hostId === guestProfile.id;
  partyCodeValue.textContent = party?.code || "------";

  if (!party) {
    lobbyStatus.textContent = "Connecting to party…";
    partyPlayBtn.hidden = true;
    return;
  }

  if (isHost) {
    partyPlayBtn.hidden = false;
    partyPlayBtn.disabled = count < 2 || partyBusy;
    lobbyStatus.textContent =
      count < 2
        ? "Waiting for at least one more player…"
        : "Ready — press Play when everyone is in.";
  } else {
    partyPlayBtn.hidden = true;
    lobbyStatus.textContent =
      count < 2
        ? "Waiting for more players…"
        : "Waiting for the host to start…";
  }

  const canSelectMode = isHost && !partyBusy;
  if (modeCoopBtn) modeCoopBtn.disabled = !canSelectMode;
  if (modePvpBtn) modePvpBtn.disabled = !canSelectMode;
  if (modeStatus) {
    modeStatus.textContent = isHost
      ? "Pick Co-op or PvP to continue."
      : "Waiting for the host to choose a mode…";
  }

  if (formatNormalBtn) formatNormalBtn.disabled = !canSelectMode;
  if (formatTeamsBtn) formatTeamsBtn.disabled = !canSelectMode;
  if (pvpFormatStatus) {
    pvpFormatStatus.textContent = isHost
      ? "Pick Normal or Teams."
      : "Waiting for the host to choose a format…";
  }

  updateTeamsPanel(party);
}

function renderTeamMembers(container, seats, team) {
  container.innerHTML = "";
  const members = (seats || []).filter((s) => s && s.team === team);
  if (!members.length) {
    const empty = document.createElement("span");
    empty.className = "party-team__empty";
    empty.textContent = "Empty";
    container.appendChild(empty);
    return;
  }
  members.forEach((seat) => {
    const el = document.createElement("span");
    el.className = "party-team__member";
    const avatar = document.createElement("span");
    avatar.className = "party-team__avatar";
    avatar.style.background = seat.color || GUEST_COLORS[0];
    avatar.textContent = (seat.name || "?").charAt(0).toUpperCase();
    const name = document.createElement("span");
    name.className = "party-team__name";
    name.textContent = seat.name;
    el.appendChild(avatar);
    el.appendChild(name);
    container.appendChild(el);
  });
}

function updateTeamsPanel(party) {
  if (!teamAMembers || !teamBMembers || !teamPickABtn || !teamPickBBtn) return;
  const seats = party?.seats || [];
  const mySeat = guestProfile
    ? seats.find((s) => s && s.id === guestProfile.id)
    : null;
  const isHost = party && guestProfile && party.hostId === guestProfile.id;
  const ready = teamsReady(seats);

  renderTeamMembers(teamAMembers, seats, "A");
  renderTeamMembers(teamBMembers, seats, "B");

  teamPickABtn.classList.toggle("party-team--selected", mySeat?.team === "A");
  teamPickBBtn.classList.toggle("party-team--selected", mySeat?.team === "B");

  if (!party) {
    if (teamsStatus) teamsStatus.textContent = "";
    if (teamsContinueBtn) teamsContinueBtn.hidden = true;
    return;
  }

  if (isHost) {
    if (teamsContinueBtn) {
      teamsContinueBtn.hidden = false;
      teamsContinueBtn.disabled = !ready || partyBusy;
    }
    if (teamsStatus) {
      teamsStatus.textContent = ready
        ? "Both sides ready — continue when everyone has picked."
        : "Everyone picks a team. Both sides need at least one player.";
    }
  } else {
    if (teamsContinueBtn) teamsContinueBtn.hidden = true;
    if (teamsStatus) {
      teamsStatus.textContent = mySeat?.team
        ? "Waiting for the host to continue…"
        : "Tap a team to join it.";
    }
  }
}

function hideAllPartyPanels() {
  multiplayerLobby.hidden = true;
  multiplayerMode.hidden = true;
  multiplayerPvpFormat.hidden = true;
  multiplayerTeams.hidden = true;
}

function showMultiplayerLobbyView() {
  multiplayerPhase = "lobby";
  cancelRegionHoverTimers();
  closeRegionDetail();
  hideAllPartyPanels();
  multiplayerLobby.hidden = false;
  regionPicker.hidden = true;
  regionSelectActive = false;
  app.classList.remove("app--start", "app--region-select", "app--game");
  app.classList.add("app--multiplayer");
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to home");
}

function showMultiplayerModeView() {
  multiplayerPhase = "mode";
  cancelRegionHoverTimers();
  closeRegionDetail();
  hideAllPartyPanels();
  multiplayerMode.hidden = false;
  regionPicker.hidden = true;
  regionSelectActive = false;
  app.classList.remove("app--start", "app--region-select", "app--game");
  app.classList.add("app--multiplayer");
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to party lobby");
}

function showMultiplayerPvpFormatView() {
  multiplayerPhase = "pvp-format";
  cancelRegionHoverTimers();
  closeRegionDetail();
  hideAllPartyPanels();
  multiplayerPvpFormat.hidden = false;
  regionPicker.hidden = true;
  regionSelectActive = false;
  app.classList.remove("app--start", "app--region-select", "app--game");
  app.classList.add("app--multiplayer");
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to mode select");
}

function showMultiplayerTeamsView() {
  multiplayerPhase = "teams";
  cancelRegionHoverTimers();
  closeRegionDetail();
  hideAllPartyPanels();
  multiplayerTeams.hidden = false;
  regionPicker.hidden = true;
  regionSelectActive = false;
  app.classList.remove("app--start", "app--region-select", "app--game");
  app.classList.add("app--multiplayer");
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to PvP format");
  updateTeamsPanel(currentParty);
}

function enterRegionSelectFromParty() {
  multiplayerPhase = "setup";
  hideAllPartyPanels();
  multiplayerActive = true;
  regionSelectActive = true;
  cancelRegionHoverTimers();
  closeRegionDetail({ restoreProvinces: false });
  resetProvincePickerUi({ showRegions: true, fromParty: true });
  setActivePack("countries").catch((err) => console.error(err));

  app.classList.remove("app--start", "app--multiplayer", "app--game");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  const backLabel =
    currentParty?.mode === "teams"
      ? "Back to team pick"
      : currentParty?.mode === "pvp"
        ? "Back to PvP format"
        : "Back to mode select";
  playScreenBack.setAttribute("aria-label", backLabel);
  gameExitBtn.hidden = true;

  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");
  updateSetupHostGate();
}

function applyPartySnapshot(party) {
  if (!multiplayerActive && !partyCode) return;

  if (!party) {
    if (gameStarted && isMultiplayerMatch()) {
      exitGame();
    }
    if (
      multiplayerPhase === "setup" ||
      multiplayerPhase === "mode" ||
      multiplayerPhase === "pvp-format" ||
      multiplayerPhase === "teams" ||
      multiplayerPhase === "lobby" ||
      multiplayerPhase === "playing"
    ) {
      if (!gameStarted) {
        exitMultiplayerFlow({ skipLeave: true });
        showError("Party closed.");
      }
    }
    return;
  }

  currentParty = party;
  if (partyCode) multiplayerActive = true;
  renderSeatRow(lobbySeats, party);
  renderSeatRow(modeSeats, party);
  renderSeatRow(pvpFormatSeats, party);
  renderSeatRow(teamsSeats, party);
  updateLobbyControls(party);

  if (party.game && (party.status === "playing" || party.status === "finished" || party.game.status === "roundEnd" || party.game.status === "playing" || party.game.status === "finished")) {
    applyMultiplayerGameSnapshot(party.game);
    return;
  }

  if (party.status === "setup") {
    if (multiplayerPhase !== "setup") {
      enterRegionSelectFromParty();
      if (globe && !gameStarted) globe.transitionToRegionSelect(1300);
    } else {
      updateSetupHostGate();
    }
    return;
  }

  if (party.status === "teams") {
    if (multiplayerPhase !== "teams") showMultiplayerTeamsView();
    else updateTeamsPanel(party);
    return;
  }

  if (party.status === "pvp-format") {
    if (multiplayerPhase !== "pvp-format") showMultiplayerPvpFormatView();
    return;
  }

  if (party.status === "mode") {
    if (multiplayerPhase !== "mode") showMultiplayerModeView();
    return;
  }

  if (party.status === "lobby" && multiplayerPhase !== "lobby") {
    showMultiplayerLobbyView();
  }
}

function attachPartyListener(code) {
  stopPartySubscription();
  partyCode = code;
  unsubscribeParty = subscribeParty(code, (party) => {
    applyPartySnapshot(party);
  });
}

async function beginMultiplayerFlow() {
  if (gameStarted || multiplayerActive || regionSelectActive || !globe || partyBusy) return;

  const profile = await ensureGuestProfile();
  if (!profile) return;

  partyBusy = true;
  multiplayerActive = true;
  partyJoinForm.hidden = true;
  showPartyJoinError("");
  partyCodeHint.textContent = "Tap to copy";

  showMultiplayerLobbyView();
  lobbyStatus.textContent = "Creating party…";
  renderSeatRow(lobbySeats, { seats: [profile, null, null, null], hostId: profile.id });
  partyCodeValue.textContent = "······";
  partyPlayBtn.hidden = true;

  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");
  globe.transitionToRegionSelect(1300);

  try {
    const party = await createParty(profile);
    currentParty = party;
    attachPartyListener(party.code);
    applyPartySnapshot(party);
  } catch (err) {
    console.error(err);
    multiplayerActive = false;
    multiplayerPhase = null;
    multiplayerLobby.hidden = true;
    app.classList.remove("app--multiplayer");
    app.classList.add("app--start");
    playScreenBack.hidden = true;
    globe.transitionToStartView(1300);
    showStartDemoStats();
    showError(err.message || "Could not start multiplayer.");
  } finally {
    partyBusy = false;
  }
}

async function exitMultiplayerFlow({ skipLeave = false } = {}) {
  if (gameStarted) return;

  multiplayerActive = false;
  multiplayerPhase = null;
  regionSelectActive = false;
  cancelRegionHoverTimers();
  closeRegionDetail();
  globe?.clearHoveredRegion({ restoreView: false });

  multiplayerLobby.hidden = true;
  multiplayerMode.hidden = true;
  multiplayerPvpFormat.hidden = true;
  multiplayerTeams.hidden = true;
  regionPicker.hidden = true;
  partyJoinForm.hidden = true;
  showPartyJoinError("");
  playScreenBack.hidden = true;
  playScreenBack.setAttribute("aria-label", "Back to home");

  app.classList.remove("app--multiplayer", "app--region-select", "app--game");
  app.classList.add("app--start");

  globeStage.setAttribute("role", "button");
  globeStage.setAttribute("tabindex", "0");
  globeStage.setAttribute("aria-label", "Start game");

  if (!skipLeave) await detachFromParty({ deleteSeat: true });
  else await detachFromParty({ deleteSeat: false });

  if (globe) {
    globe.transitionToStartView(1300);
    showStartDemoStats();
  }
}

function showPartyJoinError(message) {
  if (!message) {
    partyJoinError.hidden = true;
    partyJoinError.textContent = "";
    return;
  }
  partyJoinError.hidden = false;
  partyJoinError.textContent = message;
}

async function handleJoinPartySubmit(event) {
  event.preventDefault();
  if (!guestProfile || partyBusy) return;

  const code = partyJoinInput.value.trim().toUpperCase();
  showPartyJoinError("");
  partyBusy = true;

  const previousCode = partyCode;
  try {
    const party = await joinParty(code, guestProfile);
    partyJoinInput.value = "";
    partyJoinForm.hidden = true;
    multiplayerActive = true;
    attachPartyListener(party.code);
    applyPartySnapshot(party);
    if (previousCode && previousCode !== party.code) {
      leaveParty(previousCode, guestProfile.id).catch((err) => console.error(err));
    }
  } catch (err) {
    console.error(err);
    showPartyJoinError(err.message || "Could not join party.");
    if (previousCode && previousCode === partyCode) {
      attachPartyListener(previousCode);
    }
  } finally {
    partyBusy = false;
    updateLobbyControls(currentParty);
  }
}

async function handlePartyPlay() {
  if (!currentParty || !guestProfile || partyBusy) return;
  if (currentParty.hostId !== guestProfile.id) return;
  if (occupiedCount(currentParty.seats) < 2) return;

  partyBusy = true;
  updateLobbyControls(currentParty);
  try {
    await setPartyStatus(currentParty.code, "mode", { mode: false });
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not start mode select.");
  } finally {
    partyBusy = false;
    updateLobbyControls(currentParty);
    updateSetupHostGate();
  }
}

async function handleModeSelect(mode) {
  if (!currentParty || !guestProfile || partyBusy) return;
  if (currentParty.hostId !== guestProfile.id) return;

  partyBusy = true;
  updateLobbyControls(currentParty);
  try {
    if (mode === "pvp") {
      await setPartyStatus(currentParty.code, "pvp-format", {
        mode: false,
        clearTeams: true,
      });
    } else {
      await setPartyStatus(currentParty.code, "setup", {
        mode,
        clearTeams: true,
      });
    }
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not set mode.");
  } finally {
    partyBusy = false;
    updateLobbyControls(currentParty);
    updateSetupHostGate();
  }
}

async function handlePvpFormatSelect(format) {
  if (!currentParty || !guestProfile || partyBusy) return;
  if (currentParty.hostId !== guestProfile.id) return;

  partyBusy = true;
  updateLobbyControls(currentParty);
  try {
    if (format === "teams") {
      await setPartyStatus(currentParty.code, "teams", {
        mode: "teams",
        clearTeams: true,
      });
    } else {
      await setPartyStatus(currentParty.code, "setup", {
        mode: "pvp",
        clearTeams: true,
      });
    }
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not set PvP format.");
  } finally {
    partyBusy = false;
    updateLobbyControls(currentParty);
    updateSetupHostGate();
  }
}

async function handleTeamPick(team) {
  if (!currentParty || !guestProfile || partyBusy) return;
  if (currentParty.status !== "teams") return;

  partyBusy = true;
  updateTeamsPanel(currentParty);
  try {
    await assignSeatTeam(currentParty.code, guestProfile.id, team);
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not join that team.");
  } finally {
    partyBusy = false;
    updateTeamsPanel(currentParty);
  }
}

async function handleTeamsContinue() {
  if (!currentParty || !guestProfile || partyBusy) return;
  if (currentParty.hostId !== guestProfile.id) return;
  if (!teamsReady(currentParty.seats)) return;

  partyBusy = true;
  updateTeamsPanel(currentParty);
  try {
    await setPartyStatus(currentParty.code, "setup", { mode: "teams" });
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not continue.");
  } finally {
    partyBusy = false;
    updateLobbyControls(currentParty);
    updateSetupHostGate();
  }
}

async function handlePlayScreenBack() {
  if (gameStarted || !globe) return;

  if (multiplayerPhase === "setup" && multiplayerActive) {
    if (guestProfile && currentParty && currentParty.hostId === guestProfile.id) {
      try {
        if (currentParty.mode === "teams") {
          await setPartyStatus(currentParty.code, "teams", { mode: "teams" });
        } else if (currentParty.mode === "pvp") {
          await setPartyStatus(currentParty.code, "pvp-format", {
            mode: false,
            clearTeams: true,
          });
        } else {
          await setPartyStatus(currentParty.code, "mode", {
            mode: false,
            clearTeams: true,
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      await exitMultiplayerFlow();
    }
    return;
  }

  if (multiplayerPhase === "teams") {
    if (guestProfile && currentParty && currentParty.hostId === guestProfile.id) {
      try {
        await setPartyStatus(currentParty.code, "pvp-format", {
          mode: false,
          clearTeams: true,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await exitMultiplayerFlow();
    }
    return;
  }

  if (multiplayerPhase === "pvp-format") {
    if (guestProfile && currentParty && currentParty.hostId === guestProfile.id) {
      try {
        await setPartyStatus(currentParty.code, "mode", {
          mode: false,
          clearTeams: true,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await exitMultiplayerFlow();
    }
    return;
  }

  if (multiplayerPhase === "mode") {
    if (guestProfile && currentParty && currentParty.hostId === guestProfile.id) {
      try {
        await setPartyStatus(currentParty.code, "lobby", {
          mode: false,
          clearTeams: true,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await exitMultiplayerFlow();
    }
    return;
  }

  if (multiplayerActive || multiplayerPhase === "lobby") {
    await exitMultiplayerFlow();
    return;
  }

  if (
    regionSelectActive &&
    regionPicker.classList.contains("region-picker--detail") &&
    playSetup.catalogue === "connector"
  ) {
    closeRegionDetail({ restoreProvinces: false });
    playScreenBack.setAttribute("aria-label", "Back to home");
    return;
  }

  if (
    regionSelectActive &&
    regionPicker.classList.contains("region-picker--regions") &&
    !regionPicker.classList.contains("region-picker--detail") &&
    !regionPicker.classList.contains("region-picker--provinces") &&
    !regionPicker.classList.contains("region-picker--party")
  ) {
    closeCountriesCatalogue();
    playScreenBack.setAttribute("aria-label", "Back to home");
    return;
  }

  exitPlayFlow();
}

async function copyPartyCode() {
  if (!currentParty?.code) return;
  try {
    await navigator.clipboard.writeText(currentParty.code);
    partyCodeHint.textContent = "Copied!";
    setTimeout(() => {
      partyCodeHint.textContent = "Tap to copy";
    }, 1200);
  } catch {
    partyCodeHint.textContent = currentParty.code;
  }
}

function beginPlayFlow() {
  if (gameStarted || regionSelectActive || multiplayerActive || !globe) return;
  regionSelectActive = true;
  cancelRegionHoverTimers();
  playSetup.catalogue = "countries";

  app.classList.remove("app--start", "app--multiplayer");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to home");
  gameExitBtn.hidden = true;
  closeRegionDetail({ restoreProvinces: false });
  resetProvincePickerUi({ showRegions: false });
  updateSetupCatalogueUi();
  setActivePack("countries").catch((err) => console.error(err));
  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");

  globe.transitionToRegionSelect(1300);
}

function exitPlayFlow() {
  if (!regionSelectActive || gameStarted || !globe) return;
  if (multiplayerActive) return;

  regionSelectActive = false;
  cancelRegionHoverTimers();
  closeRegionDetail({ restoreProvinces: false });
  resetProvincePickerUi({ showRegions: false });
  globe.clearHoveredRegion({ restoreView: false });
  setActivePack("countries").catch((err) => console.error(err));

  app.classList.remove("app--region-select");
  app.classList.add("app--start");
  regionPicker.hidden = true;
  playScreenBack.hidden = true;
  playScreenBack.setAttribute("aria-label", "Back to home");

  globeStage.setAttribute("role", "button");
  globeStage.setAttribute("tabindex", "0");
  globeStage.setAttribute("aria-label", "Start game");

  globe.transitionToStartView(1300);
  showStartDemoStats();
}

async function openProvincesList() {
  if (!globe) return;
  cancelRegionHoverTimers();
  regionPicker.classList.remove("region-picker--detail");
  regionPicker.classList.add("region-picker--regions", "region-picker--provinces");
  regionDetail.setAttribute("aria-hidden", "true");
  provinceList.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  modeCatalogue.setAttribute("aria-hidden", "true");
  try {
    await setActivePack("countries");
    if (!regionSelectActive) return;
    // Normal world view until United States / Canada is hovered / selected.
    globe.clearHoveredRegion({ restoreView: true });
  } catch (err) {
    console.error(err);
    showError("Failed to load map.");
  }
}

async function closeProvincesList() {
  if (!globe) return;
  cancelRegionHoverTimers();
  regionPicker.classList.remove("region-picker--provinces");
  regionPicker.classList.add("region-picker--regions");
  provinceList.setAttribute("aria-hidden", "true");
  regionList.setAttribute("aria-hidden", "false");
  modeCatalogue.setAttribute("aria-hidden", "true");
  globe.clearHoveredRegion({ restoreView: true });
  try {
    await setActivePack("countries");
  } catch (err) {
    console.error(err);
  }
}

async function openRegionDetail(option) {
  if (!globe) return;
  cancelRegionHoverTimers();
  playSetup.catalogue = "countries";
  const region = option.dataset.region;
  playSetup.region = region;
  regionDetailTitle.textContent = option.textContent.trim();
  regionDetailClose.setAttribute(
    "aria-label",
    isAdminRegion(region) ? "Back to provinces" : "Back to regions"
  );
  regionDetail.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  provinceList.setAttribute("aria-hidden", "true");
  modeCatalogue.setAttribute("aria-hidden", "true");
  regionPicker.classList.add("region-picker--regions", "region-picker--detail");
  if (isAdminRegion(region)) {
    regionPicker.classList.add("region-picker--provinces");
  } else {
    regionPicker.classList.remove("region-picker--provinces");
  }
  try {
    // Preview stays on the world map; admin mesh loads only when the game starts.
    await setActivePack("countries");
    if (!globe) return;
    globe.setHoveredRegion(region, {
      locked: true,
    });
  } catch (err) {
    console.error(err);
    showError("Failed to load map data.");
  }
  updateSetupCatalogueUi();
  updateSetupHostGate();
}

function closeRegionDetail({ restoreProvinces = false } = {}) {
  regionPicker.classList.remove("region-picker--detail");
  regionDetail.setAttribute("aria-hidden", "true");
  globe?.unlockRegionDetail();
  if (playSetup.catalogue === "connector" && !restoreProvinces) {
    playSetup.catalogue = "countries";
    regionPicker.classList.remove("region-picker--regions", "region-picker--provinces");
    provinceList.setAttribute("aria-hidden", "true");
    regionList.setAttribute("aria-hidden", "true");
    modeCatalogue.setAttribute("aria-hidden", "false");
    updateSetupCatalogueUi();
    globe?.clearHoveredRegion({ restoreView: true });
    return;
  }
  if (restoreProvinces) {
    regionPicker.classList.add("region-picker--regions", "region-picker--provinces");
    provinceList.setAttribute("aria-hidden", "false");
    regionList.setAttribute("aria-hidden", "true");
    modeCatalogue.setAttribute("aria-hidden", "true");
    // Back to provinces list: normal globe until a country is hovered again.
    globe?.clearHoveredRegion({ restoreView: true });
  } else if (!regionPicker.classList.contains("region-picker--provinces")) {
    provinceList.setAttribute("aria-hidden", "true");
    if (regionPicker.classList.contains("region-picker--regions")) {
      regionList.setAttribute("aria-hidden", "false");
      modeCatalogue.setAttribute("aria-hidden", "true");
    } else {
      regionList.setAttribute("aria-hidden", "true");
      modeCatalogue.setAttribute("aria-hidden", "false");
    }
  }
  updateSetupCatalogueUi();
}

function setActiveSetupOption(options, selected) {
  options.forEach((btn) => {
    btn.classList.toggle("game-setup__option--active", btn === selected);
  });
}

function updateLevelDescription(levelId) {
  const mode = getLevelMode(levelId);
  levelDescEl.textContent = mode.summary;
}

function updateSetupHints() {
  if (playSetup.catalogue === "connector") {
    const perfectCap = Math.round(
      CONNECTOR_MAX_ROUND_SCORE * (1 + PERFECT_BONUS_RATIO)
    );
    const perRound =
      playSetup.timer > 0
        ? Math.round(perfectCap * (1 + TIMER_BONUS_RATIO))
        : perfectCap;
    const maxTotal = perRound * playSetup.rounds;
    setupMaxScoreEl.textContent = playSetup.timer > 0
      ? `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)} with perfect + timer).`
      : `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)} with perfect clear).`;
    setupTimerHintEl.textContent = playSetup.timer > 0
      ? `Par chain = perfect (+${Math.round(PERFECT_BONUS_RATIO * 100)}%). Finish under ${playSetup.timer}s for another +${Math.round(TIMER_BONUS_RATIO * 100)}%. Time out = 0.`
      : `Par chain = perfect (+${Math.round(PERFECT_BONUS_RATIO * 100)}% over base). Time out scores 0 for that round.`;
    syncConnectorLengthUi();
    return;
  }

  const mode = getLevelMode(playSetup.level);
  updateLevelDescription(playSetup.level);

  const perfectCap = Math.round(mode.maxRoundScore * (1 + PERFECT_BONUS_RATIO));
  const perRound =
    playSetup.timer > 0
      ? Math.round(perfectCap * (1 + TIMER_BONUS_RATIO))
      : perfectCap;
  const maxTotal = perRound * playSetup.rounds;
  setupMaxScoreEl.textContent = playSetup.timer > 0
    ? `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)} with perfect + timer).`
    : `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)} with perfect clear).`;

  setupTimerHintEl.textContent = playSetup.timer > 0
    ? `1–2 guesses = full round. First try = perfect (+${Math.round(PERFECT_BONUS_RATIO * 100)}%). Under ${playSetup.timer}s = +${Math.round(TIMER_BONUS_RATIO * 100)}% more. Time out = 0.`
    : `1–2 guesses = full round points. First try adds a +${Math.round(PERFECT_BONUS_RATIO * 100)}% perfect bonus.`;
}

input.addEventListener("input", () => {
  clearError();
  activeSuggestion = -1;
  updateSuggestions();
});

input.addEventListener("keydown", (e) => {
  const mode = currentMode();
  if (mode.autocomplete) {
    const items = suggestionsEl.querySelectorAll(".game__suggestion");
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1);
      renderSuggestions(countries.search(input.value.trim(), 8, poolOpts()));
      return;
    }
    if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      activeSuggestion = Math.max(activeSuggestion - 1, 0);
      renderSuggestions(countries.search(input.value.trim(), 8, poolOpts()));
      return;
    }
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.repeat) return;
    submitGuess();
    return;
  }
  if (e.key === "Escape") hideSuggestions();
});

input.addEventListener("blur", () => {
  setTimeout(hideSuggestions, 150);
});

enterBtn.addEventListener("click", () => submitGuess());
newGameBtn.addEventListener("click", () => restartSession());
practiceExitBtn.addEventListener("click", () => exitGame());
roundExitBtn.addEventListener("click", () => exitGame());
finalExitBtn.addEventListener("click", () => exitGame());
gameExitBtn.addEventListener("click", () => exitGame());
if (roundSheetMapBtn) {
  roundSheetMapBtn.addEventListener("click", () => {
    if (scoreSheetRound.hidden) return;
    const collapsed = !scoreSheetRound.classList.contains("game__sheet--map-peek");
    setRoundSheetMapPeek(collapsed);
  });
}
roundSheetBtn.addEventListener("click", () => {
  if (!awaitingNextRound) return;
  if (isMultiplayerMatch()) {
    if (activeSession.currentRound >= activeSession.totalRounds) {
      if (isPartyHost()) {
        handleMultiplayerAdvance().catch((err) => console.error(err));
      } else {
        showFinalSheet();
      }
      return;
    }
    handleMultiplayerAdvance().catch((err) => console.error(err));
    return;
  }
  if (activeSession.currentRound >= activeSession.totalRounds) {
    showFinalSheet();
    return;
  }
  startNextRound();
});
finalSheetBtn.addEventListener("click", () => {
  if (isMultiplayerMatch()) {
    exitGame();
    return;
  }
  restartSession();
});

function setDistanceUnit(unit) {
  distanceUnit = unit;
  guessesUnitGroup.querySelectorAll(".game__guesses-unit-btn").forEach((b) => {
    b.classList.toggle("game__guesses-unit-btn--active", b.dataset.unit === unit);
  });
  renderGuesses();
  if (currentParty?.game) updateRivalsHud(currentParty.game);
  if (radiusCircleState) syncRadiusUi(radiusCircleState);
}

guessesSort.addEventListener("change", () => {
  guessSort = guessesSort.value;
  renderGuesses();
});

guessesUnitGroup.addEventListener("click", (e) => {
  const btn = e.target.closest(".game__guesses-unit-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  setDistanceUnit(btn.dataset.unit);
});

radiusToolBtn.addEventListener("click", () => {
  if (!globe || !gameStarted || !currentMode().radiusTool) return;
  setRadiusToolOn(!radiusToolOn);
});

radiusClearBtn.addEventListener("click", () => {
  if (!globe) return;
  globe.setRadiusCircle(null);
});

playBtn.addEventListener("click", beginPlayFlow);
practiceBtn.addEventListener("click", () => beginGame({ practice: true }));
multiplayerBtn.addEventListener("click", () => {
  beginMultiplayerFlow().catch((err) => {
    console.error(err);
    showError(err.message || "Could not start multiplayer.");
  });
});
playScreenBack.addEventListener("click", () => {
  handlePlayScreenBack().catch((err) => console.error(err));
});
gameSetupStart.addEventListener("click", () => {
  if (multiplayerActive && multiplayerPhase === "setup") {
    hostStartMultiplayerGame().catch((err) => console.error(err));
    return;
  }
  beginGame({ practice: false });
});

guestPromptForm.addEventListener("submit", submitGuestNickname);
guestNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeGuestPrompt(null);
  }
});

partyCodeBtn.addEventListener("click", () => {
  copyPartyCode().catch((err) => console.error(err));
});

partyJoinToggle.addEventListener("click", () => {
  partyJoinForm.hidden = !partyJoinForm.hidden;
  showPartyJoinError("");
  if (!partyJoinForm.hidden) {
    partyJoinInput.focus();
    partyJoinInput.select();
  }
});

partyJoinForm.addEventListener("submit", (e) => {
  handleJoinPartySubmit(e).catch((err) => console.error(err));
});

partyPlayBtn.addEventListener("click", () => {
  handlePartyPlay().catch((err) => console.error(err));
});

modeCoopBtn.addEventListener("click", () => {
  handleModeSelect("coop").catch((err) => console.error(err));
});

modePvpBtn.addEventListener("click", () => {
  handleModeSelect("pvp").catch((err) => console.error(err));
});

formatNormalBtn.addEventListener("click", () => {
  handlePvpFormatSelect("normal").catch((err) => console.error(err));
});

formatTeamsBtn.addEventListener("click", () => {
  handlePvpFormatSelect("teams").catch((err) => console.error(err));
});

teamPickABtn.addEventListener("click", () => {
  handleTeamPick("A").catch((err) => console.error(err));
});

teamPickBBtn.addEventListener("click", () => {
  handleTeamPick("B").catch((err) => console.error(err));
});

teamsContinueBtn.addEventListener("click", () => {
  handleTeamsContinue().catch((err) => console.error(err));
});

window.addEventListener("beforeunload", () => {
  if (partyCode && guestProfile?.id) {
    leaveParty(partyCode, guestProfile.id).catch(() => {});
  }
});

catalogueCountriesBtn.addEventListener("click", () => {
  if (!regionSelectActive) return;
  openCountriesCatalogue();
  playScreenBack.setAttribute("aria-label", "Back to catalogues");
});

catalogueConnectorBtn.addEventListener("click", () => {
  if (!regionSelectActive) return;
  openConnectorSetup();
  playScreenBack.setAttribute("aria-label", "Back to catalogues");
});

if (setupConnectorLength) {
  setupConnectorLength.addEventListener("input", () => {
    const idx = Number(setupConnectorLength.value) || 0;
    playSetup.connectorLength = CONNECTOR_LENGTH_OPTIONS[idx] ?? 5;
    syncConnectorLengthUi();
    updateSetupHints();
  });
}

regionListBack.addEventListener("click", () => {
  if (!regionSelectActive || multiplayerActive) return;
  closeCountriesCatalogue();
  playScreenBack.setAttribute("aria-label", "Back to home");
});

regionOptions.forEach((option) => {
  option.addEventListener("mouseenter", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    if (regionPicker.classList.contains("region-picker--provinces")) return;
    if (!regionPicker.classList.contains("region-picker--regions")) return;
    scheduleRegionActivate(option.dataset.region);
  });
  option.addEventListener("mouseleave", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    if (regionPicker.classList.contains("region-picker--provinces")) return;
    if (!regionPicker.classList.contains("region-picker--regions")) return;
    scheduleRegionHighlightClear();
  });
  option.addEventListener("click", () => {
    openRegionDetail(option).catch((err) => console.error(err));
  });
});

provincesPackBtn.addEventListener("click", () => {
  openProvincesList().catch((err) => console.error(err));
});

provinceOptions.forEach((option) => {
  option.addEventListener("mouseenter", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    scheduleRegionActivate(option.dataset.region);
  });
  option.addEventListener("mouseleave", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    scheduleRegionHighlightClear();
  });
  option.addEventListener("click", () => {
    openRegionDetail(option).catch((err) => console.error(err));
  });
});

regionList.addEventListener("mouseleave", () => {
  if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
  if (regionPicker.classList.contains("region-picker--provinces")) return;
  if (!regionPicker.classList.contains("region-picker--regions")) return;
  scheduleRegionHighlightClear();
});

provinceList.addEventListener("mouseleave", () => {
  if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
  scheduleRegionHighlightClear();
});

provinceListBack.addEventListener("click", () => {
  closeProvincesList().catch((err) => console.error(err));
});

regionDetailClose.addEventListener("click", () => {
  closeRegionDetail({ restoreProvinces: isAdminRegion(playSetup.region) });
});

setupAllCountriesBtn.addEventListener("click", () => {
  setAllCountriesSwitch(!playSetup.allCountries);
});

roundOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setActiveSetupOption(roundOptions, option);
    playSetup.rounds = Number(option.dataset.rounds);
    updateSetupHints();
  });
});

timerOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setActiveSetupOption(timerOptions, option);
    playSetup.timer = Number(option.dataset.timer);
    updateSetupHints();
  });
});

levelOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setActiveSetupOption(levelOptions, option);
    playSetup.level = option.dataset.level;
    updateSetupHints();
  });
});

function setControlsEnabled(enabled) {
  multiplayerBtn.disabled = !enabled;
  playBtn.disabled = !enabled;
  practiceBtn.disabled = !enabled;
  input.disabled = !enabled;
  enterBtn.disabled = !enabled;
  if (!enabled) {
    gameSetupStart.disabled = true;
  } else {
    updateSetupHostGate();
  }
}

function dismissBootLoader() {
  if (!loadingEl || loadingEl.classList.contains("boot-loader--fade")) return;
  loadingEl.classList.add("boot-loader--fade");
  loadingEl.setAttribute("aria-busy", "false");
  const finish = () => {
    loadingEl.hidden = true;
  };
  loadingEl.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, 400);
}

async function init() {
  createStars();
  guestProfile = loadGuestProfile();
  updateStartNickname();
  setControlsEnabled(false);
  countriesPack = await loadCountries();
  decorateCountriesPackForAdminPreview(countriesPack);
  countries = countriesPack;
  activePackId = "countries";
  globe = createGlobe(
    globeContainer,
    countries.features,
    countries.regionMembers,
    countries.regionCentroids
  );
  globe.onRadiusDrag(syncRadiusUi);
  globe.initStartView();
  showStartDemoStats();
  setAllCountriesSwitch(false);
  updateSetupHints();
  updateSetupPoolVisibility();

  // Uncover as soon as the globe has a painted frame.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  dismissBootLoader();
  setControlsEnabled(true);

  // Upgrade island meshes once precise borders finish (non-blocking).
  // Border distance data mutates in place; only refresh the display mesh on the start screen.
  countriesPack.bordersReady
    ?.then((pack) => {
      if (!globe || activePackId !== "countries") return;
      if (gameStarted || regionSelectActive || multiplayerActive) return;
      globe.setGeography({
        features: pack.features,
        regionMembers: pack.regionMembers,
        regionCentroids: pack.regionCentroids,
      });
      globe.initStartView();
      showStartDemoStats();
    })
    .catch((err) => console.error("Border enrich failed", err));
}

init().catch((err) => {
  dismissBootLoader();
  setControlsEnabled(false);
  console.error(err);
  showError("Failed to load game data. Please refresh the page.");
});
