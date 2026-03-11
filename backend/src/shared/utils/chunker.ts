export const MAX_CHUNK_SIZE = 3800;

export function chunkText(text: string, maxSize = MAX_CHUNK_SIZE): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxSize) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining.trim());
      break;
    }

    const window = remaining.slice(0, maxSize);
    const sentenceIdx = lastSentenceBoundary(window);
    if (sentenceIdx > 0) {
      chunks.push(window.slice(0, sentenceIdx + 1).trim());
      remaining = remaining.slice(sentenceIdx + 1).trim();
      continue;
    }

    const spaceIdx = window.lastIndexOf(' ');
    if (spaceIdx > 0) {
      chunks.push(window.slice(0, spaceIdx).trim());
      remaining = remaining.slice(spaceIdx).trim();
      continue;
    }

    chunks.push(window);
    remaining = remaining.slice(maxSize).trim();
  }

  return chunks;
}

function lastSentenceBoundary(text: string): number {
  let lastIdx = -1;
  for (let i = 0; i < text.length; i++) {
    if ('.!?'.includes(text[i])) {
      const next = text[i + 1];
      if (!next || next === ' ' || next === '\n') {
        lastIdx = i;
      }
    }
  }
  return lastIdx;
}
