import { loadCountries } from "./countries.js";
import { haversineKm, bearing, colorFromDistance, formatDistance } from "./distance.js";
import { createGlobe } from "./globe.js";

const app = document.getElementById("app");
const starsEl = document.getElementById("stars");
const globeStage = document.getElementById("globe-stage");
const gamePanel = document.getElementById("game-panel");
const input = document.getElementById("country-input");
const enterBtn = document.getElementById("enter-btn");
const suggestionsEl = document.getElementById("suggestions");
const hintEl = document.getElementById("hint");
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

function renderGuessPill(guess) {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "game__guess-pill";
  if (guess.correct) pill.classList.add("game__guess-pill--correct");
  pill.style.backgroundColor = guess.color;
  pill.textContent = guess.correct
    ? guess.name
    : `${guess.name} — ${formatDistance(guess.distance)} km ${guess.direction}`;
  pill.addEventListener("click", () => {
    globe.flyTo(guess.centroid.lat, guess.centroid.lng);
  });
  guessesEl.appendChild(pill);
}

function renderGuesses() {
  if (!guesses.length) {
    guessesEl.hidden = true;
    guessesPlaceholder.hidden = false;
    return;
  }
  guessesPlaceholder.hidden = true;
  guessesEl.hidden = false;
  guessesEl.innerHTML = "";
  guesses.forEach(renderGuessPill);
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
    distance,
    direction: dir,
    color,
    outline,
    correct,
    centroid: country.centroid,
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

  app.classList.remove("app--start");
  app.classList.add("app--game");
  gamePanel.hidden = false;
  globeStage.removeAttribute("role");
  globeStage.removeAttribute("tabindex");
  globeStage.removeAttribute("aria-label");

  globe.transitionToGame(1100);
  startNewGame();

  setTimeout(() => input.focus(), 1150);
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

globeStage.addEventListener("click", () => {
  if (!gameStarted) beginGame();
});

globeStage.addEventListener("keydown", (e) => {
  if (!gameStarted && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    beginGame();
  }
});

async function init() {
  createStars();
  input.disabled = true;
  enterBtn.disabled = true;
  countries = await loadCountries();
  globe = createGlobe(globeContainer, countries.features);
  globe.initStartView();
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
