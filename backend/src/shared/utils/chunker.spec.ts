import { chunkText, MAX_CHUNK_SIZE } from './chunker';

describe('chunkText', () => {
  it('should return empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('should return single chunk for short text', () => {
    const text = 'Hello, world.';
    const result = chunkText(text);
    expect(result).toEqual(['Hello, world.']);
  });

  it('should return single chunk for text exactly at maxSize', () => {
    const text = 'a'.repeat(MAX_CHUNK_SIZE);
    const result = chunkText(text);
    expect(result).toEqual([text]);
  });

  it('should split at sentence boundaries', () => {
    const sentence1 = 'First sentence.';
    const sentence2 = 'Second sentence.';
    // Make sentence1 fill most of the chunk so sentence2 pushes over
    const padding = 'x'.repeat(MAX_CHUNK_SIZE - sentence1.length - 1);
    const text = `${sentence1} ${padding} ${sentence2}`;
    const result = chunkText(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // First chunk should end at a sentence boundary
    expect(result[0]).toMatch(/\.$/);
  });

  it('should split long text at sentence boundaries when possible', () => {
    // Create text with multiple sentences that exceeds maxSize
    const sentences = Array.from(
      { length: 100 },
      (_, i) => `This is sentence number ${i + 1} with quite a bit of extra padding text to make it substantially longer and ensure we exceed the chunk size limit.`,
    );
    const text = sentences.join(' ');
    // Verify our test text actually exceeds maxSize
    expect(text.length).toBeGreaterThan(MAX_CHUNK_SIZE);
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should be within limit
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
    }
    // Chunks should reconstruct the full text (modulo whitespace)
    const reconstructed = result.join(' ');
    expect(reconstructed.replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });

  it('should fall back to word boundaries when no sentence boundary exists', () => {
    // Text with no sentence-ending punctuation, but has spaces
    const words = Array.from({ length: 1000 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const result = chunkText(text);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
    }
  });

  it('should hard split when no word or sentence boundaries exist', () => {
    const text = 'a'.repeat(MAX_CHUNK_SIZE * 2 + 100);
    const result = chunkText(text);
    expect(result.length).toBe(3);
    expect(result[0].length).toBe(MAX_CHUNK_SIZE);
    expect(result[1].length).toBe(MAX_CHUNK_SIZE);
    expect(result[2].length).toBe(100);
  });

  it('should respect custom maxSize', () => {
    const text = 'Hello world. Goodbye world.';
    const result = chunkText(text, 15);
    expect(result.length).toBe(2);
    expect(result[0]).toBe('Hello world.');
    expect(result[1]).toBe('Goodbye world.');
  });

  it('should handle exclamation and question marks as sentence boundaries', () => {
    const text = 'Is this right? Yes it is! Good.';
    const result = chunkText(text, 20);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should trim whitespace from chunks', () => {
    const text = '  Hello world.  Goodbye world.  ';
    const result = chunkText(text, 15);
    for (const chunk of result) {
      expect(chunk).toBe(chunk.trim());
    }
  });
});
