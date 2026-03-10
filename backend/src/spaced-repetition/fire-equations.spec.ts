import {
  calculateRawDelta,
  calculateDecay,
  updateRepNum,
  calculateMemory,
  calculateNextInterval,
  decayMemory,
} from './fire-equations';

describe('FIRe Equations', () => {
  describe('calculateRawDelta', () => {
    it('should return positive delta scaled by (1 - memory) when passed', () => {
      // quality=0.8, memory=0.5 -> rawDelta = 0.8 * (1 - 0.5) = 0.4
      expect(calculateRawDelta(true, 0.8, 0.5)).toBeCloseTo(0.4);
    });

    it('should return negative delta scaled by (1 - memory) when failed', () => {
      // failed -> rawDelta = -0.5 * (1 - 0.5) = -0.25
      expect(calculateRawDelta(false, 0, 0.5)).toBeCloseTo(-0.25);
    });

    it('should return near-zero delta when memory is already high (early repetition discounting)', () => {
      // memory=0.95 -> rawDelta = 0.8 * (1 - 0.95) = 0.04
      expect(calculateRawDelta(true, 0.8, 0.95)).toBeCloseTo(0.04);
    });

    it('should return full delta when memory is 0', () => {
      expect(calculateRawDelta(true, 1.0, 0)).toBeCloseTo(1.0);
    });

    it('should ignore quality parameter when failed', () => {
      // quality is irrelevant for failures
      const a = calculateRawDelta(false, 0.9, 0.3);
      const b = calculateRawDelta(false, 0.1, 0.3);
      expect(a).toEqual(b);
    });
  });

  describe('calculateDecay', () => {
    it('should return higher penalty when memory is very low', () => {
      const lowMemory = calculateDecay(0.1);
      const highMemory = calculateDecay(0.8);
      expect(lowMemory).toBeGreaterThan(highMemory);
    });

    it('should return value between 0 and 1', () => {
      expect(calculateDecay(0)).toBeGreaterThanOrEqual(0);
      expect(calculateDecay(0)).toBeLessThanOrEqual(1);
      expect(calculateDecay(1)).toBeGreaterThanOrEqual(0);
      expect(calculateDecay(1)).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 when memory is 0 (maximum penalty)', () => {
      expect(calculateDecay(0)).toBeCloseTo(1.0);
    });
  });

  describe('updateRepNum', () => {
    it('should increase repNum on successful review', () => {
      // speed=1.0, not failed, rawDelta=0.5
      const result = updateRepNum(2, 1.0, 0.5, false, 0.5);
      expect(result).toBeGreaterThan(2);
    });

    it('should decrease repNum on failed review with decay penalty', () => {
      // speed=1.0, failed, decay=0.8, rawDelta=-0.5
      const result = updateRepNum(3, 1.0, 0.8, true, -0.5);
      expect(result).toBeLessThan(3);
    });

    it('should never go below 0', () => {
      const result = updateRepNum(0.5, 1.0, 0.9, true, -0.5);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should scale by speed', () => {
      const slow = updateRepNum(2, 0.5, 0, false, 0.5);
      const fast = updateRepNum(2, 2.0, 0, false, 0.5);
      expect(fast).toBeGreaterThan(slow);
    });
  });

  describe('calculateMemory', () => {
    it('should increase memory after positive rawDelta then apply forgetting', () => {
      // memory=0.5, rawDelta=0.3, 0 days elapsed -> (0.5+0.3) * 0.5^(0/1) = 0.8 * 1.0 = 0.8
      const result = calculateMemory(0.5, 0.3, 0, 1);
      expect(result).toBeCloseTo(0.8);
    });

    it('should decay memory over time with no new practice', () => {
      // memory=0.8, rawDelta=0, 7 days elapsed, interval=7
      // (0.8 + 0) * 0.5^(7/7) = 0.8 * 0.5 = 0.4
      const result = calculateMemory(0.8, 0, 7, 7);
      expect(result).toBeCloseTo(0.4);
    });

    it('should never go below 0', () => {
      const result = calculateMemory(0.1, -0.5, 30, 1);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should never exceed 1', () => {
      const result = calculateMemory(0.9, 0.5, 0, 1);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateNextInterval', () => {
    it('should return 1 day for repNum 0', () => {
      expect(calculateNextInterval(0)).toBe(1);
    });

    it('should return 3 days for repNum 1', () => {
      expect(calculateNextInterval(1)).toBe(3);
    });

    it('should return 7 days for repNum 2', () => {
      expect(calculateNextInterval(2)).toBe(7);
    });

    it('should cap at 240 days for very high repNum', () => {
      expect(calculateNextInterval(100)).toBe(240);
    });

    it('should handle fractional repNum by flooring', () => {
      expect(calculateNextInterval(1.7)).toBe(3);
      expect(calculateNextInterval(2.9)).toBe(7);
    });
  });

  describe('decayMemory', () => {
    it('should apply exponential forgetting based on elapsed time and interval', () => {
      // memory=1.0, 7 days, interval=7 -> 1.0 * 0.5^(7/7) = 0.5
      expect(decayMemory(1.0, 7, 7)).toBeCloseTo(0.5);
    });

    it('should not decay when 0 days elapsed', () => {
      expect(decayMemory(0.8, 0, 7)).toBeCloseTo(0.8);
    });

    it('should decay faster when interval is short', () => {
      const shortInterval = decayMemory(1.0, 7, 3);
      const longInterval = decayMemory(1.0, 7, 30);
      expect(shortInterval).toBeLessThan(longInterval);
    });

    it('should never go below 0', () => {
      expect(decayMemory(0.1, 365, 1)).toBeGreaterThanOrEqual(0);
    });
  });
});
