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

class CoreUtils {
escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

weatherInfo(code) {
  return weatherCodes[code] || ["حالة جوية غير معروفة", "🌡"];
}
formatTime(date, zone, options = {}) {
  return new Intl.DateTimeFormat("ar", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, ...options }).format(date);
}
updateClocks() {
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
}

const coreUtils = new CoreUtils();
const escapeHtml = (...args) => coreUtils.escapeHtml(...args);
const weatherInfo = (...args) => coreUtils.weatherInfo(...args);
const formatTime = (...args) => coreUtils.formatTime(...args);
const updateClocks = (...args) => coreUtils.updateClocks(...args);