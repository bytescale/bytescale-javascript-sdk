<h1 align="center">
  <a href="https://upload.io/upload-js">
    <img alt="Upload.js" width="280" height="78" src="https://raw.githubusercontent.com/upload-io/assets/master/logo.svg">
  </a>
</h1>

<p align="center"><b>The fastest way to upload & transform files.</b></p>
<br/>
<p align="center">
  <a href="https://github.com/upload-js/upload-js/">
    <img src="https://img.shields.io/badge/gzipped-7%20kb-75C46B" />
  </a>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/badge/upload--js-npm-75C46B" />
  </a>

  <a href="https://github.com/upload-js/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/badge/build-passing-75C46B" />
  </a>

  <a target="_blank" href="https://twitter.com/intent/tweet?text=A%20new%20way%20to%20upload%20files%3F%20I%20just%20found%20Upload.js%20%E2%80%94%20it's%20a%20library%20and%20a%20SaaS%20%E2%80%94%20makes%20it%20super%20easy%20to%20add%20file%20uploads%20%26%20transformations%20into%20web%20apps%20%E2%80%94%20installs%20with%207%20lines%20of%20code%20https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js&hashtags=javascript,opensource,js,webdev,developers">
    <img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js%2F" />
  </a>

</p>
<br/>
<p align="center"><a href="https://upload.io/upload-js"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

## 🚀 Get Started — Copy, Paste & Run!

To create a working file upload button, copy-and-paste this:

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v1"></script>
    <script>
      const upload = new Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      const uploadFile = upload.createFileInputHandler({
        onProgress: ({ bytesSent, bytesTotal }) => {
          console.log(`${bytesSent / bytesTotal}% complete`)
        },
        onUploaded: ({ fileUrl, fileId }) => {
          alert(`File uploaded!\n${fileUrl}`);
        },
        onError: (error) => {
          alert(`Error!\n${error.message}`);
        }
      });
    </script>
  </head>
  <body>
    <input type="file" onchange="uploadFile(event)" />
  </body>
</html>
```

### Integrates with Popular Frameworks

Install via NPM:

```shell
npm install upload-js
```

Or via `<script>` tag:

```shell
<script src="https://js.upload.io/upload-js/v1"></script>
```

#### **Uploading Files with React**

```javascript
//
// JSX: <MyUploadButton />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "free" });

const MyUploadButton = () => {
  const uploadFile = upload.createFileInputHandler({
    onProgress: ({ bytesSent, bytesTotal }) => {
      console.log(`${bytesSent / bytesTotal}% complete`)
    },
    onUploaded: ({ fileUrl, fileId }) => {
      alert(`File uploaded!\n${fileUrl}`);
    },
    onError: (error) => {
      alert(`Error!\n${error.message}`);
    }
  });

  return <input type="file" onChange={uploadFile} />;
};
```

#### **Uploading Files with Angular**

```javascript
//
// HTML: <input type="file" on-change="uploadFile" />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "free" });
angular
  .module("exampleApp", [])
  .controller("exampleController", $scope => {
    $scope.uploadFile = upload.createFileInputHandler({
      onProgress: ({ bytesSent, bytesTotal }) => {
        console.log(`${bytesSent / bytesTotal}% complete`)
      },
      onUploaded: ({ fileUrl, fileId }) => {
        alert(`File uploaded!\n${fileUrl}`);
      },
      onError: (error) => {
        alert(`Error!\n${error.message}`);
      }
    });
  })
  .directive("onChange", () => ({
    link: (scope, element, attrs) => {
      element.on("change", scope.$eval(attrs.onChange));
    }
  }));
```

#### **Uploading Files with Vue.js**

```javascript
//
// HTML: <input id="example" type="file" @change="uploadFile" />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "free" });
const uploadFile = upload.createFileInputHandler({
  onProgress: ({ bytesSent, bytesTotal }) => {
    console.log(`${bytesSent / bytesTotal}% complete`)
  },
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded!\n${fileUrl}`);
  },
  onError: (error) => {
    alert(`Error!\n${error.message}`);
  }
});
const vueApp = new Vue({
  el: "#example",
  methods: { uploadFile }
});
```

## ⚡ Transforming Files

### Resizing Images

Given the `fileUrl`:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ
```

Resize it with:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail
```

Autocrop it with:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail-square
```

**Tip:** you can create more transformations [with a full account](https://upload.io/pricing).

### Cropping Images

To crop images using manually-provided crop geometry:

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v1"></script>
    <script>
      const upload = new Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      // Step 1: Upload the original file.
      const onOriginalImageUploaded = ({ fileId, fileUrl: originalImageUrl }) => {

        // Step 2: Configure crop geometry.
        const crop = {
          // Type Def: https://github.com/upload-js/upload-image-plugin/blob/main/src/types/ParamsFromFile.ts
          input: fileId,
          pipeline: {
            steps: [
              {
                geometry: {
                  // Prompt your user for these dimensions...
                  offset: {
                    x: 20,
                    y: 40
                  },
                  size: {
                    // ...and these too...
                    width: 200,
                    height: 100,
                    type: "widthxheight!"
                  }
                },
                type: "crop"
              }
            ]
          }
        }

        // Step 3: Upload the crop geometry.
        const blob = new Blob([JSON.stringify(crop)], {type: "application/json"});
        upload
          .uploadFile({
            file: {
              name: `${fileId}_cropped.json`, // Can be anything.
              type: blob.type,
              size: blob.size,
              slice: (start, end) => blob.slice(start, end)
            }
          })
          .then(
            ({ fileUrl: cropGeometryUrl }) => {

              // Step 4: Done! Here's the cropped image's URL:
              alert(`Cropped image:\n${cropGeometryUrl}/thumbnail`)

            },
            e => console.error(e)
          );
      };

      const uploadFile = upload.createFileInputHandler({
        onUploaded: onOriginalImageUploaded
      });
    </script>
  </head>
  <body>
    <input type="file" onchange="uploadFile(event)" />
  </body>
</html>
```

## 📖 Full Documentation

See the **[Upload.js Documentation](https://upload.io/docs/upload-js)**.

## 🎯 All Features

Upload.js is a small file upload library (7KB) for a powerful file processing platform ([upload.io](https://upload.io/upload-js)).

They work together to provide:

- Simple File Storage & File Hosting. (Zero config: all you need is an Upload API Key.)
- Fast CDN. (Files are served from 300+ locations worldwide.)
- Low-Latency File Transformations. (Resize images, crop images & convert images.)
- Create an [Upload account](https://upload.io/pricing) to further benefit from:
  - Permanent File Storage. (The `"free"` API key provides temporary storage only.)
  - Upload & Download Authentication. (Via your web app using JWTs.)
  - File and Folder Management.
  - Expiring Links.
  - Rate Limiting Controls.
  - Traffic Limiting Controls.
  - Max File Size Controls.
  - IP & File Blacklisting.
  - Usage Monitoring & Dashboards.
  - Custom File Transformations.
  - Custom CNAME.

**[Visit the Upload.js Homepage »](https://upload.io/upload-js)**

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
