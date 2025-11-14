/**
 * Unescape ANSI color codes in a string.
 * Converts escaped sequences like \033 or \x1b to actual escape characters.
 *
 * @param str - The string containing escaped ANSI codes.
 * @returns The string with unescaped ANSI codes.
 */
export const unescapeAnsi = (str: string): string => {
  return str
    .replace(/\\033/g, '\x1b')
    .replace(/\\x1b/g, '\x1b')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
};
