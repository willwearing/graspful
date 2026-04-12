import {
  shouldPauseLesson,
  isConceptPausedInSession,
  currentSessionId,
  LessonPauseInput,
} from './lesson-pause-policy';

describe('shouldPauseLesson', () => {
  it('returns true when session failed KP attempts exceeds the threshold and KPs remain unpassed', () => {
    const input: LessonPauseInput = {
      sessionFailedKPAttempts: 6,
      hasUnpassedKPs: true,
      masteryState: 'in_progress',
    };
    expect(shouldPauseLesson(input)).toBe(true);
  });

  it('returns false when under the threshold', () => {
    const input: LessonPauseInput = {
      sessionFailedKPAttempts: 5,
      hasUnpassedKPs: true,
      masteryState: 'in_progress',
    };
    expect(shouldPauseLesson(input)).toBe(false);
  });

  it('returns false when all KPs are already passed (nothing to pause)', () => {
    const input: LessonPauseInput = {
      sessionFailedKPAttempts: 10,
      hasUnpassedKPs: false,
      masteryState: 'in_progress',
    };
    expect(shouldPauseLesson(input)).toBe(false);
  });

  it('returns false on mastered concepts — they should never pause', () => {
    const input: LessonPauseInput = {
      sessionFailedKPAttempts: 10,
      hasUnpassedKPs: false,
      masteryState: 'mastered',
    };
    expect(shouldPauseLesson(input)).toBe(false);
  });

  it('exactly 6 failed KP attempts triggers pause (threshold is inclusive)', () => {
    const input: LessonPauseInput = {
      sessionFailedKPAttempts: 6,
      hasUnpassedKPs: true,
      masteryState: 'in_progress',
    };
    expect(shouldPauseLesson(input)).toBe(true);
  });
});

describe('isConceptPausedInSession', () => {
  it('returns true when pausedAtSessionId equals the current session', () => {
    expect(
      isConceptPausedInSession({
        pausedAtSessionId: '2026-04-11',
        currentSessionId: '2026-04-11',
      }),
    ).toBe(true);
  });

  it('returns false when pausedAtSessionId is an older session (re-enters frontier)', () => {
    expect(
      isConceptPausedInSession({
        pausedAtSessionId: '2026-04-10',
        currentSessionId: '2026-04-11',
      }),
    ).toBe(false);
  });

  it('returns false when the concept was never paused', () => {
    expect(
      isConceptPausedInSession({
        pausedAtSessionId: null,
        currentSessionId: '2026-04-11',
      }),
    ).toBe(false);
  });
});

describe('currentSessionId', () => {
  it('produces a UTC YYYY-MM-DD key', () => {
    const id = currentSessionId(new Date('2026-04-11T23:59:59Z'));
    expect(id).toBe('2026-04-11');
  });

  it('rolls over at UTC midnight', () => {
    const beforeMidnight = currentSessionId(new Date('2026-04-11T23:59:59Z'));
    const afterMidnight = currentSessionId(new Date('2026-04-12T00:00:01Z'));
    expect(beforeMidnight).not.toBe(afterMidnight);
  });
});
