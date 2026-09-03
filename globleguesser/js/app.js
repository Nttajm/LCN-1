import { loadCountries } from "./countries.js";
import { closestBorder, bearing, formatDistance, distanceUnitLabel } from "./distance.js";
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
  formatScore,
  scoreMultiplierLabel,
  maxSessionScore,
  TIMER_BONUS_RATIO,
} from "./score.js";
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
} from "./party.js";

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
const partyCodeBtn = document.getElementById("party-code");
const partyCodeValue = document.getElementById("party-code-value");
const partyCodeHint = document.getElementById("party-code-hint");
const lobbySeats = document.getElementById("lobby-seats");
const modeSeats = document.getElementById("mode-seats");
const lobbyStatus = document.getElementById("lobby-status");
const modeStatus = document.getElementById("mode-status");
const partyPlayBtn = document.getElementById("party-play-btn");
const partyJoinToggle = document.getElementById("party-join-toggle");
const partyJoinForm = document.getElementById("party-join-form");
const partyJoinInput = document.getElementById("party-join-input");
const partyJoinError = document.getElementById("party-join-error");
const modeCoopBtn = document.getElementById("mode-coop");
const modePvpBtn = document.getElementById("mode-pvp");
const regionPicker = document.getElementById("region-picker");
const regionList = document.getElementById("region-list");
const regionOptions = regionList.querySelectorAll(".region-picker__option");
const regionDetail = document.getElementById("region-detail");
const regionDetailTitle = document.getElementById("region-detail-title");
const regionDetailClose = document.getElementById("region-detail-close");
const gameSetup = document.getElementById("game-setup");
const roundOptions = gameSetup.querySelectorAll("[data-rounds]");
const timerOptions = gameSetup.querySelectorAll("[data-timer]");
const levelOptions = gameSetup.querySelectorAll("[data-level]");
const levelDescEl = document.getElementById("level-desc");
const setupMaxScoreEl = document.getElementById("setup-max-score");
const setupTimerHintEl = document.getElementById("setup-timer-hint");
const setupHostWaitEl = document.getElementById("setup-host-wait");
const gameModeEl = document.getElementById("game-mode");
const gameScorebarEl = document.getElementById("game-scorebar");
const scorebarRoundEl = document.getElementById("scorebar-round");
const scorebarAwardEl = document.getElementById("scorebar-award");
const scorebarTotalEl = document.getElementById("scorebar-total");
const scorebarMaxEl = document.getElementById("scorebar-max");
const scorebarLevelEl = document.getElementById("scorebar-level");
const scorebarTimerEl = document.getElementById("scorebar-timer");
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
const roundSheetStatus = document.getElementById("round-sheet-status");
const roundSheetMeta = document.getElementById("round-sheet-meta");
const roundSheetPoints = document.getElementById("round-sheet-points");
const roundSheetBreakdown = document.getElementById("round-sheet-breakdown");
const roundSheetBtn = document.getElementById("round-sheet-btn");
const roundExitBtn = document.getElementById("round-exit-btn");
const scoreSheetFinal = document.getElementById("score-sheet-final");
const finalSheetTotal = document.getElementById("final-sheet-total");
const finalSheetMax = document.getElementById("final-sheet-max");
const finalSheetBest = document.getElementById("final-sheet-best");
const finalSheetList = document.getElementById("final-sheet-list");
const finalSheetBtn = document.getElementById("final-sheet-btn");
const finalExitBtn = document.getElementById("final-exit-btn");
const globeContainer = document.getElementById("globe-viz");
const loadingEl = document.getElementById("loading");
const gameSetupStart = document.getElementById("game-setup-start");

const REGION_LABELS = {
  world: "World",
  asia: "Asia",
  americas: "Americas",
  europe: "Europe",
  africa: "Africa",
  "east-hemisphere": "East Hemisphere",
};

let countries = null;
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
const ROW_STAGGER_MS = [40, 70, 55, 90, 60, 75, 50, 85];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  scorebarMaxEl.textContent = `/ ${formatScore(max)}`;
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

  const start = performance.now();
  const duration = 180;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    scorebarTotalEl.textContent = formatScore(value);
    scorebarMaxEl.textContent = `/ ${formatScore(max)}`;
    if (t < 1) {
      totalTweenRaf = requestAnimationFrame(tick);
      return;
    }
    totalTweenRaf = null;
    displayedTotal = to;
  };
  totalTweenRaf = requestAnimationFrame(tick);
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
};

const playSetup = {
  region: "world",
  level: "easy",
  rounds: 5,
  timer: 0,
};

const HOVER_ACTIVATE_MS = 300;
const HOVER_CLEAR_MS = 220;

let hoverActivateTimer = null;
let hoverClearTimer = null;
let timerInterval = null;
let timerRemainingMs = 0;
let timerStarted = false;

function cancelRegionHoverTimers() {
  clearTimeout(hoverActivateTimer);
  clearTimeout(hoverClearTimer);
  hoverActivateTimer = null;
  hoverClearTimer = null;
}

function scheduleRegionActivate(region) {
  cancelRegionHoverTimers();
  hoverActivateTimer = setTimeout(() => {
    if (!globe || !regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    globe.setHoveredRegion(region);
  }, HOVER_ACTIVATE_MS);
}

function scheduleRegionHighlightClear() {
  clearTimeout(hoverActivateTimer);
  hoverActivateTimer = null;
  clearTimeout(hoverClearTimer);
  hoverClearTimer = setTimeout(() => {
    if (!globe || !regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    globe.clearRegionHighlight();
  }, HOVER_CLEAR_MS);
}

function createStars() {
  const count = 140;
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
  return activeSession.mode;
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
  return activeSession.roundResults.map((r) => r.country);
}

function sessionMaxScore() {
  return maxSessionScore(
    currentMode().maxRoundScore,
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
  const region = REGION_LABELS[activeSession.region] || activeSession.region;
  const level = currentMode().label;
  const timerPart = activeSession.timerSec ? ` · ${activeSession.timerSec}s` : "";
  const modePart =
    activeSession.multiMode === "pvp"
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
  for (let i = 0; i < rounds; i += 1) {
    const country = countries.randomTarget(region, names);
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
        color: guessFillColor(mode, distance, correct),
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
  if (activeSession.multiMode !== "pvp") return all;
  if (game.status === "finished") return all;
  const myId = guestProfile?.id;
  return all.filter((g) => g.playerId === myId);
}

function buildMarkerGroups(game) {
  const byCountry = new Map();
  const showAll = activeSession.multiMode !== "pvp" || game.status === "finished";
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
  globe.clearGuesses();
  const painted = new Map();
  visiblePlayerGuesses(game).forEach((guess) => {
    const prev = painted.get(guess.name);
    if (!prev || guess.correct || guess.distance < prev.distance) {
      painted.set(guess.name, guess);
    }
  });
  painted.forEach((guess) => {
    globe.setGuess(
      guess.name,
      guessFillColor(mode, guess.distance, guess.correct),
      guessStrokeColor(mode, guess.correct)
    );
  });
  if (game.status === "roundEnd" && target) {
    globe.setGuess(target.name, "rgb(106, 170, 100)", "#2d5a28");
  }
  globe.setPlayerMarkers(buildMarkerGroups(game));
}

function updateRivalsHud(game) {
  if (!mpRivalsEl) return;
  if (!isMultiplayerMatch() || activeSession.multiMode !== "pvp" || !game || game.status !== "playing") {
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
    chips.push({ id, name: player.name, color: player.color, label });
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
    name.textContent = chip.name;
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
        color: guessFillColor(mode, distance, correct),
        correct,
        centroid: country?.centroid || { lat: 0, lng: 0 },
        orderIndex: index,
        playerId: guestProfile?.id,
        playerName: mine?.name,
        playerColor: mine?.color,
      };
    });
  }
  renderGuesses();
  updateGuessesLeftDisplay();
}

function showMultiplayerRoundSheet(game) {
  const winnerId = game.roundWinnerId;
  const winner = winnerId ? game.players?.[winnerId] : null;
  const iWon = winnerId && winnerId === guestProfile?.id;
  const myGuesses = game.players?.[guestProfile?.id]?.guesses || [];
  const guessCount = myGuesses.length;

  const remainingForScore = iWon && timerStarted ? timerRemainingMs : 0;
  const scored = scoreRound({
    guessCount: iWon ? guessCount : myGuesses.length,
    won: Boolean(iWon),
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
  if (!countries || !globe || !game) return;

  multiplayerPhase = "playing";
  mpRoundHandledKey = null;
  mpBoardFingerprint = "";

  const enteringFresh = !gameStarted;
  if (enteringFresh) {
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
    closeRegionDetail();
    globeStage.removeAttribute("role");
    globeStage.removeAttribute("tabindex");
    globeStage.removeAttribute("aria-label");
    globe.transitionToGame(1300);
    setTimeout(() => input.focus(), 1350);
  }

  activeSession = {
    region: game.region,
    level: game.level,
    timerSec: game.timerSec,
    mode: getLevelMode(game.level),
    isPractice: false,
    totalRounds: game.rounds,
    currentRound: game.currentRound,
    roundResults: enteringFresh ? [] : activeSession.roundResults,
    totalScore: enteringFresh ? 0 : activeSession.totalScore,
    multiMode: currentParty?.mode || activeSession.multiMode,
  };

  startMultiplayerRound(game);
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
    showError("Shared country missing. Ask host to restart.");
    return;
  }

  guesses = [];
  won = false;
  lost = false;
  submitting = false;
  mpRoundHandledKey = null;
  globe.clearGuesses();
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
  paintBoardFromGame(game);
  syncLocalGuessesFromGame(game);
  updateRivalsHud(game);
  updateModeLabel();
  updateStatusBar();
  updateScorebar();
  updateRadiusTools();
}

function applyMultiplayerGameSnapshot(game) {
  if (!game || !multiplayerActive) return;

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

  if (!gameStarted || activeSession.multiMode == null) {
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
    const targets = buildSharedTargets(playSetup.region, playSetup.rounds);
    await startPartyGame(currentParty.code, {
      region: playSetup.region,
      level: playSetup.level,
      rounds: playSetup.rounds,
      timerSec: playSetup.timer,
      targets,
      seats: currentParty.seats,
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
  scorebarRoundEl.textContent = `Round ${activeSession.currentRound} / ${activeSession.totalRounds}`;
  scorebarLevelEl.textContent = `${currentMode().label} ${scoreMultiplierLabel(currentMode().maxRoundScore)}`;

  if (activeSession.timerSec > 0) {
    scorebarTimerEl.hidden = false;
    scorebarTimerEl.textContent = `Timer +${Math.round(TIMER_BONUS_RATIO * 100)}%`;
  } else {
    scorebarTimerEl.hidden = true;
  }

  const max = sessionMaxScore();
  const targetTotal = activeSession.totalScore;

  if (animateAward && lastRoundAward != null) {
    tweenScorebarTotal(displayedTotal, targetTotal, max);
  } else {
    setScorebarTotalInstant(targetTotal, max);
  }

  if (lastRoundAward != null) {
    scorebarAwardEl.hidden = false;
    scorebarAwardEl.textContent = lastRoundAward > 0 ? `+${formatScore(lastRoundAward)}` : "+0";
    scorebarAwardEl.classList.toggle("game__scorebar-award--zero", lastRoundAward === 0);
    if (animateAward) {
      triggerAwardMotion(lastRoundAward === 0);
    }
  } else {
    scorebarAwardEl.hidden = true;
    scorebarAwardEl.textContent = "";
    scorebarAwardEl.classList.remove(
      "game__scorebar-award--zero",
      "game__scorebar-award--pop",
      "game__scorebar-award--shake"
    );
  }
}

function hideAllSheets() {
  practiceEndEl.hidden = true;
  scoreSheetRound.hidden = true;
  scoreSheetFinal.hidden = true;
  winPanel.hidden = true;
  practiceEndEl.classList.remove("game__sheet--enter");
  scoreSheetRound.classList.remove("game__sheet--enter");
  scoreSheetFinal.classList.remove("game__sheet--enter");
}

function setPromptVisible(visible) {
  gamePromptEl.hidden = !visible;
}

function renderCountryBlock(container, name, iso2) {
  container.innerHTML = "";
  const flagSrc = flagUrl(iso2);
  if (flagSrc) {
    const flag = document.createElement("img");
    flag.className = "game__sheet-flag";
    flag.src = flagSrc;
    flag.alt = "";
    flag.width = 28;
    flag.height = 21;
    flag.loading = "lazy";
    flag.decoding = "async";
    flag.addEventListener("error", () => flag.remove());
    container.appendChild(flag);
  }
  const label = document.createElement("span");
  label.className = "game__sheet-country-name";
  label.textContent = name;
  container.appendChild(label);
}

function showPracticeEnd(message) {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  practiceEndEl.hidden = false;
  winText.textContent = message;
  playSheetEnter(practiceEndEl);
}

function showRoundSheet(result) {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  scoreSheetRound.hidden = false;
  awaitingNextRound = true;

  const isLast = activeSession.currentRound >= activeSession.totalRounds;
  roundSheetKicker.textContent = `Round ${result.round} of ${activeSession.totalRounds}`;
  renderCountryBlock(roundSheetCountry, result.country, result.iso2);

  if (result.multiStatus) {
    roundSheetStatus.textContent = result.multiStatus;
    roundSheetStatus.className = result.multiWin
      ? "game__sheet-status game__sheet-status--win"
      : "game__sheet-status game__sheet-status--lose";
  } else if (result.won) {
    roundSheetStatus.textContent = "Found it";
    roundSheetStatus.className = "game__sheet-status game__sheet-status--win";
  } else if (result.timedOut) {
    roundSheetStatus.textContent = "Time's up";
    roundSheetStatus.className = "game__sheet-status game__sheet-status--lose";
  } else {
    roundSheetStatus.textContent = "Out of guesses";
    roundSheetStatus.className = "game__sheet-status game__sheet-status--lose";
  }

  const guessWord = result.guesses === 1 ? "guess" : "guesses";
  roundSheetMeta.textContent = result.won || result.multiWin
    ? `${result.guesses} ${guessWord}`
    : `${result.guesses} ${guessWord} · answer revealed`;

  roundSheetPoints.textContent = formatScore(result.score.total);
  roundSheetPoints.classList.toggle("game__sheet-score-value--zero", result.score.total === 0);

  if ((result.won || result.multiWin) && result.score.bonus > 0) {
    roundSheetBreakdown.textContent = `${formatScore(result.score.base)} + ${formatScore(result.score.bonus)} timer bonus`;
  } else if (result.won || result.multiWin) {
    roundSheetBreakdown.textContent = `${formatScore(result.score.base)} base`;
  } else if (result.timedOut) {
    roundSheetBreakdown.textContent = "Timed out — 0 points this round";
  } else if (result.multiStatus && !result.multiWin) {
    roundSheetBreakdown.textContent = "0 points this round";
  } else {
    roundSheetBreakdown.textContent = "Missed — 0 points this round";
  }

  const isMp = isMultiplayerMatch();
  if (isMp && !isPartyHost()) {
    roundSheetBtn.textContent = isLast ? "Waiting for host…" : "Waiting for host…";
    roundSheetBtn.disabled = true;
  } else {
    roundSheetBtn.disabled = false;
    roundSheetBtn.textContent = isLast ? "View results" : "Next round";
  }
  playSheetEnter(scoreSheetRound);
}

function showFinalSheet() {
  hideAllSheets();
  setPromptVisible(false);
  winPanel.hidden = false;
  scoreSheetFinal.hidden = false;
  awaitingNextRound = false;

  const max = sessionMaxScore();
  finalSheetTotal.textContent = formatScore(activeSession.totalScore);
  finalSheetMax.textContent = `of ${formatScore(max)}`;

  const scores = activeSession.roundResults.map((r) => r.score.total);
  const best = scores.length ? Math.max(...scores) : 0;
  const wins = activeSession.roundResults.filter((r) => r.won).length;
  finalSheetBest.textContent = `Best round ${formatScore(best)} · ${wins}/${activeSession.totalRounds} found`;

  finalSheetList.innerHTML = "";
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

  if (!wonRound && target) {
    globe.setGuess(target.name, "rgb(106, 170, 100)", "#2d5a28");
  }

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
    li.textContent = country.name;
    li.dataset.name = country.name;
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
  const results = countries.search(query);
  if (activeSuggestion < 0 && results.length) {
    activeSuggestion = 0;
  }
  renderSuggestions(results);
}

function resolveCountry(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = countries.lookup(trimmed);
  if (direct) return direct;

  if (!currentMode().autocomplete) return null;

  if (!suggestionsEl.hidden && activeSuggestion >= 0) {
    const items = suggestionsEl.querySelectorAll(".game__suggestion");
    const item = items[activeSuggestion];
    if (item) {
      return countries.lookup(item.textContent);
    }
  }

  return null;
}

function sortedGuesses() {
  const list = [...guesses];
  if (guessSort === "order") {
    return list.sort((a, b) => b.orderIndex - a.orderIndex);
  }
  return list.sort((a, b) => a.distance - b.distance);
}

function renderGuessPill(guess) {
  const mode = currentMode();
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "game__guess-pill";
  if (guess.correct) pill.classList.add("game__guess-pill--correct");
  if (guess.playerId && guestProfile && guess.playerId !== guestProfile.id) {
    pill.classList.add("game__guess-pill--remote");
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

  if (!guess.correct) {
    const label = distanceLabel(mode, guess.distance, distanceUnit, guess.direction);
    if (label) {
      const dist = document.createElement("span");
      dist.className = "game__guess-dist";
      dist.style.color = mode.grayFill ? "rgba(255,255,255,0.75)" : guess.color;
      dist.textContent = label;
      pill.appendChild(dist);
    }
  }

  pill.addEventListener("click", () => {
    if (!mode.flyGlobe) return;
    globe.flyTo(guess.centroid.lat, guess.centroid.lng);
  });
  guessesEl.appendChild(pill);
}

function renderGuesses() {
  if (!guesses.length) {
    guessesPanel.hidden = false;
    guessesToolbar.hidden = true;
    guessesEl.hidden = true;
    guessesPlaceholder.hidden = false;
    return;
  }
  guessesPanel.hidden = false;
  guessesToolbar.hidden = false;
  guessesPlaceholder.hidden = true;
  guessesEl.hidden = false;
  guessesEl.innerHTML = "";
  sortedGuesses().forEach(renderGuessPill);
}

function submitGuess(forcedName) {
  if (submitting || gameEnded() || !countries || !globe || !gameStarted) return;

  clearError();
  const country = resolveCountry(forcedName ?? input.value);
  if (!country) {
    showError("Country not found. Try a different spelling.");
    return;
  }

  if (isMultiplayerMatch()) {
    submitMultiplayerGuess(country);
    return;
  }

  if (guesses.some((g) => g.name === country.name)) {
    showError("You already guessed that country.");
    return;
  }

  submitting = true;
  startTimerIfNeeded();

  const mode = currentMode();
  const correct = country.name === target.name;
  const proximity = correct
    ? { distance: 0, from: country.centroid, to: target.centroid }
    : closestBorder(country, target);
  const distance = proximity.distance;
  const color = guessFillColor(mode, distance, correct);
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
  if (mode.flyGlobe) {
    globe.flyTo(country.centroid.lat, country.centroid.lng);
  }

  input.value = "";
  hideSuggestions();
  hintEl.classList.add("game__hint--hidden");
  renderGuesses();
  updateGuessesLeftDisplay();

  if (correct) {
    endWin();
  } else if (mode.maxGuesses && guesses.length >= mode.maxGuesses) {
    endLose(`Out of guesses! The country was ${target.name}.`);
  }

  submitting = false;
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

  submitting = true;
  startTimerIfNeeded();

  const mode = currentMode();
  const correct = country.name === target.name;
  const proximity = correct
    ? { distance: 0, from: country.centroid, to: target.centroid }
    : closestBorder(country, target);
  const distance = proximity.distance;
  const color = guessFillColor(mode, distance, correct);
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

    if (mode.flyGlobe) {
      globe.flyTo(country.centroid.lat, country.centroid.lng);
    }

    globe.setGuess(country.name, color, outline);

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

    const ownMarkers = [];
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
  } finally {
    submitting = false;
  }
}

function startRoundPlay() {
  stopTimer();
  timerStarted = false;
  timerRemainingMs = activeSession.timerSec * 1000;
  awaitingNextRound = false;
  clearScoreAnimations();

  const exclude = activeSession.isPractice ? [] : usedTargetNames();
  target = countries.randomTarget(activeSession.region, exclude);
  guesses = [];
  won = false;
  lost = false;
  submitting = false;
  globe.clearGuesses();
  globe.setRadiusCircle(null);
  updateRadiusTools();
  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  hideAllSheets();
  setPromptVisible(true);
  hintEl.classList.remove("game__hint--hidden");
  clearError();
  hideSuggestions();
  renderGuesses();
  updateModeLabel();
  updateStatusBar();
  updateScorebar();
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
  if (!countries || !globe) return;

  const isPractice = Boolean(options.practice);
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
    closeRegionDetail();
    globeStage.removeAttribute("role");
    globeStage.removeAttribute("tabindex");
    globeStage.removeAttribute("aria-label");
    globe.transitionToGame(1300);
    setTimeout(() => input.focus(), 1350);
  }

  if (isPractice) {
    activeSession = {
      region: "world",
      level: "easy",
      timerSec: 0,
      mode: getLevelMode("easy"),
      isPractice: true,
      totalRounds: 1,
      currentRound: 1,
      roundResults: [],
      totalScore: 0,
    };
  } else {
    activeSession = {
      region: playSetup.region,
      level: playSetup.level,
      timerSec: playSetup.timer,
      mode: getLevelMode(playSetup.level),
      isPractice: false,
      totalRounds: playSetup.rounds,
      currentRound: 1,
      roundResults: [],
      totalScore: 0,
    };
  }

  lastRoundAward = null;
  displayedTotal = 0;
  startRoundPlay();
}

function exitGame() {
  if (!gameStarted || !globe) return;

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

  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  hintEl.classList.remove("game__hint--hidden");
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
  };

  regionSelectActive = true;
  cancelRegionHoverTimers();
  closeRegionDetail();

  app.classList.remove("app--game", "app--start", "app--multiplayer");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  if (wasMulti) {
    multiplayerPhase = "setup";
    playScreenBack.setAttribute("aria-label", "Back to mode select");
    if (partyCode && isPartyHost()) {
      clearPartyGame(partyCode).catch((err) => console.error(err));
    }
    updateSetupHostGate();
  } else {
    playScreenBack.setAttribute("aria-label", "Back to home");
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
  modeCoopBtn.disabled = !canSelectMode;
  modePvpBtn.disabled = !canSelectMode;
  modeStatus.textContent = isHost
    ? "Pick Co-op or PvP to continue."
    : "Waiting for the host to choose a mode…";
}

function showMultiplayerLobbyView() {
  multiplayerPhase = "lobby";
  cancelRegionHoverTimers();
  closeRegionDetail();
  multiplayerLobby.hidden = false;
  multiplayerMode.hidden = true;
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
  multiplayerLobby.hidden = true;
  multiplayerMode.hidden = false;
  regionPicker.hidden = true;
  regionSelectActive = false;
  app.classList.remove("app--start", "app--region-select", "app--game");
  app.classList.add("app--multiplayer");
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to party lobby");
}

function enterRegionSelectFromParty() {
  multiplayerPhase = "setup";
  multiplayerLobby.hidden = true;
  multiplayerMode.hidden = true;
  multiplayerActive = true;
  regionSelectActive = true;
  cancelRegionHoverTimers();
  closeRegionDetail();

  app.classList.remove("app--start", "app--multiplayer", "app--game");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to mode select");
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
    if (multiplayerPhase === "setup" || multiplayerPhase === "mode" || multiplayerPhase === "lobby" || multiplayerPhase === "playing") {
      if (!gameStarted) {
        exitMultiplayerFlow({ skipLeave: true });
        showError("Party closed.");
      }
    }
    return;
  }

  currentParty = party;
  renderSeatRow(lobbySeats, party);
  renderSeatRow(modeSeats, party);
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

  if (globe) globe.transitionToStartView(1300);
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

  try {
    const previousCode = partyCode;
    if (previousCode && previousCode !== code) {
      stopPartySubscription();
      await leaveParty(previousCode, guestProfile.id);
    }
    const party = await joinParty(code, guestProfile);
    partyJoinInput.value = "";
    partyJoinForm.hidden = true;
    attachPartyListener(party.code);
    applyPartySnapshot(party);
    showMultiplayerLobbyView();
  } catch (err) {
    console.error(err);
    showPartyJoinError(err.message || "Could not join party.");
    if (partyCode) attachPartyListener(partyCode);
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
    await setPartyStatus(currentParty.code, "setup", { mode });
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not set mode.");
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
        await setPartyStatus(currentParty.code, "mode", { mode: false });
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
        await setPartyStatus(currentParty.code, "lobby", { mode: false });
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

  app.classList.remove("app--start", "app--multiplayer");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  playScreenBack.setAttribute("aria-label", "Back to home");
  gameExitBtn.hidden = true;
  closeRegionDetail();
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
  closeRegionDetail();
  globe.clearHoveredRegion({ restoreView: false });

  app.classList.remove("app--region-select");
  app.classList.add("app--start");
  regionPicker.hidden = true;
  playScreenBack.hidden = true;
  playScreenBack.setAttribute("aria-label", "Back to home");

  globeStage.setAttribute("role", "button");
  globeStage.setAttribute("tabindex", "0");
  globeStage.setAttribute("aria-label", "Start game");

  globe.transitionToStartView(1300);
}

function openRegionDetail(option) {
  if (!globe) return;
  cancelRegionHoverTimers();
  playSetup.region = option.dataset.region;
  regionDetailTitle.textContent = option.textContent;
  regionDetail.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  regionPicker.classList.add("region-picker--detail");
  globe.setHoveredRegion(option.dataset.region, { locked: true });
  updateSetupHints();
  updateSetupHostGate();
}

function closeRegionDetail() {
  regionPicker.classList.remove("region-picker--detail");
  regionDetail.setAttribute("aria-hidden", "true");
  regionList.setAttribute("aria-hidden", "false");
  globe?.unlockRegionDetail();
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
  const mode = getLevelMode(playSetup.level);
  updateLevelDescription(playSetup.level);

  const perRound = playSetup.timer > 0
    ? Math.round(mode.maxRoundScore * (1 + TIMER_BONUS_RATIO))
    : mode.maxRoundScore;
  const maxTotal = perRound * playSetup.rounds;
  setupMaxScoreEl.textContent = playSetup.timer > 0
    ? `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)} with timer bonus).`
    : `Max score ${formatScore(maxTotal)} (${playSetup.rounds} × ${formatScore(perRound)}).`;

  setupTimerHintEl.textContent = playSetup.timer > 0
    ? `Finish under ${playSetup.timer}s for +${Math.round(TIMER_BONUS_RATIO * 100)}% on the round. Time out = 0 points.`
    : "Timer off — no speed bonus. Time out scores 0 for that round.";
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
      renderSuggestions(countries.search(input.value.trim()));
      return;
    }
    if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      activeSuggestion = Math.max(activeSuggestion - 1, 0);
      renderSuggestions(countries.search(input.value.trim()));
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

window.addEventListener("beforeunload", () => {
  if (partyCode && guestProfile?.id) {
    leaveParty(partyCode, guestProfile.id).catch(() => {});
  }
});

regionOptions.forEach((option) => {
  option.addEventListener("mouseenter", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    scheduleRegionActivate(option.dataset.region);
  });
  option.addEventListener("mouseleave", () => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    scheduleRegionHighlightClear();
  });
  option.addEventListener("click", () => openRegionDetail(option));
});

regionList.addEventListener("mouseleave", () => {
  if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
  scheduleRegionHighlightClear();
});

regionDetailClose.addEventListener("click", closeRegionDetail);

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

async function init() {
  createStars();
  guestProfile = loadGuestProfile();
  updateStartNickname();
  setControlsEnabled(false);
  countries = await loadCountries();
  globe = createGlobe(
    globeContainer,
    countries.features,
    countries.regionMembers,
    countries.regionCentroids
  );
  globe.onRadiusDrag(syncRadiusUi);
  globe.initStartView();
  updateSetupHints();
  loadingEl.classList.add("game__loading--hidden");
  setControlsEnabled(true);
}

init().catch((err) => {
  loadingEl.classList.add("game__loading--hidden");
  setControlsEnabled(false);
  console.error(err);
  showError("Failed to load game data. Please refresh the page.");
});
