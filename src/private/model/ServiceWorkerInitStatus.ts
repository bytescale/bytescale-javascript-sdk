import { ServiceWorkerConfigInitialized } from "./ServiceWorkerConfig";

export interface ServiceWorkerInitStatus {
  config: ServiceWorkerConfigInitialized;
  serviceWorker: ServiceWorker;
}
