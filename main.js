const DEFAULT_LOCATION = { name: "برلين، ألمانيا", latitude: 52.52, longitude: 13.405 };
let activeLocation = { ...DEFAULT_LOCATION };
let map;
let marker;
let radarLayer = null;
let weatherRequestId = 0;
let locationSelectionRequestId = 0;
const FAVORITES_KEY = "datum-favorite-places-v1";
let holidayRequestId = 0;
const PREFERENCES_KEY = "datum-preferences-v2";
let dashboardPreferences = readDashboardPreferences();
let latestWeatherPayload = null;
let weatherUnit = dashboardPreferences.temperatureUnit;

function initPwa() {
  const installButton = document.getElementById("install-app");
  const syncStatus = document.getElementById("sync-status");
  let installPrompt = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // The dashboard remains fully usable when service workers are unavailable.
      });
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") syncStatus.textContent = "تم إرسال طلب تثبيت Datum.";
    installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    syncStatus.textContent = "تم تثبيت Datum على جهازك.";
  });
  window.addEventListener("offline", () => {
    syncStatus.textContent = "أنت غير متصل · النسخة المحفوظة متاحة";
  });
  window.addEventListener("online", () => {
    syncStatus.textContent = "عاد الاتصال بالإنترنت";
  });
}

function readDashboardPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
    return {
      theme: saved.theme === "dark" ? "dark" : "light",
      temperatureUnit: saved.temperatureUnit === "fahrenheit" ? "fahrenheit" : "celsius"
    };
  } catch {
    return { theme: "light", temperatureUnit: "celsius" };
  }
}

function saveDashboardPreferences() {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(dashboardPreferences));
    return true;
  } catch {
    return false;
  }
}

function formatTemperature(value) {
  const temperature = weatherUnit === "fahrenheit" ? (Number(value) * 9 / 5) + 32 : Number(value);
  return Math.round(temperature) + "°" + (weatherUnit === "fahrenheit" ? "F" : "C");
}

function renderWeatherTemperatures(data) {
  const current = data.current;
  document.getElementById("current-temp").textContent = formatTemperature(current.temperature_2m);
  document.getElementById("feels-like").textContent = "الإحساس: " + formatTemperature(current.apparent_temperature);
  document.getElementById("overview-temp").textContent = formatTemperature(current.temperature_2m);
  document.getElementById("forecast-list").innerHTML = data.daily.time.map((day, index) => {
    const [label, icon] = weatherInfo(data.daily.weather_code[index]);
    const date = new Date(day + "T12:00:00");
    const dayName = index === 0 ? "اليوم" : new Intl.DateTimeFormat("ar", { weekday: "long" }).format(date);
    return `<div class="forecast-row"><span class="day">${dayName}</span><span class="icon" title="${escapeHtml(label)}">${icon}</span><strong>${formatTemperature(data.daily.temperature_2m_max[index])}</strong><small>${formatTemperature(data.daily.temperature_2m_min[index])}</small></div>`;
  }).join("");
}

function applyDashboardPreferences() {
  document.documentElement.dataset.theme = dashboardPreferences.theme;
  const themeButton = document.getElementById("theme-toggle");
  const unitButton = document.getElementById("unit-toggle");
  if (themeButton) {
    const dark = dashboardPreferences.theme === "dark";
    themeButton.textContent = dark ? "☀" : "☾";
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن");
    themeButton.title = dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";
  }
  if (unitButton) {
    unitButton.textContent = weatherUnit === "fahrenheit" ? "°F" : "°C";
    unitButton.setAttribute("aria-label", weatherUnit === "fahrenheit" ? "التحويل إلى مئوية" : "التحويل إلى فهرنهايت");
    unitButton.title = unitButton.getAttribute("aria-label");
  }
  if (latestWeatherPayload) renderWeatherTemperatures(latestWeatherPayload);
}

function initDashboardPreferences() {
  applyDashboardPreferences();
  document.getElementById("theme-toggle").addEventListener("click", () => {
    dashboardPreferences.theme = dashboardPreferences.theme === "dark" ? "light" : "dark";
    applyDashboardPreferences();
    saveDashboardPreferences();
  });
  document.getElementById("unit-toggle").addEventListener("click", () => {
    weatherUnit = weatherUnit === "celsius" ? "fahrenheit" : "celsius";
    dashboardPreferences.temperatureUnit = weatherUnit;
    applyDashboardPreferences();
    saveDashboardPreferences();
  });
}

async function refreshAllData() {
  const button = document.getElementById("refresh-button");
  const status = document.getElementById("sync-status");
  button.disabled = true;
  button.classList.add("is-loading");
  status.textContent = "جارٍ تحديث جميع البيانات…";
  const results = await Promise.allSettled([
    fetchWeather(activeLocation.latitude, activeLocation.longitude, activeLocation.name),
    convertCurrency(),
    loadWorldNews(),
    loadHolidays()
  ]);
  const failed = results.some(result => result.status === "rejected") || [
    document.getElementById("weather-status").textContent,
    document.getElementById("currency-status").textContent,
    document.getElementById("news-status").textContent,
    document.getElementById("holiday-status").textContent
  ].some(message => /تعذر|غير متاحة|حدث خطأ/.test(message));
  status.textContent = failed ? "اكتمل التحديث جزئياً · تحقق من رسائل الأقسام" : "آخر تحديث: " + new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  button.disabled = false;
  button.classList.remove("is-loading");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

const cities = [
  { name: "برلين · ألمانيا", zone: "Europe/Berlin" },
  { name: "لندن · المملكة المتحدة", zone: "Europe/London" },
  { name: "نيويورك · الولايات المتحدة", zone: "America/New_York" },
  { name: "دبي · الإمارات", zone: "Asia/Dubai" },
  { name: "طوكيو · اليابان", zone: "Asia/Tokyo" },
  { name: "سيدني · أستراليا", zone: "Australia/Sydney" }
];

const weatherCodes = {
  0: ["سماء صافية", "☀"], 1: ["غالباً صافٍ", "🌤"], 2: ["غائم جزئياً", "⛅"], 3: ["غائم", "☁"],
  45: ["ضباب", "🌫"], 48: ["ضباب متجمد", "🌫"], 51: ["رذاذ خفيف", "🌦"], 53: ["رذاذ متوسط", "🌦"],
  55: ["رذاذ كثيف", "🌧"], 56: ["رذاذ متجمد", "🌧"], 57: ["رذاذ متجمد كثيف", "🌧"],
  61: ["مطر خفيف", "🌦"], 63: ["مطر متوسط", "🌧"], 65: ["مطر غزير", "🌧"],
  66: ["مطر متجمد", "🌧"], 67: ["مطر متجمد غزير", "🌧"], 71: ["ثلوج خفيفة", "🌨"],
  73: ["ثلوج متوسطة", "🌨"], 75: ["ثلوج كثيفة", "❄"], 77: ["حبيبات ثلجية", "❄"],
  80: ["زخات مطر خفيفة", "🌦"], 81: ["زخات مطر", "🌧"], 82: ["زخات مطر غزيرة", "⛈"],
  85: ["زخات ثلج", "🌨"], 86: ["زخات ثلج كثيفة", "❄"], 95: ["عاصفة رعدية", "⛈"],
  96: ["عاصفة مع بَرَد", "⛈"], 99: ["عاصفة قوية مع بَرَد", "⛈"]
};

function weatherInfo(code) {
  return weatherCodes[code] || ["حالة جوية غير معروفة", "🌡"];
}
function formatTime(date, zone, options = {}) {
  return new Intl.DateTimeFormat("ar", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, ...options }).format(date);
}
function updateClocks() {
  const now = new Date();
  document.getElementById("local-clock").textContent = formatTime(now, "Europe/Berlin");
  document.getElementById("local-date").textContent = new Intl.DateTimeFormat("ar", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("ar", { dateStyle: "full" }).format(now);
  document.getElementById("overview-day").textContent = new Intl.DateTimeFormat("ar", { day: "numeric" }).format(now);
  document.getElementById("overview-month").textContent = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(now);
  document.getElementById("year-now").textContent = now.getFullYear();
  document.getElementById("clock-grid").innerHTML = cities.map(city => {
    const time = formatTime(now, city.zone);
    const date = new Intl.DateTimeFormat("ar", { timeZone: city.zone, weekday: "long", day: "numeric", month: "short" }).format(now);
    return `<article class="clock-card"><span>${city.name}</span><strong>${time}</strong><small>${date}</small></article>`;
  }).join("");
}

async function fetchWeather(latitude, longitude, placeName) {
  const requestId = ++weatherRequestId;
  const status = document.getElementById("weather-status");
  status.textContent = "جارٍ جلب بيانات الطقس…";
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude, longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
      timezone: "auto", forecast_days: "5"
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر الاتصال بخدمة الطقس.");
    const data = await response.json();
    if (requestId !== weatherRequestId) return;
    const current = data.current;
    latestWeatherPayload = data;
    const [description, symbol] = weatherInfo(current.weather_code);
    document.getElementById("weather-city").textContent = placeName;
    document.getElementById("weather-symbol").textContent = symbol;
    document.getElementById("weather-description").textContent = description;
    renderWeatherTemperatures(data);
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind-speed").textContent = Math.round(current.wind_speed_10m) + " كم/س";
    document.getElementById("rain-chance").textContent = (data.daily.precipitation_probability_max?.[0] ?? "—") + "%";
    const solarTime = value => value ? value.slice(11, 16) : "—";
    document.getElementById("sunrise-time").textContent = solarTime(data.daily.sunrise?.[0]);
    document.getElementById("sunset-time").textContent = solarTime(data.daily.sunset?.[0]);
    document.getElementById("uv-index").textContent = data.daily.uv_index_max?.[0] ?? "—";
    document.getElementById("overview-weather").textContent = description;
    status.textContent = "تم تحديث الطقس بنجاح.";
  } catch (error) {
    if (requestId !== weatherRequestId) return;
    status.textContent = error.message || "حدث خطأ أثناء تحميل الطقس.";
    document.getElementById("weather-description").textContent = "البيانات غير متاحة حالياً";
  }
}

async function geocode(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: 1, language: "ar", format: "json" }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error("تعذر البحث عن الموقع.");
  const data = await response.json();
  if (!data.results?.length) throw new Error("لم نعثر على هذه المدينة. جرّب كتابة الاسم بالإنجليزية.");
  const place = data.results[0];
  const name = [place.name, place.admin1, place.country].filter((value, index, array) => value && array.indexOf(value) === index).join("، ");
  return { name, latitude: place.latitude, longitude: place.longitude };
}

async function reverseGeocode(latitude, longitude) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({ lat: latitude, lon: longitude, format: "jsonv2", "accept-language": "ar" }).toString();
    const response = await fetch(url);
    if (!response.ok) return "موقع محدد على الخريطة";
    const data = await response.json();
    const address = data.address || {};
    return address.city || address.town || address.village || address.state || data.name || "موقع محدد على الخريطة";
  } catch {
    return "موقع محدد على الخريطة";
  }
}

function setLocation(location, updateMap = true) {
  activeLocation = location;
  document.getElementById("overview-location").textContent = location.name.split("،")[0];
  document.getElementById("selected-place").textContent = "الموقع المحدد: " + location.name;
  document.getElementById("coordinates").textContent = `${Math.abs(location.latitude).toFixed(4)}° ${location.latitude >= 0 ? "N" : "S"}, ${Math.abs(location.longitude).toFixed(4)}° ${location.longitude >= 0 ? "E" : "W"}`;
  if (map && updateMap) {
    map.setView([location.latitude, location.longitude], 8);
    marker.setLatLng([location.latitude, location.longitude]);
    marker.bindPopup(escapeHtml(location.name)).openPopup();
  }
  fetchWeather(location.latitude, location.longitude, location.name);
}

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(place =>
      place && typeof place.name === "string" &&
      Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    ).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function renderFavorites() {
  const container = document.getElementById("favorite-places");
  const favorites = readFavorites();
  if (!favorites.length) {
    container.innerHTML = '<p class="favorites-empty">لم تحفظ أي أماكن بعد. اختر مدينة أو نقطة على الخريطة ثم اضغط «حفظ الموقع».</p>';
    return;
  }
  container.innerHTML = favorites.map((place, index) => {
    const safeName = place.name.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    return `<div class="favorite-place"><button class="favorite-select" type="button" data-favorite-index="${index}">📍 ${safeName}</button><button class="favorite-remove" type="button" data-remove-favorite="${index}" aria-label="حذف ${safeName}">×</button></div>`;
  }).join("");
}

function saveCurrentPlace() {
  const favorites = readFavorites();
  const exists = favorites.some(place =>
    Math.abs(place.latitude - activeLocation.latitude) < 0.0001 &&
    Math.abs(place.longitude - activeLocation.longitude) < 0.0001
  );
  const status = document.getElementById("map-status");
  if (exists) {
    status.textContent = "هذا الموقع محفوظ بالفعل.";
    return;
  }
  if (favorites.length >= 12) {
    status.textContent = "وصلت إلى الحد الأقصى: 12 موقعاً محفوظاً. احذف موقعاً لإضافة آخر.";
    return;
  }
  favorites.unshift({ ...activeLocation });
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    renderFavorites();
    status.textContent = "تم حفظ " + activeLocation.name + " على هذا الجهاز.";
  } catch {
    status.textContent = "تعذر الحفظ. تحقق من إعدادات التخزين في المتصفح.";
  }
}

function initFavorites() {
  renderFavorites();
  document.getElementById("save-place-button").addEventListener("click", saveCurrentPlace);
  document.getElementById("favorite-places").addEventListener("click", event => {
    const selectButton = event.target.closest("[data-favorite-index]");
    const removeButton = event.target.closest("[data-remove-favorite]");
    if (selectButton) {
      const place = readFavorites()[Number(selectButton.dataset.favoriteIndex)];
      if (place) {
        setLocation(place);
        document.getElementById("map-section").scrollIntoView({ behavior: "smooth" });
      }
    }
    if (removeButton) {
      const index = Number(removeButton.dataset.removeFavorite);
      const favorites = readFavorites();
      favorites.splice(index, 1);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        renderFavorites();
        document.getElementById("map-status").textContent = "تم حذف الموقع من المفضلة.";
      } catch {
        document.getElementById("map-status").textContent = "تعذر تحديث قائمة المواقع المحفوظة.";
      }
    }
  });
}

async function toggleRadarLayer() {
  const button = document.getElementById("radar-toggle");
  const status = document.getElementById("map-status");
  if (radarLayer && map.hasLayer(radarLayer)) {
    map.removeLayer(radarLayer);
    button.setAttribute("aria-pressed", "false");
    button.textContent = "☂ رادار الأمطار";
    status.textContent = "تم إخفاء طبقة رادار الأمطار.";
    return;
  }
  button.disabled = true;
  button.textContent = "جارٍ تحميل الرادار…";
  status.textContent = "جارٍ جلب أحدث صور رادار الأمطار…";
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!response.ok) throw new Error("خدمة رادار الأمطار غير متاحة حالياً.");
    const data = await response.json();
    const frames = data.radar && Array.isArray(data.radar.past) ? data.radar.past : [];
    const latest = frames[frames.length - 1];
    if (!data.host || !latest || !latest.path) throw new Error("لا توجد صورة رادار متاحة حالياً.");
    if (radarLayer) map.removeLayer(radarLayer);
    radarLayer = L.tileLayer(data.host + latest.path + "/256/{z}/{x}/{y}/2/1_1.png", {
      tileSize: 256, opacity: 0.72, maxNativeZoom: 7, maxZoom: 19,
      attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noopener">Weather radar by RainViewer</a>'
    }).addTo(map);
    button.setAttribute("aria-pressed", "true");
    button.textContent = "إخفاء رادار الأمطار";
    const frameTime = new Date(latest.time * 1000);
    status.textContent = "تُعرض أحدث صورة رادار متاحة: " + new Intl.DateTimeFormat("ar", { dateStyle: "short", timeStyle: "short" }).format(frameTime) + ".";
  } catch (error) {
    status.textContent = error.message || "تعذر تحميل رادار الأمطار.";
    button.textContent = "☂ رادار الأمطار";
  } finally {
    button.disabled = false;
  }
}

function initMap() {
  if (!window.L) {
    document.getElementById("map-status").textContent = "تعذر تحميل مكتبة الخريطة. تحقق من اتصال الإنترنت.";
    return;
  }
  map = L.map("map").setView([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude], 4);
  const baseLayers = {
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: 'Tiles &copy; Esri'
    }),
    terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17, attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
    })
  };
  baseLayers.street.addTo(map);
  document.getElementById("map-style-select").addEventListener("change", event => {
    Object.values(baseLayers).forEach(layer => { if (map.hasLayer(layer)) map.removeLayer(layer); });
    baseLayers[event.target.value].addTo(map);
  });
  document.getElementById("radar-toggle").addEventListener("click", toggleRadarLayer);
  marker = L.marker([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude]).addTo(map).bindPopup(DEFAULT_LOCATION.name);
  map.on("click", async event => {
    const requestId = ++locationSelectionRequestId;
    const { lat, lng } = event.latlng;
    document.getElementById("map-status").textContent = "جارٍ تحديد اسم المكان…";
    const name = await reverseGeocode(lat, lng);
    if (requestId !== locationSelectionRequestId) return;
    setLocation({ name, latitude: lat, longitude: lng }, false);
    marker.setLatLng([lat, lng]).bindPopup(escapeHtml(name)).openPopup();
    document.getElementById("map-status").textContent = "تم اختيار الموقع وتحديث الطقس.";
  });
}

async function searchLocation(inputId, statusId, moveMap) {
  const requestId = ++locationSelectionRequestId;
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const query = input.value.trim();
  if (!query) { status.textContent = "اكتب اسم مدينة أولاً."; input.focus(); return; }
  status.textContent = "جارٍ البحث…";
  try {
    const place = await geocode(query);
    if (requestId !== locationSelectionRequestId) return;
    setLocation(place, moveMap);
    if (moveMap && map) map.setView([place.latitude, place.longitude], 9);
    status.textContent = "تم العثور على " + place.name;
    input.value = "";
  } catch (error) {
    if (requestId !== locationSelectionRequestId) return;
    status.textContent = error.message;
  }
}

const currencyNames = { EUR: "اليورو", USD: "الدولار الأمريكي", GBP: "الجنيه الإسترليني", AED: "الدرهم الإماراتي", EGP: "الجنيه المصري", SAR: "الريال السعودي", TRY: "الليرة التركية", CHF: "الفرنك السويسري", JPY: "الين الياباني", CAD: "الدولار الكندي" };
let currencyRequestId = 0;
let newsRequestId = 0;
async function convertCurrency() {
  const requestId = ++currencyRequestId;
  const amount = Number(document.getElementById("amount-input").value);
  const from = document.getElementById("from-currency").value;
  const to = document.getElementById("to-currency").value;
  const status = document.getElementById("currency-status");
  if (!Number.isFinite(amount) || amount < 0) {
    status.textContent = "أدخل مبلغاً صحيحاً أكبر من أو يساوي صفراً.";
    return;
  }
  if (from === to) {
    document.getElementById("conversion-value").textContent = new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(amount) + " " + to;
    document.getElementById("conversion-rate").textContent = "1 " + from + " = 1 " + to;
    document.getElementById("rate-date").textContent = "لا يلزم تحويل";
    status.textContent = "";
    return;
  }
  status.textContent = "جارٍ تحديث سعر الصرف…";
  try {
    const url = new URL("https://api.frankfurter.app/latest");
    url.search = new URLSearchParams({ amount: String(amount), from, to }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("خدمة أسعار الصرف غير متاحة حالياً.");
    const data = await response.json();
    if (requestId !== currencyRequestId) return;
    const converted = data.rates?.[to];
    if (typeof converted !== "number") throw new Error("لا يتوفر سعر لهذه العملة.");
    document.getElementById("conversion-value").textContent = new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(converted) + " " + to;
    document.getElementById("conversion-rate").textContent = `1 ${from} (${currencyNames[from]}) = ${new Intl.NumberFormat("en", { maximumFractionDigits: 5 }).format(converted / (amount || 1))} ${to}`;
    document.getElementById("rate-date").textContent = data.date || "—";
    status.textContent = "السعر المرجعي بتاريخ " + (data.date || "غير محدد") + ".";
  } catch (error) {
    if (requestId === currencyRequestId) status.textContent = error.message || "تعذر تحويل العملة.";
  }
}

async function loadWorldNews() {
  const requestId = ++newsRequestId;
  const query = document.getElementById("news-query").value.trim() || "world";
  const list = document.getElementById("news-list");
  const status = document.getElementById("news-status");
  list.innerHTML = '<article class="news-placeholder">جارٍ البحث عن أحدث الأخبار…</article>';
  status.textContent = "يتم جلب العناوين من GDELT.";
  try {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.search = new URLSearchParams({
      query: query + " sourcelang:english",
      mode: "ArtList",
      format: "json",
      maxrecords: "10",
      sort: "DateDesc"
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر الاتصال بخدمة الأخبار.");
    const data = await response.json();
    if (requestId !== newsRequestId) return;
    const articles = (data.articles || []).filter(article => article.title && article.url).slice(0, 10);
    if (!articles.length) {
      list.innerHTML = '<article class="news-placeholder">لم نعثر على نتائج. جرّب موضوعاً أو دولة أخرى.</article>';
      status.textContent = "لا توجد عناوين مطابقة لهذا البحث.";
      return;
    }
    list.innerHTML = articles.map(article => {
      const title = String(article.title).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      const domain = String(article.domain || "مصدر إخباري").replace(/[&<>"]/g, "");
      const date = article.seendate ? article.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3 $4:$5") : "";
      const safeDate = date.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      let safeUrl;
      try {
        safeUrl = new URL(article.url);
        if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") return "";
      } catch { return ""; }
      return `<article class="news-card"><h3>${title}</h3><div class="news-meta"><span>${domain} · ${safeDate}</span><a href="${safeUrl.href}" target="_blank" rel="noopener noreferrer">قراءة الخبر ↗</a></div></article>`;
    }).join("");
    status.textContent = `تم العثور على ${articles.length} عناوين. الأخبار وروابطها من مصادر خارجية.`;
  } catch (error) {
    if (requestId !== newsRequestId) return;
    list.innerHTML = '<article class="news-placeholder">تعذر تحميل الأخبار الآن. يمكنك المحاولة مرة أخرى لاحقاً.</article>';
    status.textContent = error.message || "حدث خطأ أثناء تحميل الأخبار.";
  }
}

const LAYOUT_KEY = "datum-dashboard-layout-v1";
function readLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}
function applyLayout(layout) {
  document.querySelectorAll("[data-section-toggle]").forEach(input => {
    const sectionId = input.dataset.sectionToggle;
    const visible = layout[sectionId] !== false;
    input.checked = visible;
    const section = document.getElementById(sectionId);
    if (section) section.hidden = !visible;
    const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (navLink) navLink.hidden = !visible;
  });
}
function initCustomizer() {
  const dialog = document.getElementById("customizer-dialog");
  const status = document.getElementById("customizer-status");
  const initial = readLayout();
  applyLayout(initial);
  document.getElementById("open-customizer").addEventListener("click", () => {
    applyLayout(readLayout());
    if (typeof dialog.showModal === "function") dialog.showModal();
    else status.textContent = "متصفحك لا يدعم نافذة التخصيص.";
  });
  document.getElementById("save-layout").addEventListener("click", event => {
    event.preventDefault();
    const layout = {};
    document.querySelectorAll("[data-section-toggle]").forEach(input => {
      layout[input.dataset.sectionToggle] = input.checked;
    });
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
      applyLayout(layout);
      status.textContent = "تم حفظ إعدادات لوحة التحكم.";
      dialog.close();
    } catch {
      status.textContent = "تعذر حفظ التفضيلات في هذا المتصفح.";
    }
  });
  document.getElementById("reset-layout").addEventListener("click", () => {
    const defaults = {};
    document.querySelectorAll("[data-section-toggle]").forEach(input => {
      defaults[input.dataset.sectionToggle] = true;
    });
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(defaults));
      applyLayout(defaults);
      status.textContent = "تمت استعادة جميع الأقسام.";
    } catch {
      status.textContent = "تعذر تحديث الإعدادات.";
    }
  });
}

const countryNames = { DE: "ألمانيا", EG: "مصر", GB: "المملكة المتحدة", US: "الولايات المتحدة", FR: "فرنسا", AE: "الإمارات", SA: "السعودية", TR: "تركيا", JP: "اليابان", CA: "كندا" };
async function loadHolidays() {
  const requestId = ++holidayRequestId;
  const country = document.getElementById("holiday-country").value;
  const year = document.getElementById("holiday-year").value;
  const list = document.getElementById("holiday-list");
  const status = document.getElementById("holiday-status");
  list.innerHTML = '<p class="muted">جارٍ تحميل العطلات الرسمية…</p>';
  status.textContent = "";
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${encodeURIComponent(year)}/${encodeURIComponent(country)}`);
    if (!response.ok) throw new Error("لم تتوفر بيانات العطلات لهذه الدولة والسنة.");
    const holidays = await response.json();
    if (requestId !== holidayRequestId) return;
    if (!Array.isArray(holidays) || holidays.length === 0) {
      list.innerHTML = '<p class="muted">لا توجد عطلات مسجلة في هذه الفترة.</p>';
      status.textContent = "لا توجد نتائج.";
      return;
    }
    list.innerHTML = holidays.map(holiday => {
      const date = new Date(holiday.date + "T12:00:00");
      const formatted = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(date);
      const localName = String(holiday.localName || holiday.name || "عطلة رسمية").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
      const englishName = String(holiday.name || "").replace(/[&<>"]/g, "");
      const types = Array.isArray(holiday.types) ? holiday.types.map(escapeHtml).join(" · ") : "";
      return `<article class="holiday-item"><div class="holiday-date"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ar", { month: "short" }).format(date)}</span></div><div class="holiday-description"><b>${localName}</b><span>${englishName}</span></div><small>${formatted} · ${types}</small></article>`;
    }).join("");
    status.textContent = `تم العثور على ${holidays.length} مناسبة رسمية في ${countryNames[country]} لعام ${year}.`;
  } catch (error) {
    if (requestId !== holidayRequestId) return;
    list.innerHTML = '<p class="muted">تعذر تحميل بيانات العطلات حالياً.</p>';
    status.textContent = error.message || "حدث خطأ أثناء تحميل التقويم.";
  }
}

function initDateTools() {
  const today = new Date();
  const holidayYearSelect = document.getElementById("holiday-year");
  holidayYearSelect.innerHTML = [0, 1, 2].map(offset => {
    const year = today.getFullYear() + offset;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById("date-picker").value = localToday;
  document.getElementById("date-start").value = localToday;
  document.getElementById("date-end").value = localToday;
  document.getElementById("date-picker").addEventListener("change", event => {
    if (!event.target.value) return;
    const date = new Date(event.target.value + "T12:00:00");
    document.getElementById("date-result").textContent = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  });
  const calculateDays = () => {
    const start = document.getElementById("date-start").value;
    const end = document.getElementById("date-end").value;
    if (!start || !end) return;
    const difference = Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000);
    document.getElementById("days-result").textContent = difference >= 0 ? `الفارق: ${difference} يوم` : `تاريخ النهاية يسبق البداية بـ ${Math.abs(difference)} يوم`;
  };
  document.getElementById("date-start").addEventListener("change", calculateDays);
  document.getElementById("date-end").addEventListener("change", calculateDays);
  document.getElementById("date-picker").dispatchEvent(new Event("change"));
  calculateDays();
}


const TASKS_KEY = "datum-tasks-v1";
const NOTES_KEY = "datum-quick-notes-v1";
const FOCUS_DURATION = 25 * 60;
let taskFilter = "all";
let focusRemaining = FOCUS_DURATION;
let focusInterval = null;

function readTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(task => task && typeof task.id === "string" &&
      typeof task.title === "string" && typeof task.completed === "boolean" &&
      ["low", "normal", "high"].includes(task.priority));
  } catch { return []; }
}

function persistTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks.slice(0, 200)));
    return true;
  } catch { return false; }
}

function renderTasks() {
  const tasks = readTasks();
  const completed = tasks.filter(task => task.completed).length;
  document.getElementById("task-total").textContent = tasks.length;
  document.getElementById("task-open").textContent = tasks.length - completed;
  document.getElementById("task-completed").textContent = completed;
  document.getElementById("task-progress").textContent = (tasks.length ? Math.round(completed / tasks.length * 100) : 0) + "%";
  const visible = tasks.filter(task => taskFilter === "all" || (taskFilter === "open" ? !task.completed : task.completed));
  const list = document.getElementById("task-list");
  if (!visible.length) {
    list.innerHTML = '<p class="empty-state">' + (tasks.length ? "لا توجد مهام في هذا العرض." : "لا توجد مهام بعد. أضف أول مهمة لتبدأ.") + '</p>';
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  list.innerHTML = visible.map(task => {
    const due = task.due ? new Date(task.due + "T12:00:00") : null;
    const overdue = due && due < today && !task.completed;
    const dueLabel = due ? new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", year: "numeric" }).format(due) : "دون موعد";
    const priorityLabel = task.priority === "high" ? "عالية" : task.priority === "low" ? "منخفضة" : "عادية";
    return '<article class="task-item' + (task.completed ? ' is-complete' : '') + '">' +
      '<label class="task-check"><input type="checkbox" data-task-complete="' + escapeHtml(task.id) + '"' + (task.completed ? " checked" : "") + '><span class="visually-hidden">إكمال ' + escapeHtml(task.title) + '</span></label>' +
      '<div class="task-copy"><strong>' + escapeHtml(task.title) + '</strong><small class="' + (overdue ? "overdue" : "") + '">' + (overdue ? "متأخرة · " : "الموعد · ") + dueLabel + '</small></div>' +
      '<span class="priority-tag priority-' + task.priority + '">أولوية ' + priorityLabel + '</span>' +
      '<button type="button" class="task-delete" data-task-delete="' + escapeHtml(task.id) + '" aria-label="حذف ' + escapeHtml(task.title) + '">×</button></article>';
  }).join("");
}

function initProductivity() {
  const form = document.getElementById("task-form");
  const title = document.getElementById("task-title");
  const due = document.getElementById("task-due");
  const priority = document.getElementById("task-priority");
  const list = document.getElementById("task-list");
  const status = document.getElementById("task-status");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = title.value.trim();
    if (!value) { status.textContent = "اكتب عنوان المهمة أولاً."; title.focus(); return; }
    const tasks = readTasks();
    if (tasks.length >= 200) { status.textContent = "وصلت إلى الحد الأقصى وهو 200 مهمة."; return; }
    tasks.unshift({ id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2), title: value, due: due.value, priority: priority.value, completed: false, createdAt: new Date().toISOString() });
    if (!persistTasks(tasks)) { status.textContent = "تعذر حفظ المهمة في مساحة التخزين."; return; }
    title.value = "";
    due.value = "";
    priority.value = "normal";
    status.textContent = "تمت إضافة المهمة وحفظها.";
    renderTasks();
    title.focus();
  });
  list.addEventListener("change", event => {
    const id = event.target.dataset.taskComplete;
    if (!id) return;
    const tasks = readTasks().map(task => task.id === id ? { ...task, completed: event.target.checked } : task);
    if (!persistTasks(tasks)) status.textContent = "تعذر حفظ حالة المهمة.";
    renderTasks();
  });
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-task-delete]");
    if (!button) return;
    const tasks = readTasks().filter(task => task.id !== button.dataset.taskDelete);
    if (!persistTasks(tasks)) { status.textContent = "تعذر حذف المهمة."; return; }
    status.textContent = "تم حذف المهمة.";
    renderTasks();
  });
  document.querySelectorAll("[data-task-filter]").forEach(button => button.addEventListener("click", () => {
    taskFilter = button.dataset.taskFilter;
    document.querySelectorAll("[data-task-filter]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderTasks();
  }));

  const notes = document.getElementById("quick-notes");
  const notesCount = document.getElementById("notes-count");
  const notesStatus = document.getElementById("notes-status");
  try { notes.value = localStorage.getItem(NOTES_KEY) || ""; } catch { notesStatus.textContent = "التخزين غير متاح"; }
  const updateNotesCount = () => { notesCount.textContent = notes.value.length + " / 5000"; };
  updateNotesCount();
  notes.addEventListener("input", () => {
    updateNotesCount();
    try {
      localStorage.setItem(NOTES_KEY, notes.value);
      notesStatus.textContent = "تم الحفظ";
    } catch { notesStatus.textContent = "تعذر الحفظ"; }
  });

  const start = document.getElementById("focus-start");
  const reset = document.getElementById("focus-reset");
  const renderFocus = () => {
    const minutes = Math.floor(focusRemaining / 60);
    const seconds = focusRemaining % 60;
    document.getElementById("focus-time").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    document.getElementById("focus-progress").style.width = ((FOCUS_DURATION - focusRemaining) / FOCUS_DURATION * 100) + "%";
  };
  start.addEventListener("click", () => {
    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
      start.textContent = "استئناف";
      document.getElementById("focus-status").textContent = "تم إيقاف الجلسة مؤقتاً.";
      return;
    }
    if (focusRemaining <= 0) focusRemaining = FOCUS_DURATION;
    start.textContent = "إيقاف مؤقت";
    document.getElementById("focus-status").textContent = "أنت في جلسة تركيز. استمر!";
    focusInterval = setInterval(() => {
      focusRemaining = Math.max(0, focusRemaining - 1);
      renderFocus();
      if (focusRemaining === 0) {
        clearInterval(focusInterval);
        focusInterval = null;
        start.textContent = "ابدأ من جديد";
        document.getElementById("focus-status").textContent = "انتهت جلسة التركيز. أحسنت!";
      }
    }, 1000);
  });
  reset.addEventListener("click", () => {
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = null;
    focusRemaining = FOCUS_DURATION;
    start.textContent = "ابدأ التركيز";
    document.getElementById("focus-status").textContent = "تمت إعادة ضبط المؤقت.";
    renderFocus();
  });
  renderTasks();
  renderFocus();
}

document.getElementById("weather-search-button").addEventListener("click", () => searchLocation("weather-search-input", "weather-status", true));
document.getElementById("weather-search-input").addEventListener("keydown", event => { if (event.key === "Enter") searchLocation("weather-search-input", "weather-status", true); });
document.getElementById("map-search-button").addEventListener("click", () => searchLocation("map-search-input", "map-status", true));
document.getElementById("map-search-input").addEventListener("keydown", event => { if (event.key === "Enter") searchLocation("map-search-input", "map-status", true); });
document.getElementById("locate-button").addEventListener("click", () => {
  const status = document.getElementById("map-status");
  if (!navigator.geolocation) { status.textContent = "المتصفح لا يدعم تحديد الموقع."; return; }
  status.textContent = "يرجى السماح بالوصول إلى موقعك…";
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    const name = await reverseGeocode(latitude, longitude);
    setLocation({ name, latitude, longitude });
    status.textContent = "تم تحديد موقعك الحالي.";
  }, () => { status.textContent = "لم نتمكن من تحديد موقعك. تحقق من الأذونات."; }, { enableHighAccuracy: true, timeout: 10000 });
});
document.getElementById("refresh-button").addEventListener("click", refreshAllData);

document.getElementById("amount-input").addEventListener("input", convertCurrency);
document.getElementById("from-currency").addEventListener("change", convertCurrency);
document.getElementById("to-currency").addEventListener("change", convertCurrency);
document.getElementById("swap-currencies").addEventListener("click", () => {
  const from = document.getElementById("from-currency");
  const to = document.getElementById("to-currency");
  const previous = from.value;
  from.value = to.value;
  to.value = previous;
  convertCurrency();
});
document.getElementById("news-search-button").addEventListener("click", loadWorldNews);
document.getElementById("news-refresh").addEventListener("click", loadWorldNews);
document.getElementById("news-query").addEventListener("keydown", event => { if (event.key === "Enter") loadWorldNews(); });
document.getElementById("holiday-load").addEventListener("click", loadHolidays);
document.getElementById("holiday-country").addEventListener("change", loadHolidays);
document.getElementById("holiday-year").addEventListener("change", loadHolidays);

initDashboardPreferences();
initPwa();
updateClocks();
setInterval(updateClocks, 1000);
initDateTools();
initCustomizer();
initProductivity();
initFavorites();
initMap();
fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
convertCurrency();
loadWorldNews();
loadHolidays();
