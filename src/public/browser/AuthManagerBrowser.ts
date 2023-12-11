import { AuthManagerInterface, BeginAuthSessionParams } from "../../private/model/AuthManagerInterface";
import { AuthSessionState } from "../../private/AuthSessionState";
import { ConsoleUtils } from "../../private/ConsoleUtils";
import { BaseAPI, BytescaleApiClientConfigUtils } from "../shared/generated";
import { AuthSession } from "../../private/model/AuthSession";
import { SetAccessTokenRequestDto } from "../../private/dtos/SetAccessTokenRequestDto";
import { SetAccessTokenResponseDto } from "../../private/dtos/SetAccessTokenResponseDto";
import { AuthSwSetConfigDto } from "../../private/dtos/AuthSwSetConfigDto";
import { AuthSwConfigDto } from "../../private/dtos/AuthSwConfigDto";
import { ServiceWorkerUtils } from "../../private/ServiceWorkerUtils";

class AuthManagerImpl implements AuthManagerInterface {
  private readonly authSessionMutex;
  private readonly contentType = "content-type";
  private readonly contentTypeJson = "application/json";
  private readonly contentTypeText = "text/plain";
  private readonly minJwtTtlSeconds = 10;
  private readonly maxJwtTtlSeconds = 2147483; // Max value for window.setTimeout is 2147483647ms -- if we go over this, the timeout fires immediately.
  private readonly retryAuthAfterErrorSeconds = 5;
  private readonly refreshBeforeExpirySeconds = 20;

  constructor(private readonly serviceWorkerUtils: ServiceWorkerUtils) {
    this.authSessionMutex = AuthSessionState.getMutex();
  }

  isAuthSessionActive(): boolean {
    return AuthSessionState.getSession() !== undefined;
  }

  async beginAuthSession(params: BeginAuthSessionParams): Promise<void> {
    const session = await this.authSessionMutex.safe(async () => {
      // We check both 'session' and 'sessionDisposing' here, as we don't want to call 'beginAuthSession' until the session is fully disposed.
      if (this.isAuthSessionActive()) {
        throw new Error(
          "Auth session already active. Please call 'await endAuthSession()' and then call 'await beginAuthSession(...)' to start a new auth session."
        );
      }

      const serviceWorkerScriptField: keyof BeginAuthSessionParams = "serviceWorkerScript";
      const newSession: AuthSession = {
        accessToken: undefined,
        accessTokenRefreshHandle: undefined,
        params,
        isActive: true,
        authServiceWorker: await this.serviceWorkerUtils.registerServiceWorkerIfSupported(
          params.serviceWorkerScript,
          serviceWorkerScriptField,
          "Falling back to Bytescale CDN cookies for auth. These are third-party cookies, which some modern browsers block."
        )
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
      await this.setServiceWorkerConfig(session, []); // Prevent service worker from authorizing subsequent requests.
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
        const setCookie = !this.isUsingServiceWorker(session);

        const setTokenResult = await this.setAccessToken(session.params, jwt, setCookie);

        await this.setServiceWorkerConfig(session, [
          {
            headers: [{ key: "Authorization", value: `Bearer ${jwt}` }],
            expires: Date.now() + setTokenResult.ttlSeconds * 1000,
            urlPrefix: `${this.getCdnUrl(session.params)}/${session.params.accountId}/`
          }
        ]);

        const desiredTtl = setTokenResult.ttlSeconds - this.refreshBeforeExpirySeconds;
        timeout = Math.max(desiredTtl, this.minJwtTtlSeconds);
        if (desiredTtl !== timeout) {
          ConsoleUtils.warn(`JWT expiration is too short: waiting for ${timeout} seconds before refreshing.`);
        }

        // There's no need to print a warning for this: it's OK to silently request the JWT before it expires. Also, this is 24 days in this case!
        timeout = Math.min(timeout, this.maxJwtTtlSeconds);

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

  private isUsingServiceWorker(session: AuthSession): boolean {
    return session.authServiceWorker !== undefined;
  }

  private async setServiceWorkerConfig(session: AuthSession, config: AuthSwConfigDto): Promise<void> {
    if (session.authServiceWorker === undefined) {
      return undefined;
    }
    // We re-fetch the latest active worker, as another tab may have registered a new one, and then the tab may be closed,
    // leaving us as the only open tab but with an old and ineffective service worker reference.
    const serviceWorker = await this.serviceWorkerUtils.getActiveServiceWorkerElseRegister(session.authServiceWorker);
    const message: AuthSwSetConfigDto = {
      type: "SET_BYTESCALE_AUTH_CONFIG",
      config
    };
    serviceWorker.postMessage(message);
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
export const AuthManager = new AuthManagerImpl(new ServiceWorkerUtils());
