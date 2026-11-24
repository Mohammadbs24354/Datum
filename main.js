// Application composition root: connect feature controllers and start the dashboard.
class DatumApplication {
  constructor() {
    this.core = coreUtils;
    this.pwa = pwaManager;
    this.preferences = preferencesManager;
    this.weather = weatherService;
    this.financeNews = financeNewsService;
    this.customizer = dashboardCustomizer;
    this.calendar = calendarService;
    this.productivity = productivityManager;
  }

  bindEvents() {
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
  }

  start() {
    this.bindEvents();
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
  }
}

window.datumApp = new DatumApplication();
window.datumApp.start();
