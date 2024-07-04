import { ConsoleUtils } from "./ConsoleUtils";
import { ServiceWorkerInitStatus } from "./model/ServiceWorkerInitStatus";
import { ServiceWorkerConfig, ServiceWorkerConfigInitialized } from "./model/ServiceWorkerConfig";
import { assertUnreachable } from "./TypeUtils";

export class ServiceWorkerUtils<TMessage> {
  canUseServiceWorkers(): boolean {
    return "serviceWorker" in navigator;
  }

  async sendMessage(
    message: TMessage,
    config: ServiceWorkerConfig,
    serviceWorkerScriptFieldName: string
  ): Promise<ServiceWorkerConfigInitialized> {
    const result = await this.ensureActiveServiceWorkerExists(message, config, serviceWorkerScriptFieldName);

    // Message delivery is at least once. We must always assume this as there is only 1 service worker instance and
    // potentially multiple browser tabs with AuthManager sessions running. As such, even if we ensure exactly-once
    // delivery within a single tab, there will still be at-least-once delivery across all. As such, we simplfy our
    // code by using at-least-once delivery here too (hence the following 'postMessage' will already have been called
    // in the scenario where a new worker is newly installed).
    result.serviceWorker.postMessage(message);

    return result.config;
  }

  private async ensureActiveServiceWorkerExists(
    initMessage: TMessage,
    config: ServiceWorkerConfig,
    serviceWorkerScriptFieldName: string
  ): Promise<ServiceWorkerInitStatus> {
    switch (config.type) {
      case "Uninitialized": {
        await this.unregisterOnHardReload();
        break;
      }
      case "Initialized": {
        const serviceWorker = await this.getActiveServiceWorker(config.serviceWorkerScope);
        if (serviceWorker !== undefined) {
          return {
            serviceWorker,
            config
          };
        }
        break;
      }
      default:
        assertUnreachable(config);
    }

    return await this.registerServiceWorker(config.serviceWorkerScript, initMessage, serviceWorkerScriptFieldName);
  }

  /**
   * Idempotent.
   *
   * Only returns once the service worker has been activated.
   *
   * We don't need to unregister it: we just need to clear the config when auth ends.
   */
  private async registerServiceWorker(
    serviceWorkerScript: string,
    initMessage: TMessage,
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

    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerScript);
      return {
        serviceWorker: await this.waitForActiveServiceWorker(registration, initMessage),
        config: {
          serviceWorkerScript,
          serviceWorkerScope: registration.scope, // Can be undefined (despite what the DOM TS defs say).
          type: "Initialized"
        }
      };
    } catch (e) {
      throw new Error(`Failed to install Bytescale Service Worker (SW). ${(e as Error).name}: ${(e as Error).message}`);
    }
  }

  private async waitForActiveServiceWorker(
    registration: ServiceWorkerRegistration,
    initMessage: TMessage
  ): Promise<ServiceWorker> {
    // We must check the 'installing' state before the 'active' state (see comment below).
    // The state will be 'installing' when the service worker is installed for the first time, or if there have been
    // code changes to the service worker, else the state will be 'active'.
    const installing = registration.installing;
    if (installing !== null) {
      const waitForActive = new Promise<ServiceWorker>(resolve => {
        const stateChangeHandler = (e: Event): void => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") {
            installing.removeEventListener("statechange", stateChangeHandler);
            resolve(sw);
          }
        };
        installing.addEventListener("statechange", stateChangeHandler);
      });

      // We send the message during the INSTALL phase instead of ACTIVE phase to ensure that when replacing an
      // existing Service Worker instance, the new instance will be ready to run (with config received from this
      // 'postMessage' call) prior to it being activated, so that it can immediately start attaching auth headers to
      // intercepted 'fetch' requests.
      installing.postMessage(initMessage);

      return await waitForActive;
    }

    // We must check the 'installing' state before the 'active' state, because if we've just installed a new service
    // worker, then the new service worker will be in the 'installing' slot whereas the old service worker will be in
    // the 'active' slot. So, if we checked this first, we would always return the old service worker, and therefore the
    // new service worker would never be initialized.
    if (registration.active !== null) {
      return registration.active;
    }

    // We expect the service worker to use 'skipWaiting', so we don't expect 'waiting' service workers.
    throw new Error("Service worker was neither 'installing' or 'active'.");
  }

  private async getActiveServiceWorker(serviceWorkerScope: string | undefined): Promise<ServiceWorker | undefined> {
    const registrations = (await this.getActiveRegistrations()).filter(x => x.scope === serviceWorkerScope);
    return registrations[0]?.active ?? undefined;
  }

  /**
   * Existing active Service Workers will not receive 'fetch' events in sessions that start with a hard reload, so
   * we must unregister them and register a new one. (See: https://github.com/mswjs/msw/issues/98#issuecomment-612118211)
   */
  private async unregisterOnHardReload(): Promise<undefined> {
    const isHardReload = navigator.serviceWorker.controller === null;
    if (!isHardReload) {
      return;
    }

    const registrations = await this.getActiveRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }

  private async getActiveRegistrations(): Promise<ServiceWorkerRegistration[]> {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.filter(registration => registration.active !== null);
  }
}
