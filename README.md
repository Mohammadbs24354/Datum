# Datum — World Dashboard

Datum is a responsive Arabic world dashboard built with vanilla HTML, CSS and JavaScript.

## Features

- Live world clocks for Berlin, London, New York, Dubai, Tokyo and Sydney.
- Current weather and a five-day forecast for a searched or selected location.
- Interactive world map powered by Leaflet and OpenStreetMap.
- Search for cities, select a point on the map, or use browser geolocation.
- Date explorer and date-difference calculator.
- Responsive layout for desktop and mobile.

## Data providers

- Weather and geocoding: [Open-Meteo](https://open-meteo.com/) (no API key required for this project).
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Map library: [Leaflet](https://leafletjs.com/).
- Reverse geocoding: [Nominatim](https://nominatim.org/).

## Run locally

Open `index.html` in a modern browser. For best results, use a local development server (for example, VS Code Live Server), because browser geolocation requires a secure context (HTTPS or localhost).

No build step or package installation is required.

## Notes

Weather and geocoding require an internet connection. Browser location access is optional and only runs after the user presses the location button and grants permission. Map data is © OpenStreetMap contributors.
