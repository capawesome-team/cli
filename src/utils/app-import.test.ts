import { generateUniqueName, isNameTaken } from '@/utils/app-import.js';
import { describe, expect, it } from 'vitest';

describe('isNameTaken', () => {
  it('should match names regardless of case', () => {
    expect(isNameTaken('test', ['Test'])).toBe(true);
    expect(isNameTaken('TEST', ['Test'])).toBe(true);
    expect(isNameTaken('other', ['Test'])).toBe(false);
  });
});

describe('generateUniqueName', () => {
  it('should keep a name that is not taken', () => {
    expect(generateUniqueName('Production', [])).toBe('Production');
  });

  it('should suffix a name that is taken regardless of case', () => {
    expect(generateUniqueName('Production', ['production'])).toBe('Production (2)');
  });

  it('should skip suffixes that are taken', () => {
    expect(generateUniqueName('Prod', ['prod', 'Prod (2)'])).toBe('Prod (3)');
  });
});
