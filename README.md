# Datum — World Dashboard

Datum is a responsive Arabic world dashboard built with vanilla HTML, CSS and JavaScript.

## Features

- Live world clocks for Berlin, London, New York, Dubai, Tokyo and Sydney.
- Current weather, five-day forecast, sunrise, sunset and daily maximum UV index.
- Interactive world map powered by Leaflet and OpenStreetMap.
- Search for cities, select a point on the map, or use browser geolocation.
- Save up to 12 favorite places locally in the browser and revisit them later.
- Currency converter for EUR, USD, GBP, AED, EGP, SAR, TRY, CHF, JPY and CAD.
- Global news headlines with topic search and links to original publishers.
- Date explorer and date-difference calculator.
- Responsive layout for desktop and mobile.

## Data providers

- Weather, forecast and geocoding: [Open-Meteo](https://open-meteo.com/).
- Currency reference rates: [Frankfurter](https://www.frankfurter.app/).
- News discovery: [GDELT Project](https://www.gdeltproject.org/).
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Map library: [Leaflet](https://leafletjs.com/).
- Reverse geocoding: [Nominatim](https://nominatim.org/).

## Run locally

Open `index.html` in a modern browser. For best results, use a local development server (for example, VS Code Live Server), because browser geolocation requires a secure context (HTTPS or localhost).

No build step or package installation is required. An internet connection is needed for live data and map tiles.

## Important notes

- Currency rates are reference rates, not guaranteed bank or card transaction rates. Fees and provider spreads may apply.
- News headlines and article links are provided by GDELT and belong to their original publishers. Open the source article for full context.
- Browser location access is optional and only runs after the user presses the location button and grants permission.
- Map data is © OpenStreetMap contributors.
