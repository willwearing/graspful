import { serializeProblemForClient } from './problem-presentation';

describe('serializeProblemForClient', () => {
  it('normalizes multiple choice string options into id/text objects', () => {
    expect(
      serializeProblemForClient({
        id: 'p1',
        questionText: 'How many entities?',
        type: 'multiple_choice',
        options: ['1', '2', '3', '4'],
        difficulty: 2,
      }),
    ).toEqual({
      id: 'p1',
      questionText: 'How many entities?',
      type: 'multiple_choice',
      options: [
        { id: '0', text: '1' },
        { id: '1', text: '2' },
        { id: '2', text: '3' },
        { id: '3', text: '4' },
      ],
      difficulty: 2,
    });
  });

  it('normalizes matching options into pairs', () => {
    expect(
      serializeProblemForClient({
        id: 'p2',
        questionText: 'Match the terms',
        type: 'matching',
        options: ['student|person', 'course|class'],
        difficulty: 1,
      }),
    ).toEqual({
      id: 'p2',
      questionText: 'Match the terms',
      type: 'matching',
      pairs: [
        { left: 'student', right: 'person' },
        { left: 'course', right: 'class' },
      ],
      difficulty: 1,
    });
  });

  it('normalizes ordering options into items', () => {
    expect(
      serializeProblemForClient({
        id: 'p3',
        questionText: 'Put these in order',
        type: 'ordering',
        options: [' first ', ' second '],
        difficulty: 1,
      }),
    ).toEqual({
      id: 'p3',
      questionText: 'Put these in order',
      type: 'ordering',
      items: ['first', 'second'],
      difficulty: 1,
    });
  });
});
