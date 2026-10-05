import { z } from 'zod';

export const stringOption = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const clearableStringOption = z
  .string()
  .trim()
  .transform((value) => value || null)
  .optional();

export const clearableValue = <T extends string>(value: T | '' | undefined): T | null | undefined =>
  value === '' ? null : value;

export const parseListOption = (values: string[] | undefined): string[] | undefined => {
  return values
    ?.flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};
