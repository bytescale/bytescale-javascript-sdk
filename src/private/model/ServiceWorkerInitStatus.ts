import { ServiceWorkerConfigInitialized } from "./ServiceWorkerConfig";

export interface ServiceWorkerInitStatus {
  config: ServiceWorkerConfigInitialized;
  messageSent: boolean;
  serviceWorker: ServiceWorker;
}
