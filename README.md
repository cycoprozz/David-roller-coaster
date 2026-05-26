# David Roller Coaster

David Roller Coaster is a modern React road-trip planner that calculates driving routes, estimates fuel usage from vehicle MPG, projects fuel cost, and saves past trips locally.

## Features

- Interactive Leaflet/OpenStreetMap map
- Address geocoding with OpenStreetMap Nominatim
- Fastest-route calculation with the public OSRM driving API
- Turn-by-turn route details
- Vehicle year/make/model/trim MPG lookup through FuelEconomy.gov
- Manual MPG fallback
- State-level gas-price field with configurable API hook and built-in fallback estimates
- Trip summary: distance, travel time, MPG, gallons, gas price, and estimated cost
- Save/recall/delete trips with localStorage
- Dark/light theme toggle
- English, French, Haitian Creole, and Spanish UI labels
- Accessible labels, keyboard-friendly controls, reduced-motion support
- Optional route assistant UI with local heuristic answers
- Future-ready structure for tolls, EV chargers, POIs, scenic stops, and a secure backend proxy

## Quick start

```bash
cd "david-roller-coaster"
npm install
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://127.0.0.1:5173
```

## Build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## API/data sources

This project intentionally uses low-cost public data by default:

- Geocoding: OpenStreetMap Nominatim
- Routing: OSRM public demo server
- Map tiles: OpenStreetMap tiles
- Address autofill suggestions through OpenStreetMap Nominatim
- Vehicle MPG: FuelEconomy.gov Web Services
- Upside-style 50-mile fuel marketplace panel with nearby station discovery, price sorting, and promo-ready offer cards
- Optional `VITE_GAS_DEALS_API_URL` hook for verified live gas prices and real promo/cashback data
- EV charging discovery within 50 miles, prioritizing Tesla Superchargers while also listing third-party chargers
- Gas price: built-in state estimates unless a gas-price/deals API is configured

Important: public routing/geocoding services are fine for demos and light usage. For production traffic, use a paid or self-hosted provider such as Mapbox, OpenRouteService, GraphHopper, Google Maps Platform, or a private OSRM instance.

## Environment variables

Create `.env.local` if you want to connect a gas-price API:

```bash
VITE_GAS_PRICE_API_URL="https://your-gas-api.example.com/prices?region={region}"
VITE_GAS_DEALS_API_URL="https://your-gas-deals-api.example.com/deals?lat={lat}&lon={lon}&radius={radius}&region={region}"
```

Expected response shape can be any of these:

```json
{ "price": 3.49 }
{ "average": 3.49 }
{ "regular": 3.49 }
{ "gasoline": 3.49 }
{ "data": { "price": 3.49 } }
```

Security note: Vite variables are shipped to the browser. Do not put private API keys directly in `VITE_*` variables. If your gas-price provider requires a secret key, create a backend/API proxy and keep the key server-side.

## Deployment

### Netlify static deployment

```bash
npm run build
netlify deploy --prod --dir dist
```

### Vercel

```bash
npm run build
vercel --prod
```

For providers that need secret gas-price keys, add a small serverless function:

1. Browser calls `/api/gas-price?region=GA`.
2. Serverless function calls the paid provider with the secret key.
3. Serverless function returns only sanitized `{ "price": 3.49, "source": "provider" }`.

## Future enhancements

- Secure backend proxy for Mapbox/OpenRouteService/AAA/OilPriceAPI keys
- Scenic-stop search using OpenStreetMap Overpass or Google Places
- EV charging stations and EV energy cost
- Toll calculators
- Multi-stop routing
- User accounts and cloud trip sync
- Voice assistant / ASR integration
- Real gamification history: badges, savings streaks, efficient-driver score

## Project structure

```text
src/
  App.tsx       Main application, API calls, route math, trip storage
  main.tsx      React bootstrap
  styles.css    Responsive design system and theme tokens
```

## Name

The app name is **David Roller Coaster**.
