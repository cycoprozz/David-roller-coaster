import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { formatDuration, getManualMakes, getManualModels, getManualOptions } from './vehicleMpgManual';

type Theme = 'dark' | 'light';
type Lang = 'en' | 'fr' | 'ht' | 'es';

type GeoPoint = {
  label: string;
  lat: number;
  lon: number;
};

type Step = {
  instruction: string;
  distance: number;
  duration: number;
  name?: string;
};

type RouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
  steps: Step[];
};

type Vehicle = {
  year: string;
  make: string;
  model: string;
  option: string;
  mpg: number;
};

type SavedTrip = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  vehicle: Vehicle;
  gasPrice: number;
  gallons: number;
  cost: number;
};

type PlaceSuggestion = GeoPoint & { id: string; detail?: string };

type FuelDeal = {
  id: string;
  name: string;
  brand: string;
  address: string;
  lat: number;
  lon: number;
  distanceMiles: number;
  price: number;
  promo: string;
  source: string;
};

type ChargeSpot = {
  id: string;
  name: string;
  network: string;
  address: string;
  lat: number;
  lon: number;
  distanceMiles: number;
  connector: string;
  cost: string;
};

const translations: Record<Lang, Record<string, string>> = {
  en: {
    tagline: 'Smart fuel-aware road trips',
    subtitle: 'Plan the fastest drive, estimate gallons, compare fuel cost, and save your favorite trips.',
    origin: 'Origin',
    destination: 'Destination',
    route: 'Calculate route',
    vehicle: 'Vehicle MPG lookup',
    summary: 'Trip summary',
    saved: 'Saved trips',
    assistant: 'Route assistant',
  },
  fr: {
    tagline: 'Trajets intelligents selon le carburant',
    subtitle: 'Planifiez le trajet le plus rapide, estimez les gallons, comparez le coût et sauvegardez vos voyages.',
    origin: 'Départ',
    destination: 'Destination',
    route: 'Calculer',
    vehicle: 'Recherche MPG du véhicule',
    summary: 'Résumé du trajet',
    saved: 'Trajets sauvegardés',
    assistant: 'Assistant de route',
  },
  ht: {
    tagline: 'Vwayaj entelijan ki kalkile gaz',
    subtitle: 'Planifye wout ki pi rapid la, estime galon, konpare pri gaz, epi sove vwayaj ou yo.',
    origin: 'Kote w ap soti',
    destination: 'Kote w prale',
    route: 'Kalkile wout la',
    vehicle: 'Chèche MPG machin nan',
    summary: 'Rezime vwayaj la',
    saved: 'Vwayaj ki sove',
    assistant: 'Asistan wout',
  },
  es: {
    tagline: 'Viajes inteligentes con cálculo de combustible',
    subtitle: 'Planifica la ruta más rápida, estima galones, compara costos y guarda tus viajes.',
    origin: 'Origen',
    destination: 'Destino',
    route: 'Calcular ruta',
    vehicle: 'Buscar MPG del vehículo',
    summary: 'Resumen del viaje',
    saved: 'Viajes guardados',
    assistant: 'Asistente de ruta',
  },
};

const fallbackGasPrices: Record<string, number> = {
  US: 3.48, AL: 3.05, AK: 4.22, AZ: 3.67, AR: 3.08, CA: 4.96, CO: 3.33, CT: 3.56, DC: 3.72,
  DE: 3.31, FL: 3.29, GA: 3.19, HI: 4.72, IA: 3.10, ID: 3.64, IL: 3.74, IN: 3.39, KS: 3.02,
  KY: 3.22, LA: 3.06, MA: 3.52, MD: 3.45, ME: 3.49, MI: 3.48, MN: 3.20, MO: 3.01, MS: 2.96,
  MT: 3.38, NC: 3.21, ND: 3.21, NE: 3.16, NH: 3.42, NJ: 3.36, NM: 3.13, NV: 4.12, NY: 3.63,
  OH: 3.34, OK: 2.98, OR: 4.18, PA: 3.68, RI: 3.48, SC: 3.08, SD: 3.24, TN: 3.10, TX: 2.99,
  UT: 3.69, VA: 3.29, VT: 3.56, WA: 4.55, WI: 3.20, WV: 3.42, WY: 3.27,
};

const years = Array.from({ length: 2026 - 1984 + 1 }, (_, i) => String(2026 - i));
const starterMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 'Tesla', 'BMW', 'Mercedes-Benz'];

function miles(km: number) { return km * 0.621371; }
function money(v: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0); }
function one(v: number) { return Number.isFinite(v) ? v.toFixed(1) : '0.0'; }
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function distanceMiles(a: GeoPoint, b: GeoPoint) {
  const R = 3958.8;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function tagValue(tags: Record<string, string> = {}, keys: string[], fallback = '') {
  for (const key of keys) if (tags[key]) return tags[key];
  return fallback;
}

async function geocode(query: string): Promise<GeoPoint> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  if (!data?.length) throw new Error(`Could not find address: ${query}`);
  return { label: data[0].display_name, lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

async function autocompletePlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');
  url.searchParams.set('q', query);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((item: any) => ({
    id: String(item.place_id),
    label: item.display_name,
    detail: [item.type, item.address?.city || item.address?.town || item.address?.state].filter(Boolean).join(' · '),
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}

async function overpass(query: string) {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: query,
  });
  if (!res.ok) throw new Error(`Station search failed (${res.status})`);
  return res.json();
}

async function findFuelDeals(center: GeoPoint, radiusMiles = 50, region = 'US'): Promise<FuelDeal[]> {
  const radiusMeters = Math.round(radiusMiles * 1609.344);
  const custom = import.meta.env.VITE_GAS_DEALS_API_URL as string | undefined;
  if (custom) {
    try {
      const url = custom
        .replace('{lat}', String(center.lat))
        .replace('{lon}', String(center.lon))
        .replace('{radius}', String(radiusMiles))
        .replace('{region}', encodeURIComponent(region));
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.stations || data.deals || [];
        return rows.slice(0, 24).map((row: any, index: number) => ({
          id: String(row.id || index),
          name: row.name || row.station || 'Fuel station',
          brand: row.brand || row.chain || 'Independent',
          address: row.address || row.vicinity || 'Address not provided',
          lat: Number(row.lat || row.latitude),
          lon: Number(row.lon || row.lng || row.longitude),
          distanceMiles: Number(row.distanceMiles || row.distance || 0),
          price: Number(row.price || row.regular || row.gas_price || fallbackGasPrices[region] || fallbackGasPrices.US),
          promo: row.promo || row.cashback || row.offer || 'Provider promo available',
          source: 'configured live deals API',
        }));
      }
    } catch {
      // fall through to OSM station discovery
    }
  }

  const q = `[out:json][timeout:25];(
    node["amenity"="fuel"](around:${radiusMeters},${center.lat},${center.lon});
    way["amenity"="fuel"](around:${radiusMeters},${center.lat},${center.lon});
  );out center tags 35;`;
  const data = await overpass(q);
  const base = fallbackGasPrices[region] || fallbackGasPrices.US;
  return (data.elements || []).map((el: any, index: number) => {
    const p = { lat: Number(el.lat ?? el.center?.lat), lon: Number(el.lon ?? el.center?.lon), label: '' };
    const d = distanceMiles(center, p);
    const variance = ((index % 9) - 4) * 0.035;
    const discount = 0.05 + (index % 4) * 0.04;
    return {
      id: String(el.id),
      name: tagValue(el.tags, ['name', 'operator', 'brand'], 'Fuel station'),
      brand: tagValue(el.tags, ['brand', 'operator'], 'Independent'),
      address: tagValue(el.tags, ['addr:full', 'addr:street'], 'OpenStreetMap location'),
      lat: p.lat,
      lon: p.lon,
      distanceMiles: d,
      price: Math.max(2.25, base + variance - discount),
      promo: `Promo-ready estimate: save about ${money(discount)}/gal when a provider is connected`,
      source: 'OSM station + regional estimate; connect VITE_GAS_DEALS_API_URL for true live promos',
    };
  }).filter((s: FuelDeal) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).sort((a: FuelDeal, b: FuelDeal) => a.price - b.price).slice(0, 18);
}

async function findChargeSpots(center: GeoPoint, radiusMiles = 50): Promise<ChargeSpot[]> {
  const radiusMeters = Math.round(radiusMiles * 1609.344);
  const q = `[out:json][timeout:25];(
    node["amenity"="charging_station"](around:${radiusMeters},${center.lat},${center.lon});
    way["amenity"="charging_station"](around:${radiusMeters},${center.lat},${center.lon});
  );out center tags 50;`;
  const data = await overpass(q);
  return (data.elements || []).map((el: any) => {
    const p = { lat: Number(el.lat ?? el.center?.lat), lon: Number(el.lon ?? el.center?.lon), label: '' };
    const network = tagValue(el.tags, ['network', 'brand', 'operator'], 'Third-party charger');
    const isTesla = /tesla|supercharger/i.test(`${network} ${el.tags?.name || ''}`);
    return {
      id: String(el.id),
      name: tagValue(el.tags, ['name', 'operator'], isTesla ? 'Tesla Supercharger' : 'EV charging station'),
      network: isTesla ? 'Tesla Supercharger' : network,
      address: tagValue(el.tags, ['addr:full', 'addr:street'], 'OpenStreetMap location'),
      lat: p.lat,
      lon: p.lon,
      distanceMiles: distanceMiles(center, p),
      connector: tagValue(el.tags, ['socket:tesla_supercharger', 'socket:tesla_destination', 'socket:type2', 'socket:chademo', 'socket:ccs'], isTesla ? 'Tesla / NACS' : 'Connector varies'),
      cost: tagValue(el.tags, ['fee', 'charge'], isTesla ? 'Tesla app live price' : 'Check network app'),
    };
  }).filter((s: ChargeSpot) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).sort((a: ChargeSpot, b: ChargeSpot) => {
    const at = /tesla/i.test(a.network) ? -1000 : 0;
    const bt = /tesla/i.test(b.network) ? -1000 : 0;
    return (a.distanceMiles + at) - (b.distanceMiles + bt);
  }).slice(0, 24);
}

async function routeBetween(origin: GeoPoint, destination: GeoPoint): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('No route found.');
  const steps = route.legs?.flatMap((leg: any) => leg.steps || []).map((step: any) => ({
    instruction: step.maneuver?.instruction || humanStep(step),
    distance: step.distance,
    duration: step.duration,
    name: step.name,
  })) || [];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
    steps,
  };
}

function humanStep(step: any) {
  const type = step.maneuver?.type || 'continue';
  const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
  const road = step.name ? ` on ${step.name}` : '';
  if (type === 'depart') return `Start${road}`;
  if (type === 'arrive') return 'Arrive at destination';
  return `${type}${modifier}${road}`.replace(/^./, (c) => c.toUpperCase());
}

async function fuelEconomy(path: string) {
  const res = await fetch(`https://www.fueleconomy.gov/ws/rest/${path}`, { headers: { Accept: 'application/xml' } });
  if (!res.ok) throw new Error(`FuelEconomy.gov error ${res.status}`);
  const text = await res.text();
  return new DOMParser().parseFromString(text, 'text/xml');
}

function menuItems(xml: Document): string[] {
  return Array.from(xml.querySelectorAll('menuItem text')).map((n) => n.textContent || '').filter(Boolean);
}

function vehicleOptions(xml: Document): { id: string; text: string }[] {
  return Array.from(xml.querySelectorAll('menuItem')).map((item) => ({
    id: item.querySelector('value')?.textContent || '',
    text: item.querySelector('text')?.textContent || '',
  })).filter((item) => item.id);
}

async function fetchGasPrice(region: string): Promise<{ price: number; source: string }> {
  const custom = import.meta.env.VITE_GAS_PRICE_API_URL as string | undefined;
  if (custom) {
    try {
      const url = custom.replace('{region}', encodeURIComponent(region));
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const price = Number(data.price ?? data.average ?? data.regular ?? data.gasoline ?? data.data?.price);
        if (price > 0) return { price, source: 'configured live API' };
      }
    } catch {
      // fall back below
    }
  }
  return { price: fallbackGasPrices[region] || fallbackGasPrices.US, source: 'built-in state estimate; configure VITE_GAS_PRICE_API_URL for live pricing' };
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('drc-theme') as Theme) || 'dark');
  const [lang, setLang] = useState<Lang>('en');
  const t = translations[lang];
  const [origin, setOrigin] = useState('Atlanta, GA');
  const [destination, setDestination] = useState('Orlando, FL');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState('');
  const [busy, setBusy] = useState(false);

  const [year, setYear] = useState('2022');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Camry');
  const [makes, setMakes] = useState<string[]>(starterMakes);
  const [models, setModels] = useState<string[]>(['Camry', 'Corolla', 'RAV4', 'Prius']);
  const [options, setOptions] = useState<{ id: string; text: string; mpg?: number }[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [manualMpg, setManualMpg] = useState(32);
  const [vehicleMpg, setVehicleMpg] = useState(32);
  const [mpgSource, setMpgSource] = useState('Manual MPG fallback');

  const [gasRegion, setGasRegion] = useState('GA');
  const [gasPrice, setGasPrice] = useState(3.19);
  const [gasSource, setGasSource] = useState('built-in state estimate');
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dealCenter, setDealCenter] = useState<GeoPoint | null>(null);
  const [fuelDeals, setFuelDeals] = useState<FuelDeal[]>([]);
  const [chargeSpots, setChargeSpots] = useState<ChargeSpot[]>([]);
  const [stationBusy, setStationBusy] = useState(false);
  const [stationError, setStationError] = useState('');
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => JSON.parse(localStorage.getItem('drc-trips') || '[]'));
  const [assistantInput, setAssistantInput] = useState('How can I save money on this trip?');
  const [assistantAnswer, setAssistantAnswer] = useState('Ask for scenic stops, cheaper fuel strategy, comfort breaks, or route tradeoffs.');

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('drc-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('drc-trips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, { zoomControl: false }).setView([33.749, -84.388], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(leafletRef.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(leafletRef.current);
  }, []);

  useEffect(() => {
    fetchGasPrice(gasRegion).then((data) => { setGasPrice(data.price); setGasSource(data.source); });
  }, [gasRegion]);

  useEffect(() => {
    const handle = window.setTimeout(() => autocompletePlaces(origin).then(setOriginSuggestions), 350);
    return () => window.clearTimeout(handle);
  }, [origin]);

  useEffect(() => {
    const handle = window.setTimeout(() => autocompletePlaces(destination).then(setDestinationSuggestions), 350);
    return () => window.clearTimeout(handle);
  }, [destination]);

  useEffect(() => {
    const localMakes = getManualMakes(year);
    fuelEconomy(`vehicle/menu/make?year=${year}`)
      .then((xml) => setMakes(Array.from(new Set([...localMakes, ...menuItems(xml)])).sort()))
      .catch(() => setMakes(localMakes.length ? localMakes : starterMakes));
  }, [year]);

  useEffect(() => {
    if (!make) return;
    const localModels = getManualModels(year, make);
    fuelEconomy(`vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`)
      .then((xml) => setModels(Array.from(new Set([...localModels, ...menuItems(xml)])).sort()))
      .catch(() => setModels(localModels.length ? localModels : ['Camry']));
  }, [year, make]);

  useEffect(() => {
    if (!model) return;
    const localOptions = getManualOptions(year, make, model);
    fuelEconomy(`vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)
      .then((xml) => {
        const apiOptions = vehicleOptions(xml);
        const merged = [...apiOptions, ...localOptions.filter((local) => !apiOptions.some((api) => api.text === local.text))];
        setOptions(merged);
        setVehicleId(merged[0]?.id || '');
        if (!apiOptions.length && localOptions[0]) {
          setVehicleMpg(localOptions[0].mpg);
          setManualMpg(localOptions[0].mpg);
          setMpgSource('Built-in vehicle MPG manual');
        }
      })
      .catch(() => {
        setOptions(localOptions);
        setVehicleId(localOptions[0]?.id || '');
        if (localOptions[0]) {
          setVehicleMpg(localOptions[0].mpg);
          setManualMpg(localOptions[0].mpg);
          setMpgSource('Built-in vehicle MPG manual');
        }
      });
  }, [year, make, model]);

  useEffect(() => {
    if (!vehicleId) return;
    const localOption = options.find((option) => option.id === vehicleId && option.mpg);
    if (localOption?.mpg) {
      setVehicleMpg(localOption.mpg);
      setManualMpg(localOption.mpg);
      setMpgSource('Built-in vehicle MPG manual');
      return;
    }
    fuelEconomy(`vehicle/${vehicleId}`)
      .then((xml) => {
        const mpg = Number(xml.querySelector('comb08')?.textContent || 0);
        if (mpg > 0) {
          setVehicleMpg(mpg);
          setManualMpg(mpg);
          setMpgSource('FuelEconomy.gov combined MPG');
        }
      })
      .catch(() => setMpgSource('Manual MPG fallback'));
  }, [vehicleId, options]);

  const tripMath = useMemo(() => {
    const distanceMiles = route ? miles(route.distanceKm) : 0;
    const mpg = Number(vehicleMpg || manualMpg || 1);
    const gallons = distanceMiles / Math.max(mpg, 1);
    const cost = gallons * gasPrice;
    return { distanceMiles, mpg, gallons, cost };
  }, [route, vehicleMpg, manualMpg, gasPrice]);

  async function loadStations(center: GeoPoint) {
    setStationBusy(true);
    setStationError('');
    setDealCenter(center);
    try {
      const [deals, chargers] = await Promise.all([
        findFuelDeals(center, 50, gasRegion),
        findChargeSpots(center, 50),
      ]);
      setFuelDeals(deals);
      setChargeSpots(chargers);
      if (deals[0]?.price) {
        setGasPrice(deals[0].price);
        setGasSource(deals[0].source);
      }
    } catch (error: any) {
      setStationError(error.message || 'Could not load nearby stations.');
    } finally {
      setStationBusy(false);
    }
  }

  async function calculateRoute() {
    setBusy(true);
    setRouteError('');
    try {
      const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
      const result = await routeBetween(o, d);
      setRoute(result);
      drawRoute(result, o, d);
    } catch (error: any) {
      setRouteError(error.message || 'Route failed.');
    } finally {
      setBusy(false);
    }
  }

  function drawRoute(result: RouteResult, o: GeoPoint, d: GeoPoint) {
    const map = leafletRef.current;
    if (!map) return;
    if (layerRef.current) layerRef.current.remove();
    const group = L.layerGroup();
    L.polyline(result.geometry, { color: '#7c7cff', weight: 6, opacity: 0.9 }).addTo(group);
    L.circleMarker([o.lat, o.lon], { radius: 8, color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }).bindPopup(`Start: ${o.label}`).addTo(group);
    L.circleMarker([d.lat, d.lon], { radius: 8, color: '#ffb454', fillColor: '#ffb454', fillOpacity: 1 }).bindPopup(`Finish: ${d.label}`).addTo(group);
    group.addTo(map);
    layerRef.current = group;
    map.fitBounds(L.polyline(result.geometry).getBounds(), { padding: [28, 28] });
  }

  function saveTrip() {
    if (!route) return;
    const trip: SavedTrip = {
      id: uid(), origin, destination, date: new Date().toISOString(), distanceKm: route.distanceKm, durationMin: route.durationMin,
      vehicle: { year, make, model, option: options.find((o) => o.id === vehicleId)?.text || 'Manual', mpg: tripMath.mpg },
      gasPrice, gallons: tripMath.gallons, cost: tripMath.cost,
    };
    setSavedTrips((trips) => [trip, ...trips].slice(0, 20));
  }

  function answerAssistant() {
    const q = assistantInput.toLowerCase();
    const parts = [];
    if (route) parts.push(`Your fastest route is ${one(tripMath.distanceMiles)} miles and about ${formatDuration(route.durationMin)}.`);
    if (q.includes('save') || q.includes('cheap') || q.includes('cost')) {
      parts.push(`Fuel strategy: keep speed smooth, avoid hard accelerations, and fill up before high-price metro/tourist areas. At ${one(tripMath.mpg)} MPG, each $0.25/gal price difference changes this trip by about ${money(tripMath.gallons * 0.25)}.`);
    }
    if (q.includes('scenic') || q.includes('stop')) {
      parts.push('Scenic stop idea: add one midpoint stop near parks, museums, cafes, or viewpoints. The app is structured so POI APIs can be added next.');
    }
    if (!parts.length) parts.push('I can explain the route, compare fuel costs, suggest rest breaks, or help plan a lower-cost drive.');
    setAssistantAnswer(parts.join(' '));
  }

  return (
    <main className="app-shell">
      <section className="hero panel glow">
        <nav className="topbar" aria-label="Main navigation">
          <div className="brand" aria-label="David Roller Coaster home">
            <img className="logo-img" src="/assets/david-roller-coaster-logo.png" alt="David Roller Coaster logo" />
            <div><strong>David Roller Coaster</strong><small>Road-trip fuel planner</small></div>
          </div>
          <div className="controls">
            <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              <option value="en">EN</option><option value="fr">FR</option><option value="ht">HT</option><option value="es">ES</option>
            </select>
            <button className="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? 'Light' : 'Dark'} mode</button>
          </div>
        </nav>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">{t.tagline}</p>
            <h1>Plan the fastest route and know the fuel cost before you roll.</h1>
            <p className="lede">{t.subtitle}</p>
            <div className="badges"><span>OSM + OSRM routing</span><span>FuelEconomy.gov MPG</span><span>i18n ready</span><span>Local trip vault</span></div>
          </div>
          <div className="score-card" aria-live="polite">
            <span className="score-label">Estimated trip cost</span>
            <strong>{money(tripMath.cost)}</strong>
            <small>{route ? `${one(tripMath.gallons)} gal · ${one(tripMath.distanceMiles)} mi` : 'Calculate a route to unlock cost.'}</small>
            <div className="progress"><span style={{ width: `${Math.min(100, Math.max(8, (vehicleMpg / 55) * 100))}%` }} /></div>
            <small>Eco score: {vehicleMpg >= 35 ? 'Efficient cruiser' : vehicleMpg >= 25 ? 'Balanced ride' : 'Fuel-hungry route'}</small>
          </div>
        </div>
      </section>

      <section className="planner-grid">
        <div className="panel form-panel">
          <h2>Route planner</h2>
          <label>{t.origin}<input list="origin-autofill" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City, address, landmark" />
            <datalist id="origin-autofill">{originSuggestions.map((p) => <option key={p.id} value={p.label}>{p.detail}</option>)}</datalist>
          </label>
          <label>{t.destination}<input list="destination-autofill" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City, address, landmark" />
            <datalist id="destination-autofill">{destinationSuggestions.map((p) => <option key={p.id} value={p.label}>{p.detail}</option>)}</datalist>
          </label>
          <button className="primary" onClick={calculateRoute} disabled={busy}>{busy ? 'Calculating…' : t.route}</button>
          {routeError && <p className="error" role="alert">{routeError}</p>}

          <h2>{t.vehicle}</h2>
          <div className="three-cols">
            <label>Year<select value={year} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
            <label>Make<input list="makes" value={make} onChange={(e) => setMake(e.target.value)} /><datalist id="makes">{makes.map((m) => <option key={m} value={m} />)}</datalist></label>
            <label>Model<input list="models" value={model} onChange={(e) => setModel(e.target.value)} /><datalist id="models">{models.map((m) => <option key={m} value={m} />)}</datalist></label>
          </div>
          <label>Trim / engine
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Manual / not selected</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
            </select>
          </label>
          <label>Estimated combined MPG<input type="number" min="1" value={manualMpg} onChange={(e) => { setManualMpg(Number(e.target.value)); setVehicleMpg(Number(e.target.value)); setMpgSource('Manual MPG fallback'); }} /></label>
          <p className="hint">MPG source: {mpgSource}. Choose year, make, model, and trim to auto-fill from the built-in manual catalog when FuelEconomy.gov is unavailable.</p>

          <h2>Fuel price</h2>
          <div className="two-cols">
            <label>Region/state<select value={gasRegion} onChange={(e) => setGasRegion(e.target.value)}>{Object.keys(fallbackGasPrices).map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Price per gallon<input type="number" step="0.01" min="0" value={gasPrice} onChange={(e) => { setGasPrice(Number(e.target.value)); setGasSource('manual override'); }} /></label>
          </div>
          <p className="hint">Gas source: {gasSource}</p>
        </div>

        <div className="map-panel panel">
          <div ref={mapRef} className="map" role="application" aria-label="Interactive route map" />
        </div>

        <aside className="panel summary">
          <h2>{t.summary}</h2>
          <Metric label="Distance" value={route ? `${one(tripMath.distanceMiles)} mi` : '—'} />
          <Metric label="Travel time" value={route ? formatDuration(route.durationMin) : '—'} />
          <Metric label="Vehicle MPG" value={`${one(tripMath.mpg)} MPG`} />
          <Metric label="Gallons needed" value={route ? `${one(tripMath.gallons)} gal` : '—'} />
          <Metric label="Fuel price" value={`${money(gasPrice)} / gal`} />
          <Metric label="Estimated cost" value={money(tripMath.cost)} featured />
          <button className="primary full" onClick={saveTrip} disabled={!route}>Save this trip</button>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="panel directions">
          <h2>Turn-by-turn details</h2>
          <ol>{(route?.steps || []).slice(0, 12).map((step, i) => <li key={i}><span>{step.instruction}</span><small>{one(step.distance / 1609.344)} mi · {formatDuration(step.duration / 60)}</small></li>)}</ol>
          {!route && <p className="hint">Route steps appear after calculation.</p>}
        </div>

        <div className="panel assistant">
          <h2>{t.assistant}</h2>
          <textarea value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} aria-label="Ask route assistant" />
          <button className="ghost" onClick={answerAssistant}>Ask assistant</button>
          <p>{assistantAnswer}</p>
        </div>

        <div className="panel trips">
          <h2>{t.saved}</h2>
          <div className="trip-list">
            {savedTrips.map((trip) => <article key={trip.id} className="trip-card">
              <strong>{trip.origin} → {trip.destination}</strong>
              <span>{new Date(trip.date).toLocaleString()} · {one(miles(trip.distanceKm))} mi · {formatDuration(trip.durationMin)} · {money(trip.cost)}</span>
              <button className="danger" onClick={() => setSavedTrips((items) => items.filter((item) => item.id !== trip.id))}>Delete</button>
            </article>)}
            {!savedTrips.length && <p className="hint">No saved trips yet. Calculate and save one.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return <div className={`metric ${featured ? 'featured' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
