import { AuthManagerInterface, BeginAuthSessionParams } from "../../private/model/AuthManagerInterface";
import { AuthSessionState } from "../../private/AuthSessionState";
import { ConsoleUtils } from "../../private/ConsoleUtils";
import { BaseAPI, BytescaleApiClientConfigUtils } from "../shared/generated";
import { AuthSession } from "../../private/model/AuthSession";
import { SetAccessTokenRequestDto } from "../../private/dtos/SetAccessTokenRequestDto";
import { SetAccessTokenResponseDto } from "../../private/dtos/SetAccessTokenResponseDto";

class AuthManagerImpl implements AuthManagerInterface {
  private readonly authSessionMutex;
  private readonly contentType = "content-type";
  private readonly contentTypeJson = "application/json";
  private readonly contentTypeText = "text/plain";
  private readonly minJwtTtlSeconds = 10;
  private readonly maxJwtTtlSeconds = 2147483; // Max value for window.setTimeout is 2147483647ms -- if we go over this, the timeout fires immediately.
  private readonly retryAuthAfterErrorSeconds = 5;
  private readonly refreshBeforeExpirySeconds = 20;

  constructor() {
    this.authSessionMutex = AuthSessionState.getMutex();
  }

  isAuthSessionActive(): boolean {
    return AuthSessionState.getSession() !== undefined;
  }

  async beginAuthSession(params: BeginAuthSessionParams): Promise<void> {
    const newSession: AuthSession = {
      accessToken: undefined,
      accessTokenRefreshHandle: undefined,
      params,
      isActive: true
    };

    await this.authSessionMutex.safe(async () => {
      // We check both 'session' and 'sessionDisposing' here, as we don't want to call 'beginAuthSession' until the session is fully disposed.
      if (this.isAuthSessionActive()) {
        throw new Error(
          "Auth session already active. Please call 'await endAuthSession()' and then call 'await beginAuthSession(...)' to start a new auth session."
        );
      }

      AuthSessionState.setSession(newSession);
    });

    // IMPORTANT: must be called outside the above, else re-entrant deadlock will occur.
    await this.refreshAccessToken(newSession);
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
        const setTokenResult = await this.setAccessToken(session.params, jwt);

        const desiredTtl = setTokenResult.ttlSeconds - this.refreshBeforeExpirySeconds;
        timeout = Math.max(desiredTtl, this.minJwtTtlSeconds);
        if (desiredTtl !== timeout) {
          ConsoleUtils.warn(`JWT expiration is too short: waiting for ${timeout} seconds before refreshing.`);
        }

        // There's need to print a warning for this: it's OK to silently request the JWT before it expires. Also, this is 24 days in this case!
        timeout = Math.min(timeout, this.maxJwtTtlSeconds);

        session.accessToken = setTokenResult.accessToken;
      } catch (e) {
        // Use 'error' instead of 'debug' so that the user sees error messages.
        ConsoleUtils.error(`Error when refreshing access token: ${e as string}`);
      } finally {
        session.accessTokenRefreshHandle = window.setTimeout(() => {
          this.refreshAccessToken(session).then(
            () => {},
            e => ConsoleUtils.error(`Unexpected error when refreshing access token: ${e as string}`)
          );
        }, timeout * 1000);
      }
    });
  }

  private getAccessTokenUrl(params: BeginAuthSessionParams): string {
    const cdnUrl = BytescaleApiClientConfigUtils.getCdnUrl(params.options ?? {});
    return `${cdnUrl}/api/v1/access_tokens/${params.accountId}`;
  }

  private async deleteAccessToken(params: BeginAuthSessionParams): Promise<void> {
    await BaseAPI.fetch(
      this.getAccessTokenUrl(params),
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

  private async setAccessToken(params: BeginAuthSessionParams, jwt: string): Promise<SetAccessTokenResponseDto> {
    const request: SetAccessTokenRequestDto = {
      accessToken: jwt
    };
    const response = await BaseAPI.fetch(
      this.getAccessTokenUrl(params),
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
export const AuthManager = new AuthManagerImpl();
