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
    console.error("Weather holder element not found");
    return;
  }

  const tempEl = weatherHolder.querySelector(".temp");
  const placeEl = weatherHolder.querySelector(".place");
  const descEl = weatherHolder.querySelector(".desc");
  const hiLowEl = weatherHolder.querySelector(".hi-low");

  if (data) {
    // Current temperature
    const currentTemp = Math.round(data.current.temperature_2m);
    tempEl.textContent = `${currentTemp}°`;

    // Location
    placeEl.textContent = ROHNERT_PARK.name;

    // Weather description
    const weatherCode = data.current.weather_code;
    descEl.textContent = weatherCodes[weatherCode] || "Unknown";

    // High/Low for today
    const highTemp = Math.round(data.daily.temperature_2m_max[0]);
    const lowTemp = Math.round(data.daily.temperature_2m_min[0]);
    hiLowEl.textContent = `${highTemp}° / ${lowTemp}°`;
  } else {
    // Fallback if API fails
    descEl.textContent = "Unable to load";
  }
}

// Initialize weather when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const weatherData = await fetchWeather();
  updateWeatherUI(weatherData);
});

// Refresh weather every 10 minutes
setInterval(async () => {
  const weatherData = await fetchWeather();
  updateWeatherUI(weatherData);
}, 10 * 60 * 1000);
