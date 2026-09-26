export const parseFirebaseTesterGroups = (values: string[] | undefined): string[] | undefined => {
  return values
    ?.flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};
