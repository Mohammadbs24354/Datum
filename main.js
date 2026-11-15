const DEFAULT_LOCATION = { name: "برلين، ألمانيا", latitude: 52.52, longitude: 13.405 };
let activeLocation = { ...DEFAULT_LOCATION };
let map;
let marker;

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
  const status = document.getElementById("weather-status");
  status.textContent = "جارٍ جلب بيانات الطقس…";
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude, longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto", forecast_days: "5"
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("تعذر الاتصال بخدمة الطقس.");
    const data = await response.json();
    const current = data.current;
    const [description, symbol] = weatherInfo(current.weather_code);
    document.getElementById("weather-city").textContent = placeName;
    document.getElementById("weather-symbol").textContent = symbol;
    document.getElementById("current-temp").textContent = Math.round(current.temperature_2m) + "°";
    document.getElementById("weather-description").textContent = description;
    document.getElementById("feels-like").textContent = "الإحساس: " + Math.round(current.apparent_temperature) + "°";
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind-speed").textContent = Math.round(current.wind_speed_10m) + " كم/س";
    document.getElementById("rain-chance").textContent = (data.daily.precipitation_probability_max?.[0] ?? "—") + "%";
    document.getElementById("overview-temp").textContent = Math.round(current.temperature_2m) + "°";
    document.getElementById("overview-weather").textContent = description;
    document.getElementById("forecast-list").innerHTML = data.daily.time.map((day, index) => {
      const [label, icon] = weatherInfo(data.daily.weather_code[index]);
      const date = new Date(day + "T12:00:00");
      const dayName = index === 0 ? "اليوم" : new Intl.DateTimeFormat("ar", { weekday: "long" }).format(date);
      return `<div class="forecast-row"><span class="day">${dayName}</span><span class="icon" title="${label}">${icon}</span><strong>${Math.round(data.daily.temperature_2m_max[index])}°</strong><small>${Math.round(data.daily.temperature_2m_min[index])}°</small></div>`;
    }).join("");
    status.textContent = "تم تحديث الطقس بنجاح.";
  } catch (error) {
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
    marker.bindPopup(location.name).openPopup();
  }
  fetchWeather(location.latitude, location.longitude, location.name);
}

function initMap() {
  if (!window.L) {
    document.getElementById("map-status").textContent = "تعذر تحميل مكتبة الخريطة. تحقق من اتصال الإنترنت.";
    return;
  }
  map = L.map("map").setView([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);
  marker = L.marker([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude]).addTo(map).bindPopup(DEFAULT_LOCATION.name);
  map.on("click", async event => {
    const { lat, lng } = event.latlng;
    document.getElementById("map-status").textContent = "جارٍ تحديد اسم المكان…";
    const name = await reverseGeocode(lat, lng);
    setLocation({ name, latitude: lat, longitude: lng }, false);
    marker.setLatLng([lat, lng]).bindPopup(name).openPopup();
    document.getElementById("map-status").textContent = "تم اختيار الموقع وتحديث الطقس.";
  });
}

async function searchLocation(inputId, statusId, moveMap) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const query = input.value.trim();
  if (!query) { status.textContent = "اكتب اسم مدينة أولاً."; input.focus(); return; }
  status.textContent = "جارٍ البحث…";
  try {
    const place = await geocode(query);
    setLocation(place, moveMap);
    if (moveMap && map) map.setView([place.latitude, place.longitude], 9);
    status.textContent = "تم العثور على " + place.name;
    input.value = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

function initDateTools() {
  const today = new Date();
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

document.getElementById("weather-search-button").addEventListener("click", () => searchLocation("weather-search-input", "weather-status", true));
document.getElementById("weather-search-input").addEventListener("keydown", event => { if (event.key === "Enter") searchLocation("weather-search-input", "weather-status", false); });
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
document.getElementById("refresh-button").addEventListener("click", () => {
  updateClocks();
  fetchWeather(activeLocation.latitude, activeLocation.longitude, activeLocation.name);
});

updateClocks();
setInterval(updateClocks, 1000);
initDateTools();
initMap();
fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
