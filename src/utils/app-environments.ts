/**
 * Parse key-value pairs from content string.
 *
 * Format: KEY=value (one per line)
 * - Empty lines are ignored
 * - Lines starting with # are ignored (comments)
 * - Lines without = are skipped
 * - Keys and values are trimmed
 * - Values can contain = characters
 * - Lines with empty keys are skipped
 *
 * @param content - Content string to parse
 * @returns Array of key-value pairs
 */
export function parseKeyValuePairs(content: string): Array<{ key: string; value: string }> {
  const lines = content.split('\n');
  const pairs: Array<{ key: string; value: string }> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      pairs.push({ key, value });
    }
  }
  return pairs;
}
