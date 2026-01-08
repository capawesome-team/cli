import { describe, expect, it } from 'vitest';
import { parseKeyValuePairs } from './env-file.js';

describe('parseKeyValuePairs', () => {
  it('should parse valid key-value pairs', () => {
    const result = parseKeyValuePairs('KEY1=value1\nKEY2=value2');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY2', value: 'value2' },
    ]);
  });

  it('should handle empty lines', () => {
    const result = parseKeyValuePairs('KEY1=value1\n\nKEY2=value2\n\n');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY2', value: 'value2' },
    ]);
  });

  it('should ignore comments', () => {
    const result = parseKeyValuePairs('# Comment\nKEY1=value1\n# Another comment\nKEY2=value2');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY2', value: 'value2' },
    ]);
  });

  it('should handle values with = characters', () => {
    const result = parseKeyValuePairs('KEY1=value=with=equals\nKEY2=a=b');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value=with=equals' },
      { key: 'KEY2', value: 'a=b' },
    ]);
  });

  it('should trim whitespace from keys and values', () => {
    const result = parseKeyValuePairs('  KEY1  =  value1  \n  KEY2  =  value2  ');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY2', value: 'value2' },
    ]);
  });

  it('should skip lines without = separator', () => {
    const result = parseKeyValuePairs('KEY1=value1\nINVALID_LINE\nKEY2=value2');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY2', value: 'value2' },
    ]);
  });

  it('should skip lines with empty keys', () => {
    const result = parseKeyValuePairs('KEY1=value1\n=value2\nKEY3=value3');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY3', value: 'value3' },
    ]);
  });

  it('should skip lines with empty values', () => {
    const result = parseKeyValuePairs('KEY1=value1\nKEY2=\nKEY3=value3');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY3', value: 'value3' },
    ]);
  });

  it('should handle empty content', () => {
    const result = parseKeyValuePairs('');

    expect(result).toEqual([]);
  });

  it('should handle content with only comments', () => {
    const result = parseKeyValuePairs('# Comment 1\n# Comment 2');

    expect(result).toEqual([]);
  });

  it('should handle mixed valid and invalid lines', () => {
    const result = parseKeyValuePairs('KEY1=value1\nINVALID\n=nokey\nKEY2=\nKEY3=value3\n# comment\nKEY4=value4');

    expect(result).toEqual([
      { key: 'KEY1', value: 'value1' },
      { key: 'KEY3', value: 'value3' },
      { key: 'KEY4', value: 'value4' },
    ]);
  });
});
