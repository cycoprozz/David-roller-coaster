export type ManualVehicleOption = {
  id: string;
  year: string;
  make: string;
  model: string;
  text: string;
  mpg: number;
};

const baseVehicles: Array<Omit<ManualVehicleOption, 'id' | 'year'>> = [
  { make: 'Toyota', model: 'Camry', text: 'Auto (S8), 6 cyl, 3.5 L', mpg: 26 },
  { make: 'Toyota', model: 'Camry', text: 'LE/SE 4 cyl, 2.5 L', mpg: 32 },
  { make: 'Toyota', model: 'Corolla', text: '2.0 L CVT', mpg: 35 },
  { make: 'Toyota', model: 'RAV4', text: '2.5 L AWD', mpg: 30 },
  { make: 'Toyota', model: 'Prius', text: 'Hybrid FWD', mpg: 57 },
  { make: 'Honda', model: 'Civic', text: '2.0 L CVT', mpg: 35 },
  { make: 'Honda', model: 'Accord', text: '1.5T CVT', mpg: 32 },
  { make: 'Honda', model: 'CR-V', text: '1.5T AWD', mpg: 29 },
  { make: 'Honda', model: 'HR-V', text: '2.0 L CVT', mpg: 28 },
  { make: 'Ford', model: 'F-150', text: '2.7L EcoBoost 2WD', mpg: 22 },
  { make: 'Ford', model: 'Escape', text: '1.5L EcoBoost FWD', mpg: 30 },
  { make: 'Ford', model: 'Explorer', text: '2.3L EcoBoost RWD', mpg: 24 },
  { make: 'Ford', model: 'Mustang', text: '2.3L EcoBoost Auto', mpg: 25 },
  { make: 'Chevrolet', model: 'Malibu', text: '1.5L Turbo CVT', mpg: 30 },
  { make: 'Chevrolet', model: 'Equinox', text: '1.5L Turbo FWD', mpg: 28 },
  { make: 'Chevrolet', model: 'Silverado 1500', text: '2.7L Turbo 2WD', mpg: 20 },
  { make: 'Chevrolet', model: 'Trailblazer', text: '1.3L Turbo FWD', mpg: 31 },
  { make: 'Nissan', model: 'Versa', text: 'S Manual', mpg: 30 },
  { make: 'Nissan', model: 'Versa', text: 'SV CVT', mpg: 35 },
  { make: 'Nissan', model: 'Altima', text: '2.5L CVT FWD', mpg: 32 },
  { make: 'Nissan', model: 'Sentra', text: '2.0L CVT', mpg: 34 },
  { make: 'Nissan', model: 'Rogue', text: '1.5L VC-Turbo AWD', mpg: 31 },
  { make: 'Hyundai', model: 'Elantra', text: '2.0L IVT', mpg: 36 },
  { make: 'Hyundai', model: 'Sonata', text: '2.5L Auto', mpg: 32 },
  { make: 'Hyundai', model: 'Tucson', text: '2.5L FWD', mpg: 28 },
  { make: 'Hyundai', model: 'Santa Fe', text: '2.5L Turbo AWD', mpg: 23 },
  { make: 'Kia', model: 'Forte', text: '2.0L IVT', mpg: 34 },
  { make: 'Kia', model: 'K5', text: '1.6L Turbo FWD', mpg: 31 },
  { make: 'Kia', model: 'Sportage', text: '2.5L FWD', mpg: 28 },
  { make: 'Kia', model: 'Telluride', text: '3.8L V6 FWD', mpg: 22 },
  { make: 'Tesla', model: 'Model 3', text: 'EV estimated MPGe converted for trip display', mpg: 132 },
  { make: 'Tesla', model: 'Model Y', text: 'EV estimated MPGe converted for trip display', mpg: 123 },
  { make: 'Tesla', model: 'Model S', text: 'EV estimated MPGe converted for trip display', mpg: 120 },
  { make: 'Tesla', model: 'Model X', text: 'EV estimated MPGe converted for trip display', mpg: 102 },
  { make: 'BMW', model: '3 Series', text: '330i 2.0L Auto', mpg: 30 },
  { make: 'BMW', model: '5 Series', text: '530i 2.0L Auto', mpg: 29 },
  { make: 'BMW', model: 'X3', text: 'xDrive30i', mpg: 25 },
  { make: 'BMW', model: 'X5', text: 'xDrive40i', mpg: 25 },
  { make: 'Mercedes-Benz', model: 'C-Class', text: 'C300 Sedan', mpg: 29 },
  { make: 'Mercedes-Benz', model: 'E-Class', text: 'E350 Sedan', mpg: 27 },
  { make: 'Mercedes-Benz', model: 'GLC', text: 'GLC300 SUV', mpg: 26 },
  { make: 'Mercedes-Benz', model: 'GLE', text: 'GLE350 SUV', mpg: 22 },
];

const yearAdjustments: Record<string, number> = {
  '2026': 1,
  '2025': 0,
  '2024': 0,
  '2023': -1,
  '2022': 0,
};

export const manualVehicleMpgDatabase: ManualVehicleOption[] = Object.entries(yearAdjustments).flatMap(([year, adjustment]) =>
  baseVehicles.map((vehicle, index) => ({
    ...vehicle,
    year,
    mpg: Math.max(8, vehicle.mpg + adjustment),
    id: `manual-${year}-${slug(vehicle.make)}-${slug(vehicle.model)}-${index}`,
  })),
);

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function getManualMakes(year: string) {
  return uniqueSorted(manualVehicleMpgDatabase.filter((entry) => entry.year === year).map((entry) => entry.make));
}

export function getManualModels(year: string, make: string) {
  return uniqueSorted(manualVehicleMpgDatabase
    .filter((entry) => entry.year === year && same(entry.make, make))
    .map((entry) => entry.model));
}

export function getManualOptions(year: string, make: string, model: string) {
  return manualVehicleMpgDatabase.filter((entry) =>
    entry.year === year && same(entry.make, make) && same(entry.model, model),
  );
}

export function getManualVehicleMpg(year: string, make: string, model: string, optionText = '') {
  const options = getManualOptions(year, make, model);
  if (!options.length) return 0;
  const exact = options.find((entry) => same(entry.text, optionText));
  return (exact || options[0]).mpg;
}

export function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}
