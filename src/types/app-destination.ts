export type AppDestinationType =
  | 'apple-app-store-connect'
  | 'firebase-app-distribution'
  | 'google-play'
  | 'huawei-appgallery';

export interface AppDestinationDto {
  id: string;
  appId: string;
  name: string;
  nameLower: string;
  platform: 'android' | 'ios';
  type: AppDestinationType;
  appleId: string | null;
  appleAppId: string | null;
  appleTeamId: string | null;
  appleAppPassword: string | null;
  appleApiKeyId: string | null;
  appleIssuerId: string | null;
  appAppleApiKeyId: string | null;
  appleBetaGroups: string[];
  appleRejectIfPossible: boolean;
  appleReleaseType: 'after-approval' | 'manual';
  appleSubmitForReview: boolean;
  androidPackageName: string | null;
  androidBuildArtifactType: 'aab' | 'apk' | null;
  androidReleaseStatus: 'completed' | 'draft' | null;
  appGoogleServiceAccountKeyId: string | null;
  googlePlayTrack: string | null;
  firebaseAppId: string | null;
  firebaseTesterGroups: string[];
  huaweiAppId: string | null;
  huaweiClientId: string | null;
  defaultLanguage: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateAppDestinationDto {
  appId: string;
  name: string;
  platform: 'android' | 'ios';
  type?: AppDestinationType;
  appleId?: string;
  appleAppId?: string;
  appleTeamId?: string;
  appleAppPassword?: string;
  appleApiKeyId?: string;
  appleIssuerId?: string;
  appAppleApiKeyId?: string;
  appleBetaGroups?: string[];
  appleRejectIfPossible?: boolean;
  appleReleaseType?: 'after-approval' | 'manual';
  appleSubmitForReview?: boolean;
  androidPackageName?: string;
  androidBuildArtifactType?: 'aab' | 'apk';
  androidReleaseStatus?: 'completed' | 'draft';
  appGoogleServiceAccountKeyId?: string;
  googlePlayTrack?: string;
  firebaseAppId?: string;
  firebaseTesterGroups?: string[];
  huaweiAppId?: string;
  huaweiClientId?: string;
  huaweiClientSecret?: string;
  defaultLanguage?: string;
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
  appleBetaGroups?: string[];
  appleRejectIfPossible?: boolean;
  appleReleaseType?: 'after-approval' | 'manual';
  appleSubmitForReview?: boolean;
  androidPackageName?: string;
  androidBuildArtifactType?: 'aab' | 'apk';
  androidReleaseStatus?: 'completed' | 'draft';
  appGoogleServiceAccountKeyId?: string;
  googlePlayTrack?: string;
  firebaseAppId?: string;
  firebaseTesterGroups?: string[];
  huaweiAppId?: string;
  huaweiClientId?: string;
  huaweiClientSecret?: string;
  defaultLanguage?: string | null;
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
  name?: string;
  offset?: number;
  platform?: 'android' | 'ios';
  query?: string;
}
