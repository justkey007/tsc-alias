import { appConfig } from '@app/config';

export function getAppName(): string {
  return appConfig.name;
}
