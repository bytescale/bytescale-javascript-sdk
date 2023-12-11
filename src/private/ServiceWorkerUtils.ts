import { ConsoleUtils } from "./ConsoleUtils";
import { ServiceWorkerConfig } from "./model/ServiceWorkerConfig";

export class ServiceWorkerUtils {
  /**
   * Idempotent.
   *
   * Only returns once the service worker has been activated.
   *
   * We don't need to unregister it: we just need to clear the config when auth ends.
   */
  async registerServiceWorkerIfSupported(
    serviceWorkerScript: string | undefined,
    configFieldName: string,
    fallbackMessage: string
  ): Promise<ServiceWorkerConfig | undefined> {
    if (serviceWorkerScript === undefined) {
      return undefined;
    }
    if (!("serviceWorker" in navigator)) {
      ConsoleUtils.warn(`Service workers not supported by browser. ${fallbackMessage}`);
      return undefined;
    }

    if (!serviceWorkerScript.startsWith("/")) {
      throw new Error(
        `The '${configFieldName}' field must start with a '/' and reference a script at the root of your website.`
      );
    }

    const forwardSlashCount = serviceWorkerScript.split("/").length - 1;
    if (forwardSlashCount > 1) {
      ConsoleUtils.warn(
        `The '${configFieldName}' field should be a root script (e.g. '/script.js'). The Bytescale SDK can only authorize requests originating from webpages that are at the same level as the script or below.`
      );
    }

    return (await this.registerAuthServiceWorker(serviceWorkerScript)).config;
  }

  async getActiveServiceWorkerElseRegister({
    serviceWorkerScope,
    serviceWorkerScript
  }: ServiceWorkerConfig): Promise<ServiceWorker> {
    const serviceWorker = await this.getActiveServiceWorker(serviceWorkerScope);
    if (serviceWorker !== undefined) {
      return serviceWorker;
    }

    return (await this.registerAuthServiceWorker(serviceWorkerScript)).serviceWorker;
  }

  /**
   * Idempotent.
   *
   * Only returns once the service worker has been activated.
   *
   * We don't need to unregister it: we just need to clear the config when auth ends.
   */
  private async registerAuthServiceWorker(
    serviceWorkerScript: string
  ): Promise<{ config: ServiceWorkerConfig; serviceWorker: ServiceWorker }> {
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerScript);

      // Occurs when: (service worker is already registered AND there's been no code changes) OR (service worker was not previously registered).
      if (registration.active !== null) {
        return {
          serviceWorker: registration.active,
          config: {
            serviceWorkerScript,
            serviceWorkerScope: registration.scope
          }
        };
      }

      // Occurs when: service worker is already registered AND there's been code changes.
      return await new Promise<{ config: ServiceWorkerConfig; serviceWorker: ServiceWorker }>(resolve => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker !== null) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                resolve({
                  config: {
                    serviceWorkerScript,
                    serviceWorkerScope: registration.scope
                  },
                  serviceWorker: newWorker
                });
              }
            });
          }
        });
      });
    } catch (e) {
      throw new Error(`Failed to install Bytescale Service Worker (SW). ${(e as Error).name}: ${(e as Error).message}`);
    }
  }

  private async getActiveServiceWorker(serviceWorkerScope: string): Promise<ServiceWorker | undefined> {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (registration.active !== null && registration.scope === serviceWorkerScope) {
        return registration.active;
      }
    }

    return undefined;
  }
}
