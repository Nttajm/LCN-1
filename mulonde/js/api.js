// Weather API for Rohnert Park, CA
// Using Open-Meteo free API (no API key required)

const ROHNERT_PARK = {
  lat: 38.3399,
  lon: -122.7011,
  name: "Rohnert Park, CA"
};

// Weather code descriptions from Open-Meteo
const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
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

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const CLOUDY_CODES = new Set([2, 3, 45, 48]);

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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ROHNERT_PARK.lat}&longitude=${ROHNERT_PARK.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
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
    const currentTemp = Math.round(data.current.temperature_2m);
    tempEl.textContent = `${currentTemp}°`;
    placeEl.textContent = ROHNERT_PARK.name;
    const weatherCode = data.current.weather_code;
    currentWeatherCode = weatherCode;
    descEl.textContent = weatherCodes[weatherCode] || "Unknown";
    const highTemp = Math.round(data.daily.temperature_2m_max[0]);
    const lowTemp = Math.round(data.daily.temperature_2m_min[0]);
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
