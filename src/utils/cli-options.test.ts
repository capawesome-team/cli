import { describe, expect, it } from 'vitest';
import { parseListOption } from './cli-options.js';

describe('parseListOption', () => {
  it('should return undefined if the option is not passed', () => {
    expect(parseListOption(undefined)).toBeUndefined();
  });

  it('should split comma-separated values and trim them', () => {
    expect(parseListOption(['qa-team, beta-testers', 'internal'])).toEqual(['qa-team', 'beta-testers', 'internal']);
  });

  it('should drop empty values', () => {
    expect(parseListOption(['qa-team,, ', ''])).toEqual(['qa-team']);
  });

  it('should return an empty list if only an empty value is passed', () => {
    expect(parseListOption([''])).toEqual([]);
  });
});
