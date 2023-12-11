export type ServiceWorkerConfig = ServiceWorkerConfigUninitialized | ServiceWorkerConfigInitialized;

export interface ServiceWorkerConfigUninitialized {
  serviceWorkerScope: undefined;
  serviceWorkerScript: string;
}
export interface ServiceWorkerConfigInitialized {
  serviceWorkerScope: string;
  serviceWorkerScript: string;
}
