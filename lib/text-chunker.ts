/**
 * Text Chunking Utilities
 * Breaks large texts into manageable sections for ADHD-friendly reading
 */

export interface TextChunk {
  id: number;
  text: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Splits text into manageable chunks based on word count
 * @param text - Full text to chunk
 * @param wordsPerChunk - Number of words per chunk (default: 200)
 * @returns Array of text chunks
 */
export function chunkText(text: string, wordsPerChunk: number = 200): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const words = text.trim().split(/\s+/);
  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let chunkId = 0;
  let startIndex = 0;

  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);

    // Create chunk when we reach the word limit or at paragraph breaks
    if (currentChunk.length >= wordsPerChunk) {
      // Try to break at sentence boundaries
      const chunkText = currentChunk.join(" ");
      const lastPeriod = chunkText.lastIndexOf(".");
      const lastExclamation = chunkText.lastIndexOf("!");
      const lastQuestion = chunkText.lastIndexOf("?");
      const lastBreak = Math.max(lastPeriod, lastExclamation, lastQuestion);

      let finalChunkText: string;
      let actualWordCount: number;

      if (lastBreak > chunkText.length * 0.7) {
        // Break at sentence if it's in the last 30% of the chunk
        finalChunkText = chunkText.substring(0, lastBreak + 1);
        actualWordCount = finalChunkText.split(/\s+/).length;
        // Put remaining words back
        const remaining = chunkText.substring(lastBreak + 1).trim();
        if (remaining) {
          currentChunk = remaining.split(/\s+/);
        } else {
          currentChunk = [];
        }
      } else {
        // Break at word boundary
        finalChunkText = chunkText;
        actualWordCount = currentChunk.length;
        currentChunk = [];
      }

      chunks.push({
        id: chunkId++,
        text: finalChunkText.trim(),
        wordCount: actualWordCount,
        startIndex,
        endIndex: startIndex + finalChunkText.length,
      });

      startIndex += finalChunkText.length + 1; // +1 for space
    }
  }

  // Add remaining words as final chunk
  if (currentChunk.length > 0) {
    const finalText = currentChunk.join(" ");
    chunks.push({
      id: chunkId,
      text: finalText.trim(),
      wordCount: currentChunk.length,
      startIndex,
      endIndex: startIndex + finalText.length,
    });
  }

  return chunks;
}

/**
 * Calculates reading progress based on scroll position
 * @param scrollTop - Current scroll position
 * @param scrollHeight - Total scrollable height
 * @param clientHeight - Visible height
 * @returns Progress percentage (0-100)
 */
export function calculateReadingProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  if (scrollHeight <= clientHeight) {
    return 100; // Already fully visible
  }

  const scrolled = scrollTop / (scrollHeight - clientHeight);
  return Math.round(scrolled * 100);
}

