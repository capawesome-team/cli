import configService from '@/services/config.js';

export interface AppBuildShareUrls {
  qrCodeUrl: string;
  webUrl: string;
}

/**
 * Build the public share page URL and the corresponding QR code image URL for an app build share.
 */
export const getAppBuildShareUrls = async (shareId: string): Promise<AppBuildShareUrls> => {
  const consoleBaseUrl = await configService.getValueForKey('CONSOLE_BASE_URL');
  const apiBaseUrl = await configService.getValueForKey('API_BASE_URL');
  const webUrl = `${consoleBaseUrl}/app-build-shares/${shareId}`;
  const qrCodeUrl = `${apiBaseUrl}/v1/qrcodes?content=${encodeURIComponent(webUrl)}&format=png`;
  return { qrCodeUrl, webUrl };
};
