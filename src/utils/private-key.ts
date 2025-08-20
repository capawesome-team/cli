export const formatPrivateKey = (privateKey: string): string => {
  // Extract the header, key data, and footer using regex that preserves spaces
  const beginMatch = privateKey.match(/-----BEGIN [^-]+ ?-----/);
  const endMatch = privateKey.match(/-----END [^-]+ ?-----/);

  if (!beginMatch || !endMatch) {
    return privateKey; // Return as-is if not properly formatted PEM
  }

  const header = beginMatch[0];
  const footer = endMatch[0];

  // Remove all whitespace from the entire key, then find the positions
  const cleanKey = privateKey.replace(/\s/g, '');
  const cleanHeader = header.replace(/\s/g, '');
  const cleanFooter = footer.replace(/\s/g, '');

  const headerEnd = cleanKey.indexOf(cleanHeader) + cleanHeader.length;
  const footerStart = cleanKey.indexOf(cleanFooter);

  if (headerEnd >= footerStart) {
    return privateKey; // Return as-is if structure is invalid
  }

  const keyData = cleanKey.substring(headerEnd, footerStart);

  // Split the key data into 64-character lines
  const formattedKeyData = keyData.match(/.{1,64}/g)?.join('\n') || keyData;

  return `${header}\n${formattedKeyData}\n${footer}`;
};
