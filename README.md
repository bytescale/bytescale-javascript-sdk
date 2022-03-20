<h1 align="center">
  <a href="https://upload.io/upload-js">
    <img alt="Upload.js" width="280" height="78" src="https://raw.githubusercontent.com/upload-io/assets/master/logo.svg">
  </a>
</h1>

<p align="center"><b>JavaScript File Upload Library</b><br/> (With Integrated Cloud Storage)</p>
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

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/badge/TypeScript-included-4ba0f6" />
  </a>

  <a href="https://github.com/upload-js/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/npms-io/maintenance-score/upload-js?color=4ba0f6" />
  </a>

  <a target="_blank" href="https://twitter.com/intent/tweet?text=I%20just%20found%20Upload.js%20%26%20Upload.io%20%E2%80%94%20they%20make%20it%20super%20easy%20to%20upload%20files%20%E2%80%94%20installs%20with%207%20lines%20of%20code%20https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js&hashtags=javascript,opensource,js,webdev,developers&via=UploadJS">
    <img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js%2F" />
  </a>

</p>
<h1 align="center">
  Get Started —
  <a href="https://codepen.io/upload-js/pen/abVapaJ?editors=1010">
    Try on CodePen
  </a>
</h1>

<p align="center"><a href="https://upload.io/upload-js"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

<p align="center">Files are hosted on <a href="https://upload.io/">Upload.io</a>: the file upload service for developers.<br/><br/></p>

## Installation

Install via NPM:

```shell
npm install upload-js
```

Or via NPM:

```shell
yarn add upload-js
```

Or via a `<script>` tag:

```html
<script src="https://js.upload.io/upload-js/v1"></script>
```

## Usage

### Option 1: Use an `<input>` element  — [Try on CodePen](https://codepen.io/upload-js/pen/abVapaJ?editors=1010)

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

### Option 2: Use a `File` object — [Try on CodePen](https://codepen.io/upload-js/pen/qBVgbqZ?editors=1010)

If you have a `File` object already, use the `upload.uploadFile(...)` method:

```javascript
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "free" });

const onFileInputChange = async event => {
  const fileObject = event.target.files[0];

  const { fileUrl, fileId } = await upload.uploadFile({
    file: fileObject,
    onProgress: ({ bytesSent, bytesTotal }) => {
      console.log(`${bytesSent / bytesTotal}% complete`)
    }
  });

  alert(`File uploaded to: ${fileUrl}`);
}
```

### Option 3: Use our UI widget — [Try on CodePen](https://codepen.io/upload-js/pen/QWOZWZR?editors=1010)

**[Uploader](https://upload.io/uploader)** is our file & image upload widget, powered by Upload.js.

Uploader has a larger payload size (29kB) compared to Upload.js (7kB), but if you're writing a file upload UI component, it could save you time: Uploader provides things like progress bars and cancellation out-the-box.

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

### Upload Files with jQuery — [Try on CodePen](https://codepen.io/upload-js/pen/BamOMPd?editors=1010)

```html
<html>
  <head>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://js.upload.io/upload-js/v1"></script>
    <script>
      const upload = new Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      $(() => {
        $("#file-input").change(
          upload.createFileInputHandler({
            onBegin: () => {
              $("#file-input").hide()
            },
            onProgress: ({ bytesSent, bytesTotal }) => {
              const progress = Math.round(bytesSent / bytesTotal * 100)
              $("#title").html(`File uploading... ${progress}%`)
            },
            onError: (error) => {
              $("#title").html(`Error:<br/><br/>${error.message}`)
            },
            onUploaded: ({ fileUrl, fileId }) => {
              $("#title").html(`
                File uploaded:
                <br/>
                <br/>
                <a href="${fileUrl}" target="_blank">${fileUrl}</a>`
              )
            }
          })
        )
      })
    </script>
  </head>
  <body>
    <h1 id="title">Please select a file...</h1>
    <input type="file" id="file-input" />
  </body>
</html>
```

### Upload Multiple Files with jQuery — [Try on CodePen](https://codepen.io/upload-js/pen/JjOawge?editors=1010)

Please refer to the CodePen example (link above).

Overview of the code:

1. Instantiate `Upload` once in your app (at the start).
2. Call `createFileInputHandler` once for each file `<input>` element.
3. Use `onProgress` to display the upload progress for each input element.
4. When `onUploaded` fires, record the `fileUrl` from the callback's argument to a local variable.
5. When `onUploaded` has fired for all files, the form is ready to be submitted.

Note: file uploads will safely run in parallel, despite using the same `Upload` instance.

### Force File Downloads

By default, the browser will attempt to render uploaded files:

```
https://upcdn.io/W142hJkHhVSQ5ZQ5bfqvanQ
```

To force a file to download, add `?download=true` to the file's URL:

```
https://upcdn.io/W142hJkHhVSQ5ZQ5bfqvanQ?download=true
```

### Resize Images

Given an uploaded image URL:

```
https://upcdn.io/W142hJkHhVSQ5ZQ5bfqvanQ
```

Resize with:

```
https://upcdn.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail
```

Auto-crop with:

```
https://upcdn.io/W142hJkHhVSQ5ZQ5bfqvanQ/thumbnail-square
```

**Tip:** to create more transformations, please [register an account](https://upload.io/pricing).

### Crop Images — [Try on CodePen](https://codepen.io/upload-js/pen/JjOaWpB?editors=1010)

To crop images using manually-provided geometry:

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

## 📖 Documentation

**[See Upload.js Documentation »](https://upload.io/docs/upload-js)**

## 🎯 Features

Upload.js is the JavaScript client library for [Upload.io](https://upload.io/upload-js): the file upload service for developers.

**Core features:**

- File Storage. (Files stored for 4 hours with the `"free"` API key.)
- File Hosting via CDN. (Files served from 100 locations worldwide.)
- Fast Image Transformations. (Resize images, crop images & convert images.)

**Available with an account:**

- Permanent Storage. (The `"free"` API key provides temporary storage only.)
- Unlimited Daily Uploads. (The `"free"` API key allows 100 uploads per day per IP.)
- Extended CDN Coverage. (Files served from 300+ locations worldwide.)
- More File Transformations. (Custom image resizing, cropping, converting, etc.)
- Upload & Download Authentication. (Supports federated auth via your own JWT authorizer.)
- File & Folder Management.
- Expiring Links.
- Custom CNAME.
- Advanced Upload Control:
  - Rate Limiting.
  - Traffic Limiting.
  - File Size Limiting.
  - IP Blacklisting.
  - File Type Blacklisting.
  - And More...

**[Create an Upload.io account »](https://upload.io/pricing)**

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
