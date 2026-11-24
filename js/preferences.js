class PreferencesManager {
readDashboardPreferences() {
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

saveDashboardPreferences() {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(dashboardPreferences));
    return true;
  } catch {
    return false;
  }
}

formatTemperature(value) {
  const temperature = weatherUnit === "fahrenheit" ? (Number(value) * 9 / 5) + 32 : Number(value);
  return Math.round(temperature) + "°" + (weatherUnit === "fahrenheit" ? "F" : "C");
}

renderWeatherTemperatures(data) {
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

applyDashboardPreferences() {
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

initDashboardPreferences() {
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

async refreshAllData() {
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
}

const preferencesManager = new PreferencesManager();
const readDashboardPreferences = (...args) => preferencesManager.readDashboardPreferences(...args);
const saveDashboardPreferences = (...args) => preferencesManager.saveDashboardPreferences(...args);
const formatTemperature = (...args) => preferencesManager.formatTemperature(...args);
const renderWeatherTemperatures = (...args) => preferencesManager.renderWeatherTemperatures(...args);
const applyDashboardPreferences = (...args) => preferencesManager.applyDashboardPreferences(...args);
const initDashboardPreferences = (...args) => preferencesManager.initDashboardPreferences(...args);
const refreshAllData = (...args) => preferencesManager.refreshAllData(...args);

dashboardPreferences = readDashboardPreferences();
weatherUnit = dashboardPreferences.temperatureUnit;
