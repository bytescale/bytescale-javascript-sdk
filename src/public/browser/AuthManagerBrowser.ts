import {
  AuthManagerServiceWorkerConfig,
  AuthManagerInterface,
  BeginAuthSessionParams,
  UrlRewriteRule
} from "../../private/model/AuthManagerInterface";
import { AuthSessionState } from "../../private/AuthSessionState";
import { ConsoleUtils } from "../../private/ConsoleUtils";
import { BaseAPI, BytescaleApiClientConfigUtils } from "../shared/generated";
import { AuthSession } from "../../private/model/AuthSession";
import { SetAccessTokenRequestDto } from "../../private/dtos/SetAccessTokenRequestDto";
import { SetAccessTokenResponseDto } from "../../private/dtos/SetAccessTokenResponseDto";
import { AuthSwSetConfigDto } from "../../private/dtos/AuthSwSetConfigDto";
import { AuthSwConfigDto } from "../../private/dtos/AuthSwConfigDto";
import { ServiceWorkerUtils } from "../../private/ServiceWorkerUtils";
import { Scheduler } from "../../private/Scheduler";

export type { AuthSwConfigEntryDto } from "../../private/dtos/AuthSwConfigEntryDto";
export type { AuthSwHeaderDto } from "../../private/dtos/AuthSwHeaderDto";
export type {
  AuthManagerServiceWorkerConfig,
  BeginAuthSessionParams,
  UrlRewriteRule
} from "../../private/model/AuthManagerInterface";

class AuthManagerImpl implements AuthManagerInterface {
  private readonly authSessionMutex;
  private readonly serviceWorkerScriptFieldName: keyof BeginAuthSessionParams = "serviceWorkerScript";
  private readonly contentType = "content-type";
  private readonly contentTypeJson = "application/json";
  private readonly contentTypeText = "text/plain";
  private readonly minJwtTtlSeconds = 10;
  private readonly retryAuthAfterErrorSeconds = 5;
  private readonly refreshBeforeExpirySeconds = 20;
  private readonly scheduler = new Scheduler();
  private readonly sourceScopedUrlPrefixMarker = "!bytescale-source-scoped!";

  constructor(private readonly serviceWorkerUtils: ServiceWorkerUtils<AuthSwSetConfigDto>) {
    this.authSessionMutex = AuthSessionState.getMutex();
  }

  isAuthSessionActive(): boolean {
    return AuthSessionState.getSession() !== undefined;
  }

  isAuthSessionReady(): boolean {
    const session = AuthSessionState.getSession();
    return session?.isReady ?? session?.accessToken !== undefined;
  }

  async beginAuthSession(params: BeginAuthSessionParams): Promise<void> {
    const session = await this.authSessionMutex.safe(async () => {
      // We check both 'session' and 'sessionDisposing' here, as we don't want to call 'beginAuthSession' until the session is fully disposed.
      if (this.isAuthSessionActive()) {
        throw new Error(
          "Auth session already active. Please call 'await endAuthSession()' and then call 'await beginAuthSession(...)' to start a new auth session."
        );
      }

      const canUseServiceWorkers = this.serviceWorkerUtils.canUseServiceWorkers();
      if (params.serviceWorkerConfig !== undefined) {
        if (params.serviceWorkerScript === undefined) {
          throw new Error("The 'serviceWorkerScript' field is required when 'serviceWorkerConfig' is provided.");
        }
        if (!canUseServiceWorkers) {
          throw new Error(
            "The 'serviceWorkerConfig' field requires service workers, but this browser does not support them."
          );
        }
      }

      const newSession: AuthSession = {
        accessToken: undefined,
        accessTokenRefreshHandle: undefined,
        params,
        isActive: true,
        isReady: false,
        authServiceWorker:
          params.serviceWorkerScript !== undefined && canUseServiceWorkers
            ? {
                serviceWorkerScript: params.serviceWorkerScript,
                type: "Uninitialized"
              }
            : undefined,
        primaryAuthSwConfig: undefined,
        serviceWorkerConfig: undefined,
        serviceWorkerConfigRefreshHandle: undefined
      };

      AuthSessionState.setSession(newSession);

      return newSession;
    });

    // IMPORTANT: must be called outside the above, else re-entrant deadlock will occur.
    if (session.params.serviceWorkerConfig !== undefined) {
      await this.refreshServiceWorkerConfig(session, session.params);
    }
    await this.refreshAccessToken(session, session.params);
  }

  async endAuthSession(): Promise<void> {
    await this.authSessionMutex.safe(async () => {
      const session = AuthSessionState.getSession();
      if (session === undefined) {
        return;
      }

      AuthSessionState.setSession(undefined);
      session.isActive = false;

      if (session.accessTokenRefreshHandle !== undefined) {
        this.scheduler.unschedule(session.accessTokenRefreshHandle);
      }
      if (session.serviceWorkerConfigRefreshHandle !== undefined) {
        this.scheduler.unschedule(session.serviceWorkerConfigRefreshHandle);
      }

      // AuthSessionState is shared between bundled SDK versions. Service-worker-only sessions from 3.56.0 did not
      // contain an accountId, so allow a newer SDK instance to tear those sessions down without calling this endpoint.
      if (typeof session.params.accountId === "string") {
        await this.deleteAccessToken(session.params);
      }

      if (session.authServiceWorker !== undefined) {
        // Prevent service worker from authorizing subsequent requests.
        await this.sendServiceWorkerConfig(session, []);
      }
    });
  }

  private async refreshAccessToken(session: AuthSession, params: BeginAuthSessionParams): Promise<void> {
    await this.authSessionMutex.safe(async () => {
      if (!session.isActive) {
        return;
      }

      const secondsFromNow = (seconds: number): number => Date.now() + seconds * 1000;

      let expires = secondsFromNow(this.retryAuthAfterErrorSeconds);

      try {
        const jwt = await this.getAccessToken(params, await params.authHeaders());

        // We don't use cookie-based auth if the browser supports service worker-based auth, as using both will cause
        // confusion for us in the future (i.e. we may question "do we need to use both together? was there a reason?").
        // Also: if the user has omitted "allowedOrigins" from their JWT, then service worker-based auth is more secure
        // than cookie-based auth, which is another reason to prevent these cookies from being set unless required.
        const setCookie = session.authServiceWorker === undefined;

        const setTokenResult = await this.setAccessToken(params, jwt, setCookie);

        if (session.authServiceWorker !== undefined) {
          const primaryAuthSwConfig = {
            headers: [{ key: "Authorization", value: `Bearer ${jwt}` }],
            expires: secondsFromNow(setTokenResult.ttlSeconds),
            urlPrefix: `${this.getCdnUrl(params)}/${params.accountId}/`
          };

          // Fail closed until the initial serviceWorkerConfig callback succeeds: without its result, we do not know
          // the source-page restrictions intended for the primary JWT.
          if (params.serviceWorkerConfig === undefined || session.serviceWorkerConfig !== undefined) {
            await this.sendMergedServiceWorkerConfig(session, primaryAuthSwConfig, session.serviceWorkerConfig);
            await this.waitForServiceWorker();
          }

          session.primaryAuthSwConfig = primaryAuthSwConfig;
        }

        const desiredTtl = setTokenResult.ttlSeconds - this.refreshBeforeExpirySeconds;
        const actualTtl = Math.max(desiredTtl, this.minJwtTtlSeconds);
        if (desiredTtl !== actualTtl) {
          ConsoleUtils.warn(`JWT expiration is too short: waiting for ${actualTtl} seconds before refreshing.`);
        }

        expires = secondsFromNow(actualTtl);

        // Set this at the end, as it's also used to signal 'isAuthSessionReady', so must be set after configuring the Service Worker, etc.
        session.accessToken = setTokenResult.accessToken;
        this.updateSessionReadiness(session);
      } catch (e) {
        // Use 'warn' instead of 'error' since this happens frequently, i.e. user goes through a tunnel, and some customers report these errors to systems like Sentry, so we don't want to spam.
        ConsoleUtils.warn(`Unable to refresh JWT access token: ${e as string}`);
      } finally {
        // 'setTimeout' can be paused (e.g., during hibernation), risking JWT expiration before it triggers. We use a
        // scheduler to check wall-clock time every second and execute the callback at the scheduled time (below).
        session.accessTokenRefreshHandle = this.scheduler.schedule(expires, () => {
          this.refreshAccessToken(session, params).then(
            () => {},
            // Should not occur, as this method shouldn't throw errors.
            e => ConsoleUtils.error(`Unexpected error when refreshing JWT access token: ${e as string}`)
          );
        });
      }
    });
  }

  private async refreshServiceWorkerConfig(session: AuthSession, params: BeginAuthSessionParams): Promise<void> {
    const getServiceWorkerConfig = params.serviceWorkerConfig;
    if (getServiceWorkerConfig === undefined) {
      return;
    }

    await this.authSessionMutex.safe(async () => {
      if (!session.isActive) {
        return;
      }

      let refreshAt: number | undefined;

      try {
        const result = await getServiceWorkerConfig();
        if (result === null || typeof result !== "object" || !Array.isArray(result.additionalConfig)) {
          throw new Error("The 'serviceWorkerConfig' callback must return an object containing 'additionalConfig'.");
        }
        if (
          result.sourceUrlPrefixes !== undefined &&
          (!Array.isArray(result.sourceUrlPrefixes) ||
            !result.sourceUrlPrefixes.every(prefix => typeof prefix === "string"))
        ) {
          throw new Error(
            "The 'sourceUrlPrefixes' field returned by 'serviceWorkerConfig' must be an array of strings."
          );
        }
        if (
          result.urlRewriteRules !== undefined &&
          (!Array.isArray(result.urlRewriteRules) ||
            !result.urlRewriteRules.every(
              rule =>
                rule !== null &&
                typeof rule === "object" &&
                typeof rule.fromUrlPrefix === "string" &&
                typeof rule.toUrlPrefix === "string"
            ))
        ) {
          throw new Error(
            "The 'urlRewriteRules' field returned by 'serviceWorkerConfig' must be an array of URL rewrite rules."
          );
        }

        const config: AuthManagerServiceWorkerConfig = {
          additionalConfig: result.additionalConfig,
          sourceUrlPrefixes: result.sourceUrlPrefixes,
          urlRewriteRules: result.urlRewriteRules
        };

        if (session.primaryAuthSwConfig !== undefined) {
          await this.sendMergedServiceWorkerConfig(session, session.primaryAuthSwConfig, config);
          await this.waitForServiceWorker();
        }

        session.serviceWorkerConfig = config;
        this.updateSessionReadiness(session);
        refreshAt = this.getServiceWorkerConfigRefreshEpoch(config.additionalConfig);
      } catch (e) {
        ConsoleUtils.warn(`Unable to refresh service worker auth config: ${e as string}`);
        refreshAt = Date.now() + this.retryAuthAfterErrorSeconds * 1000;
      }

      if (refreshAt !== undefined) {
        session.serviceWorkerConfigRefreshHandle = this.scheduler.schedule(refreshAt, () => {
          this.refreshServiceWorkerConfig(session, params).then(
            () => {},
            e => ConsoleUtils.error(`Unexpected error when refreshing service worker auth config: ${e as string}`)
          );
        });
      }
    });
  }

  private async sendMergedServiceWorkerConfig(
    session: AuthSession,
    primaryConfig: AuthSwConfigDto[number],
    serviceWorkerConfig: AuthManagerServiceWorkerConfig | undefined
  ): Promise<void> {
    await this.sendServiceWorkerConfig(
      session,
      [
        {
          ...primaryConfig,
          sourceUrlPrefixes: serviceWorkerConfig?.sourceUrlPrefixes
        },
        ...(serviceWorkerConfig?.additionalConfig ?? [])
      ],
      serviceWorkerConfig?.urlRewriteRules
    );
  }

  private getServiceWorkerConfigRefreshEpoch(config: AuthSwConfigDto): number | undefined {
    let earliestExpiry: number | undefined;
    for (const entry of config) {
      if (entry.expires !== undefined && (earliestExpiry === undefined || entry.expires < earliestExpiry)) {
        earliestExpiry = entry.expires;
      }
    }
    return earliestExpiry === undefined ? undefined : earliestExpiry - this.refreshBeforeExpirySeconds * 1000;
  }

  private async sendServiceWorkerConfig(
    session: AuthSession,
    config: AuthSwConfigDto,
    urlRewriteRules?: UrlRewriteRule[]
  ): Promise<void> {
    if (session.authServiceWorker === undefined) {
      throw new Error("Service worker configuration cannot be applied because service workers are unavailable.");
    }

    session.authServiceWorker = await this.serviceWorkerUtils.sendMessage(
      {
        type: "SET_BYTESCALE_AUTH_CONFIG",
        config: config.map((entry): AuthSwConfigDto[number] => ({
          ...entry,
          urlPrefix: `${entry.sourceUrlPrefixes === undefined ? "" : this.sourceScopedUrlPrefixMarker}${
            entry.urlPrefix
          }`
        })),
        ...(urlRewriteRules === undefined ? {} : { urlRewriteRules })
      },
      session.authServiceWorker,
      this.serviceWorkerScriptFieldName
    );
  }

  private updateSessionReadiness(session: AuthSession): void {
    session.isReady =
      session.accessToken !== undefined &&
      (session.params.serviceWorkerConfig === undefined || session.serviceWorkerConfig !== undefined);
  }

  private async waitForServiceWorker(): Promise<void> {
    // Message delivery is asynchronous and has no acknowledgement, so allow the worker time to apply the config before
    // beginAuthSession reports that authenticated requests are ready.
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private getAccessTokenUrl(params: BeginAuthSessionParams, setCookie: boolean): string {
    return `${this.getCdnUrl(params)}/api/v1/access_tokens/${params.accountId}?set-cookie=${
      setCookie ? "true" : "false"
    }`;
  }

  private getCdnUrl(params: BeginAuthSessionParams): string {
    return BytescaleApiClientConfigUtils.getCdnUrl(params.options ?? {});
  }

  private async deleteAccessToken(params: BeginAuthSessionParams): Promise<void> {
    await BaseAPI.fetch(
      this.getAccessTokenUrl(params, true),
      {
        method: "DELETE",
        credentials: "include", // Required, else Bytescale CDN response's `Set-Cookie` header will be silently ignored.
        headers: {}
      },
      {
        isBytescaleApi: true,
        fetchApi: params.options?.fetchApi
      }
    );
  }

  private async setAccessToken(
    params: BeginAuthSessionParams,
    jwt: string,
    setCookie: boolean
  ): Promise<SetAccessTokenResponseDto> {
    const request: SetAccessTokenRequestDto = {
      accessToken: jwt
    };
    const response = await BaseAPI.fetch(
      this.getAccessTokenUrl(params, setCookie),
      {
        method: "PUT",
        credentials: "include", // Required, else Bytescale CDN response's `Set-Cookie` header will be silently ignored.
        headers: {
          [this.contentType]: this.contentTypeJson
        },
        body: JSON.stringify(request)
      },
      {
        isBytescaleApi: true,
        fetchApi: params.options?.fetchApi
      }
    );

    return await response.json();
  }

  private async getAccessToken(params: BeginAuthSessionParams, headers: Record<string, string>): Promise<string> {
    const endpointName = "Your auth API endpoint";
    const requiredContentType = this.contentTypeText;
    const result = await BaseAPI.fetch(
      params.authUrl,
      {
        method: "GET",
        headers
      },
      {
        isBytescaleApi: false,
        fetchApi: params.options?.fetchApi
      }
    );

    const actualContentType = result.headers.get(this.contentType) ?? "";

    // Support content types like "text/plain; charset=utf-8" and "text/plain"
    if (actualContentType.split(";")[0] !== requiredContentType) {
      throw new Error(
        `${endpointName} returned "${actualContentType}" for the ${this.contentType} response header, but the Bytescale SDK requires "${requiredContentType}".`
      );
    }

    const jwt = await result.text();

    if (jwt.length === 0) {
      throw new Error(`${endpointName} returned an empty string. Please return a valid JWT instead.`);
    }

    if (jwt.trim().length !== jwt.length) {
      // Whitespace can be a nightmare to spot/debug, so we fail early here.
      throw new Error(`${endpointName} returned whitespace around the JWT, please remove it.`);
    }

    return jwt;
  }
}

/**
 * Alternative way of implementing a static class (i.e. all methods static). We do this so we can use a interface on the class (interfaces can't define static methods).
 */
export const AuthManager = new AuthManagerImpl(new ServiceWorkerUtils<AuthSwSetConfigDto>());
