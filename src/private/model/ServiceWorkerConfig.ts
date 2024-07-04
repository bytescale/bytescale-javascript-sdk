export type ServiceWorkerConfig = ServiceWorkerConfigUninitialized | ServiceWorkerConfigInitialized;

export interface ServiceWorkerConfigUninitialized {
  serviceWorkerScript: string;
  type: "Uninitialized";
}

export interface ServiceWorkerConfigInitialized {
  serviceWorkerScope: string | undefined; // Scope can still be undefined even when initialized.
  serviceWorkerScript: string;
  type: "Initialized";
}
