import { AuthManagerInterface } from "../../private/model/AuthManagerInterface";
import { AuthSessionState } from "../../private/AuthSessionState";
import { ConsoleUtils } from "../../private/ConsoleUtils";
import { BaseAPI, BytescaleApiClientConfigUtils } from "../shared/generated";
import { AuthSession, AuthSessionConfigState } from "../../private/model/AuthSession";
import { SetAccessTokenRequestDto } from "../../private/dtos/SetAccessTokenRequestDto";
import { SetAccessTokenResponseDto } from "../../private/dtos/SetAccessTokenResponseDto";
import { AuthSwSetConfigDto } from "../../private/dtos/AuthSwSetConfigDto";
import { AuthSwConfigDto } from "../../private/dtos/AuthSwConfigDto";
import { ServiceWorkerUtils } from "../../private/ServiceWorkerUtils";
import { Scheduler } from "../../private/Scheduler";
import { BeginAuthSessionParamsV1 } from "../../private/model/BeginAuthSessionParamsV1";
import { BeginAuthSessionParamsV2 } from "../../private/model/BeginAuthSessionParamsV2";
import { BeginAuthSessionParams } from "../../private/model/BeginAuthSessionParams";
import { AuthSessionConfigAuto } from "../../private/model/AuthSessionConfigAuto";
import { AuthSessionConfig } from "../../private/model/AuthSessionConfig";
import { UrlRewriteRule } from "../../private/model/UrlRewriteRule";

export type { AuthSwConfigEntryDto } from "../../private/dtos/AuthSwConfigEntryDto";
export type { AuthSwHeaderDto } from "../../private/dtos/AuthSwHeaderDto";

class InvalidAuthTokenError extends Error {}

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
    if (session !== undefined && Array.isArray(session.authConfigs)) {
      return session.isReady === true && session.authConfigs.every(state => this.isConfigUsable(state));
    }
    return session?.accessToken !== undefined;
  }

  async beginAuthSession(params: BeginAuthSessionParams): Promise<void> {
    const session = await this.authSessionMutex.safe(async () => {
      if (this.isAuthSessionActive()) {
        throw new Error(
          "Auth session already active. Please call 'await endAuthSession()' and then call 'await beginAuthSession(...)' to start a new auth session."
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(params, "authConfigs") &&
        typeof (params as { authConfigs?: unknown }).authConfigs !== "function"
      ) {
        throw new Error("The 'authConfigs' field must be a callback returning a non-empty array.");
      }
      const isV2 = this.isV2Params(params);
      const configs = isV2 ? await this.getV2Configs(params) : [this.normalizeV1Config(params)];
      const canUseServiceWorkers = this.serviceWorkerUtils.canUseServiceWorkers();
      const requiresServiceWorker =
        configs.some(config => config !== null && typeof config === "object" && this.isServiceWorkerEnabled(config)) ||
        (isV2 && (params.urlRewriteRules?.length ?? 0) > 0);

      this.validateSessionConfig(params, configs, canUseServiceWorkers, requiresServiceWorker);

      const newSession: AuthSession = {
        accessToken: undefined,
        accessTokenRefreshHandle: undefined,
        authConfigs: configs.map(
          (config): AuthSessionConfigState => ({
            accessToken: undefined,
            authenticationPromise: Promise.resolve(),
            config,
            expiresAt: undefined,
            jwt: undefined,
            refreshHandle: undefined,
            refreshPromise: undefined
          })
        ),
        authServiceWorker:
          requiresServiceWorker && params.serviceWorkerScript !== undefined && canUseServiceWorkers
            ? {
                serviceWorkerScript: params.serviceWorkerScript,
                type: "Uninitialized"
              }
            : undefined,
        isActive: true,
        isReady: false,
        params,
        serviceWorkerConfigured: false
      };

      AuthSessionState.setSession(newSession);
      return newSession;
    });

    try {
      for (const config of session.authConfigs ?? []) {
        await this.refreshAuthConfig(session, config);
      }
    } catch (e) {
      try {
        await this.endAuthSession();
      } catch (_cleanupError) {
        // Preserve the validation error that caused session initialization to fail.
      }
      throw e;
    }
  }

  async endAuthSession(): Promise<void> {
    await this.authSessionMutex.safe(async () => {
      const session = AuthSessionState.getSession();
      if (session === undefined) {
        return;
      }

      AuthSessionState.setSession(undefined);
      session.isActive = false;

      if (session.authConfigs === undefined) {
        if (session.accessTokenRefreshHandle !== undefined) {
          this.scheduler.unschedule(session.accessTokenRefreshHandle);
        }
      } else {
        for (const state of session.authConfigs) {
          if (state.refreshHandle !== undefined) {
            this.scheduler.unschedule(state.refreshHandle);
          }
        }
      }

      let cleanupError: unknown;
      const cookieConfigs = this.isV2Params(session.params)
        ? session.authConfigs?.filter(state => state.config.enableCookieAuth === true) ?? []
        : session.authConfigs ?? [];

      // A 3.54.0 session will not contain authConfigs, but a newer bundle must still be able to end it.
      if (session.authConfigs === undefined && typeof session.params.accountId === "string") {
        try {
          await this.deleteAccessToken(
            session.params.options,
            this.getCdnUrl(session.params),
            session.params.accountId
          );
        } catch (e) {
          cleanupError = e;
        }
      } else {
        for (const state of cookieConfigs) {
          try {
            await this.deleteAccessToken(
              session.params.options,
              this.getConfigCdnUrl(session.params, state.config),
              state.config.accountId
            );
          } catch (e) {
            cleanupError ??= e;
          }
        }
      }

      if (session.authServiceWorker !== undefined) {
        try {
          await this.sendServiceWorkerConfig(session, []);
        } catch (e) {
          cleanupError ??= e;
        }
      }

      if (cleanupError !== undefined) {
        throw cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError));
      }
    });
  }

  private async refreshAuthConfig(session: AuthSession, state: AuthSessionConfigState): Promise<void> {
    if (state.refreshPromise !== undefined) {
      await state.refreshPromise;
      return;
    }

    // Publish the pending operation before provider code can run, including provider code that calls back into the SDK.
    const refreshPromise = Promise.resolve().then(async () => await this.performRefreshAuthConfig(session, state));
    state.authenticationPromise = refreshPromise;
    state.refreshPromise = refreshPromise;
    const clearRefreshPromise = (): void => {
      if (state.refreshPromise === refreshPromise) {
        state.refreshPromise = undefined;
      }
    };
    refreshPromise.then(clearRefreshPromise, clearRefreshPromise);
    await refreshPromise;
  }

  private async performRefreshAuthConfig(session: AuthSession, state: AuthSessionConfigState): Promise<void> {
    await this.authSessionMutex.safe(async () => {
      if (!session.isActive) {
        return;
      }

      if (state.refreshHandle !== undefined) {
        this.scheduler.unschedule(state.refreshHandle);
        state.refreshHandle = undefined;
      }

      const previous = {
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        jwt: state.jwt,
        serviceWorkerConfigured: session.serviceWorkerConfigured
      };
      let refreshAt = Date.now() + this.retryAuthAfterErrorSeconds * 1000;

      try {
        const jwt = await this.getAuthorizationToken(session.params, state.config);
        const setCookie = this.shouldSetCookie(session, state.config);
        const token = await this.setAccessToken(
          session.params.options,
          this.getConfigCdnUrl(session.params, state.config),
          state.config.accountId,
          jwt,
          setCookie
        );
        const expiresAt = Date.now() + token.ttlSeconds * 1000;

        state.accessToken = token.accessToken;
        state.expiresAt = expiresAt;
        state.jwt = jwt;

        if (
          session.authServiceWorker !== undefined &&
          (this.isServiceWorkerEnabled(state.config) || session.serviceWorkerConfigured !== true)
        ) {
          await this.sendCurrentServiceWorkerConfig(session);
          await this.waitForServiceWorker();
          session.serviceWorkerConfigured = true;
        }

        const desiredTtl = token.ttlSeconds - this.refreshBeforeExpirySeconds;
        const actualTtl = Math.max(desiredTtl, this.minJwtTtlSeconds);
        if (desiredTtl !== actualTtl) {
          ConsoleUtils.warn(`JWT expiration is too short: waiting for ${actualTtl} seconds before refreshing.`);
        }
        refreshAt = Date.now() + actualTtl * 1000;
      } catch (e) {
        state.accessToken = previous.accessToken;
        state.expiresAt = previous.expiresAt;
        state.jwt = previous.jwt;
        session.serviceWorkerConfigured = previous.serviceWorkerConfigured;
        ConsoleUtils.warn(
          `Unable to refresh JWT access token for auth config '${state.config.authConfigId ?? "default"}': ${
            e as string
          }`
        );
        if (
          this.isV2Params(session.params) &&
          previous.accessToken === undefined &&
          e instanceof InvalidAuthTokenError
        ) {
          throw e;
        }
      } finally {
        state.refreshHandle = this.scheduler.schedule(refreshAt, () => {
          this.refreshAuthConfig(session, state).then(
            () => {},
            e => ConsoleUtils.error(`Unexpected error when refreshing JWT access token: ${e as string}`)
          );
        });
        this.updateSessionState(session);
      }
    });
  }

  private async sendCurrentServiceWorkerConfig(session: AuthSession): Promise<void> {
    const now = Date.now();
    const config = (session.authConfigs ?? []).flatMap((state): AuthSwConfigDto => {
      if (
        !this.isServiceWorkerEnabled(state.config) ||
        state.jwt === undefined ||
        state.expiresAt === undefined ||
        state.expiresAt <= now
      ) {
        return [];
      }
      return [
        {
          expires: state.expiresAt,
          headers: [{ key: "Authorization", value: `Bearer ${state.jwt}` }],
          sourceUrlPrefixes: state.config.sourceUrlPrefixes,
          urlPrefix: `${this.getConfigCdnUrl(session.params, state.config)}/${state.config.accountId}/`
        }
      ];
    });
    await this.sendServiceWorkerConfig(
      session,
      config,
      this.isV2Params(session.params) ? session.params.urlRewriteRules : undefined
    );
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

  private async getV2Configs(params: BeginAuthSessionParamsV2): Promise<AuthSessionConfig[]> {
    const configs = await params.authConfigs();
    if (!Array.isArray(configs) || configs.length === 0) {
      throw new Error("The 'authConfigs' callback must return a non-empty array.");
    }
    return configs.map(config =>
      config === null || typeof config !== "object"
        ? config
        : {
            ...config,
            sourceUrlPrefixes: Array.isArray(config.sourceUrlPrefixes)
              ? [...config.sourceUrlPrefixes]
              : config.sourceUrlPrefixes
          }
    );
  }

  private normalizeV1Config(params: BeginAuthSessionParamsV1): AuthSessionConfigAuto {
    return {
      accountId: params.accountId,
      authConfigId: undefined,
      authHeaders: params.authHeaders,
      authUrl: params.authUrl,
      enableCookieAuth: params.serviceWorkerScript === undefined,
      enableServiceWorkerAuth: params.serviceWorkerScript !== undefined
    };
  }

  private validateSessionConfig(
    params: BeginAuthSessionParams,
    configs: AuthSessionConfig[],
    canUseServiceWorkers: boolean,
    requiresServiceWorker: boolean
  ): void {
    const isV2 = this.isV2Params(params);
    if (isV2 && (params.accountId !== undefined || params.authHeaders !== undefined || params.authUrl !== undefined)) {
      throw new Error("V2 auth sessions must use 'authConfigs' instead of top-level auth fields.");
    }

    const ids = new Set<string | undefined>();
    let cookieConfig: AuthSessionConfig | undefined;
    const workerConfigsByPrefix = new Map<string, AuthSessionConfig>();

    for (const config of configs) {
      if (config === null || typeof config !== "object") {
        throw new Error("Each auth configuration must be an object.");
      }
      if (!Object.prototype.hasOwnProperty.call(config, "authConfigId")) {
        throw new Error("Each auth configuration must explicitly provide 'authConfigId'.");
      }
      if (config.authConfigId !== undefined && typeof config.authConfigId !== "string") {
        throw new Error("The 'authConfigId' field must be a string or undefined.");
      }
      if (ids.has(config.authConfigId)) {
        throw new Error(
          config.authConfigId === undefined
            ? "Only one default auth configuration is allowed."
            : `Duplicate auth configuration ID: '${config.authConfigId}'.`
        );
      }
      ids.add(config.authConfigId);

      if (isV2 && !this.isValidAccountId(config.accountId)) {
        throw new Error(`Invalid Bytescale account ID: '${String(config.accountId)}'.`);
      }
      if (config.cdnUrl !== undefined && typeof config.cdnUrl !== "string") {
        throw new Error("The 'cdnUrl' field must be a string when provided.");
      }
      if (
        (config.enableCookieAuth !== undefined && typeof config.enableCookieAuth !== "boolean") ||
        (config.enableServiceWorkerAuth !== undefined && typeof config.enableServiceWorkerAuth !== "boolean")
      ) {
        throw new Error("Authentication enablement flags must be booleans when provided.");
      }
      if (
        config.sourceUrlPrefixes !== undefined &&
        (!Array.isArray(config.sourceUrlPrefixes) ||
          !config.sourceUrlPrefixes.every(prefix => typeof prefix === "string"))
      ) {
        throw new Error("The 'sourceUrlPrefixes' field must be an array of strings.");
      }

      const isManual = typeof config.getAuthorizationToken === "function";
      const isAutomatic = typeof config.authUrl === "string" && typeof config.authHeaders === "function";
      if (
        isManual === isAutomatic ||
        (isManual && (config.authUrl !== undefined || config.authHeaders !== undefined))
      ) {
        throw new Error(
          "Each auth configuration must provide either 'getAuthorizationToken' or both 'authUrl' and 'authHeaders'."
        );
      }

      if (config.enableCookieAuth === true) {
        if (cookieConfig !== undefined) {
          throw new Error("Only one auth configuration may enable cookie authentication.");
        }
        cookieConfig = config;
      }

      if (this.isServiceWorkerEnabled(config)) {
        const prefix = `${this.getConfigCdnUrl(params, config)}/${config.accountId}/`;
        if (workerConfigsByPrefix.has(prefix)) {
          throw new Error(`Multiple service-worker auth configurations target the same URL prefix: '${prefix}'.`);
        }
        workerConfigsByPrefix.set(prefix, config);
      }
    }

    if (cookieConfig !== undefined) {
      const prefix = `${this.getConfigCdnUrl(params, cookieConfig)}/${cookieConfig.accountId}/`;
      const workerConfig = workerConfigsByPrefix.get(prefix);
      if (workerConfig !== undefined && workerConfig !== cookieConfig) {
        throw new Error(
          "Cookie and service-worker authentication cannot target the same account from different configs."
        );
      }
    }

    if (isV2) {
      this.validateUrlRewriteRules(params.urlRewriteRules);
      if (requiresServiceWorker && params.serviceWorkerScript === undefined) {
        throw new Error(
          "The 'serviceWorkerScript' field is required when service-worker authentication or URL rewriting is enabled."
        );
      }
      if (requiresServiceWorker && !canUseServiceWorkers) {
        throw new Error("This auth session requires service workers, but this browser does not support them.");
      }
    }
  }

  private validateUrlRewriteRules(rules: UrlRewriteRule[] | undefined): void {
    if (
      rules !== undefined &&
      (!Array.isArray(rules) ||
        !rules.every(
          rule =>
            rule !== null &&
            typeof rule === "object" &&
            typeof rule.fromUrlPrefix === "string" &&
            typeof rule.toUrlPrefix === "string"
        ))
    ) {
      throw new Error("The 'urlRewriteRules' field must be an array of URL rewrite rules.");
    }
  }

  private updateSessionState(session: AuthSession): void {
    const configs = session.authConfigs ?? [];
    const defaultConfig = configs.find(state => state.config.authConfigId === undefined);
    const exposeLegacyDefault = !this.isV2Params(session.params);
    session.accessToken =
      exposeLegacyDefault && defaultConfig !== undefined && this.isConfigUsable(defaultConfig)
        ? defaultConfig.accessToken
        : undefined;
    session.accessTokenRefreshHandle = exposeLegacyDefault ? defaultConfig?.refreshHandle : undefined;
    session.isReady =
      configs.length > 0 &&
      configs.every(state => this.isConfigUsable(state)) &&
      (session.authServiceWorker === undefined || session.serviceWorkerConfigured === true);
  }

  private isConfigUsable(state: AuthSessionConfigState | undefined): boolean {
    return state?.accessToken !== undefined && state.expiresAt !== undefined && state.expiresAt > Date.now();
  }

  private isServiceWorkerEnabled(config: AuthSessionConfig): boolean {
    return config.enableServiceWorkerAuth !== false;
  }

  private isV2Params(params: BeginAuthSessionParams): params is BeginAuthSessionParamsV2 {
    return typeof (params as BeginAuthSessionParamsV2).authConfigs === "function";
  }

  private isValidAccountId(accountId: unknown): accountId is string {
    return typeof accountId === "string" && /^[1-9A-HJ-NP-Za-km-z]{7}$/.test(accountId);
  }

  private shouldSetCookie(session: AuthSession, config: AuthSessionConfig): boolean {
    return this.isV2Params(session.params) ? config.enableCookieAuth === true : session.authServiceWorker === undefined;
  }

  private async waitForServiceWorker(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private getAccessTokenUrl(cdnUrl: string, accountId: string, setCookie: boolean): string {
    return `${cdnUrl}/api/v1/access_tokens/${accountId}?set-cookie=${setCookie ? "true" : "false"}`;
  }

  private getCdnUrl(params: BeginAuthSessionParams): string {
    return BytescaleApiClientConfigUtils.getCdnUrl(params.options ?? {});
  }

  private getConfigCdnUrl(params: BeginAuthSessionParams, config: AuthSessionConfig): string {
    return BytescaleApiClientConfigUtils.getCdnUrl({ cdnUrl: config.cdnUrl ?? params.options?.cdnUrl });
  }

  private async deleteAccessToken(
    options: BeginAuthSessionParams["options"],
    cdnUrl: string,
    accountId: string
  ): Promise<void> {
    await BaseAPI.fetch(
      this.getAccessTokenUrl(cdnUrl, accountId, true),
      {
        method: "DELETE",
        credentials: "include",
        headers: {}
      },
      {
        isBytescaleApi: true,
        fetchApi: options?.fetchApi
      }
    );
  }

  private async setAccessToken(
    options: BeginAuthSessionParams["options"],
    cdnUrl: string,
    accountId: string,
    jwt: string,
    setCookie: boolean
  ): Promise<SetAccessTokenResponseDto> {
    const request: SetAccessTokenRequestDto = { accessToken: jwt };
    const response = await BaseAPI.fetch(
      this.getAccessTokenUrl(cdnUrl, accountId, setCookie),
      {
        method: "PUT",
        credentials: "include",
        headers: { [this.contentType]: this.contentTypeJson },
        body: JSON.stringify(request)
      },
      {
        isBytescaleApi: true,
        fetchApi: options?.fetchApi
      }
    );
    const result = (await response.json()) as SetAccessTokenResponseDto;
    if (
      typeof result.accessToken !== "string" ||
      result.accessToken.length === 0 ||
      typeof result.ttlSeconds !== "number" ||
      !Number.isFinite(result.ttlSeconds) ||
      result.ttlSeconds <= 0
    ) {
      throw new Error("Bytescale returned an invalid access-token registration response.");
    }
    return result;
  }

  private async getAuthorizationToken(params: BeginAuthSessionParams, config: AuthSessionConfig): Promise<string> {
    if (typeof config.getAuthorizationToken === "function") {
      return this.validateJwt(await config.getAuthorizationToken(), "The 'getAuthorizationToken' callback");
    }

    const endpointName = "Your auth API endpoint";
    const result = await BaseAPI.fetch(
      config.authUrl,
      { method: "GET", headers: await config.authHeaders() },
      {
        isBytescaleApi: false,
        fetchApi: params.options?.fetchApi
      }
    );
    const actualContentType = result.headers.get(this.contentType) ?? "";
    if (actualContentType.split(";")[0] !== this.contentTypeText) {
      throw new Error(
        `${endpointName} returned "${actualContentType}" for the ${this.contentType} response header, but the Bytescale SDK requires "${this.contentTypeText}".`
      );
    }
    return this.validateJwt(await result.text(), endpointName);
  }

  private validateJwt(jwt: unknown, source: string): string {
    if (typeof jwt !== "string" || jwt.length === 0) {
      throw new InvalidAuthTokenError(
        `${source} returned an empty or malformed token. Please return a valid JWT instead.`
      );
    }
    if (jwt.trim().length !== jwt.length) {
      throw new InvalidAuthTokenError(`${source} returned whitespace around the JWT, please remove it.`);
    }
    const parts = jwt.split(".");
    if (parts.length !== 3 || parts.some(part => part.length === 0 || !/^[A-Za-z0-9_-]+$/.test(part))) {
      throw new InvalidAuthTokenError(`${source} returned a malformed JWT.`);
    }
    return jwt;
  }
}

/** Alternative to a static class that allows the implementation to satisfy an interface. */
export const AuthManager = new AuthManagerImpl(new ServiceWorkerUtils<AuthSwSetConfigDto>());
export { BeginAuthSessionParamsV1 } from "../../private/model/BeginAuthSessionParamsV1";
export { BeginAuthSessionParamsV2 } from "../../private/model/BeginAuthSessionParamsV2";
export { BeginAuthSessionParams } from "../../private/model/BeginAuthSessionParams";
export { AuthSessionConfigAuto } from "../../private/model/AuthSessionConfigAuto";
export { AuthSessionConfigManual } from "../../private/model/AuthSessionConfigManual";
export { AuthSessionConfig } from "../../private/model/AuthSessionConfig";
export { AuthSessionConfigBase } from "../../private/model/AuthSessionConfigBase";
export { UrlRewriteRule } from "../../private/model/UrlRewriteRule";
export { NonEmptyArray } from "../../private/model/NonEmptyArray";
export { BeginAuthSessionParamsOptions } from "../../private/model/BeginAuthSessionParamsOptions";
