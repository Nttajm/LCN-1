import { showBackBtn } from './render.js';

const ICONS = {
  sun: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="#FFD54F"/><g stroke="#FFD54F" stroke-width="1.6" stroke-linecap="square"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="7" y2="17"/><line x1="17" y1="7" x2="19.1" y2="4.9"/></g></svg>`,
  moon: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 14.5A7.5 7.5 0 0 1 9.5 6 6.5 6.5 0 1 0 18 14.5Z" fill="#C8D8F0"/></svg>`,
  cloud: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.2A3.8 3.8 0 0 0 7 18Z" fill="rgba(255,255,255,0.85)"/></svg>`,
  partly: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="9" r="3.2" fill="#FFD54F"/><path d="M7 17h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.2A3.8 3.8 0 0 0 7 17Z" fill="rgba(255,255,255,0.85)"/></svg>`,
  rain: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 14h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.2A3.8 3.8 0 0 0 7 14Z" fill="rgba(255,255,255,0.85)"/><g stroke="#7EC8FF" stroke-width="1.5" stroke-linecap="square"><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="17" x2="11" y2="21"/><line x1="16" y1="17" x2="15" y2="21"/></g></svg>`,
  fog: `<svg class="wx-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g stroke="rgba(255,255,255,0.8)" stroke-width="1.5" stroke-linecap="square"><line x1="4" y1="10" x2="20" y2="10"/><line x1="6" y1="14" x2="18" y2="14"/><line x1="5" y1="18" x2="19" y2="18"/></g></svg>`
};

function getApi() {
  return window.WeatherAPI;
}

function fmt(value, suffix = '') {
  if (value === undefined || value === null || value === '') return '—';
  return `${value}${suffix}`;
}

function slotHour(timeStr) {
  return Math.floor(Number(timeStr) / 100);
}

function isNightHour(hour) {
  return hour < 6 || hour >= 20;
}

function formatHourLabel(timeStr, { isNow = false, dayOffset = 0, dateStr = '' } = {}) {
  if (isNow) return 'Now';
  const hour = slotHour(timeStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  if (dayOffset > 0 && hour === 0 && dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return `${hour12}${period}`;
}

function formatDayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function findNearestHourly(data) {
  const api = getApi();
  const nowMins = api?.getLocalMinutes?.() ?? 0;
  const hourly = data?.weather?.[0]?.hourly || [];
  let best = hourly[0] || null;
  let bestDiff = Infinity;

  hourly.forEach((h) => {
    const diff = Math.abs(slotHour(h.time) * 60 - nowMins);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  });

  return best;
}

function hourTemp(h) {
  return h.temp_F ?? h.tempF ?? h.temp_C ?? h.tempC;
}

function getUpcomingHourly(data) {
  const api = getApi();
  const nowHour = Math.floor((api?.getLocalMinutes?.() ?? 0) / 60);
  const current = data?.current_condition?.[0];
  const items = [];

  if (current) {
    items.push({
      isNow: true,
      temp_F: current.temp_F,
      weatherCode: current.weatherCode,
      time: null
    });
  }

  (data?.weather || []).forEach((day, dayIdx) => {
    (day.hourly || []).forEach((h) => {
      const hour = slotHour(h.time);
      if (dayIdx === 0 && hour < nowHour) return;
      items.push({
        ...h,
        temp_F: hourTemp(h),
        dayOffset: dayIdx,
        dateStr: day.date,
        slotHour: hour
      });
    });
  });

  return items.slice(0, 16);
}

function avgHumidity(hourly = []) {
  if (!hourly.length) return null;
  const total = hourly.reduce((sum, h) => sum + Number(h.humidity || 0), 0);
  return Math.round(total / hourly.length);
}
function iconForCode(code, night = false) {
  const c = Number(code);
  const api = getApi();
  if (api?.RAIN_CODES?.has(c)) return ICONS.rain;
  if ([143, 248, 260].includes(c)) return ICONS.fog;
  if (api?.CLOUDY_CODES?.has(c)) return ICONS.cloud;
  if (c === 116) return ICONS.partly;
  if (c === 113) return night ? ICONS.moon : ICONS.sun;
  return night ? ICONS.moon : ICONS.partly;
}

function buildSummary(data) {
  const current = data?.current_condition?.[0];
  const nearest = findNearestHourly(data);
  const desc = current?.weatherDesc?.[0]?.value || 'Clear';
  const wind = current?.windspeedMiles || nearest?.windspeedMiles || '0';
  const gust = nearest?.WindGustMiles;
  const gustText = gust && Number(gust) > Number(wind)
    ? ` Wind gusts are up to ${gust} mph.`
    : ` Winds around ${wind} mph.`;
  return `${desc} conditions expected.${gustText}`.replace(/\s+/g, ' ').trim();
}

function uvLabel(index) {
  const n = Number(index);
  if (n <= 2) return 'Low';
  if (n <= 5) return 'Moderate';
  if (n <= 7) return 'High';
  if (n <= 10) return 'Very High';
  return 'Extreme';
}

function renderHourly(data) {
  const items = getUpcomingHourly(data);

  return items.map((h) => {
    const night = h.isNow
      ? getApi()?.isNightTime?.(new Date()) ?? false
      : isNightHour(h.slotHour ?? slotHour(h.time));
    return `<div class="wx-hour">
      <span class="wx-hour-time">${formatHourLabel(h.time, {
        isNow: h.isNow,
        dayOffset: h.dayOffset,
        dateStr: h.dateStr
      })}</span>
      <span class="wx-hour-icon">${iconForCode(h.weatherCode, night)}</span>
      <span class="wx-hour-temp">${fmt(hourTemp(h))}°</span>
    </div>`;
  }).join('<div class="wx-hour-divider" aria-hidden="true"></div>');
}

function renderDaily(data, globalMin, globalMax) {
  const days = data?.weather || [];
  const current = data?.current_condition?.[0];
  const currentTemp = Number(current?.temp_F ?? 0);
  const range = globalMax - globalMin || 1;

  return days.map((day, i) => {
    const low = Number(day.mintempF);
    const high = Number(day.maxtempF);
    const code = day.hourly?.[Math.floor((day.hourly.length - 1) / 2)]?.weatherCode ?? 113;
    const left = ((low - globalMin) / range) * 100;
    const width = ((high - low) / range) * 100;
    const dot = i === 0
      ? `<span class="wx-day-dot" style="left:${Math.max(0, Math.min(100, ((currentTemp - globalMin) / range) * 100))}%"></span>`
      : '';

    return `<div class="wx-day-row">
      <span class="wx-day-name">${formatDayLabel(day.date, i)}</span>
      <span class="wx-day-icon">${iconForCode(code)}</span>
      <span class="wx-day-low">${fmt(low)}°</span>
      <div class="wx-day-bar-wrap">
        <div class="wx-day-bar" style="left:${left}%;width:${Math.max(width, 4)}%"></div>
        ${dot}
      </div>
      <span class="wx-day-high">${fmt(high)}°</span>
    </div>`;
  }).join('');
}

function getGlobalTempRange(data) {
  const days = data?.weather || [];
  let min = Infinity;
  let max = -Infinity;
  days.forEach((d) => {
    min = Math.min(min, Number(d.mintempF));
    max = Math.max(max, Number(d.maxtempF));
  });
  if (!Number.isFinite(min)) return { min: 50, max: 80 };
  return { min, max };
}

function renderDetails(data) {
  const current = data?.current_condition?.[0];
  const nearest = findNearestHourly(data);
  const tomorrow = data?.weather?.[1];
  const tomorrowHumidity = avgHumidity(tomorrow?.hourly);
  const uv = Number(current?.uvIndex ?? nearest?.uvIndex ?? 0);
  const uvPct = Math.min(100, (uv / 11) * 100);
  const windDeg = Number(current?.winddirDegree ?? nearest?.winddirDegree ?? 0);
  const windSpeed = fmt(current?.windspeedMiles ?? nearest?.windspeedMiles);
  const windDir = current?.winddir16Point ?? nearest?.winddir16Point ?? '';
  const dew = nearest?.DewPointF ?? current?.FeelsLikeF;
  const humiditySub = tomorrow
    ? `Tomorrow ${fmt(tomorrow.mintempF)}° – ${fmt(tomorrow.maxtempF)}° · ${fmt(tomorrowHumidity)}% avg humidity`
    : `Feels like ${fmt(current?.FeelsLikeF)}°`;

  return `
    <div class="wx-panel wx-detail">
      <div class="wx-detail-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        UV INDEX
      </div>
      <div class="wx-detail-value">${fmt(uv)}</div>
      <div class="wx-detail-sub">${uvLabel(uv)}</div>
      <div class="wx-uv-bar"><span class="wx-uv-marker" style="left:${uvPct}%"></span></div>
    </div>
    <div class="wx-panel wx-detail">
      <div class="wx-detail-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3c-4 3.5-6 7-6 10a6 6 0 1 0 12 0c0-3-2-6.5-6-10Z"/></svg>
        HUMIDITY
      </div>
      <div class="wx-detail-value">${fmt(current?.humidity)}%</div>
      <div class="wx-detail-sub">Dew point ${fmt(dew)}° · ${humiditySub}</div>
    </div>
    <div class="wx-panel wx-detail">
      <div class="wx-detail-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h16M6 10h12M8 18h8"/></svg>
        WIND
      </div>
      <div class="wx-detail-value">${windSpeed}<span style="font-size:1rem;font-weight:400"> mph</span></div>
      <div class="wx-wind-compass">
        <span class="wx-wind-dir n">N</span>
        <span class="wx-wind-dir e">E</span>
        <span class="wx-wind-dir s">S</span>
        <span class="wx-wind-dir w">W</span>
        <div class="wx-wind-needle" style="transform:rotate(${windDeg}deg)"></div>
      </div>
      <div class="wx-detail-sub" style="text-align:center">${windDir}</div>
    </div>`;
}

function buildWeatherHTML(data, bgUrl) {
  const api = getApi();
  const current = data?.current_condition?.[0];
  const today = data?.weather?.[0];
  const place = api?.ROHNERT_PARK?.name || 'Rohnert Park, CA';
  const { min, max } = getGlobalTempRange(data);
  const dayCount = data?.weather?.length || 3;

  return `
    <div class="wx-app">
      <div class="wx-bg" style="background-image:url('${bgUrl}')"></div>
      <div class="wx-bg-blur" aria-hidden="true"></div>
      <div class="wx-content">
        <header class="wx-hero">
          <span class="wx-label">MY LOCATION</span>
          <h1 class="wx-city">${place}</h1>
          <div class="wx-temp">${fmt(current?.temp_F)}°</div>
          <div class="wx-condition">${current?.weatherDesc?.[0]?.value ?? '—'}</div>
          <div class="wx-hilo">H:${fmt(today?.maxtempF)}° L:${fmt(today?.mintempF)}°</div>
        </header>

        <section class="wx-panel wx-hourly">
          <p class="wx-summary">${buildSummary(data)}</p>
          <div class="wx-hourly-scroll" role="list">${renderHourly(data)}</div>
        </section>

        <div class="wx-layout">
          <section class="wx-panel wx-forecast">
            <div class="wx-panel-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
              ${dayCount}-DAY FORECAST
            </div>
            <div class="wx-daily-list">${renderDaily(data, min, max)}</div>
          </section>

          <div class="wx-detail-grid">${renderDetails(data)}</div>
        </div>
      </div>
    </div>`;
}

async function sampleAverageColor(imageUrl) {
  return new Promise((resolve) => {
    const fallback = '#1a4f8a';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = imageUrl;
  });
}

export async function openWeatherView() {
  const catView = document.querySelector('.cat-view');
  const hero = document.querySelector('.hero');
  const api = getApi();
  if (!catView || !hero || !api) return;

  let data = api.getCachedData();
  if (!data) data = await api.fetchWeather();
  if (!data?.current_condition?.[0]) {
    catView.innerHTML = '<div class="wx-app"><div class="wx-content"><p class="wx-summary">Unable to load weather data.</p></div></div>';
    catView.classList.add('weather-mode', 'open');
    hero.classList.add('cv-open');
    showBackBtn('#1a4f8a', null, null);
    return;
  }

  const bgPath = api.getWeatherBackgroundImage(new Date(), api.getWeatherCode());
  const bgUrl = `${bgPath}?t=${Date.now()}`;
  const avgColor = await sampleAverageColor(bgPath);

  catView.style.setProperty('--wx-avg-color', avgColor);
  catView.style.setProperty('--cat-color', avgColor);
  catView.innerHTML = buildWeatherHTML(data, bgUrl);
  catView.classList.add('weather-mode');

  showBackBtn(avgColor, null, null);
  hero.classList.add('cv-open');
  catView.classList.add('open');
  catView.scrollTop = 0;
}

function bindWeatherCard() {
  const card = document.querySelector('#item-weather-rp .card-back');
  if (!card || card.dataset.wxBound) return;
  card.dataset.wxBound = 'true';
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    openWeatherView();
  });
}

function initWeatherApp() {
  Promise.resolve(window.__homeReady)
    .catch(() => {})
    .finally(bindWeatherCard);
}

document.addEventListener('DOMContentLoaded', initWeatherApp);

export { bindWeatherCard };
