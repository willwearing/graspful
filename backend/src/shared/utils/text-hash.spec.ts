import { computeTextHash } from './text-hash';

describe('computeTextHash', () => {
  it('should return a 16-character hex string', () => {
    const hash = computeTextHash('Hello world');
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('should return consistent hashes for the same input', () => {
    const hash1 = computeTextHash('Hello world');
    const hash2 = computeTextHash('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('should normalize whitespace', () => {
    const hash1 = computeTextHash('Hello   world');
    const hash2 = computeTextHash('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('should normalize leading/trailing whitespace', () => {
    const hash1 = computeTextHash('  Hello world  ');
    const hash2 = computeTextHash('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('should normalize case', () => {
    const hash1 = computeTextHash('Hello World');
    const hash2 = computeTextHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('should normalize tabs and newlines', () => {
    const hash1 = computeTextHash('Hello\n\tworld');
    const hash2 = computeTextHash('Hello world');
    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different content', () => {
    const hash1 = computeTextHash('Hello world');
    const hash2 = computeTextHash('Goodbye world');
    expect(hash1).not.toBe(hash2);
  });
});
