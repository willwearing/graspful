import { syncKeyPrerequisites, syncProblems } from './course-content-sync';

describe('authored remediation targets', () => {
  const course = (keyPrerequisite?: string) => ({
    course: { id: 'advanced' }, concepts: [{ id: 'joins', knowledgePoints: [{ id: 'grain', keyPrerequisite }] }],
  }) as any;
  const conceptIds = new Map([['joins', 'join-id']]);
  const resolver = new Map([['advanced:joins', 'join-id'], ['foundation:keys', 'keys-id']]);

  it('persists a qualified prerequisite against the existing knowledge point', async () => {
    const tx = { knowledgePoint: { update: jest.fn() } };
    await syncKeyPrerequisites(tx as any, course('foundation:keys'), conceptIds, resolver);
    expect(tx.knowledgePoint.update).toHaveBeenCalledWith({
      where: { conceptId_slug: { conceptId: 'join-id', slug: 'grain' } },
      data: { keyPrerequisiteConceptId: 'keys-id' },
    });
  });

  it('avoids self remediation and preserves a target omitted from a partial export', async () => {
    const tx = { knowledgePoint: { update: jest.fn() } };
    await syncKeyPrerequisites(tx as any, course('joins'), conceptIds, resolver);
    expect(tx.knowledgePoint.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { keyPrerequisiteConceptId: null },
    }));
    tx.knowledgePoint.update.mockClear();
    await syncKeyPrerequisites(tx as any, course(), conceptIds, resolver);
    expect(tx.knowledgePoint.update).not.toHaveBeenCalled();
  });

  it('rejects an unresolved key prerequisite before updating its knowledge point', async () => {
    const tx = { knowledgePoint: { update: jest.fn() } };
    await expect(syncKeyPrerequisites(tx as any, course('foundation:missing'), conceptIds, resolver))
      .rejects.toThrow('Unknown key prerequisite');
    expect(tx.knowledgePoint.update).not.toHaveBeenCalled();
  });
});

describe('problem purpose content sync', () => {
  it('updates existing problem identity and writes independent exam metadata', async () => {
    const tx = { problem: { update: jest.fn(), create: jest.fn() } };
    await syncProblems(tx as any, 'kp1', [{
      id: 'authored1', type: 'scenario', question: 'Which response fits these constraints?',
      options: ['First action', 'Second action'], correct: 0, difficulty: 4,
      purpose: 'exam', isTransfer: true,
    }], [{ id: 'persisted1', authoredId: 'authored1' }]);
    expect(tx.problem.update).toHaveBeenCalledWith({
      where: { id: 'persisted1' }, data: expect.objectContaining({ purpose: 'exam', isTransfer: true, isReviewVariant: false }),
    });
    expect(tx.problem.create).not.toHaveBeenCalled();
  });

  it('keeps review variants distinct from practice and exam cases', async () => {
    const tx = { problem: { update: jest.fn(), create: jest.fn() } };
    await syncProblems(tx as any, 'kp1', [{
      id: 'review1', type: 'true_false', question: 'Is this conclusion supported?',
      correct: true, purpose: 'review', difficulty: 3,
    }], []);
    expect(tx.problem.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      knowledgePointId: 'kp1', purpose: 'review', isReviewVariant: true, isTransfer: false,
    }) });
  });
});
