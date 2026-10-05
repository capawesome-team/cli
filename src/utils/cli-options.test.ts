import { describe, expect, it } from 'vitest';
import { clearableStringOption, parseListOption, stringOption } from './cli-options.js';

describe('stringOption', () => {
  it('should return undefined if the option is not passed', () => {
    expect(stringOption.parse(undefined)).toBeUndefined();
  });

  it('should return undefined for an empty value', () => {
    expect(stringOption.parse('')).toBeUndefined();
  });

  it('should return undefined for a whitespace-only value', () => {
    expect(stringOption.parse('   ')).toBeUndefined();
  });

  it('should trim the value', () => {
    expect(stringOption.parse('  production ')).toBe('production');
  });
});

describe('clearableStringOption', () => {
  it('should return undefined if the option is not passed', () => {
    expect(clearableStringOption.parse(undefined)).toBeUndefined();
  });

  it('should return null for an empty value', () => {
    expect(clearableStringOption.parse('')).toBeNull();
  });

  it('should return null for a whitespace-only value', () => {
    expect(clearableStringOption.parse('   ')).toBeNull();
  });

  it('should trim the value', () => {
    expect(clearableStringOption.parse('  production ')).toBe('production');
  });
});

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
