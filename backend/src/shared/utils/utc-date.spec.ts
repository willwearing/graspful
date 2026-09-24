import { startOfDayUtc, startOfWeekUtc } from './utc-date';

describe('UTC calendar boundaries', () => {
  it.each([
    ['2026-09-27T01:00:00.000Z', '2026-09-27T00:00:00.000Z'],
    ['2026-09-26T23:59:59.999Z', '2026-09-20T00:00:00.000Z'],
    ['2026-01-01T02:00:00.000Z', '2025-12-28T00:00:00.000Z'],
    ['2026-03-08T09:59:59.000Z', '2026-03-08T00:00:00.000Z'],
    ['2026-03-08T10:00:00.000Z', '2026-03-08T00:00:00.000Z'],
  ])('starts the week at Sunday UTC for %s', (input, expected) => {
    const date = new Date(input);
    expect(startOfWeekUtc(date).toISOString()).toBe(expected);
    expect(date.toISOString()).toBe(input);
  });

  it('uses the UTC day when local midnight is on another date', () => {
    const date = new Date('2026-09-24T23:30:00-06:00');
    expect(startOfDayUtc(date).toISOString()).toBe('2026-09-25T00:00:00.000Z');
    expect(date.toISOString()).toBe('2026-09-25T05:30:00.000Z');
  });

  it('defaults to the current date', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-24T01:00:00Z'));
    try {
      expect(startOfDayUtc().toISOString()).toBe('2026-09-24T00:00:00.000Z');
      expect(startOfWeekUtc().toISOString()).toBe('2026-09-20T00:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });
});
