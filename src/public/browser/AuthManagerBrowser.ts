import { AuthManagerInterface, BeginAuthSessionParams } from "../../private/model/AuthManagerInterface";
import { AuthSessionState } from "../../private/AuthSessionState";
import { ConsoleUtils } from "../../private/ConsoleUtils";
import { BaseAPI, BytescaleApiClientConfigUtils } from "../shared/generated";
import { AuthSession } from "../../private/model/AuthSession";
import { SetAccessTokenRequestDto } from "../../private/dtos/SetAccessTokenRequestDto";
import { SetAccessTokenResponseDto } from "../../private/dtos/SetAccessTokenResponseDto";
import { AuthSwSetConfigDto } from "../../private/dtos/AuthSwSetConfigDto";
import { ServiceWorkerUtils } from "../../private/ServiceWorkerUtils";

class AuthManagerImpl implements AuthManagerInterface {
  private readonly authSessionMutex;
  private readonly serviceWorkerScriptFieldName: keyof BeginAuthSessionParams = "serviceWorkerScript";
  private readonly contentType = "content-type";
  private readonly contentTypeJson = "application/json";
  private readonly contentTypeText = "text/plain";
  private readonly minJwtTtlSeconds = 10;
  private readonly maxJwtTtlSeconds = 2147483; // Max value for window.setTimeout is 2147483647ms -- if we go over this, the timeout fires immediately.
  private readonly retryAuthAfterErrorSeconds = 5;
  private readonly refreshBeforeExpirySeconds = 20;

  constructor(private readonly serviceWorkerUtils: ServiceWorkerUtils<AuthSwSetConfigDto>) {
    this.authSessionMutex = AuthSessionState.getMutex();
  }

  isAuthSessionActive(): boolean {
    return AuthSessionState.getSession() !== undefined;
  }

  isAuthSessionReady(): boolean {
    return AuthSessionState.getSession()?.accessToken !== undefined;
  }

  async beginAuthSession(params: BeginAuthSessionParams): Promise<void> {
    const session = await this.authSessionMutex.safe(async () => {
      // We check both 'session' and 'sessionDisposing' here, as we don't want to call 'beginAuthSession' until the session is fully disposed.
      if (this.isAuthSessionActive()) {
        throw new Error(
          "Auth session already active. Please call 'await endAuthSession()' and then call 'await beginAuthSession(...)' to start a new auth session."
        );
      }

      const newSession: AuthSession = {
        accessToken: undefined,
        accessTokenRefreshHandle: undefined,
        params,
        isActive: true,
        authServiceWorker:
          params.serviceWorkerScript !== undefined && this.serviceWorkerUtils.canUseServiceWorkers()
            ? {
                serviceWorkerScript: params.serviceWorkerScript,
                type: "Uninitialized"
              }
            : undefined
      };

      AuthSessionState.setSession(newSession);

      return newSession;
    });

    // IMPORTANT: must be called outside the above, else re-entrant deadlock will occur.
    await this.refreshAccessToken(session);
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
        clearTimeout(session.accessTokenRefreshHandle);
      }

      await this.deleteAccessToken(session.params);

      if (session.authServiceWorker !== undefined) {
        // Prevent service worker from authorizing subsequent requests.
        await this.serviceWorkerUtils.sendMessage(
          { type: "SET_BYTESCALE_AUTH_CONFIG", config: [] },
          session.authServiceWorker,
          this.serviceWorkerScriptFieldName
        );
      }
    });
  }

  private async refreshAccessToken(session: AuthSession): Promise<void> {
    await this.authSessionMutex.safe(async () => {
      if (!session.isActive) {
        return;
      }

      let timeout = this.retryAuthAfterErrorSeconds;

      try {
        const jwt = await this.getAccessToken(session.params, await session.params.authHeaders());

        // We don't use cookie-based auth if the browser supports service worker-based auth, as using both will cause
        // confusion for us in the future (i.e. we may question "do we need to use both together? was there a reason?").
        // Also: if the user has omitted "allowedOrigins" from their JWT, then service worker-based auth is more secure
        // than cookie-based auth, which is another reason to prevent these cookies from being set unless required.
        const setCookie = session.authServiceWorker === undefined;

        const setTokenResult = await this.setAccessToken(session.params, jwt, setCookie);

        if (session.authServiceWorker !== undefined) {
          await this.serviceWorkerUtils.sendMessage(
            {
              type: "SET_BYTESCALE_AUTH_CONFIG",
              config: [
                {
                  headers: [{ key: "Authorization", value: `Bearer ${jwt}` }],
                  expires: Date.now() + setTokenResult.ttlSeconds * 1000,
                  urlPrefix: `${this.getCdnUrl(session.params)}/${session.params.accountId}/`
                }
              ]
            },
            session.authServiceWorker,
            this.serviceWorkerScriptFieldName
          );

          // Allow time for the service worker to receive and process the message. Since this is asynchronous and not
          // synchronized, we need to wait for a sufficient amount of time to ensure the service worker is ready to
          // authenticate requests, so that after 'beginAuthSession' completes, users can start making requests.
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const desiredTtl = setTokenResult.ttlSeconds - this.refreshBeforeExpirySeconds;
        timeout = Math.max(desiredTtl, this.minJwtTtlSeconds);
        if (desiredTtl !== timeout) {
          ConsoleUtils.warn(`JWT expiration is too short: waiting for ${timeout} seconds before refreshing.`);
        }

        // There's no need to print a warning for this: it's OK to silently request the JWT before it expires. Also, this is 24 days in this case!
        timeout = Math.min(timeout, this.maxJwtTtlSeconds);

        // Set this at the end, as it's also used to signal 'isAuthSessionReady', so must be set after configuring the Service Worker, etc.
        session.accessToken = setTokenResult.accessToken;
      } catch (e) {
        // Use 'warn' instead of 'error' since this happens frequently, i.e. user goes through a tunnel, and some customers report these errors to systems like Sentry, so we don't want to spam.
        ConsoleUtils.warn(`Unable to refresh JWT access token: ${e as string}`);
      } finally {
        session.accessTokenRefreshHandle = window.setTimeout(() => {
          this.refreshAccessToken(session).then(
            () => {},
            // Should not occur, as this method shouldn't throw errors.
            e => ConsoleUtils.error(`Unexpected error when refreshing JWT access token: ${e as string}`)
          );
        }, timeout * 1000);
      }
    });
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
