export interface AppDestinationDto {
  id: string;
  appId: string;
  name: string;
  nameLower: string;
  platform: 'android' | 'ios';
  appleId: string | null;
  appleAppId: string | null;
  appleTeamId: string | null;
  appleAppPassword: string | null;
  appleApiKeyId: string | null;
  appleIssuerId: string | null;
  appAppleApiKeyId: string | null;
  androidPackageName: string | null;
  androidBuildArtifactType: 'aab' | 'apk' | null;
  androidReleaseStatus: 'completed' | 'draft' | null;
  appGoogleServiceAccountKeyId: string | null;
  googlePlayTrack: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateAppDestinationDto {
  appId: string;
  name: string;
  platform: 'android' | 'ios';
  appleId?: string;
  appleAppId?: string;
  appleTeamId?: string;
  appleAppPassword?: string;
  appleApiKeyId?: string;
  appleIssuerId?: string;
  appAppleApiKeyId?: string;
  androidPackageName?: string;
  androidBuildArtifactType?: 'aab' | 'apk';
  androidReleaseStatus?: 'completed' | 'draft';
  appGoogleServiceAccountKeyId?: string;
  googlePlayTrack?: string;
}

export interface UpdateAppDestinationDto {
  appId: string;
  destinationId: string;
  name?: string;
  appleId?: string;
  appleAppId?: string;
  appleTeamId?: string;
  appleAppPassword?: string;
  appleApiKeyId?: string;
  appleIssuerId?: string;
  appAppleApiKeyId?: string;
  androidPackageName?: string;
  androidBuildArtifactType?: 'aab' | 'apk';
  androidReleaseStatus?: 'completed' | 'draft';
  appGoogleServiceAccountKeyId?: string;
  googlePlayTrack?: string;
}

export interface DeleteAppDestinationDto {
  appId: string;
  destinationId: string;
}

export interface FindOneAppDestinationDto {
  appId: string;
  destinationId: string;
}

export interface FindAllAppDestinationsDto {
  appId: string;
  limit?: number;
  offset?: number;
  platform?: 'android' | 'ios';
  query?: string;
}
