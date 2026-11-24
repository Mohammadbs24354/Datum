// Shared application state. Feature controllers own behavior; this file owns cross-feature state.
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
let dashboardPreferences;
let latestWeatherPayload = null;
let weatherUnit = "celsius";
