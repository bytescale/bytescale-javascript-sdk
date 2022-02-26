<h1 align="center">
  <a href="https://upload.io/upload-js">
    <img alt="Upload.js" width="280" height="78" src="https://raw.githubusercontent.com/upload-io/assets/master/logo.svg">
  </a>
</h1>

<p align="center"><b>The quickest way to upload files.</b></p>
<br/>
<p align="center">
  <a href="https://github.com/upload-js/upload-js/">
    <img src="https://img.shields.io/badge/gzipped-7%20kb-4ba0f6" />
  </a>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/badge/upload--js-npm-4ba0f6" />
  </a>

  <a href="https://github.com/upload-js/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/badge/build-passing-4ba0f6" />
  </a>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/npm/dt/upload-js?color=%234ba0f6" />
  </a>
  <br/>

  <a href="https://github.com/upload-js/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/badge/TypeScript-included-4ba0f6" />
  </a>

  <a href="https://github.com/upload-js/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/npms-io/quality-score/upload-js?color=4ba0f6" />
  </a>

  <a target="_blank" href="https://twitter.com/intent/tweet?text=I%20just%20found%20Upload.js%20%26%20Upload.io%20%E2%80%94%20they%20make%20it%20super%20easy%20to%20upload%20files%20%E2%80%94%20installs%20with%207%20lines%20of%20code%20https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js&hashtags=javascript,opensource,js,webdev,developers&via=UploadJS">
    <img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js%2F" />
  </a>

</p>
<br/>
<p align="center"><a href="https://upload.io/upload-js"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

# 🚀 Get Started — [Try on CodePen](https://codepen.io/upload-js/pen/abVapaJ?editors=1010)

To create a working file upload button, copy this example:

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

## Installation

Install via NPM:

```shell
npm install upload-js
```

Or via a `<script>` tag:

```html
<script src="https://js.upload.io/upload-js/v1"></script>
```

## Use with Popular Frameworks

### Upload Files with React — [Try on CodePen](https://codepen.io/upload-js/pen/jOavBPb?editors=1010)

```javascript
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

### Upload Files with Angular — [Try on CodePen](https://codepen.io/upload-js/pen/qBVMYPK?editors=1010)

```javascript
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

### Upload Files with Vue.js — [Try on CodePen](https://codepen.io/upload-js/pen/BamOvma?editors=1010)

```javascript
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

### Resize Images

Given the `fileUrl`:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ
```

Resize with:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail
```

Autocrop with:

```
https://files.upload.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail-square
```

**Tip:** to create more transformations, please [register an account](https://upload.io/pricing).

### Crop Images — [Try on CodePen](https://codepen.io/upload-js/pen/JjOaWpB?editors=1010)

To crop images using manual geometry:

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

**[See Upload.js Documentation »](https://upload.io/docs/upload-js)**

## 🎯 Features

Upload.js is the lightweight client library for [Upload.io](https://upload.io/upload-js): the file upload service for developers.

**Core features (available without an account):**

- File Storage. (Files stored for 4 hours when using `"free"` as your API key.)
- File Hosting via CDN. (Files served from 100 locations worldwide.)
- Fast Image Transformations. (Resize images, crop images & convert images.)

**All features (available with an account):**

- Permanent Storage. (The `"free"` API key provides temporary storage only.)
- Unlimited Daily Uploads. (The `"free"` API key allows 100 uploads per day per IP.)
- Extended CDN Coverage. (Files are served from 300+ locations worldwide.)
- More File Transformations. (Custom image resizing, cropping, converting, etc.)
- Upload & Download Authentication. (Supports federated auth via your own JWT authorizer.)
- File & Folder Management.
- Expiring Links.
- Custom CNAME.
- Advanced Rules Engine:
  - Rate Limiting.
  - Traffic Limiting.
  - File Size Limiting.
  - IP Blacklisting.
  - File Type Blacklisting.
  - And More...


**[Create your account »](https://upload.io/pricing)**

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
