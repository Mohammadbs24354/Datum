# Datum — World Dashboard

Datum is a responsive Arabic world dashboard built with vanilla HTML, CSS and JavaScript.

## Features

- Light and dark themes with persistent preferences.
- Switch weather temperatures between Celsius and Fahrenheit without another API request.
- One-click refresh for weather, exchange rates, news and public holidays.
- Accessible utility controls, visible synchronization feedback and reduced-motion support.

- Live world clocks for Berlin, London, New York, Dubai, Tokyo and Sydney.
- Current weather, five-day forecast, sunrise, sunset and daily maximum UV index.
- Interactive world map powered by Leaflet and OpenStreetMap, with street, satellite and terrain basemaps.
- Optional precipitation radar overlay using the latest available RainViewer radar frame.
- Search for cities, select a point on the map, or use browser geolocation.
- Save up to 12 favorite places locally in the browser and revisit them later.
- Personalize the dashboard by showing or hiding sections; preferences persist locally.
- Currency converter for EUR, USD, GBP, AED, EGP, SAR, TRY, CHF, JPY and CAD.
- Global news headlines with topic search and links to original publishers.
- Public holidays calendar by country and year (Nager.Date API).
- Date explorer and date-difference calculator.
- Responsive layout for desktop and mobile.

## Data providers

- Weather, forecast and geocoding: [Open-Meteo](https://open-meteo.com/).
- Currency reference rates: [Frankfurter](https://www.frankfurter.app/).
- News discovery: [GDELT Project](https://www.gdeltproject.org/).
- Public holidays: [Nager.Date](https://date.nager.at/).
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright), [Esri World Imagery](https://www.esri.com/), and [OpenTopoMap](https://opentopomap.org/).
- Precipitation radar: [RainViewer Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html). Its free API is intended for personal/educational use, has no uptime guarantee, and currently limits native radar zoom to level 7.
- Map library: [Leaflet](https://leafletjs.com/).
- Reverse geocoding: [Nominatim](https://nominatim.org/).

## Installable app and offline shell

Datum is a Progressive Web App (PWA). On supported browsers, use the install prompt in the header to add it to the home screen or desktop. A service worker caches the application shell so the dashboard can reopen offline; live weather, currency, news and holiday requests still require an internet connection.

## Interface preferences

Theme and temperature-unit choices are stored locally in the current browser. Weather values are re-rendered from the most recently received forecast, so changing units does not require another network request. The global refresh control requests fresh weather, currency, news and holiday data and reports completion in the header.

## Automated browser tests

The repository includes Playwright end-to-end tests and a GitHub Actions workflow. The workflow runs Chromium tests on pushes and pull requests targeting `main` or `master`, and can also be started manually from the Actions tab.

Run the same checks locally:

```bash
npm install
npx playwright install chromium
npm test
```

External data APIs and map tiles are mocked in the test suite so checks remain deterministic and do not depend on provider availability. The Leaflet library is loaded from the pinned npm package during tests.

## Run locally

Open `index.html` in a modern browser. For best results, use a local development server (for example, VS Code Live Server), because browser geolocation requires a secure context (HTTPS or localhost).

The dashboard itself has no build step. Install the optional development dependencies only when running the automated tests. An internet connection is needed for live data and map tiles.

## Important notes

- Currency rates are reference rates, not guaranteed bank or card transaction rates. Fees and provider spreads may apply.
- News headlines and article links are provided by GDELT and belong to their original publishers. Open the source article for full context.
- Browser location access is optional and only runs after the user presses the location button and grants permission.
- Map data is © OpenStreetMap contributors.
