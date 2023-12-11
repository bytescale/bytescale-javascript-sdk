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
        : await this.registerServiceWorkerValidated(config.serviceWorkerScript, message, serviceWorkerScriptFieldName);

    if (!result.messageSent) {
      result.serviceWorker.postMessage(message);
    }
    return result.config;
  }

  private async registerServiceWorkerValidated(
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

    return await this.registerServiceWorker(serviceWorkerScript, init);
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

    return await this.registerServiceWorker(config.serviceWorkerScript, init);
  }

  /**
   * Idempotent.
   *
   * Only returns once the service worker has been activated.
   *
   * We don't need to unregister it: we just need to clear the config when auth ends.
   */
  private async registerServiceWorker(serviceWorkerScript: string, init: TMessage): Promise<ServiceWorkerInitStatus> {
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
    // We must check the 'installing' state before the 'active' state (see comment below).
    // The state will be 'installing' when the service worker is installed for the first time, or if there have been
    // code changes to the service worker, else the state will be 'active'.
    const installing = registration.installing;
    if (installing !== null) {
      const waitForActive = new Promise<{ messageSent: boolean; serviceWorker: ServiceWorker }>(resolve => {
        const stateChangeHandler = (e: Event): void => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") {
            installing.removeEventListener("statechange", stateChangeHandler);
            resolve({
              messageSent: true,
              serviceWorker: sw
            });
          }
        };
        installing.addEventListener("statechange", stateChangeHandler);
      });

      installing.postMessage(init);

      return await waitForActive;
    }

    // We must check the 'installing' state before the 'active' state, because if we've just installed a new service
    // worker, then the new service worker will be in the 'installing' slot whereas the old service worker will be in
    // the 'active' slot. So, if we checked this first, we would always return the old service worker, and therefore the
    // new service worker would never be initialized.
    if (registration.active !== null) {
      return {
        serviceWorker: registration.active,
        messageSent: false
      };
    }

    // We expect the service worker to use 'skipWaiting', so we don't expect 'waiting' service workers.
    throw new Error("Service worker was neither 'installing' or 'active'.");
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
