import {
  detectKPPlateau,
  KPPlateauSnapshot,
  KP_PLATEAU_ATTEMPTS_THRESHOLD,
  KP_PLATEAU_SESSIONS_THRESHOLD,
} from './kp-plateau-detector';

describe('detectKPPlateau', () => {
  it('fires when attempts >= threshold and failures spread across multiple sessions', () => {
    const snapshot: KPPlateauSnapshot = {
      attempts: KP_PLATEAU_ATTEMPTS_THRESHOLD,
      passed: false,
      failedSessionIds: ['2026-04-10', '2026-04-11'],
      keyPrerequisiteConceptId: 'prereq-concept',
    };
    expect(detectKPPlateau(snapshot)).toBe(true);
  });

  it('does not fire when attempts are under the threshold', () => {
    const snapshot: KPPlateauSnapshot = {
      attempts: KP_PLATEAU_ATTEMPTS_THRESHOLD - 1,
      passed: false,
      failedSessionIds: ['2026-04-10', '2026-04-11'],
      keyPrerequisiteConceptId: 'prereq-concept',
    };
    expect(detectKPPlateau(snapshot)).toBe(false);
  });

  it('does not fire when all failures happened in a single session (slow peel-back)', () => {
    const snapshot: KPPlateauSnapshot = {
      attempts: KP_PLATEAU_ATTEMPTS_THRESHOLD + 2,
      passed: false,
      failedSessionIds: ['2026-04-10'],
      keyPrerequisiteConceptId: 'prereq-concept',
    };
    expect(detectKPPlateau(snapshot)).toBe(false);
  });

  it('does not fire on already-passed KPs', () => {
    const snapshot: KPPlateauSnapshot = {
      attempts: 20,
      passed: true,
      failedSessionIds: ['2026-04-10', '2026-04-11'],
      keyPrerequisiteConceptId: 'prereq-concept',
    };
    expect(detectKPPlateau(snapshot)).toBe(false);
  });

  it('does not fire when no key prerequisite is authored (graceful fallback)', () => {
    const snapshot: KPPlateauSnapshot = {
      attempts: KP_PLATEAU_ATTEMPTS_THRESHOLD + 2,
      passed: false,
      failedSessionIds: ['2026-04-10', '2026-04-11'],
      keyPrerequisiteConceptId: null,
    };
    expect(detectKPPlateau(snapshot)).toBe(false);
  });

  it('requires the session count to meet KP_PLATEAU_SESSIONS_THRESHOLD (2)', () => {
    expect(KP_PLATEAU_SESSIONS_THRESHOLD).toBe(2);
  });
});
