import { describe, expect, it } from 'vitest';
import { formatDuration, getManualVehicleMpg, getManualMakes, getManualModels, getManualOptions } from './vehicleMpgManual';

describe('formatDuration', () => {
  it('formats route duration in hours and minutes', () => {
    expect(formatDuration(462)).toBe('7 hr 42 min');
    expect(formatDuration(75)).toBe('1 hr 15 min');
    expect(formatDuration(42)).toBe('42 min');
  });
});

describe('manual vehicle MPG database', () => {
  it('returns estimated combined MPG from year make model and trim specs', () => {
    expect(getManualVehicleMpg('2025', 'Nissan', 'Versa', 'S Manual')).toBe(30);
    expect(getManualVehicleMpg('2025', 'Nissan', 'Versa', 'SV CVT')).toBe(35);
    expect(getManualVehicleMpg('2022', 'Toyota', 'Camry', 'Auto (S8), 6 cyl, 3.5 L')).toBe(26);
  });

  it('populates make model and trim lists from the local manual database', () => {
    expect(getManualMakes('2025')).toContain('Nissan');
    expect(getManualModels('2025', 'Nissan')).toContain('Versa');
    expect(getManualOptions('2025', 'Nissan', 'Versa')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'S Manual', mpg: 30 }),
        expect.objectContaining({ text: 'SV CVT', mpg: 35 }),
      ]),
    );
  });
});
