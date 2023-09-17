# Migration Guide

## From Upload.js (`upload-js`)

Steps:

1. Install `@bytescale/sdk`
2. Uninstall `upload-js`
3. Replace `"upload-js"` with `"@bytescale/sdk"` in your `import` statements
4. Replace `Upload({ apiKey })` with `new UploadManager({ apiKey })`
5. Replace `.uploadFile(file, options)` with `.upload({ data: file, ...options })`

### Before

```javascript
import { Upload } from "upload-js";

const upload = Upload({ apiKey: "free" });

//
// Uploading files...
//
const { fileUrl } = await upload.uploadFile(file, {
  onBegin: ({ cancel }) => {
    /* Optional. To cancel, you would call 'cancel()' */
  },
  ...additionalParams
});

//
// Making URLs....
//
upload.url("/my-uploaded-image.jpg", "thumbnail");

//
// JWT authorization...
//
await upload.beginAuthSession("https://my-auth-url", async () => ({ Authorization: "Bearer AuthTokenForMyApi" }));
```

### After

```javascript
import { AuthManager, UrlBuilder, UploadManager } from "@bytescale/sdk";

//
// Uploading files...
//
const uploadManager = new UploadManager({
  fetchApi: nodeFetch, // import nodeFetch from "node-fetch"; // Only required for Node.js. TypeScript: 'nodeFetch as any' may be necessary.
  apiKey: "free" // Get API keys from: www.bytescale.com
});
const cancellationToken = {
  isCancelled: false // Set to 'true' at any point to cancel the upload.
};
const { fileUrl } = await uploadManager.upload({
  data: file,
  cancellationToken, // optional
  ...additionalParams
});

//
// Making URLs...
//
UrlBuilder.url({
  accountId,
  filePath: "/my-uploaded-image.jpg",
  options: {
    transformation: "preset",
    transformationPreset: "thumbnail"
  }
});

//
// JWT authorization...
//
await AuthManager.beginAuthSession({
  accountId,
  authUrl: "https://my-auth-url",
  authHeaders: async () => ({ Authorization: "Bearer AuthTokenForMyApi" })
});
```

## From Upload JavaScript SDK (`upload-js-full`)

Steps:

1. Install `@bytescale/sdk`
2. Uninstall `upload-js-full`
3. Replace `"upload-js-full"` with `"@bytescale/sdk"` in your `import` statements
4. Remove `accountId` from `uploadManager.upload({...options...})` (it's no-longer required).

## See also

Bytescale migration guides listed below:

- [Migrating from `upload-js` to `@bytescale/sdk`](https://github.com/bytescale/bytescale-javascript-sdk/blob/main/MIGRATE.md)
- [Migrating from `uploader` to `@bytescale/upload-widget`](https://github.com/bytescale/bytescale-upload-widget/blob/main/MIGRATE.md)
- [Migrating from `react-uploader` to `@bytescale/upload-widget-react`](https://github.com/bytescale/bytescale-upload-widget-react/blob/main/MIGRATE.md)
- [Migrating from `angular-uploader` to `@bytescale/upload-widget-angular`](https://github.com/bytescale/bytescale-upload-widget-angular/blob/main/MIGRATE.md)
- [Migrating from `@upload-io/vue-uploader` to `@bytescale/upload-widget-vue`](https://github.com/bytescale/bytescale-upload-widget-vue/blob/main/MIGRATE.md)
- [Migrating from `@upload-io/jquery-uploader` to `@bytescale/upload-widget-jquery`](https://github.com/bytescale/bytescale-upload-widget-jquery/blob/main/MIGRATE.md)
