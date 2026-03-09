import {
  calculateLessonXP,
  calculateReviewXP,
  calculateQuizXP,
  calculateXP,
} from './xp-calculator';

describe('XP Calculator', () => {
  describe('calculateLessonXP', () => {
    it('should return 0 XP for incorrect answers', () => {
      const result = calculateLessonXP(5, 1, false, 5000);
      expect(result.xp).toBe(0);
      expect(result.antiGamingTriggered).toBe(false);
    });

    it('should trigger anti-gaming for answers under 2s', () => {
      const result = calculateLessonXP(5, 1, true, 1500);
      expect(result.xp).toBe(0);
      expect(result.antiGamingTriggered).toBe(true);
      expect(result.reason).toContain('<2s');
    });

    it('should give base XP of 10 for difficulty 1', () => {
      // difficulty 1, second attempt (no modifier)
      const result = calculateLessonXP(1, 2, true, 5000);
      expect(result.xp).toBe(10);
    });

    it('should give base XP of 20 for difficulty 10', () => {
      const result = calculateLessonXP(10, 2, true, 5000);
      expect(result.xp).toBe(20);
    });

    it('should apply +25% first attempt bonus', () => {
      // difficulty 5 -> base ~14-15
      const result = calculateLessonXP(5, 1, true, 5000);
      const baseXP = Math.round(10 + ((5 - 1) / 9) * 10); // ~14
      expect(result.xp).toBe(Math.round(baseXP * 1.25));
    });

    it('should apply -50% for third+ attempt', () => {
      const result = calculateLessonXP(5, 3, true, 5000);
      const baseXP = Math.round(10 + ((5 - 1) / 9) * 10);
      expect(result.xp).toBe(Math.round(baseXP * 0.5));
    });

    it('should apply -50% for fourth attempt too', () => {
      const result3 = calculateLessonXP(5, 3, true, 5000);
      const result4 = calculateLessonXP(5, 4, true, 5000);
      expect(result3.xp).toBe(result4.xp);
    });
  });

  describe('calculateReviewXP', () => {
    it('should return 0 XP for incorrect answers', () => {
      const result = calculateReviewXP(3, false, 5000, 10000);
      expect(result.xp).toBe(0);
    });

    it('should trigger anti-gaming for answers under 2s', () => {
      const result = calculateReviewXP(3, true, 1500, 10000);
      expect(result.xp).toBe(0);
      expect(result.antiGamingTriggered).toBe(true);
    });

    it('should give 3 XP for difficulty 1', () => {
      const result = calculateReviewXP(1, true, 15000, 10000);
      expect(result.xp).toBe(3);
    });

    it('should give 5 XP for difficulty 5', () => {
      const result = calculateReviewXP(5, true, 15000, 10000);
      expect(result.xp).toBe(5);
    });

    it('should apply fast bonus when answer is faster than expected', () => {
      const slow = calculateReviewXP(3, true, 15000, 10000);
      const fast = calculateReviewXP(3, true, 8000, 10000);
      expect(fast.xp).toBeGreaterThanOrEqual(slow.xp);
    });
  });

  describe('calculateQuizXP', () => {
    it('should give 1.5x for perfect score', () => {
      const result = calculateQuizXP(10, 10);
      expect(result.xp).toBe(Math.round(15 * 1.5)); // 10 * 1.5 = 15 base, * 1.5 = 23
    });

    it('should give 1.2x for 80%+ score', () => {
      const result = calculateQuizXP(10, 8);
      expect(result.xp).toBe(Math.round(15 * 1.2));
    });

    it('should give 1.0x for 60-79% score', () => {
      const result = calculateQuizXP(10, 7);
      expect(result.xp).toBe(Math.round(15 * 1.0));
    });

    it('should give 0.5x for <60% score', () => {
      const result = calculateQuizXP(10, 5);
      expect(result.xp).toBe(Math.round(15 * 0.5));
    });

    it('should scale base XP with question count', () => {
      const small = calculateQuizXP(10, 10);
      const large = calculateQuizXP(15, 15);
      expect(large.xp).toBeGreaterThanOrEqual(small.xp);
    });

    it('should handle 0 questions gracefully', () => {
      const result = calculateQuizXP(0, 0);
      expect(result.xp).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateXP (dispatcher)', () => {
    it('should dispatch lesson XP correctly', () => {
      const result = calculateXP({
        activityType: 'lesson',
        difficulty: 5,
        correct: true,
        responseTimeMs: 5000,
        attemptNumber: 1,
      });
      expect(result.xp).toBeGreaterThan(0);
    });

    it('should dispatch review XP correctly', () => {
      const result = calculateXP({
        activityType: 'review',
        difficulty: 3,
        correct: true,
        responseTimeMs: 5000,
        attemptNumber: 1,
      });
      expect(result.xp).toBeGreaterThan(0);
    });

    it('should return 0 for individual quiz answers', () => {
      const result = calculateXP({
        activityType: 'quiz',
        difficulty: 3,
        correct: true,
        responseTimeMs: 5000,
        attemptNumber: 1,
      });
      expect(result.xp).toBe(0);
    });
  });
});
