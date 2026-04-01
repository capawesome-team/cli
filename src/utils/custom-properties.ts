export const parseCustomProperties = (customProperty: string[] | undefined): Record<string, string> | undefined => {
  if (!customProperty) {
    return undefined;
  }
  const customProperties: Record<string, string> = {};
  for (const property of customProperty) {
    if (!property) {
      continue;
    }
    const separatorIndex = property.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = property.slice(0, separatorIndex).trim();
    const value = property.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      continue;
    }
    customProperties[key] = value;
  }
  return Object.keys(customProperties).length > 0 ? customProperties : undefined;
};
