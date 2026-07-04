// Weather API for Rohnert Park, CA
// Using wttr.in free API (no API key required)

const ROHNERT_PARK = {
  lat: 38.3399,
  lon: -122.7011,
  name: "Rohnert Park, CA"
};

const WEATHER_TIMEZONE = "America/Los_Angeles";
const WEATHER_BG_PATH = "weather";

const WEATHER_BG_SLOTS = [
  { from: 0, to: 300, image: "pm10.png" },
  { from: 300, to: 390, image: "am5-630.png" },
  { from: 390, to: 420, image: "am6-8.png" },
  { from: 420, to: 480, image: "am7-8.png" },
  { from: 480, to: 660, image: "am8-11.png" },
  { from: 660, to: 720, image: "pm12-2.png" },
  { from: 720, to: 840, image: "pm12-2.png" },
  { from: 840, to: 960, image: "pm2-4.png" },
  { from: 960, to: 1080, image: "pm4-6.png" },
  { from: 1080, to: 1140, image: "pm7.png" },
  { from: 1140, to: 1200, image: "pm8.png" },
  { from: 1200, to: 1230, image: "pm8-830.png" },
  { from: 1230, to: 1320, image: "pm9.png" },
  { from: 1320, to: 1440, image: "pm10.png" }
];

// wttr.in weather codes
const RAIN_CODES = new Set([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365, 374, 377, 386, 389, 392, 395]);
const CLOUDY_CODES = new Set([119, 122, 143, 248, 260]);

let currentWeatherCode = null;

function isNightTime(date = new Date()) {
  const minutes = getLocalMinutes(date);
  return minutes < 390 || minutes >= 1200;
}

function getWeatherBackgroundImage(date = new Date(), weatherCode = currentWeatherCode) {
  if (weatherCode !== null && RAIN_CODES.has(weatherCode)) {
    const image = isNightTime(date) ? "rain-night.png" : "rain.png";
    return `${WEATHER_BG_PATH}/${image}`;
  }

  if (weatherCode !== null && CLOUDY_CODES.has(weatherCode)) {
    return `${WEATHER_BG_PATH}/cloudy.png`;
  }

  const minutes = getLocalMinutes(date);
  const slot = WEATHER_BG_SLOTS.find(({ from, to }) => minutes >= from && minutes < to);
  const image = slot?.image || "pm10.png";
  return `${WEATHER_BG_PATH}/${image}`;
}

function updateWeatherBackground(date = new Date(), weatherCode = currentWeatherCode) {
  const cardBack = document.querySelector("#item-weather-rp .card-back");
  if (!cardBack) {
    return;
  }

  cardBack.style.backgroundImage = `url(${getWeatherBackgroundImage(date, weatherCode)})`;
}

function getLocalMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WEATHER_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  return hour * 60 + minute;
}

async function fetchWeather() {
  const url = `https://wttr.in/${ROHNERT_PARK.lat},${ROHNERT_PARK.lon}?format=j1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return null;
  }
}

function updateWeatherUI(data) {
  const weatherHolder = document.querySelector("#item-weather-rp .weather-holder");
  if (!weatherHolder) {
    return;
  }

  const tempEl = weatherHolder.querySelector(".temp");
  const placeEl = weatherHolder.querySelector(".place");
  const descEl = weatherHolder.querySelector(".desc");
  const hiLowEl = weatherHolder.querySelector(".hi-low");

  if (data) {
    const current = data.current_condition?.[0];
    const today = data.weather?.[0];

    const currentTemp = current?.temp_F ?? "—";
    tempEl.textContent = `${currentTemp}°`;
    placeEl.textContent = ROHNERT_PARK.name;

    const weatherCode = parseInt(current?.weatherCode ?? "0", 10);
    currentWeatherCode = weatherCode;
    descEl.textContent = current?.weatherDesc?.[0]?.value || "Unknown";

    const highTemp = today?.maxtempF ?? "—";
    const lowTemp = today?.mintempF ?? "—";
    hiLowEl.textContent = `${highTemp}° / ${lowTemp}°`;
    updateWeatherBackground(new Date(), weatherCode);
  } else if (descEl) {
    descEl.textContent = "Unable to load";
  }
}

function updateDateUI() {
  const dateHolder = document.querySelector("#item-date .date-holder");
  if (!dateHolder) {
    return;
  }

  const now = new Date();
  const dateEl = dateHolder.querySelector(".date");
  const monthEl = dateHolder.querySelector(".month");
  const dayEl = dateHolder.querySelector(".day");

  if (dateEl) dateEl.textContent = String(now.getDate());
  if (monthEl) monthEl.textContent = now.toLocaleDateString("en-US", { month: "long" });
  if (dayEl) dayEl.textContent = now.toLocaleDateString("en-US", { weekday: "long" });
}

async function initWidgets() {
  if (window.__homeReady) {
    await window.__homeReady;
  }

  updateDateUI();
  updateWeatherBackground();
  const weatherData = await fetchWeather();
  updateWeatherUI(weatherData);
}

document.addEventListener("DOMContentLoaded", () => {
  initWidgets();
});

setInterval(() => {
  updateDateUI();
  updateWeatherBackground();
}, 60 * 1000);

setInterval(async () => {
  const weatherData = await fetchWeather();
  updateWeatherUI(weatherData);
}, 10 * 60 * 1000);
