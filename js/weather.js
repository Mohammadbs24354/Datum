class WeatherService {
async fetchWeather(latitude, longitude, placeName) {
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

async geocode(query) {
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

async reverseGeocode(latitude, longitude) {
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

setLocation(location, updateMap = true) {
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

readFavorites() {
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

renderFavorites() {
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

saveCurrentPlace() {
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

initFavorites() {
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

async toggleRadarLayer() {
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

initMap() {
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

async searchLocation(inputId, statusId, moveMap) {
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
}

const weatherService = new WeatherService();
const fetchWeather = (...args) => weatherService.fetchWeather(...args);
const geocode = (...args) => weatherService.geocode(...args);
const reverseGeocode = (...args) => weatherService.reverseGeocode(...args);
const setLocation = (...args) => weatherService.setLocation(...args);
const readFavorites = (...args) => weatherService.readFavorites(...args);
const renderFavorites = (...args) => weatherService.renderFavorites(...args);
const saveCurrentPlace = (...args) => weatherService.saveCurrentPlace(...args);
const initFavorites = (...args) => weatherService.initFavorites(...args);
const toggleRadarLayer = (...args) => weatherService.toggleRadarLayer(...args);
const initMap = (...args) => weatherService.initMap(...args);
const searchLocation = (...args) => weatherService.searchLocation(...args);