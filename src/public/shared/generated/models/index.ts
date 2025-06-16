/* tslint:disable */
/* eslint-disable */
/**
 *
 * @export
 */
export type AccountJobStatus =
  | "Created"
  | "Pending"
  | "Running"
  | "Rollback"
  | "Failed"
  | "Succeeded"
  | "Cancelling"
  | "Cancelled";
/**
 * Job type.
 * @export
 */
export type AccountJobType =
  | "ProcessImageJob"
  | "ProcessVideoJob"
  | "ProcessAudioJob"
  | "AntivirusJob"
  | "ResetCacheJob"
  | "DeleteFolderBatchJob"
  | "DeleteFileBatchJob"
  | "CopyFolderBatchJob"
  | "CopyFileBatchJob";
/**
 * Response body from an API endpoint that performs work asynchronously (i.e. does not complete the work immediately).
 * @export
 * @interface AsyncResponse
 */
export interface AsyncResponse {
  /**
   * Link to the documentation that describes how to get a job's status from its job ID.
   * @type {string}
   * @memberof AsyncResponse
   */
  jobDocs: AsyncResponseJobDocsEnum;
  /**
   * Job ID.
   * @type {string}
   * @memberof AsyncResponse
   */
  jobId: string;
  /**
   *
   * @type {AccountJobType}
   * @memberof AsyncResponse
   */
  jobType: AccountJobType;
  /**
   * URL for the job's status.
   *
   * You can `GET` this URL to retrieve the job's status.
   *
   * You must authorize your `GET` request with a ```secret_*``` API key when accessing the URL.
   * @type {string}
   * @memberof AsyncResponse
   */
  jobUrl: string;
}

/**
 * @export
 */
export type AsyncResponseJobDocsEnum = "https://www.bytescale.com/docs/job-api/GetJob";

/**
 * AWS Region.
 * @export
 */
export type AwsRegion =
  | "us-east-2"
  | "us-east-1"
  | "us-west-1"
  | "us-west-2"
  | "af-south-1"
  | "ap-east-1"
  | "ap-south-2"
  | "ap-southeast-3"
  | "ap-southeast-4"
  | "ap-south-1"
  | "ap-northeast-3"
  | "ap-northeast-2"
  | "ap-southeast-1"
  | "ap-southeast-2"
  | "ap-northeast-1"
  | "ca-central-1"
  | "ca-west-1"
  | "eu-central-1"
  | "eu-west-1"
  | "eu-west-2"
  | "eu-south-1"
  | "eu-west-3"
  | "eu-south-2"
  | "eu-north-1"
  | "eu-central-2"
  | "il-central-1"
  | "me-south-1"
  | "me-central-1"
  | "sa-east-1";
/**
 *
 * @export
 * @interface AzureReadOnlyStorage
 */
export interface AzureReadOnlyStorage {
  /**
   *
   * @type {PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage}
   * @memberof AzureReadOnlyStorage
   */
  azureStorage: PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage;
  /**
   *
   * @type {AzureReadOnlyStorageCredentials}
   * @memberof AzureReadOnlyStorage
   */
  credentials: AzureReadOnlyStorageCredentials;
  /**
   *
   * @type {string}
   * @memberof AzureReadOnlyStorage
   */
  type: AzureReadOnlyStorageTypeEnum;
  /**
   *
   * @type {boolean}
   * @memberof AzureReadOnlyStorage
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type AzureReadOnlyStorageTypeEnum = "AzureReadOnly";

/**
 *
 * @export
 * @interface AzureReadOnlyStorageCredentials
 */
export interface AzureReadOnlyStorageCredentials {
  /**
   * Query string without the leading "?" character.
   * @type {string}
   * @memberof AzureReadOnlyStorageCredentials
   */
  sasToken: string;
}
/**
 * Response body for BasicUpload.
 * @export
 * @interface BasicUploadResponse
 */
export interface BasicUploadResponse {
  /**
   * Your account ID.
   *
   * This is visible on the settings page:
   *
   * https://www.bytescale.com/dashboard/settings
   * @type {string}
   * @memberof BasicUploadResponse
   */
  accountId: string;
  /**
   * The file's ETag, short for "entity tag", reflects the file's version and changes whenever the file is modified.
   * @type {string}
   * @memberof BasicUploadResponse
   */
  etag: string;
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof BasicUploadResponse
   */
  filePath: string;
  /**
   * URL for a raw file hosted on the Bytescale CDN.
   * @type {string}
   * @memberof BasicUploadResponse
   */
  fileUrl: string;
}
/**
 * Request body for BeginMultipartUpload.
 * @export
 * @interface BeginMultipartUploadRequest
 */
export interface BeginMultipartUploadRequest {
  /**
   * The file metadata specified in the original upload request as a JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof BeginMultipartUploadRequest
   */
  metadata?: { [key: string]: any };
  /**
   * File MIME type.
   * @type {string}
   * @memberof BeginMultipartUploadRequest
   */
  mime?: string;
  /**
   * The file's original name on the user's device.
   * @type {string}
   * @memberof BeginMultipartUploadRequest
   */
  originalFileName?: string;
  /**
   *
   * @type {FilePathDefinition}
   * @memberof BeginMultipartUploadRequest
   */
  path?: FilePathDefinition;
  /**
   *
   * @type {MultipartUploadProtocol}
   * @memberof BeginMultipartUploadRequest
   */
  protocol?: MultipartUploadProtocol;
  /**
   * Size in bytes.
   * @type {number}
   * @memberof BeginMultipartUploadRequest
   */
  size: number;
  /**
   * The file tags to store against the file.
   *
   * When you associate file tags with a file, Bytescale checks which rules match the tags (if any) and applies those rules to the upload request:
   *
   * Rules can include max file size checks, traffic limit checks, rate limit checks, and so forth. These are configured in the Bytescale Dashboard.
   * @type {Array<string>}
   * @memberof BeginMultipartUploadRequest
   */
  tags?: Array<string>;
}
/**
 * Response body for BeginMultipartUpload.
 * @export
 * @interface BeginMultipartUploadResponse
 */
export interface BeginMultipartUploadResponse {
  /**
   *
   * @type {FileDetails}
   * @memberof BeginMultipartUploadResponse
   */
  file: FileDetails;
  /**
   * The ID for the multipart file upload.
   * @type {string}
   * @memberof BeginMultipartUploadResponse
   */
  uploadId: string;
  /**
   *
   * @type {BeginMultipartUploadResponseUploadParts}
   * @memberof BeginMultipartUploadResponse
   */
  uploadParts: BeginMultipartUploadResponseUploadParts;
}
/**
 *
 * @export
 * @interface BeginMultipartUploadResponseUploadParts
 */
export interface BeginMultipartUploadResponseUploadParts {
  /**
   *
   * @type {UploadPart}
   * @memberof BeginMultipartUploadResponseUploadParts
   */
  first: UploadPart;
  /**
   * The number of parts the file will be uploaded with.
   * @type {number}
   * @memberof BeginMultipartUploadResponseUploadParts
   */
  count: number;
}
/**
 * @type CompleteMultipartUploadResponse
 * Response body for CompleteUploadPart.
 * @export
 */
export type CompleteMultipartUploadResponse =
  | CompleteMultipartUploadResponseCompleted
  | CompleteMultipartUploadResponsePending;
/**
 * Response body for CompleteUploadPart when the final upload part is marked as completed.
 * @export
 * @interface CompleteMultipartUploadResponseCompleted
 */
export interface CompleteMultipartUploadResponseCompleted {
  /**
   * The file's ETag, short for "entity tag", reflects the file's version and changes whenever the file is modified.
   * @type {string}
   * @memberof CompleteMultipartUploadResponseCompleted
   */
  etag: string;
  /**
   *
   * @type {string}
   * @memberof CompleteMultipartUploadResponseCompleted
   */
  status: CompleteMultipartUploadResponseCompletedStatusEnum;
}

/**
 * @export
 */
export type CompleteMultipartUploadResponseCompletedStatusEnum = "Completed";

/**
 * Response body for CompleteUploadPart when additional upload parts still need to be marked as completed.
 * @export
 * @interface CompleteMultipartUploadResponsePending
 */
export interface CompleteMultipartUploadResponsePending {
  /**
   *
   * @type {string}
   * @memberof CompleteMultipartUploadResponsePending
   */
  status: CompleteMultipartUploadResponsePendingStatusEnum;
}

/**
 * @export
 */
export type CompleteMultipartUploadResponsePendingStatusEnum = "Pending";

/**
 * Request body for CompleteUploadPart.
 * @export
 * @interface CompleteUploadPartRequest
 */
export interface CompleteUploadPartRequest {
  /**
   * The file's ETag, short for "entity tag", reflects the file's version and changes whenever the file is modified.
   * @type {string}
   * @memberof CompleteUploadPartRequest
   */
  etag: string;
}
/**
 * Request body for CopyFileBatch.
 * @export
 * @interface CopyFileBatchRequest
 */
export interface CopyFileBatchRequest {
  /**
   * Files to copy.
   * @type {Array<CopyFileRequest>}
   * @memberof CopyFileBatchRequest
   */
  files: Array<CopyFileRequest>;
}
/**
 * Request body for CopyFile.
 * @export
 * @interface CopyFileRequest
 */
export interface CopyFileRequest {
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof CopyFileRequest
   */
  destination: string;
  /**
   *
   * @type {CopyableFileDataFileMetadata}
   * @memberof CopyFileRequest
   */
  metadata?: CopyableFileDataFileMetadata;
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof CopyFileRequest
   */
  source: string;
  /**
   *
   * @type {CopyableFileDataFileTagNameArray}
   * @memberof CopyFileRequest
   */
  tags?: CopyableFileDataFileTagNameArray;
}
/**
 * Response body for CopyFile.
 * @export
 * @interface CopyFileResponse
 */
export interface CopyFileResponse {
  /**
   *
   * @type {FileCopyStatusCopied}
   * @memberof CopyFileResponse
   */
  status: FileCopyStatusCopied;
}
/**
 * Request body for CopyFolderBatch.
 * @export
 * @interface CopyFolderBatchRequest
 */
export interface CopyFolderBatchRequest {
  /**
   * Folders to copy.
   * @type {Array<CopyFolderRequest>}
   * @memberof CopyFolderBatchRequest
   */
  folders: Array<CopyFolderRequest>;
}
/**
 * Request body for CopyFolder.
 * @export
 * @interface CopyFolderRequest
 */
export interface CopyFolderRequest {
  /**
   * If `true` then copies files.
   *
   * Default: true
   * @type {boolean}
   * @memberof CopyFolderRequest
   */
  copyFiles?: boolean;
  /**
   *
   * If `false` then if a file's parent folder has overridden storage settings, the file won't be copied.
   *
   * If you don't use folders with custom storage settings (like AWS S3 buckets), you don't need to worry about this setting.
   *
   * Conditional: `copyVirtualFolders` and `copyOverriddenStorage` cannot both be `true`.
   *
   * Default: false
   * @type {boolean}
   * @memberof CopyFolderRequest
   */
  copyOverriddenStorage?: boolean;
  /**
   * If `true` then copies virtual folders at the current path and below (virtual folders are folders created using the PutFolder operation).
   *
   * If `false` then virtual folders will not be copied, meaning no folder settings will be copied to the destination, but the files of any virtual folders will still be copied if `copyFiles` is set to `true`.
   *
   * Conditional: `copyVirtualFolders` and `copyOverriddenStorage` cannot both be `true`.
   *
   * Default: true
   * @type {boolean}
   * @memberof CopyFolderRequest
   */
  copyVirtualFolders?: boolean;
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof CopyFolderRequest
   */
  destination: string;
  /**
   *
   * @type {CopyableFileDataFileMetadata}
   * @memberof CopyFolderRequest
   */
  metadata?: CopyableFileDataFileMetadata;
  /**
   * If `true` then copies files and folders that are descendants of the `source` folder.
   *
   * If `false` then only copies files that are direct children of the `source` folder, and does not copy descendant folders (children or otherwise).
   *
   * Default: true
   * @type {boolean}
   * @memberof CopyFolderRequest
   */
  recursive?: boolean;
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof CopyFolderRequest
   */
  source: string;
  /**
   *
   * @type {CopyableFileDataFileTagNameArray}
   * @memberof CopyFolderRequest
   */
  tags?: CopyableFileDataFileTagNameArray;
}
/**
 *
 * @export
 * @interface CopyableFileDataFileMetadata
 */
export interface CopyableFileDataFileMetadata {
  /**
   * If `true` then merges `value` with the settings from the original file, giving precedence to `value`.
   *
   * If `false` then uses `value` as-is, ignoring the settings from the original file.
   *
   * Default: false
   * @type {boolean}
   * @memberof CopyableFileDataFileMetadata
   */
  merge?: boolean;
  /**
   * The file metadata specified in the original upload request as a JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof CopyableFileDataFileMetadata
   */
  value?: { [key: string]: any };
}
/**
 *
 * @export
 * @interface CopyableFileDataFileTagNameArray
 */
export interface CopyableFileDataFileTagNameArray {
  /**
   * If `true` then merges `value` with the settings from the original file, giving precedence to `value`.
   *
   * If `false` then uses `value` as-is, ignoring the settings from the original file.
   *
   * Default: false
   * @type {boolean}
   * @memberof CopyableFileDataFileTagNameArray
   */
  merge?: boolean;
  /**
   * The value to set into the field.
   *
   * Default: empty object / empty array
   * @type {Array<string>}
   * @memberof CopyableFileDataFileTagNameArray
   */
  value?: Array<string>;
}
/**
 *
 * @export
 * @interface CopyableFileDataForArtifactsFileMetadata
 */
export interface CopyableFileDataForArtifactsFileMetadata {
  /**
   * If `true` then merges `value` with the settings from the original file, giving precedence to `value`.
   *
   * If `false` then uses `value` as-is, ignoring the settings from the original file.
   *
   * Default: false
   * @type {boolean}
   * @memberof CopyableFileDataForArtifactsFileMetadata
   */
  merge?: boolean;
  /**
   * The file metadata specified in the original upload request as a JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof CopyableFileDataForArtifactsFileMetadata
   */
  value?: { [key: string]: any };
  /**
   * If `true` then sets the `value` for all files generated by the transformation, else only sets the `value` for the root output file.
   *
   * Default: true
   * @type {boolean}
   * @memberof CopyableFileDataForArtifactsFileMetadata
   */
  setForAllArtifacts?: boolean;
}
/**
 *
 * @export
 * @interface CopyableFileDataForArtifactsFileTagNameArray
 */
export interface CopyableFileDataForArtifactsFileTagNameArray {
  /**
   * If `true` then merges `value` with the settings from the original file, giving precedence to `value`.
   *
   * If `false` then uses `value` as-is, ignoring the settings from the original file.
   *
   * Default: false
   * @type {boolean}
   * @memberof CopyableFileDataForArtifactsFileTagNameArray
   */
  merge?: boolean;
  /**
   * The value to set into the field.
   *
   * Default: empty object / empty array
   * @type {Array<string>}
   * @memberof CopyableFileDataForArtifactsFileTagNameArray
   */
  value?: Array<string>;
  /**
   * If `true` then sets the `value` for all files generated by the transformation, else only sets the `value` for the root output file.
   *
   * Default: true
   * @type {boolean}
   * @memberof CopyableFileDataForArtifactsFileTagNameArray
   */
  setForAllArtifacts?: boolean;
}
/**
 * Request body for DeleteFileBatch.
 * @export
 * @interface DeleteFileBatchRequest
 */
export interface DeleteFileBatchRequest {
  /**
   *
   * @type {Array<string>}
   * @memberof DeleteFileBatchRequest
   */
  files: Array<string>;
}
/**
 * Request body for DeleteFolderBatch.
 * @export
 * @interface DeleteFolderBatchRequest
 */
export interface DeleteFolderBatchRequest {
  /**
   * Folders to delete.
   * @type {Array<DeleteFolderRequest>}
   * @memberof DeleteFolderBatchRequest
   */
  folders: Array<DeleteFolderRequest>;
}
/**
 * Request body for DeleteFolder.
 *
 * You can use ListFolder to preview the operation using the `dryRun` parameter.
 *
 * *External storage:* external files are only deleted when you directly delete a file or subfolder of a folder that has external storage configured. If you delete the folder itself, only the mapping is removed.
 * @export
 * @interface DeleteFolderRequest
 */
export interface DeleteFolderRequest {
  /**
   * If `true` then deletes files.
   *
   * Default: true
   * @type {boolean}
   * @memberof DeleteFolderRequest
   */
  deleteFiles?: boolean;
  /**
   * If `true` then deletes virtual folders (virtual folders are folders created using the PutFolder operation).
   *
   * Default: true
   * @type {boolean}
   * @memberof DeleteFolderRequest
   */
  deleteVirtualFolders?: boolean;
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof DeleteFolderRequest
   */
  folderPath: string;
  /**
   * If `true` then deletes files and folder settings that descend `folderPath`.
   *
   * If `false` then only deletes files that are direct children of `folderPath` and only deletes the folder settings of the current folder (if any). Does not delete the folder settings of any child or descendant folders.
   *
   * Default: true
   * @type {boolean}
   * @memberof DeleteFolderRequest
   */
  recursive?: boolean;
}
/**
 * Storage layer used for storing files in a DigitalOcean Space, as opposed to Bytescale's built-in storage.
 *
 * This is a read/write storage layer.
 * @export
 * @interface DigitalOceanStorage
 */
export interface DigitalOceanStorage {
  /**
   *
   * @type {PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket}
   * @memberof DigitalOceanStorage
   */
  bucket: PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket;
  /**
   *
   * @type {DigitalOceanStorageCredentials}
   * @memberof DigitalOceanStorage
   */
  credentials: DigitalOceanStorageCredentials;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof DigitalOceanStorage
   */
  type: DigitalOceanStorageTypeEnum;
  /**
   * If `true` then writes S3 objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes S3 objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof DigitalOceanStorage
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type DigitalOceanStorageTypeEnum = "DigitalOceanSpace";

/**
 *
 * @export
 * @interface DigitalOceanStorageCredentials
 */
export interface DigitalOceanStorageCredentials {
  /**
   * AWS Secret Access Key.
   * @type {string}
   * @memberof DigitalOceanStorageCredentials
   */
  spacesSecretKey: string;
  /**
   * AWS Access Key.
   * @type {string}
   * @memberof DigitalOceanStorageCredentials
   */
  spacesAccessKey: string;
}
/**
 * An object containing a `fileName` and/or `folderPath` field.
 *
 * The `folderPath` may be relative or absolute; paths are relative to the API key's default folder (configured per API key in the Bytescale Dashboard).
 *
 * If a field is omitted, the API key's default values will be used for that field. These are configured per API key via the Bytescale Dashboard.
 *
 * Supports path variables.
 * @export
 * @interface DynamicFilePath
 */
export interface DynamicFilePath {
  /**
   * The file name to upload the file with.
   *
   * Must not contain `/`.
   *
   * Supports path variables.
   * @type {string}
   * @memberof DynamicFilePath
   */
  fileName?: string;
  /**
   * The file name to upload the file with.
   *
   * Must not contain `/`.
   *
   * Supports path variables.
   * @type {string}
   * @memberof DynamicFilePath
   */
  fileNameFallback?: string;
  /**
   * If `true` then path variables like `{UTC_DATE}` in the `fileName` will be replaced. You can escape `{` characters with a `\`.
   *
   * If `false` then path variables like `{UTC_DATE}` in the `fileName` will be taken literally.
   *
   * Default: true
   * @type {boolean}
   * @memberof DynamicFilePath
   */
  fileNameVariablesEnabled?: boolean;
  /**
   * Absolute or relative path to a folder in your Bytescale account's storage.
   *
   * Relative paths are relative to the API key's default folder (configured per API key in the Bytescale Dashboard).
   *
   * Should not end with `/`.
   *
   * Does not support path traversals (e.g. `..`).
   *
   * Supports path variables.
   * @type {string}
   * @memberof DynamicFilePath
   */
  folderPath?: string;
  /**
   * If `true` then path variables like `{UTC_DATE}` in the `folderPath` will be replaced. You can escape `{` characters with a `\`.
   *
   * If `false` then path variables like `{UTC_DATE}` in the `folderPath` will be taken literally.
   *
   * Default: true
   * @type {boolean}
   * @memberof DynamicFilePath
   */
  folderPathVariablesEnabled?: boolean;
}
/**
 * Response body for client-side and server-side errors.
 * @export
 * @interface ErrorResponse
 */
export interface ErrorResponse {
  /**
   *
   * @type {ErrorResponseError}
   * @memberof ErrorResponse
   */
  error: ErrorResponseError;
}
/**
 *
 * @export
 * @interface ErrorResponseError
 */
export interface ErrorResponseError {
  /**
   * Human-readable error message.
   * @type {string}
   * @memberof ErrorResponseError
   */
  message: string;
  /**
   * Additional machine-readable details relating to the error.
   * @type {{ [key: string]: any; }}
   * @memberof ErrorResponseError
   */
  details?: { [key: string]: any };
  /**
   * Machine-readable error code.
   * @type {string}
   * @memberof ErrorResponseError
   */
  code: string;
}
/**
 *
 * @export
 */
export type FileCopyStatusCopied = "Copied";
/**
 * Contains full information about a file, including its file metadata, file tags, original file name, and MIME type.
 * @export
 * @interface FileDetails
 */
export interface FileDetails {
  /**
   * Your account ID.
   *
   * This is visible on the settings page:
   *
   * https://www.bytescale.com/dashboard/settings
   * @type {string}
   * @memberof FileDetails
   */
  accountId: string;
  /**
   * The file's ETag, short for "entity tag", reflects the file's version and changes whenever the file is modified.
   * @type {string}
   * @memberof FileDetails
   */
  etag: string | null;
  /**
   * The file metadata specified in the original upload request as a JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof FileDetails
   */
  metadata: { [key: string]: any };
  /**
   * File MIME type.
   * @type {string}
   * @memberof FileDetails
   */
  mime: string;
  /**
   *
   * @type {string}
   * @memberof FileDetails
   */
  originalFileName: string | null;
  /**
   *
   * @type {Array<string>}
   * @memberof FileDetails
   */
  tags: Array<string>;
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof FileDetails
   */
  filePath: string;
  /**
   * URL for a raw file hosted on the Bytescale CDN.
   * @type {string}
   * @memberof FileDetails
   */
  fileUrl: string;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof FileDetails
   */
  lastModified: number;
  /**
   * Size in bytes.
   * @type {number}
   * @memberof FileDetails
   */
  size: number;
}
/**
 * Permissions relating to the downloading of files at this path.
 * @export
 * @interface FileDownloadGrants
 */
export interface FileDownloadGrants {
  /**
   * An array of transformation URL slug patterns.
   *
   * This array specifies which transformation slugs can be used when downloading files from this location.
   *
   * - Use `"*"` to allow all file downloads.
   *
   * - Use `"raw"` to allow raw/original file downloads.
   *
   * - Use a `*` suffix to allow transformation prefixes. For example: `"thumbnail-*"` will allow `thumbnail-sm` and `thumbnail-lg`.
   *
   * - Use any other value to allow specific transformations. For example: `"thumbnail"` will allow `thumbnail` downloads only.
   *
   * - Use an empty array to indicate no file downloads are allowed.
   * @type {Array<string>}
   * @memberof FileDownloadGrants
   */
  downloadFile: Array<string>;
}
/**
 * @type FilePathDefinition
 * The path to upload the file to.
 * @export
 */
export type FilePathDefinition = DynamicFilePath | string;
/**
 * Summary information about a file (a subset of the FileDetails type).
 * @export
 * @interface FileSummary
 */
export interface FileSummary {
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof FileSummary
   */
  filePath: string;
  /**
   * URL for a raw file hosted on the Bytescale CDN.
   * @type {string}
   * @memberof FileSummary
   */
  fileUrl: string;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof FileSummary
   */
  lastModified: number;
  /**
   * Size in bytes.
   * @type {number}
   * @memberof FileSummary
   */
  size: number;
  /**
   *
   * @type {string}
   * @memberof FileSummary
   */
  type: FileSummaryTypeEnum;
}

/**
 * @export
 */
export type FileSummaryTypeEnum = "File";

/**
 * Full details of a given folder.
 * @export
 * @interface FolderDetails
 */
export interface FolderDetails {
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof FolderDetails
   */
  folderPath: string;
  /**
   *
   * @type {FolderSettingsStorageLayerSummary}
   * @memberof FolderDetails
   */
  settings: FolderSettingsStorageLayerSummary;
  /**
   * Indicates this item is a folder (as opposed to a file).
   * @type {string}
   * @memberof FolderDetails
   */
  type: FolderDetailsTypeEnum;
  /**
   * If `true` then the folder was created using the PutFolder operation.
   *
   * If `false` then the folder was created automatically as the result of a file upload operation, and will disappear if/when the folder later becomes empty.
   * @type {boolean}
   * @memberof FolderDetails
   */
  virtual: boolean;
  /**
   *
   * @type {FolderSettingsInherited}
   * @memberof FolderDetails
   */
  settingsInherited: FolderSettingsInherited;
}

/**
 * @export
 */
export type FolderDetailsTypeEnum = "Folder";

/**
 * The FolderSettings inherited by the current path.
 *
 * If the folder defines its own `settings`, then those will take effect instead of these inherited settings.
 *
 * Each inherited setting contains a `folderPath` field to indicate which folder the setting was inherited from.
 *
 * Note: if the requester has insufficient privileges to read a setting, that setting's value will be undefined.
 * @export
 * @interface FolderSettingsInherited
 */
export interface FolderSettingsInherited {
  /**
   *
   * @type {WithFolderPathPublicPermissionsArray}
   * @memberof FolderSettingsInherited
   */
  publicPermissions?: WithFolderPathPublicPermissionsArray;
  /**
   *
   * @type {WithFolderPathStorageLayerSummary}
   * @memberof FolderSettingsInherited
   */
  storageLayer?: WithFolderPathStorageLayerSummary;
}
/**
 *
 * @export
 * @interface FolderSettingsStorageLayerSummary
 */
export interface FolderSettingsStorageLayerSummary {
  /**
   * Folder description.
   * @type {string}
   * @memberof FolderSettingsStorageLayerSummary
   */
  description?: string;
  /**
   *
   * @type {Array<PublicPermissions>}
   * @memberof FolderSettingsStorageLayerSummary
   */
  publicPermissions?: Array<PublicPermissions>;
  /**
   *
   * @type {StorageLayerSummary}
   * @memberof FolderSettingsStorageLayerSummary
   */
  storageLayer?: StorageLayerSummary;
}
/**
 * Summary information about a folder (a subset of the FolderDetails type).
 * @export
 * @interface FolderSummary
 */
export interface FolderSummary {
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof FolderSummary
   */
  folderPath: string;
  /**
   *
   * @type {FolderSettingsStorageLayerSummary}
   * @memberof FolderSummary
   */
  settings: FolderSettingsStorageLayerSummary;
  /**
   * Indicates this item is a folder (as opposed to a file).
   * @type {string}
   * @memberof FolderSummary
   */
  type: FolderSummaryTypeEnum;
  /**
   * If `true` then the folder was created using the PutFolder operation.
   *
   * If `false` then the folder was created automatically as the result of a file upload operation, and will disappear if/when the folder later becomes empty.
   * @type {boolean}
   * @memberof FolderSummary
   */
  virtual: boolean;
}

/**
 * @export
 */
export type FolderSummaryTypeEnum = "Folder";

/**
 *
 * @export
 * @interface GenericS3Storage
 */
export interface GenericS3Storage {
  /**
   *
   * @type {PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket}
   * @memberof GenericS3Storage
   */
  bucket: PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket;
  /**
   *
   * @type {GenericS3StorageCredentials}
   * @memberof GenericS3Storage
   */
  credentials: GenericS3StorageCredentials;
  /**
   *
   * @type {string}
   * @memberof GenericS3Storage
   */
  type: GenericS3StorageTypeEnum;
  /**
   *
   * @type {boolean}
   * @memberof GenericS3Storage
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type GenericS3StorageTypeEnum = "GenericS3";

/**
 *
 * @export
 * @interface GenericS3StorageCredentials
 */
export interface GenericS3StorageCredentials {
  /**
   * AWS Secret Access Key.
   * @type {string}
   * @memberof GenericS3StorageCredentials
   */
  secretKey: string;
  /**
   * AWS Access Key.
   * @type {string}
   * @memberof GenericS3StorageCredentials
   */
  accessKey: string;
}
/**
 * Storage layer used for storing files in Google Storage, as opposed to Bytescale's built-in storage.
 *
 * This is a read/write storage layer.
 * @export
 * @interface GoogleStorage
 */
export interface GoogleStorage {
  /**
   *
   * @type {PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket}
   * @memberof GoogleStorage
   */
  bucket: PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket;
  /**
   *
   * @type {GoogleStorageCredentials}
   * @memberof GoogleStorage
   */
  credentials: GoogleStorageCredentials;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof GoogleStorage
   */
  type: GoogleStorageTypeEnum;
  /**
   * If `true` then writes Google Storage objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes Google Storage objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof GoogleStorage
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type GoogleStorageTypeEnum = "GoogleStorage";

/**
 *
 * @export
 * @interface GoogleStorageCredentials
 */
export interface GoogleStorageCredentials {
  /**
   * AWS Secret Access Key.
   * @type {string}
   * @memberof GoogleStorageCredentials
   */
  googleSecretKey: string;
  /**
   * AWS Access Key.
   * @type {string}
   * @memberof GoogleStorageCredentials
   */
  googleAccessKey: string;
}
/**
 * Storage layer used for all files uploaded via the Bytescale API V1 (legacy version).
 *
 * This is a read/write storage layer.
 * @export
 * @interface InternalStorageV1
 */
export interface InternalStorageV1 {
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof InternalStorageV1
   */
  type: InternalStorageV1TypeEnum;
}

/**
 * @export
 */
export type InternalStorageV1TypeEnum = "InternalStorageV1";

/**
 * Default storage layer used for files uploaded via the Bytescale API V2 (latest version).
 *
 * This is a read/write storage layer.
 * @export
 * @interface InternalStorageV2
 */
export interface InternalStorageV2 {
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof InternalStorageV2
   */
  mount?: string;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof InternalStorageV2
   */
  type: InternalStorageV2TypeEnum;
}

/**
 * @export
 */
export type InternalStorageV2TypeEnum = "InternalStorageV2";

/**
 * Summary information about an asynchronous background job (for example, a folder deletion).
 * @export
 * @interface JobSummary
 */
export interface JobSummary {
  /**
   * Link to the documentation that describes how to get a job's status from its job ID.
   * @type {string}
   * @memberof JobSummary
   */
  jobDocs: JobSummaryJobDocsEnum;
  /**
   * Job ID.
   * @type {string}
   * @memberof JobSummary
   */
  jobId: string;
  /**
   *
   * @type {AccountJobType}
   * @memberof JobSummary
   */
  jobType: AccountJobType;
  /**
   * URL for the job's status.
   *
   * You can `GET` this URL to retrieve the job's status.
   *
   * You must authorize your `GET` request with a ```secret_*``` API key when accessing the URL.
   * @type {string}
   * @memberof JobSummary
   */
  jobUrl: string;
  /**
   * Your account ID.
   *
   * This is visible on the settings page:
   *
   * https://www.bytescale.com/dashboard/settings
   * @type {string}
   * @memberof JobSummary
   */
  accountId: string;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof JobSummary
   */
  created: number;
  /**
   *
   * @type {JobSummaryError}
   * @memberof JobSummary
   */
  error: JobSummaryError | null;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof JobSummary
   */
  lastUpdated: number;
  /**
   *
   * @type {AccountJobStatus}
   * @memberof JobSummary
   */
  status: AccountJobStatus;
  /**
   * An arbitrary JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof JobSummary
   */
  summary: { [key: string]: any };
}

/**
 * @export
 */
export type JobSummaryJobDocsEnum = "https://www.bytescale.com/docs/job-api/GetJob";

/**
 *
 * @export
 * @interface JobSummaryError
 */
export interface JobSummaryError {
  /**
   * Time the error occurred (UTC ISO 8601).
   * @type {string}
   * @memberof JobSummaryError
   */
  timestamp: string;
  /**
   * Human-readable error message.
   * @type {string}
   * @memberof JobSummaryError
   */
  message: string;
  /**
   * Additional machine-readable details relating to the error.
   * @type {any}
   * @memberof JobSummaryError
   */
  details?: any | null;
  /**
   * Machine-readable error code.
   * @type {string}
   * @memberof JobSummaryError
   */
  code: string;
}
/**
 * Response body for ListFolderDescendants.
 * @export
 * @interface ListFolderResponse
 */
export interface ListFolderResponse {
  /**
   * Absolute path to a file or folder. Begins with a `/`.
   * @type {string}
   * @memberof ListFolderResponse
   */
  cursor: string;
  /**
   *
   * @type {FolderSummary}
   * @memberof ListFolderResponse
   */
  folder: FolderSummary;
  /**
   * If `true` then paging has completed.
   * @type {boolean}
   * @memberof ListFolderResponse
   */
  isPaginationComplete: boolean;
  /**
   * Summary information about each of the folder's descendants (files and folders).
   * @type {Array<ObjectSummary>}
   * @memberof ListFolderResponse
   */
  items: Array<ObjectSummary>;
}
/**
 * Response body for ListRecentJobs.
 * @export
 * @interface ListRecentJobsResponse
 */
export interface ListRecentJobsResponse {
  /**
   *
   * @type {Array<JobSummary>}
   * @memberof ListRecentJobsResponse
   */
  items: Array<JobSummary>;
}
/**
 * Multipart file upload protocol version.
 *
 * - `1.0`: this protocol version automatically downgrades to single part uploads when files are below a certain size. When this protocol is used for small files, the file exists immediately after the `PUT` request to the `uploadUrl` completes. This protocol requires more client-side code to implement, and has a known issue whereby file TTLs are ignored if the client code fails to call CompleteUploadPart.
 *
 * - `1.1`: this protocol version uses multipart uploads for all files. When this protocol is used, files only exist after the last CompleteUploadPart request is made. This protocol simplifies client code, and fixes a known issue in the `2.0` protocol for file TTLs (described above).
 * @export
 */
export type MultipartUploadProtocol = "1.0" | "1.1";
/**
 * @type ObjectSummary
 * Summary information about a file or folder.
 * @export
 */
export type ObjectSummary = FileSummary | FolderSummary;
/**
 * Specifies the folder settings to use when creating or updating a folder.
 * @export
 * @interface PatchFolderSettings
 */
export interface PatchFolderSettings {
  /**
   *
   * @type {UpdatableFieldEmptiableFolderDescription}
   * @memberof PatchFolderSettings
   */
  description?: UpdatableFieldEmptiableFolderDescription;
  /**
   *
   * @type {UpdatableFieldEmptiablePublicPermissionsArray}
   * @memberof PatchFolderSettings
   */
  publicPermissions?: UpdatableFieldEmptiablePublicPermissionsArray;
  /**
   *
   * @type {UpdatableFieldEmptiableStorageLayerUpdate}
   * @memberof PatchFolderSettings
   */
  storageLayer?: UpdatableFieldEmptiableStorageLayerUpdate;
}
/**
 * Specifies the level in the file tree, relative to the path, that these permissions apply.
 *
 * - `"This"`: Permissions apply to the current path only.
 *
 * - `"Children"`: Permissions apply to the children (files and folders) of this path only.
 *
 * - `"Grandchildren+"`: Permissions apply to the grandchildren (files and folders) of this path and their descendants only.
 * @export
 */
export type PathPermissionScope = "Children" | "Grandchildren+" | "This";
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials
 */
export interface PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials {
  /**
   *
   * @type {string}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials
   */
  type: PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsTypeEnum;
  /**
   *
   * @type {PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials
   */
  azureStorage: PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage;
  /**
   *
   * @type {boolean}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsTypeEnum = "AzureReadOnly";

/**
 *
 * @export
 * @interface PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage
 */
export interface PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage {
  /**
   * Azure Storage container name.
   * @type {string}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage
   */
  containerName: string;
  /**
   * Azure Storage BLOB name prefix.
   * @type {string}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage
   */
  blobNamePrefix: string;
  /**
   * Azure Storage account name.
   * @type {string}
   * @memberof PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentialsAzureStorage
   */
  accountName: string;
}
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials
 */
export interface PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials {
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials
   */
  type: PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsTypeEnum;
  /**
   * If `true` then writes S3 objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes S3 objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials
   */
  useAbsolutePaths: boolean;
  /**
   *
   * @type {PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials
   */
  bucket: PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket;
}

/**
 * @export
 */
export type PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsTypeEnum = "DigitalOceanSpace";

/**
 *
 * @export
 * @interface PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket
 */
export interface PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket {
  /**
   * AWS S3 Object Key.
   * @type {string}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket
   */
  objectKeyPrefix: string;
  /**
   * DigitalOcean Region.
   * @type {string}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket
   */
  bucketRegion: string;
  /**
   * AWS S3 Bucket Name.
   * @type {string}
   * @memberof PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentialsBucket
   */
  bucketName: string;
}
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials
 */
export interface PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials {
  /**
   *
   * @type {string}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials
   */
  type: PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsTypeEnum;
  /**
   *
   * @type {boolean}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials
   */
  useAbsolutePaths: boolean;
  /**
   *
   * @type {PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials
   */
  bucket: PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket;
}

/**
 * @export
 */
export type PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsTypeEnum = "GenericS3";

/**
 *
 * @export
 * @interface PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
 */
export interface PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket {
  /**
   *
   * @type {Array<S3OperationName>}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  unsupportedOperations: Array<S3OperationName>;
  /**
   * AWS S3 Object Key.
   * @type {string}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  objectKeyPrefix: string;
  /**
   * Controls how URLs are constructed when making HTTP requests to the S3-compatible API hosted at `bucketEndpoint`.
   * - If `true` then `bucketName` will be added to the URL path.
   * - If `false` then `bucketName` will be added as a subdomain of `bucketEndpoint`, assuming `bucketName` does not contain '.' and is DNS-compatible.
   * @type {boolean}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  forcePathStyle: boolean;
  /**
   * Generic S3 Region.
   * @type {string}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  bucketRegion: string;
  /**
   * AWS S3 Bucket Name.
   * @type {string}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  bucketName: string;
  /**
   * URL for an http(s) resource.
   * @type {string}
   * @memberof PickGenericS3StorageExcludeKeyofGenericS3StorageCredentialsBucket
   */
  bucketEndpoint: string;
}
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickGoogleStorageExcludeKeyofGoogleStorageCredentials
 */
export interface PickGoogleStorageExcludeKeyofGoogleStorageCredentials {
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof PickGoogleStorageExcludeKeyofGoogleStorageCredentials
   */
  type: PickGoogleStorageExcludeKeyofGoogleStorageCredentialsTypeEnum;
  /**
   * If `true` then writes Google Storage objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes Google Storage objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof PickGoogleStorageExcludeKeyofGoogleStorageCredentials
   */
  useAbsolutePaths: boolean;
  /**
   *
   * @type {PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket}
   * @memberof PickGoogleStorageExcludeKeyofGoogleStorageCredentials
   */
  bucket: PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket;
}

/**
 * @export
 */
export type PickGoogleStorageExcludeKeyofGoogleStorageCredentialsTypeEnum = "GoogleStorage";

/**
 *
 * @export
 * @interface PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket
 */
export interface PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket {
  /**
   * AWS S3 Object Key.
   * @type {string}
   * @memberof PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket
   */
  objectKeyPrefix: string;
  /**
   * Google Storage Bucket Name.
   * @type {string}
   * @memberof PickGoogleStorageExcludeKeyofGoogleStorageCredentialsBucket
   */
  bucketName: string;
}
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickR2StorageExcludeKeyofR2StorageCredentials
 */
export interface PickR2StorageExcludeKeyofR2StorageCredentials {
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentials
   */
  type: PickR2StorageExcludeKeyofR2StorageCredentialsTypeEnum;
  /**
   * If `true` then writes Google Storage objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes Google Storage objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentials
   */
  useAbsolutePaths: boolean;
  /**
   *
   * @type {PickR2StorageExcludeKeyofR2StorageCredentialsBucket}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentials
   */
  bucket: PickR2StorageExcludeKeyofR2StorageCredentialsBucket;
  /**
   * Cloudflare Account ID.
   * @type {string}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentials
   */
  cloudflareAccountId: string;
}

/**
 * @export
 */
export type PickR2StorageExcludeKeyofR2StorageCredentialsTypeEnum = "R2";

/**
 *
 * @export
 * @interface PickR2StorageExcludeKeyofR2StorageCredentialsBucket
 */
export interface PickR2StorageExcludeKeyofR2StorageCredentialsBucket {
  /**
   * AWS S3 Object Key.
   * @type {string}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentialsBucket
   */
  objectKeyPrefix: string;
  /**
   * AWS S3 Bucket Name.
   * @type {string}
   * @memberof PickR2StorageExcludeKeyofR2StorageCredentialsBucket
   */
  bucketName: string;
}
/**
 * From T, pick a set of properties whose keys are in the union K
 * @export
 * @interface PickS3StorageExcludeKeyofS3StorageCredentials
 */
export interface PickS3StorageExcludeKeyofS3StorageCredentials {
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentials
   */
  type: PickS3StorageExcludeKeyofS3StorageCredentialsTypeEnum;
  /**
   * If `true` then writes S3 objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes S3 objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentials
   */
  useAbsolutePaths: boolean;
  /**
   *
   * @type {PickS3StorageExcludeKeyofS3StorageCredentialsBucket}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentials
   */
  bucket: PickS3StorageExcludeKeyofS3StorageCredentialsBucket;
  /**
   * Enables S3 transfer acceleration, providing improved file upload speeds for larger files.
   *
   * Note: this setting must also be enabled on the S3 bucket.
   * @type {boolean}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentials
   */
  useTransferAcceleration: boolean;
}

/**
 * @export
 */
export type PickS3StorageExcludeKeyofS3StorageCredentialsTypeEnum = "S3";

/**
 *
 * @export
 * @interface PickS3StorageExcludeKeyofS3StorageCredentialsBucket
 */
export interface PickS3StorageExcludeKeyofS3StorageCredentialsBucket {
  /**
   * AWS S3 Object Key.
   * @type {string}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentialsBucket
   */
  objectKeyPrefix: string;
  /**
   *
   * @type {AwsRegion}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentialsBucket
   */
  bucketRegion: AwsRegion;
  /**
   * AWS S3 Bucket Name.
   * @type {string}
   * @memberof PickS3StorageExcludeKeyofS3StorageCredentialsBucket
   */
  bucketName: string;
}
/**
 * Request body for ProcessFileAndSave.
 * @export
 * @interface ProcessFileAndSaveRequest
 */
export interface ProcessFileAndSaveRequest {
  /**
   *
   * @type {FilePathDefinition}
   * @memberof ProcessFileAndSaveRequest
   */
  destination?: FilePathDefinition;
  /**
   *
   * @type {TransformationParams}
   * @memberof ProcessFileAndSaveRequest
   */
  extendedParams?: TransformationParams;
  /**
   *
   * @type {CopyableFileDataForArtifactsFileMetadata}
   * @memberof ProcessFileAndSaveRequest
   */
  metadata?: CopyableFileDataForArtifactsFileMetadata;
  /**
   *
   * @type {CopyableFileDataForArtifactsFileTagNameArray}
   * @memberof ProcessFileAndSaveRequest
   */
  tags?: CopyableFileDataForArtifactsFileTagNameArray;
}
/**
 * @type ProcessFileAndSaveResponse
 * Response body for ProcessFileAndSave.
 * @export
 */
export type ProcessFileAndSaveResponse = ProcessFileAndSaveResponseAsync | ProcessFileAndSaveResponseSync;
/**
 * Response body for ProcessFileAndSave operations where the File Processing API operation is asynchronous (e.g. a video transcoding job).
 * @export
 * @interface ProcessFileAndSaveResponseAsync
 */
export interface ProcessFileAndSaveResponseAsync {
  /**
   * Link to the documentation that describes how to get a job's status from its job ID.
   * @type {string}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  jobDocs: ProcessFileAndSaveResponseAsyncJobDocsEnum;
  /**
   * Job ID.
   * @type {string}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  jobId: string;
  /**
   *
   * @type {AccountJobType}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  jobType: AccountJobType;
  /**
   * URL for the job's status.
   *
   * You can `GET` this URL to retrieve the job's status.
   *
   * You must authorize your `GET` request with a ```secret_*``` API key when accessing the URL.
   * @type {string}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  jobUrl: string;
  /**
   * Your account ID.
   *
   * This is visible on the settings page:
   *
   * https://www.bytescale.com/dashboard/settings
   * @type {string}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  accountId: string;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  created: number;
  /**
   *
   * @type {JobSummaryError}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  error: JobSummaryError | null;
  /**
   * Epoch milliseconds (since midnight 1 January 1970, UTC).
   * @type {number}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  lastUpdated: number;
  /**
   *
   * @type {AccountJobStatus}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  status: AccountJobStatus;
  /**
   * An arbitrary JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  summary: { [key: string]: any };
  /**
   * True for asynchronous file processing operations (e.g. video transcoding).
   *
   * For asynchronous operations, the response body will contain information about the background job that's processing the file, which can then be polled via the GetJob operation.
   * @type {boolean}
   * @memberof ProcessFileAndSaveResponseAsync
   */
  async: ProcessFileAndSaveResponseAsyncAsyncEnum;
}

/**
 * @export
 */
export type ProcessFileAndSaveResponseAsyncJobDocsEnum = "https://www.bytescale.com/docs/job-api/GetJob";

/**
 * @export
 */
export type ProcessFileAndSaveResponseAsyncAsyncEnum = true;

/**
 * Response body for ProcessFileAndSave operations where the File Processing API operation is synchronous (e.g. an image processing job).
 * @export
 * @interface ProcessFileAndSaveResponseSync
 */
export interface ProcessFileAndSaveResponseSync {
  /**
   * Your account ID.
   *
   * This is visible on the settings page:
   *
   * https://www.bytescale.com/dashboard/settings
   * @type {string}
   * @memberof ProcessFileAndSaveResponseSync
   */
  accountId: string;
  /**
   * False for synchronous file processing operations (e.g. image processing).
   *
   * For synchronous operations, the response body will contain links to the transformed file.
   * @type {boolean}
   * @memberof ProcessFileAndSaveResponseSync
   */
  async: ProcessFileAndSaveResponseSyncAsyncEnum;
  /**
   * Absolute path to a file. Begins with a `/`.
   * @type {string}
   * @memberof ProcessFileAndSaveResponseSync
   */
  filePath: string;
  /**
   * URL for an http(s) resource.
   * @type {string}
   * @memberof ProcessFileAndSaveResponseSync
   */
  fileUrl: string;
  /**
   * JSON response returned by certain File Processing APIs.
   *
   * Structure varies between File Processing APIs (please see the documentation of each individual File Processing API).
   * @type {{ [key: string]: any; }}
   * @memberof ProcessFileAndSaveResponseSync
   */
  summary?: { [key: string]: any };
}

/**
 * @export
 */
export type ProcessFileAndSaveResponseSyncAsyncEnum = false;

/**
 * Permissions applied to anonymous users who attempt to download files from a folder.
 *
 * Each folder can declare these permissions via its FolderSettings object.
 * @export
 * @interface PublicPermissions
 */
export interface PublicPermissions {
  /**
   *
   * @type {PublicPermissionsGrants}
   * @memberof PublicPermissions
   */
  permissions: PublicPermissionsGrants;
  /**
   *
   * @type {PathPermissionScope}
   * @memberof PublicPermissions
   */
  scope: PathPermissionScope;
}
/**
 * Permissions applied to anonymous users who attempt to download files from a folder.
 *
 * Each folder can declare these permissions via its FolderSettings object.
 * @export
 * @interface PublicPermissionsGrants
 */
export interface PublicPermissionsGrants {
  /**
   *
   * @type {FileDownloadGrants}
   * @memberof PublicPermissionsGrants
   */
  file: FileDownloadGrants;
}
/**
 * Request body for PutFolder.
 * @export
 * @interface PutFolderRequest
 */
export interface PutFolderRequest {
  /**
   * You must specify `true` if the `folderPath` ends with a `/`.
   *
   * This prevents the accidental creation of folders that produce file paths with double forward-slashes in them.
   *
   * Default: false
   * @type {boolean}
   * @memberof PutFolderRequest
   */
  allowUnnamedFolder?: boolean;
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof PutFolderRequest
   */
  folderPath: string;
  /**
   *
   * @type {PatchFolderSettings}
   * @memberof PutFolderRequest
   */
  folderSettings?: PatchFolderSettings;
}
/**
 * Storage layer used for storing files in Cloudflare R2, as opposed to Bytescale's built-in storage.
 *
 * This is a read/write storage layer.
 * @export
 * @interface R2Storage
 */
export interface R2Storage {
  /**
   *
   * @type {PickR2StorageExcludeKeyofR2StorageCredentialsBucket}
   * @memberof R2Storage
   */
  bucket: PickR2StorageExcludeKeyofR2StorageCredentialsBucket;
  /**
   * Cloudflare Account ID.
   * @type {string}
   * @memberof R2Storage
   */
  cloudflareAccountId: string;
  /**
   *
   * @type {R2StorageCredentials}
   * @memberof R2Storage
   */
  credentials: R2StorageCredentials;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof R2Storage
   */
  type: R2StorageTypeEnum;
  /**
   * If `true` then writes Google Storage objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes Google Storage objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof R2Storage
   */
  useAbsolutePaths: boolean;
}

/**
 * @export
 */
export type R2StorageTypeEnum = "R2";

/**
 *
 * @export
 * @interface R2StorageCredentials
 */
export interface R2StorageCredentials {
  /**
   * AWS Secret Access Key.
   * @type {string}
   * @memberof R2StorageCredentials
   */
  r2SecretKey: string;
  /**
   * AWS Access Key.
   * @type {string}
   * @memberof R2StorageCredentials
   */
  r2AccessKey: string;
}
/**
 * Request body for ResetCache.
 *
 * You can choose to reset the edge cache, or permanent cache, or both caches.
 *
 * *Warning:* Resetting the permanent cache (by setting ```resetPermanentCache: true```) may lead to a significant increase in processing time if numerous file transformations need to be re-performed upon their next request.
 *
 * *Recommended:* Prevent cache resets by adding a ```?v=<etag>``` querystring parameter to your URLs. This ensures your URLs change when your files change, eliminating the need for cache resets. The `etag` field is returned by GetFileDetails and all upload operations, and can be saved to your database.
 *
 * *Example patterns:*
 *
 * - ```"/*"```
 * - ```"/raw/example.jpg"```
 * - ```"/image/example.jpg"```
 * - ```"/image/customers/abc/*"```
 *
 * You may only use ```*``` at the end of the pattern. You must not include your account ID prefix in the pattern.
 * @export
 * @interface ResetCacheRequest
 */
export interface ResetCacheRequest {
  /**
   * The URL pattern to reset the cache for, excluding the account ID, but including the delivery method prefix (e.g. "raw", "image", etc.).
   *
   * May end with a `*` to indicate that all files with this prefix are to be removed from the cache.
   *
   * Specify `/*` to reset your entire cache.
   * @type {string}
   * @memberof ResetCacheRequest
   */
  pattern: string;
  /**
   * If `true` then resets the edge cache for the location(s) specified by `pattern`.
   * @type {boolean}
   * @memberof ResetCacheRequest
   */
  resetEdgeCache: boolean;
  /**
   * If `true` then resets the permanent cache for the location(s) specified by `pattern`.
   * @type {boolean}
   * @memberof ResetCacheRequest
   */
  resetPermanentCache: boolean;
}
/**
 *
 * @export
 */
export type S3OperationName = "DeleteObjects";
/**
 * Storage layer used for storing files in custom S3 buckets, as opposed to Bytescale's built-in storage.
 *
 * This is a read/write storage layer.
 * @export
 * @interface S3Storage
 */
export interface S3Storage {
  /**
   *
   * @type {PickS3StorageExcludeKeyofS3StorageCredentialsBucket}
   * @memberof S3Storage
   */
  bucket: PickS3StorageExcludeKeyofS3StorageCredentialsBucket;
  /**
   *
   * @type {S3StorageCredentials}
   * @memberof S3Storage
   */
  credentials: S3StorageCredentials;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof S3Storage
   */
  type: S3StorageTypeEnum;
  /**
   * If `true` then writes S3 objects with full `filePath` as key, prefixed with the `objectKeyPrefix`.
   *
   * If `false` then writes S3 objects using a relative `filePath` in relation to folder's path, prefixed with the `objectKeyPrefix`.
   * @type {boolean}
   * @memberof S3Storage
   */
  useAbsolutePaths: boolean;
  /**
   * Enables S3 transfer acceleration, providing improved file upload speeds for larger files.
   *
   * Note: this setting must also be enabled on the S3 bucket.
   * @type {boolean}
   * @memberof S3Storage
   */
  useTransferAcceleration: boolean;
}

/**
 * @export
 */
export type S3StorageTypeEnum = "S3";

/**
 *
 * @export
 * @interface S3StorageCredentials
 */
export interface S3StorageCredentials {
  /**
   * AWS Secret Access Key.
   * @type {string}
   * @memberof S3StorageCredentials
   */
  awsSecretKey: string;
  /**
   * AWS Access Key.
   * @type {string}
   * @memberof S3StorageCredentials
   */
  awsAccessKey: string;
}
/**
 * This data type specifies the field must be updated.
 * @export
 * @interface SpecifiedFieldValueEmptiableFolderDescription
 */
export interface SpecifiedFieldValueEmptiableFolderDescription {
  /**
   * This field is always `true`. Indicates the property *will* be updated as part of the request, and the property's new value will be ```value```.
   * @type {boolean}
   * @memberof SpecifiedFieldValueEmptiableFolderDescription
   */
  set: SpecifiedFieldValueEmptiableFolderDescriptionSetEnum;
  /**
   * Folder description.
   * @type {string}
   * @memberof SpecifiedFieldValueEmptiableFolderDescription
   */
  value?: string;
}

/**
 * @export
 */
export type SpecifiedFieldValueEmptiableFolderDescriptionSetEnum = true;

/**
 * This data type specifies the field must be updated.
 * @export
 * @interface SpecifiedFieldValueEmptiablePublicPermissionsArray
 */
export interface SpecifiedFieldValueEmptiablePublicPermissionsArray {
  /**
   * This field is always `true`. Indicates the property *will* be updated as part of the request, and the property's new value will be ```value```.
   * @type {boolean}
   * @memberof SpecifiedFieldValueEmptiablePublicPermissionsArray
   */
  set: SpecifiedFieldValueEmptiablePublicPermissionsArraySetEnum;
  /**
   * The value to set into the field.
   * @type {Array<PublicPermissions>}
   * @memberof SpecifiedFieldValueEmptiablePublicPermissionsArray
   */
  value?: Array<PublicPermissions>;
}

/**
 * @export
 */
export type SpecifiedFieldValueEmptiablePublicPermissionsArraySetEnum = true;

/**
 * This data type specifies the field must be updated.
 * @export
 * @interface SpecifiedFieldValueEmptiableStorageLayerUpdate
 */
export interface SpecifiedFieldValueEmptiableStorageLayerUpdate {
  /**
   * This field is always `true`. Indicates the property *will* be updated as part of the request, and the property's new value will be ```value```.
   * @type {boolean}
   * @memberof SpecifiedFieldValueEmptiableStorageLayerUpdate
   */
  set: SpecifiedFieldValueEmptiableStorageLayerUpdateSetEnum;
  /**
   *
   * @type {StorageLayerUpdate}
   * @memberof SpecifiedFieldValueEmptiableStorageLayerUpdate
   */
  value?: StorageLayerUpdate;
}

/**
 * @export
 */
export type SpecifiedFieldValueEmptiableStorageLayerUpdateSetEnum = true;

/**
 * @type StorageLayerSummary
 * Storage layer summary information, describing an existing folder's storage layer.
 *
 * This data type does not contain credentials.
 * @export
 */
export type StorageLayerSummary =
  | InternalStorageV1
  | InternalStorageV2
  | PickAzureReadOnlyStorageExcludeKeyofAzureReadOnlyStorageCredentials
  | PickDigitalOceanStorageExcludeKeyofDigitalOceanStorageCredentials
  | PickGenericS3StorageExcludeKeyofGenericS3StorageCredentials
  | PickGoogleStorageExcludeKeyofGoogleStorageCredentials
  | PickR2StorageExcludeKeyofR2StorageCredentials
  | PickS3StorageExcludeKeyofS3StorageCredentials
  | WebStorage;
/**
 * @type StorageLayerUpdate
 * Data type used to update or create a folder's storage layer.
 *
 * This data type may contain credentials.
 * @export
 */
export type StorageLayerUpdate =
  | AzureReadOnlyStorage
  | DigitalOceanStorage
  | GenericS3Storage
  | GoogleStorage
  | InternalStorageV2
  | R2Storage
  | S3Storage
  | WebStorage;
/**
 * @type TransformationParamValue
 * A single transformation parameter provided to a Bytescale File Processing API.
 *
 * See TransformationParams for more information.
 * @export
 */
export type TransformationParamValue = boolean | number | string;
/**
 * @type TransformationParams
 * Transformation parameters provided to a Bytescale File Processing API.
 *
 * *Array support:*
 *
 * Arrays are specified by repeating the same parameter name multiple times on the querystring.
 *
 * For example, the following querystring declares a `file` parameter as an array containing two values (`/file1.txt` and `/file2.txt`):
 *
 * ```?file=/file1.txt&file=/file2.txt```
 *
 * The Bytescale SDKs and the ProcessFileAndSave request body (the `extendedParams` field) also support arrays of transformation parameters. These are specified by providing an array of objects as the field value instead of an object, for example:
 *
 * ```transformationParams: [{ file: "/file1.txt" }, { file: "/file2.txt" }]```
 *
 * This structure allows parameter groups to be retained, which is important for certain transformations. For example, the Video Processing API allows developers to specify multiple clusters of `w`, `h` and `q` parameters when specifying the Adaptive Bitrate (ABR) variants in an HTTP Live Streaming (HLS) output video.
 *
 * *Parameters are order sensitive:*
 *
 * The order of the parameters may be important. Please refer to the documentation of each File Processing API for more information.
 *
 * *Maximum URL length:*
 *
 * Bytescale URLs have a maximum total length of 1000 bytes (excluding the hostname and protocol).
 *
 * To provide a longer parameter list to a Bytescale File Processing API, you must use ProcessFileAndSave (POST) instead of ProcessFile (GET). This allows you to specify parameters via the ProcessFileAndSave HTTP request body (via the `extendedParams` field).
 *
 * The `extendedParams` field supports up to 400KB of transformation parameter data.
 * @export
 */
export type TransformationParams =
  | Array<{ [key: string]: TransformationParamValue }>
  | { [key: string]: TransformationParamValue };
/**
 * This data type specifies no update is to be performed.
 * @export
 * @interface UnspecifiedFieldValue
 */
export interface UnspecifiedFieldValue {
  /**
   * This field is always `false`. Indicates the property *will not* be updated as part of the request.
   * @type {boolean}
   * @memberof UnspecifiedFieldValue
   */
  set: UnspecifiedFieldValueSetEnum;
}

/**
 * @export
 */
export type UnspecifiedFieldValueSetEnum = false;

/**
 * @type UpdatableFieldEmptiableFolderDescription
 *
 * @export
 */
export type UpdatableFieldEmptiableFolderDescription =
  | SpecifiedFieldValueEmptiableFolderDescription
  | UnspecifiedFieldValue;
/**
 * @type UpdatableFieldEmptiablePublicPermissionsArray
 *
 * @export
 */
export type UpdatableFieldEmptiablePublicPermissionsArray =
  | SpecifiedFieldValueEmptiablePublicPermissionsArray
  | UnspecifiedFieldValue;
/**
 * @type UpdatableFieldEmptiableStorageLayerUpdate
 *
 * @export
 */
export type UpdatableFieldEmptiableStorageLayerUpdate =
  | SpecifiedFieldValueEmptiableStorageLayerUpdate
  | UnspecifiedFieldValue;
/**
 * Request body for UploadFromUrl.
 * @export
 * @interface UploadFromUrlRequest
 */
export interface UploadFromUrlRequest {
  /**
   * The file metadata specified in the original upload request as a JSON object.
   * @type {{ [key: string]: any; }}
   * @memberof UploadFromUrlRequest
   */
  metadata?: { [key: string]: any };
  /**
   * File MIME type.
   * @type {string}
   * @memberof UploadFromUrlRequest
   */
  mime?: string;
  /**
   * The file's original name on the user's device.
   * @type {string}
   * @memberof UploadFromUrlRequest
   */
  originalFileName?: string;
  /**
   *
   * @type {FilePathDefinition}
   * @memberof UploadFromUrlRequest
   */
  path?: FilePathDefinition;
  /**
   * The file tags to store against the file.
   *
   * When you associate file tags with a file, Bytescale checks which rules match the tags (if any) and applies those rules to the upload request:
   *
   * Rules can include max file size checks, traffic limit checks, rate limit checks, and so forth. These are configured in the Bytescale Dashboard.
   * @type {Array<string>}
   * @memberof UploadFromUrlRequest
   */
  tags?: Array<string>;
  /**
   * Source URL to upload.
   * @type {string}
   * @memberof UploadFromUrlRequest
   */
  url: string;
}
/**
 * Represents a part of a file to be uploaded as part of a multipart file upload.
 *
 * Specifies the 'range' of the file that needs uploading, together with an 'uploadUrl' of where to PUT those bytes to.
 *
 * The PUT request to the `uploadUrl` will return an etag response header, which must be provided in a subsequent CompleteUploadPart request.
 *
 * See: basic file uploads, multipart file uploads.
 * @export
 * @interface UploadPart
 */
export interface UploadPart {
  /**
   *
   * @type {UploadPartRange}
   * @memberof UploadPart
   */
  range: UploadPartRange;
  /**
   * The ID for the multipart file upload.
   * @type {string}
   * @memberof UploadPart
   */
  uploadId: string;
  /**
   * Index of an uploadable file part.
   *
   * Can be used as the `uploadPartIndex` parameter in the GetUploadPart and CompleteUploadPart operations.
   * @type {number}
   * @memberof UploadPart
   */
  uploadPartIndex: number;
  /**
   * Pre-signed upload URL for this part.
   *
   * You are required to issue a `PUT` to this URL, with the file's bytes as the request body (limited to the range indicated by this upload part).
   *
   * The `PUT` request will return an `etag` response header, which must be provided in a subsequent CompleteUploadPart request.
   * @type {string}
   * @memberof UploadPart
   */
  uploadUrl: string;
}
/**
 * Identifies the UploadPart indexes that still need uploading for an active multipart file upload.
 * @export
 * @interface UploadPartList
 */
export interface UploadPartList {
  /**
   * Indexes of the remaining parts to upload.
   *
   * These indexes can be used as the `uploadPartIndex` parameter in the GetUploadPart and CompleteUploadPart endpoints.
   * @type {Array<number>}
   * @memberof UploadPartList
   */
  remainingUploadParts: Array<number>;
}
/**
 * Specifies the range in the file the UploadPart represents.
 * @export
 * @interface UploadPartRange
 */
export interface UploadPartRange {
  /**
   * Position in the file the last byte of this part corresponds to. Value is -1 when the part is empty (i.e. for
   * uploading empty files).
   * @type {number}
   * @memberof UploadPartRange
   */
  inclusiveEnd: number;
  /**
   * Position in the file the first byte of this part corresponds to.
   * @type {number}
   * @memberof UploadPartRange
   */
  inclusiveStart: number;
}
/**
 * Storage layer used for serving files from external HTTP origins.
 *
 * This is a read-only storage layer.
 * @export
 * @interface WebStorage
 */
export interface WebStorage {
  /**
   * Query string without the leading "?" character.
   * @type {string}
   * @memberof WebStorage
   */
  appendQueryString?: string;
  /**
   * URL for an http(s) resource.
   * @type {string}
   * @memberof WebStorage
   */
  baseUrl?: string;
  /**
   *
   * @type {WebStorageQueryStringForwarding}
   * @memberof WebStorage
   */
  queryStringForwarding?: WebStorageQueryStringForwarding;
  /**
   * The type of this storage layer.
   * @type {string}
   * @memberof WebStorage
   */
  type: WebStorageTypeEnum;
}

/**
 * @export
 */
export type WebStorageTypeEnum = "Web";

/**
 * This object is used for the value of the `queryStringForwarding` field on the `WebStorage` object, and defines how user-provided query strings are forwarded to the HTTP origin. If left unset, no user-provided query strings will be forwarded to the HTTP origin.
 *
 * *Instructions:*
 * - To *block all* query string parameters: use `"Whitelist"` with an empty `parameters` array (default if unset).
 * - To *allow all* query string parameters: use `"Blacklist"` with an empty `parameters` array.
 * - To *allow some* query string parameters: use either `"Blacklist"` or `"Whitelist"` with one or more `parameters`.
 * @export
 * @interface WebStorageQueryStringForwarding
 */
export interface WebStorageQueryStringForwarding {
  /**
   * Determines which parameters to forward based on the `type` field:
   *
   * If `"Whitelist"` is set in the `type` field:
   * - Only parameters in this array will be forwarded.
   * - An empty array prevents all parameters from being forwarded.
   *
   * If `"Blacklist"` is set in the `type` field:
   * - Only parameters in this array will be blocked.
   * - An empty array allows all parameters to be forwarded.
   * @type {Array<WebStorageQueryStringParam>}
   * @memberof WebStorageQueryStringForwarding
   */
  parameters: Array<WebStorageQueryStringParam>;
  /**
   * Determines whether the `parameters` array is interpreted as a blacklist or a whitelist.
   * @type {string}
   * @memberof WebStorageQueryStringForwarding
   */
  type: WebStorageQueryStringForwardingTypeEnum;
}

/**
 * @export
 */
export type WebStorageQueryStringForwardingTypeEnum = "Whitelist" | "Blacklist";

/**
 * Matches exactly one query string parameter. The value of the `name` field must be URL encoded.
 * @export
 * @interface WebStorageQueryStringParam
 */
export interface WebStorageQueryStringParam {
  /**
   * Query string parameter name. Must be URL-encoded.
   * @type {string}
   * @memberof WebStorageQueryStringParam
   */
  name: string;
}
/**
 *
 * @export
 * @interface WithFolderPathPublicPermissionsArray
 */
export interface WithFolderPathPublicPermissionsArray {
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof WithFolderPathPublicPermissionsArray
   */
  folderPath: string;
  /**
   *
   * @type {Array<PublicPermissions>}
   * @memberof WithFolderPathPublicPermissionsArray
   */
  value: Array<PublicPermissions>;
}
/**
 *
 * @export
 * @interface WithFolderPathStorageLayerSummary
 */
export interface WithFolderPathStorageLayerSummary {
  /**
   * Absolute path to a folder. Begins with a `/`. Should not end with a `/`.
   * @type {string}
   * @memberof WithFolderPathStorageLayerSummary
   */
  folderPath: string;
  /**
   *
   * @type {StorageLayerSummary}
   * @memberof WithFolderPathStorageLayerSummary
   */
  value: StorageLayerSummary;
}
