import { loadCountries } from "./countries.js";
import { haversineKm, bearing, colorFromDistance, formatDistance, distanceUnitLabel } from "./distance.js";
import { createGlobe } from "./globe.js";
import { flagUrl } from "./flags.js";
import { getLevelMode } from "./levels.js";

const app = document.getElementById("app");
const starsEl = document.getElementById("stars");
const globeStage = document.getElementById("globe-stage");
const gamePanel = document.getElementById("game-panel");
const playBtn = document.getElementById("btn-play");
const practiceBtn = document.getElementById("btn-practice");
const playScreenBack = document.getElementById("play-screen-back");
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
const input = document.getElementById("country-input");
const enterBtn = document.getElementById("enter-btn");
const suggestionsEl = document.getElementById("suggestions");
const hintEl = document.getElementById("hint");
const guessesPanel = document.getElementById("guesses-panel");
const guessesToolbar = document.getElementById("guesses-toolbar");
const guessesSort = document.getElementById("guesses-sort");
const guessesUnitGroup = document.getElementById("guesses-unit");
const guessesEl = document.getElementById("guesses");
const guessesPlaceholder = document.getElementById("guesses-placeholder");
const winPanel = document.getElementById("win-panel");
const winText = document.getElementById("win-text");
const newGameBtn = document.getElementById("new-game-btn");
const globeContainer = document.getElementById("globe-viz");
const loadingEl = document.getElementById("loading");

let countries = null;
let globe = null;
let target = null;
let guesses = [];
let won = false;
let activeSuggestion = -1;
let errorEl = null;
let submitting = false;
let gameStarted = false;
let regionSelectActive = false;
let guessSort = "distance";
let distanceUnit = "km";

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

function cancelRegionHoverTimers() {
  clearTimeout(hoverActivateTimer);
  clearTimeout(hoverClearTimer);
  hoverActivateTimer = null;
  hoverClearTimer = null;
}

function scheduleRegionActivate(region) {
  cancelRegionHoverTimers();
  hoverActivateTimer = setTimeout(() => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
    globe.setHoveredRegion(region);
  }, HOVER_ACTIVATE_MS);
}

function scheduleRegionHighlightClear() {
  clearTimeout(hoverActivateTimer);
  hoverActivateTimer = null;
  clearTimeout(hoverClearTimer);
  hoverClearTimer = setTimeout(() => {
    if (!regionSelectActive || regionPicker.classList.contains("region-picker--detail")) return;
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
  if (!countries || won) {
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
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "game__guess-pill";
  if (guess.correct) pill.classList.add("game__guess-pill--correct");

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
    const dist = document.createElement("span");
    dist.className = "game__guess-dist";
    dist.style.color = guess.color;
    dist.textContent = `${formatDistance(guess.distance, distanceUnit)} ${distanceUnitLabel(distanceUnit)} ${guess.direction}`;
    pill.appendChild(dist);
  }

  pill.addEventListener("click", () => {
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
  if (submitting || won || !countries || !globe || !gameStarted) return;

  clearError();
  const country = resolveCountry(forcedName ?? input.value);
  if (!country) {
    showError("Country not found. Try a different spelling.");
    return;
  }

  if (guesses.some((g) => g.name === country.name)) {
    showError("You already guessed that country.");
    return;
  }

  submitting = true;

  const distance = country.name === target.name ? 0 : haversineKm(country.centroid, target.centroid);
  const correct = distance === 0;
  const color = colorFromDistance(distance);
  const outline = correct ? "#2d5a28" : "#1a1a1a";
  const dir = correct ? "" : bearing(country.centroid, target.centroid);

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
  globe.flyTo(country.centroid.lat, country.centroid.lng);

  input.value = "";
  hideSuggestions();
  hintEl.classList.add("game__hint--hidden");
  renderGuesses();

  if (correct) {
    won = true;
    winText.textContent = `You found ${target.name} in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}!`;
    winPanel.hidden = false;
    input.disabled = true;
    enterBtn.disabled = true;
  }

  submitting = false;
}

function startNewGame() {
  target = countries.randomTarget();
  guesses = [];
  won = false;
  submitting = false;
  globe.clearGuesses();
  input.value = "";
  input.disabled = false;
  enterBtn.disabled = false;
  winPanel.hidden = true;
  hintEl.classList.remove("game__hint--hidden");
  clearError();
  hideSuggestions();
  renderGuesses();
}

function beginGame() {
  if (gameStarted) return;
  gameStarted = true;
  regionSelectActive = false;

  app.classList.remove("app--start", "app--region-select");
  app.classList.add("app--game");
  gamePanel.hidden = false;
  guessesPanel.hidden = false;
  regionPicker.hidden = true;
  closeRegionDetail();
  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");

  globe.transitionToGame(1300);
  startNewGame();

  setTimeout(() => input.focus(), 1350);
}

function beginPlayFlow() {
  if (gameStarted || regionSelectActive) return;
  regionSelectActive = true;
  cancelRegionHoverTimers();

  app.classList.remove("app--start");
  app.classList.add("app--region-select");
  regionPicker.hidden = false;
  playScreenBack.hidden = false;
  closeRegionDetail();
  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");

  globe.transitionToRegionSelect(1300);
}

function exitPlayFlow() {
  if (!regionSelectActive || gameStarted) return;

  regionSelectActive = false;
  cancelRegionHoverTimers();
  closeRegionDetail();
  globe.clearHoveredRegion({ restoreView: false });

  app.classList.remove("app--region-select");
  app.classList.add("app--start");
  regionPicker.hidden = true;
  playScreenBack.hidden = true;

  globeStage.setAttribute("role", "button");
  globeStage.setAttribute("tabindex", "0");
  globeStage.setAttribute("aria-label", "Start game");

  globe.transitionToStartView(1300);
}

function openRegionDetail(option) {
  cancelRegionHoverTimers();
  playSetup.region = option.dataset.region;
  regionDetailTitle.textContent = option.textContent;
  regionDetail.setAttribute("aria-hidden", "false");
  regionList.setAttribute("aria-hidden", "true");
  regionPicker.classList.add("region-picker--detail");
  globe.setHoveredRegion(option.dataset.region, { locked: true });
}

function closeRegionDetail() {
  regionPicker.classList.remove("region-picker--detail");
  regionDetail.setAttribute("aria-hidden", "true");
  regionList.setAttribute("aria-hidden", "false");
  globe.unlockRegionDetail();
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

input.addEventListener("input", () => {
  clearError();
  activeSuggestion = -1;
  updateSuggestions();
});

input.addEventListener("keydown", (e) => {
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
newGameBtn.addEventListener("click", startNewGame);

function setDistanceUnit(unit) {
  distanceUnit = unit;
  guessesUnitGroup.querySelectorAll(".game__guesses-unit-btn").forEach((b) => {
    b.classList.toggle("game__guesses-unit-btn--active", b.dataset.unit === unit);
  });
  renderGuesses();
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

playBtn.addEventListener("click", beginPlayFlow);
practiceBtn.addEventListener("click", beginGame);
playScreenBack.addEventListener("click", exitPlayFlow);

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
  });
});

timerOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setActiveSetupOption(timerOptions, option);
    playSetup.timer = Number(option.dataset.timer);
  });
});

levelOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setActiveSetupOption(levelOptions, option);
    playSetup.level = option.dataset.level;
    updateLevelDescription(playSetup.level);
  });
});

async function init() {
  createStars();
  input.disabled = true;
  enterBtn.disabled = true;
  countries = await loadCountries();
  globe = createGlobe(
    globeContainer,
    countries.features,
    countries.regionMembers,
    countries.regionCentroids
  );
  globe.initStartView();
  updateLevelDescription(playSetup.level);
  loadingEl.classList.add("game__loading--hidden");
  input.disabled = false;
  enterBtn.disabled = false;
}

init().catch((err) => {
  loadingEl.classList.add("game__loading--hidden");
  input.disabled = false;
  enterBtn.disabled = false;
  console.error(err);
  showError("Failed to load game data. Please refresh the page.");
});
