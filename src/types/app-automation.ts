export type AppAutomationPlatform = 'android' | 'ios' | 'web';

export type AppAutomationTriggerType = 'branch' | 'tag';

export interface AppAutomationDto {
  id: string;
  appId: string;
  appCertificateId: string | null;
  appChannelId: string | null;
  appConfigurationId: string | null;
  appDestinationId: string | null;
  appEnvironmentId: string | null;
  buildStack: string | null;
  buildType: string | null;
  commitMessagePattern: string | null;
  enabled: boolean;
  lastTriggeredAt: string | null;
  name: string;
  platform: AppAutomationPlatform;
  triggerPattern: string | null;
  triggerType: AppAutomationTriggerType;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateAppAutomationDto {
  appId: string;
  appCertificateName?: string | null;
  appChannelName?: string | null;
  appConfigurationName?: string | null;
  appDestinationName?: string | null;
  appEnvironmentName?: string | null;
  buildStack?: string | null;
  buildType?: string | null;
  commitMessagePattern?: string | null;
  enabled?: boolean;
  name: string;
  platform?: AppAutomationPlatform;
  triggerPattern?: string | null;
  triggerType: AppAutomationTriggerType;
}

export interface UpdateAppAutomationDto {
  appId: string;
  automationId: string;
  appCertificateName?: string | null;
  appChannelName?: string | null;
  appConfigurationName?: string | null;
  appDestinationName?: string | null;
  appEnvironmentName?: string | null;
  buildStack?: string | null;
  buildType?: string | null;
  commitMessagePattern?: string | null;
  name?: string;
  platform?: AppAutomationPlatform;
  triggerPattern?: string | null;
  triggerType?: AppAutomationTriggerType;
}

export interface DeleteAppAutomationDto {
  appId: string;
  automationId: string;
}

export interface FindAllAppAutomationsDto {
  appId: string;
  limit?: number;
  name?: string;
  offset?: number;
  platform?: AppAutomationPlatform;
}

export interface FindOneAppAutomationByIdDto {
  appId: string;
  automationId: string;
}
