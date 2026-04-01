export const parseCustomProperties = (customProperty: string[] | undefined): Record<string, string> | undefined => {
  if (!customProperty) {
    return undefined;
  }
  const customProperties: Record<string, string> = {};
  for (const property of customProperty) {
    const [key, value] = property.split('=');
    if (key && value) {
      customProperties[key] = value;
    }
  }
  return customProperties;
};
