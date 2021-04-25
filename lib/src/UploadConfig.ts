export interface UploadConfig {
  apiKey: string;
  internal?: UploadInternalConfig;
  logging?: boolean;
}

/**
 * Undocumented (and unsupported) config
 */
export interface UploadInternalConfig {
  apiUrl?: string;
  cdnUrl?: string;
}
