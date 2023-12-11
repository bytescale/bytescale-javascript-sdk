import { ConsoleUtils } from "./ConsoleUtils";
import { ServiceWorkerInitStatus } from "./model/ServiceWorkerInitStatus";
import { ServiceWorkerConfig, ServiceWorkerConfigInitialized } from "./model/ServiceWorkerConfig";

export class ServiceWorkerUtils<TMessage> {
  canUseServiceWorkers(): boolean {
    return "serviceWorker" in navigator;
  }

  async sendMessage(
    message: TMessage,
    config: ServiceWorkerConfig,
    serviceWorkerScriptFieldName: string
  ): Promise<ServiceWorkerConfigInitialized> {
    const result =
      config.serviceWorkerScope !== undefined
        ? await this.getActiveServiceWorkerElseRegister(config, message)
        : await this.registerServiceWorkerIfSupported(
            config.serviceWorkerScript,
            message,
            serviceWorkerScriptFieldName
          );

    if (!result.messageSent) {
      result.serviceWorker.postMessage(message);
    }
    return result.config;
  }

  private async registerServiceWorkerIfSupported(
    serviceWorkerScript: string,
    init: TMessage,
    serviceWorkerScriptFieldName: string
  ): Promise<ServiceWorkerInitStatus> {
    if (!serviceWorkerScript.startsWith("/")) {
      throw new Error(
        `The '${serviceWorkerScriptFieldName}' field must start with a '/' and reference a script at the root of your website.`
      );
    }

    const forwardSlashCount = serviceWorkerScript.split("/").length - 1;
    if (forwardSlashCount > 1) {
      ConsoleUtils.warn(
        `The '${serviceWorkerScriptFieldName}' field should be a root script (e.g. '/script.js'). The Bytescale SDK can only authorize requests originating from webpages that are at the same level as the script or below.`
      );
    }

    return await this.registerAuthServiceWorker(serviceWorkerScript, init);
  }

  private async getActiveServiceWorkerElseRegister(
    config: ServiceWorkerConfigInitialized,
    init: TMessage
  ): Promise<ServiceWorkerInitStatus> {
    const serviceWorker = await this.getActiveServiceWorker(config.serviceWorkerScope);
    if (serviceWorker !== undefined) {
      return {
        serviceWorker,
        messageSent: false,
        config
      };
    }

    return await this.registerAuthServiceWorker(config.serviceWorkerScript, init);
  }

  /**
   * Idempotent.
   *
   * Only returns once the service worker has been activated.
   *
   * We don't need to unregister it: we just need to clear the config when auth ends.
   */
  private async registerAuthServiceWorker(
    serviceWorkerScript: string,
    init: TMessage
  ): Promise<ServiceWorkerInitStatus> {
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerScript);

      const { serviceWorker, messageSent } = await this.waitForActiveServiceWorker(registration, init);

      return {
        serviceWorker,
        messageSent,
        config: {
          serviceWorkerScript,
          serviceWorkerScope: registration.scope
        }
      };
    } catch (e) {
      throw new Error(`Failed to install Bytescale Service Worker (SW). ${(e as Error).name}: ${(e as Error).message}`);
    }
  }

  private async waitForActiveServiceWorker(
    registration: ServiceWorkerRegistration,
    init: TMessage
  ): Promise<{ messageSent: boolean; serviceWorker: ServiceWorker }> {
    // If the service worker is already active, return it.
    if (registration.active !== null) {
      return {
        serviceWorker: registration.active,
        messageSent: false
      };
    }

    // Service worker has not finished installing, which means we've just started installing a new one, so send the INIT
    // message to it, as it will be waiting for it to complete its install phase.
    let messageSent: boolean;
    if (registration.installing !== null) {
      messageSent = true;
      registration.installing.postMessage(init);
    } else {
      messageSent = false;
    }

    // Wait for the service worker to become active.
    return await new Promise<{ messageSent: boolean; serviceWorker: ServiceWorker }>((resolve, reject) => {
      const serviceWorker = registration.installing ?? registration.waiting ?? undefined;
      if (serviceWorker !== undefined) {
        const stateChangeHandler = (e: Event): void => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") {
            serviceWorker.removeEventListener("statechange", stateChangeHandler);
            resolve({
              messageSent,
              serviceWorker: sw
            });
          }
        };
        serviceWorker.addEventListener("statechange", stateChangeHandler);
      } else {
        // If there's no installing or waiting service worker, reject.
        reject(new Error("No service worker is installing or waiting."));
      }
    });
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
