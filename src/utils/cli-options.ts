export const clearableValue = (value: string | undefined): string | null | undefined => (value === '' ? null : value);

export const parseListOption = (values: string[] | undefined): string[] | undefined => {
  return values
    ?.flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};
