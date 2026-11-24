const { test, expect } = require("@playwright/test");

const weatherFixture = {
  current: {
    temperature_2m: 18,
    relative_humidity_2m: 54,
    apparent_temperature: 17,
    is_day: 1,
    precipitation: 0,
    weather_code: 0,
    wind_speed_10m: 12
  },
  daily: {
    time: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
    weather_code: [0, 1, 2, 3, 61],
    temperature_2m_max: [19, 18, 17, 15, 13],
    temperature_2m_min: [10, 9, 8, 7, 6],
    precipitation_probability_max: [5, 10, 20, 30, 60],
    sunrise: ["2026-11-16T07:20", "2026-11-17T07:22", "2026-11-18T07:24", "2026-11-19T07:26", "2026-11-20T07:28"],
    sunset: ["2026-11-16T16:20", "2026-11-17T16:18", "2026-11-18T16:16", "2026-11-19T16:14", "2026-11-20T16:12"],
    uv_index_max: [1, 1, 1, 1, 1]
  }
};

test.beforeEach(async ({ page }) => {
  // Keep the suite deterministic and independent from third-party API uptime.
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", route =>
    route.fulfill({ path: require.resolve("leaflet/dist/leaflet.js"), contentType: "application/javascript" })
  );
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", route =>
    route.fulfill({ path: require.resolve("leaflet/dist/leaflet.css"), contentType: "text/css" })
  );
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.route("https://*.tile.openstreetmap.org/**", route => route.abort());
  await page.route("https://server.arcgisonline.com/**", route => route.abort());
  await page.route("https://*.tile.opentopomap.org/**", route => route.abort());
  await page.route("https://tilecache.rainviewer.com/**", route => route.abort());

  await page.route("https://api.open-meteo.com/v1/forecast**", route =>
    route.fulfill({ json: weatherFixture })
  );
  await page.route("https://geocoding-api.open-meteo.com/**", route =>
    route.fulfill({ json: { results: [{ name: "القاهرة", admin1: "القاهرة", country: "مصر", latitude: 30.0444, longitude: 31.2357 }] } })
  );
  await page.route("https://nominatim.openstreetmap.org/**", route =>
    route.fulfill({ json: { name: "القاهرة", address: { city: "القاهرة" } } })
  );
  await page.route("https://api.frankfurter.app/**", route =>
    route.fulfill({ json: { amount: 100, base: "EUR", date: "2026-11-13", rates: { USD: 110, EUR: 0.91 } } })
  );
  await page.route("https://api.gdeltproject.org/**", route =>
    route.fulfill({ json: { articles: [] } })
  );
  await page.route("https://date.nager.at/**", route =>
    route.fulfill({ json: [{ date: "2026-01-01", localName: "رأس السنة", name: "New Year's Day", types: ["Public"] }] })
  );
  await page.route("https://api.rainviewer.com/**", route =>
    route.fulfill({ json: { host: "https://tilecache.rainviewer.com", radar: { past: [{ time: 1794820000, path: "/v2/radar/1794820000" }] } } })
  );
});

test("loads the dashboard and renders live-data sections from fixtures", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "لوحة العالم" })).toBeVisible();
  await expect(page.locator("#clock-grid .clock-card")).toHaveCount(6);
  await expect(page.locator("#current-temp")).toHaveText("18°C");
  await expect(page.locator("#forecast-list .forecast-row")).toHaveCount(5);
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#holiday-list .holiday-item")).toHaveCount(1);
});

test("switches map basemaps and toggles the precipitation radar", async ({ page }) => {
  await page.goto("/");
  const style = page.locator("#map-style-select");
  await style.selectOption("satellite");
  await expect(style).toHaveValue("satellite");
  await style.selectOption("terrain");
  await expect(style).toHaveValue("terrain");

  const radar = page.locator("#radar-toggle");
  await radar.click();
  await expect(radar).toHaveAttribute("aria-pressed", "true");
  await expect(radar).toContainText("إخفاء");
  await radar.click();
  await expect(radar).toHaveAttribute("aria-pressed", "false");
});

test("customizes dashboard sections and restores defaults", async ({ page }) => {
  await page.goto("/");
  await page.locator("#open-customizer").click();
  await page.locator('[data-section-toggle="calendar"]').uncheck();
  await page.locator("#save-layout").click();
  await expect(page.locator("#calendar")).toBeHidden();
  await expect(page.locator('.nav-link[href="#calendar"]')).toBeHidden();

  await page.locator("#open-customizer").click();
  await page.locator("#reset-layout").click();
  await expect(page.locator("#calendar")).toBeVisible();
});

test("calculates date differences and loads selected-country holidays", async ({ page }) => {
  await page.goto("/");
  await page.locator("#date-start").fill("2026-11-01");
  await page.locator("#date-end").fill("2026-11-11");
  await expect(page.locator("#days-result")).toContainText("10");

  await page.locator("#holiday-country").selectOption("EG");
  await expect(page.locator("#holiday-status")).toContainText("مصر");
  await expect(page.locator("#holiday-list .holiday-item")).toHaveCount(1);
});

test("supports the mobile dashboard layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "لوحة العالم" })).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#open-customizer")).toBeVisible();
});

test("keeps the latest holiday selection when an older request finishes later", async ({ page }) => {
  const year = new Date().getFullYear();
  await page.route("https://date.nager.at/api/v3/PublicHolidays/**", async route => {
    const url = route.request().url();
    if (url.endsWith(`/${year}/DE`)) {
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.fulfill({ json: [{ date: "2026-01-01", localName: "نتيجة ألمانية قديمة", name: "Old German result", types: ["Public"] }] });
      return;
    }
    if (url.endsWith(`/${year}/EG`)) {
      await route.fulfill({ json: [{ date: "2026-07-23", localName: "ثورة 23 يوليو", name: "July Revolution Day", types: ["Public"] }] });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await page.locator("#holiday-country").selectOption("EG");
  await expect(page.locator("#holiday-status")).toContainText("مصر");
  await expect(page.locator("#holiday-list")).toContainText("ثورة 23 يوليو");
  await page.waitForTimeout(500);
  await expect(page.locator("#holiday-list")).not.toContainText("نتيجة ألمانية قديمة");
});

test("keeps the newest news search when an earlier request finishes later", async ({ page }) => {
  await page.route("https://api.gdeltproject.org/api/v2/doc/doc**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("query")?.startsWith("world ")) {
      await new Promise(resolve => setTimeout(resolve, 400));
      await route.fulfill({ json: { articles: [{ title: "نتيجة بحث قديمة", url: "https://example.com/old", domain: "example.com" }] } });
      return;
    }
    await route.fulfill({ json: { articles: [{ title: "النتيجة الأحدث", url: "https://example.com/latest", domain: "example.com" }] } });
  });

  await page.goto("/");
  await page.locator("#news-query").fill("latest topic");
  await page.locator("#news-search-button").click();
  await expect(page.locator("#news-list")).toContainText("النتيجة الأحدث");
  await page.waitForTimeout(500);
  await expect(page.locator("#news-list")).not.toContainText("نتيجة بحث قديمة");
});

test("renders untrusted news fields as text instead of executable markup", async ({ page }) => {
  await page.route("https://api.gdeltproject.org/api/v2/doc/doc**", route =>
    route.fulfill({
      json: {
        articles: [{
          title: "<img src=x onerror=alert(1)>",
          url: "https://example.com/article",
          domain: "example.com",
          seendate: '20261117T120000Z<script>alert(1)</script>'
        }]
      }
    })
  );

  await page.goto("/");
  await expect(page.locator("#news-list")).toContainText("<img src=x onerror=alert(1)>");
  await expect(page.locator("#news-list img, #news-list script")).toHaveCount(0);
});

test("searches for cities and updates the selected weather location", async ({ page }) => {
  await page.goto("/");
  await page.locator("#weather-search-input").fill("Cairo");
  await page.locator("#weather-search-button").click();
  await expect(page.locator("#weather-city")).toContainText("القاهرة");
  await expect(page.locator("#weather-status")).toContainText("تم تحديث الطقس بنجاح.");

  await page.locator("#map-search-input").fill("Berlin");
  await page.locator("#map-search-button").click();
  await expect(page.locator("#map-status")).toContainText("تم العثور على");
});

test("saves, restores and removes favorite places", async ({ page }) => {
  await page.goto("/");
  await page.locator("#save-place-button").click();
  await expect(page.locator("#favorite-places .favorite-place")).toHaveCount(1);
  await expect(page.locator("#favorite-places")).toContainText("برلين");
  await page.reload();
  await expect(page.locator("#favorite-places .favorite-place")).toHaveCount(1);
  await page.locator("#favorite-places [data-remove-favorite]").click();
  await expect(page.locator("#favorite-places .favorite-place")).toHaveCount(0);
  await expect(page.locator("#favorite-places .favorites-empty")).toBeVisible();
});

test("converts currencies, supports identical currencies and swapping", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#rate-date")).toHaveText("2026-11-13");
  await expect(page.locator("#conversion-value")).not.toHaveText("—");

  await page.locator("#to-currency").selectOption("EUR");
  await expect(page.locator("#rate-date")).toHaveText("لا يلزم تحويل");
  await expect(page.locator("#currency-status")).toBeEmpty();

  await page.locator("#to-currency").selectOption("USD");
  await page.locator("#swap-currencies").click();
  await expect(page.locator("#from-currency")).toHaveValue("USD");
  await expect(page.locator("#to-currency")).toHaveValue("EUR");
  await expect(page.locator("#rate-date")).toHaveText("2026-11-13");
});

test("shows a useful message when the currency provider is unavailable", async ({ page }) => {
  await page.route("https://api.frankfurter.app/**", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await expect(page.locator("#currency-status")).toContainText("غير متاحة");
});

test("updates the selected location when the user clicks the map", async ({ page }) => {
  await page.goto("/");
  await page.locator("#map").click({ position: { x: 180, y: 120 } });
  await expect(page.locator("#selected-place")).toContainText("القاهرة");
  await expect(page.locator("#map-status")).toContainText("تم اختيار الموقع");
});

test("shows a clear validation message for an unknown city", async ({ page }) => {
  await page.route("https://geocoding-api.open-meteo.com/**", route =>
    route.fulfill({ json: { results: [] } })
  );
  await page.goto("/");
  await page.locator("#weather-search-input").fill("No such city");
  await page.locator("#weather-search-button").click();
  await expect(page.locator("#weather-status")).toContainText("لم نعثر على هذه المدينة");
});

test("keeps the newest city search when an earlier geocoding request is slower", async ({ page }) => {
  await page.route("https://geocoding-api.open-meteo.com/v1/search**", async route => {
    const url = new URL(route.request().url());
    const name = url.searchParams.get("name");
    if (name === "Slow city") await new Promise(resolve => setTimeout(resolve, 400));
    const isFast = name === "Fast city";
    await route.fulfill({
      json: {
        results: [{
          name: isFast ? "Fast city" : "Slow city",
          country: "Test",
          latitude: isFast ? 20 : 10,
          longitude: isFast ? 20 : 10
        }]
      }
    });
  });

  await page.goto("/");
  await page.locator("#weather-search-input").fill("Slow city");
  await page.locator("#weather-search-button").click();
  await page.locator("#weather-search-input").fill("Fast city");
  await page.locator("#weather-search-button").click();
  await expect(page.locator("#weather-city")).toContainText("Fast city");
  await page.waitForTimeout(500);
  await expect(page.locator("#weather-city")).toContainText("Fast city");
});

test("shows a fallback when the weather provider is unavailable", async ({ page }) => {
  await page.route("https://api.open-meteo.com/v1/forecast**", route =>
    route.fulfill({ status: 503, body: "Unavailable" })
  );
  await page.goto("/");
  await expect(page.locator("#weather-description")).toHaveText("البيانات غير متاحة حالياً");
  await expect(page.locator("#weather-status")).toContainText("تعذر الاتصال بخدمة الطقس");
});

test("shows a fallback when the news provider is unavailable", async ({ page }) => {
  await page.route("https://api.gdeltproject.org/api/v2/doc/doc**", route =>
    route.fulfill({ status: 503, body: "Unavailable" })
  );
  await page.goto("/");
  await expect(page.locator("#news-list .news-placeholder")).toContainText("تعذر تحميل الأخبار");
});

test("escapes untrusted holiday type labels", async ({ page }) => {
  await page.route("https://date.nager.at/api/v3/PublicHolidays/**", route =>
    route.fulfill({
      json: [{
        date: "2026-01-01",
        localName: "عطلة اختبار",
        name: "Test holiday",
        types: ["<img src=x onerror=alert(1)>"]
      }]
    })
  );
  await page.goto("/");
  await expect(page.locator("#holiday-list")).toContainText("<img src=x onerror=alert(1)>");
  await expect(page.locator("#holiday-list img")).toHaveCount(0);
});


test("switches between light and dark themes and persists the preference", async ({ page }) => {
  await page.goto("/");
  const theme = page.locator("#theme-toggle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("converts current and forecast temperatures between Celsius and Fahrenheit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#current-temp")).toHaveText("18°C");
  await page.locator("#unit-toggle").click();
  await expect(page.locator("#current-temp")).toHaveText("64°F");
  await expect(page.locator("#feels-like")).toContainText("63°F");
  await expect(page.locator("#forecast-list .forecast-row").first().locator("strong")).toHaveText("66°F");
  await page.reload();
  await expect(page.locator("#current-temp")).toHaveText("64°F");
  await page.locator("#unit-toggle").click();
  await expect(page.locator("#current-temp")).toHaveText("18°C");
});

test("refreshes weather, currency, news and holidays from the global refresh control", async ({ page }) => {
  await page.goto("/");
  await page.locator("#refresh-button").click();
  await expect(page.locator("#weather-status")).toContainText("تم تحديث الطقس بنجاح.");
  await expect(page.locator("#rate-date")).toHaveText("2026-11-13");
  await expect(page.locator("#holiday-list .holiday-item")).toHaveCount(1);
  await expect(page.locator("#sync-status")).not.toContainText("جارٍ تحديث");
  await expect(page.locator("#refresh-button")).toBeEnabled();
});

test("exposes clear accessible labels for theme and temperature controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "تفعيل الوضع الداكن" })).toBeVisible();
  await expect(page.getByRole("button", { name: "التحويل إلى فهرنهايت" })).toBeVisible();
  await expect(page.locator("#refresh-button")).toHaveAttribute("aria-label", "تحديث جميع البيانات");
});

test("publishes a valid installable PWA manifest and offline app shell", async ({ page, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Datum — لوحة العالم");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./");

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBeTruthy();
  const workerSource = await workerResponse.text();
  expect(workerSource).toContain("caches.open");
  expect(workerSource).toContain("datum-shell-v2");

  const iconResponse = await request.get("/assets/datum-icon.svg");
  expect(iconResponse.ok()).toBeTruthy();
});


test("manages tasks, filters them and persists changes locally", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#task-total")).toHaveText("0");
  await page.locator("#task-title").fill("إعداد تقرير المشروع");
  await page.locator("#task-due").fill("2026-12-01");
  await page.locator("#task-priority").selectOption("high");
  await page.locator("#task-form button[type=submit]").click();
  await expect(page.locator("#task-total")).toHaveText("1");
  await expect(page.locator("#task-open")).toHaveText("1");
  await expect(page.locator("#task-list")).toContainText("إعداد تقرير المشروع");
  await expect(page.locator("#task-list .priority-high")).toContainText("عالية");
  await page.locator("#task-list input[data-task-complete]").check();
  await expect(page.locator("#task-completed")).toHaveText("1");
  await expect(page.locator("#task-progress")).toHaveText("100%");
  await page.locator('[data-task-filter="open"]').click();
  await expect(page.locator("#task-list .task-item")).toHaveCount(0);
  await page.locator('[data-task-filter="completed"]').click();
  await expect(page.locator("#task-list .task-item")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#task-total")).toHaveText("1");
  await expect(page.locator("#task-completed")).toHaveText("1");
  await page.locator("#task-list [data-task-delete]").click();
  await expect(page.locator("#task-total")).toHaveText("0");
});

test("escapes task titles and validates empty submissions", async ({ page }) => {
  await page.goto("/");
  await page.locator("#task-form button[type=submit]").click();
  await expect(page.locator("#task-title")).toBeFocused();
  await expect(page.locator("#task-list .task-item")).toHaveCount(0);
  await page.locator("#task-title").fill('<img src=x onerror=alert(1)>');
  await page.locator("#task-form button[type=submit]").click();
  await expect(page.locator("#task-list")).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator("#task-list img")).toHaveCount(0);
});

test("autosaves quick notes and restores them after reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("#quick-notes").fill("خطة الأسبوع: مراجعة المشروع ثم نشر التحديثات.");
  await expect(page.locator("#notes-status")).toHaveText("تم الحفظ");
  await expect(page.locator("#notes-count")).toContainText(" / 5000");
  await page.reload();
  await expect(page.locator("#quick-notes")).toHaveValue("خطة الأسبوع: مراجعة المشروع ثم نشر التحديثات.");
});

test("starts, pauses and resets the focus timer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#focus-time")).toHaveText("25:00");
  await page.locator("#focus-start").click();
  await expect(page.locator("#focus-start")).toHaveText("إيقاف مؤقت");
  await page.waitForTimeout(1100);
  await expect(page.locator("#focus-time")).not.toHaveText("25:00");
  await page.locator("#focus-start").click();
  await expect(page.locator("#focus-start")).toHaveText("استئناف");
  const pausedTime = await page.locator("#focus-time").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator("#focus-time")).toHaveText(pausedTime);
  await page.locator("#focus-reset").click();
  await expect(page.locator("#focus-time")).toHaveText("25:00");
  await expect(page.locator("#focus-start")).toHaveText("ابدأ التركيز");
});


test("keeps the layout usable without horizontal page overflow on phone, tablet and laptop widths", async ({ page }) => {
  const sizes = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 }
  ];
  await page.goto("/");
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(80);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector(".main-content").getBoundingClientRect().width
    }));
    expect(dimensions.document, `horizontal overflow at ${size.width}px: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.main).toBeGreaterThan(0);
    await expect(page.locator("#open-customizer")).toBeVisible();
    await expect(page.locator("#map")).toBeVisible();
  }
});

test("provides scrollable bottom navigation and safe-area spacing on narrow phones", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  const nav = page.locator(".main-nav");
  await expect(nav).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCSS("position", "fixed");
  const metrics = await nav.evaluate(element => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
    links: element.querySelectorAll(".nav-link").length
  }));
  expect(metrics.links).toBeGreaterThanOrEqual(8);
  expect(metrics.scroll).toBeGreaterThan(metrics.client);
  await page.locator('.nav-link[href="#productivity"]').click();
  await expect(page.locator("#productivity")).toBeInViewport();
});


test("boots the dashboard through dedicated object-oriented feature controllers", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/");
  const controllers = await page.evaluate(() => ({
    app: window.datumApp?.constructor?.name,
    core: window.datumApp?.core?.constructor?.name,
    pwa: window.datumApp?.pwa?.constructor?.name,
    preferences: window.datumApp?.preferences?.constructor?.name,
    weather: window.datumApp?.weather?.constructor?.name,
    financeNews: window.datumApp?.financeNews?.constructor?.name,
    customizer: window.datumApp?.customizer?.constructor?.name,
    calendar: window.datumApp?.calendar?.constructor?.name,
    productivity: window.datumApp?.productivity?.constructor?.name
  }));
  expect(controllers).toEqual({
    app: "DatumApplication",
    core: "CoreUtils",
    pwa: "PwaManager",
    preferences: "PreferencesManager",
    weather: "WeatherService",
    financeNews: "FinanceNewsService",
    customizer: "DashboardCustomizer",
    calendar: "CalendarService",
    productivity: "ProductivityManager"
  });
  expect(pageErrors).toEqual([]);
});
