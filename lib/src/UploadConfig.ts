export interface UploadConfig {
  apiKey: string;
  debug?: boolean;
  internal?: UploadInternalConfig;
}

/**
 * Undocumented (and unsupported) config for internal use only.
 */
export type UploadInternalConfig = (
  | {
      authenticateWithApiKey?: true;
    }
  | {
      accountId: string;
      authenticateWithApiKey: false;
      headers: () => Promise<Record<string, string>>;
    }
) &
  UploadInternalConfigBase;

export interface UploadInternalConfigBase {
  apiUrl?: string;
  cdnUrl?: string;
  headers?: () => Promise<Record<string, string>>;
}
