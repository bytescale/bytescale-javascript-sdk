<h1 align="center">
  <a href="https://upload.io/upload-js">
    <img alt="Upload.js" width="315" height="93" src="https://raw.githubusercontent.com/upload-io/upload-js/main/.github/assets/logo.svg">
  </a>
</h1>
<p align="center"><b>JavaScript File Upload Library</b><br/> (With Integrated Cloud Storage)</p>
<br/>
<p align="center">
  <a href="https://github.com/upload-io/upload-js/">
    <img src="https://img.shields.io/badge/gzipped-6%20kb-4ba0f6" />
  </a>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/badge/upload--js-npm-4ba0f6" />
  </a>

  <a href="https://github.com/upload-io/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/badge/build-passing-4ba0f6" />
  </a>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/npm/dt/upload-js?color=%234ba0f6" />
  </a>
  <br/>

  <a href="https://www.npmjs.com/package/upload-js">
    <img src="https://img.shields.io/badge/TypeScript-included-4ba0f6" />
  </a>

  <a href="https://github.com/upload-io/upload-js/actions/workflows/ci.yml">
    <img src="https://img.shields.io/npms-io/maintenance-score/upload-js?color=4ba0f6" />
  </a>

  <a target="_blank" href="https://twitter.com/intent/tweet?text=I%20just%20found%20Upload.js%20%26%20Upload.io%20%E2%80%94%20they%20make%20it%20super%20easy%20to%20upload%20files%20%E2%80%94%20installs%20with%207%20lines%20of%20code%20https%3A%2F%2Fgithub.com%2Fupload-io%2Fupload-js&hashtags=javascript,opensource,js,webdev,developers&via=UploadJS">
    <img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fupload-io%2Fupload-js%2F" />
  </a>

</p>
<h1 align="center">
  Get Started —
  <a href="https://codepen.io/upload-js/pen/abVapaJ?editors=1000">
    Try on CodePen
  </a>
</h1>

<p align="center"><a href="https://upload.io/upload-js"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

<p align="center">100% Serverless File Upload Library  <br /> Powered by <a href="https://upload.io/">Upload.io</a><br/><br/></p>

<hr/>

<p align="center"><a href="https://upload.io/dmca" rel="nofollow">DMCA Compliant</a> • <a href="https://upload.io/dpa" rel="nofollow">GDPR Compliant</a> • <a href="https://upload.io/sla" rel="nofollow">99.9% Uptime SLA</a>
  <br/>
  <b>Supports:</b> Rate Limiting, Volume Limiting, File Size &amp; Type Limiting, JWT Auth, and more...
  <br />
</p>

<hr/>
<br />
<br />

## Installation

Install via NPM:

```shell
npm install upload-js
```

Or via YARN:

```shell
yarn add upload-js
```

Or via a `<script>` tag:

```html
<script src="https://js.upload.io/upload-js/v2"></script>
```

## Usage — [Try on CodePen](https://codepen.io/upload-js/pen/abVapaJ?editors=1000)

To upload a file from the browser:

```JavaScript
//
// <input type="file" onchange="onFileSelected(event)" />
//

import { Upload } from "upload-js";

const upload = Upload({ apiKey: "free" }); // Get production API keys from Upload.io

const onFileSelected = async (event) => {
  const [ file ]    = event.target.files;
  const { fileUrl } = await upload.uploadFile(file, { onProgress });
  console.log(`File uploaded: ${fileUrl}`);
}

const onProgress = ({ progress }) => {
  console.log(`File uploading: ${progress}% complete.`)
}
```


## Full Working Example (Copy & Paste)

**[Try on CodePen](https://codepen.io/upload-js/pen/abVapaJ?editors=1000)** / **Copy to IDE & Run:**

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v2"></script>
    <script>
      const upload = Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      const onFileSelected = async (event) => {
        try {
          const { fileUrl } = await upload.uploadFile(
            event.target.files[0],
            { onProgress: ({ progress }) => console.log(`${progress}% complete`) }
          );
          alert(`File uploaded!\n${fileUrl}`);
        } catch (e) {
          alert(`Error!\n${e.message}`);
        }
      }
    </script>
  </head>
  <body>
    <input type="file" onchange="onFileSelected(event)" />
  </body>
</html>
```

## Examples with Popular Frameworks

### Upload Files with React — [Try on CodePen](https://codepen.io/upload-js/pen/jOavBPb?editors=1010)

```javascript
const { Upload } = require("upload-js");
const upload = Upload({ apiKey: "free" });

const MyUploadButton = () => {
  const onFileSelected = async (event) => {
    try {
      const { fileUrl } = await upload.uploadFile(
        event.target.files[0],
        { onProgress: ({ progress }) => console.log(`${progress}% complete`) }
      );
      alert(`File uploaded!\n${fileUrl}`);
    } catch (e) {
      alert(`Error!\n${e.message}`);
    }
  }

  return <input type="file" onChange={onFileSelected} />;
};
```

### Upload Files with Angular — [Try on CodePen](https://codepen.io/upload-js/pen/qBVMYPK?editors=1010)

```javascript
const { Upload } = require("upload-js");
const upload = Upload({ apiKey: "free" });
angular
  .module("exampleApp", [])
  .controller("exampleController", $scope => {
    $scope.uploadFile = async (event) => {
      try {
        const { fileUrl } = await upload.uploadFile(
          event.target.files[0],
          { onProgress: ({ progress }) => console.log(`${progress}% complete`) }
        );
        alert(`File uploaded!\n${fileUrl}`);
      } catch (e) {
        alert(`Error!\n${e.message}`);
      }
    }
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
const upload = Upload({ apiKey: "free" });
const uploadFile = async (event) => {
  try {
    const { fileUrl } = await upload.uploadFile(
      event.target.files[0],
      { onProgress: ({ progress }) => console.log(`${progress}% complete`) }
    );
    alert(`File uploaded!\n${fileUrl}`);
  } catch (e) {
    alert(`Error!\n${e.message}`);
  }
}
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
    <script src="https://js.upload.io/upload-js/v2"></script>
    <script>
      const upload = Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      $(() => {
        $("#file-input").change(async (event) => {
          $("#file-input").hide()

          try {
            const { fileUrl } = await upload.uploadFile(
              event.target.files[0], {
              onProgress: ({ progress }) => $("#title").html(`File uploading... ${progress}%`)
            });

            $("#title").html(`
              File uploaded:
              <br/>
              <br/>
              <a href="${fileUrl}" target="_blank">${fileUrl}</a>`
            )
          } catch (e) {
            $("#title").html(`Error:<br/><br/>${e.message}`)
          }

        })
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

1. Call `Upload` once at the start of your app.
2. Call `uploadFile` from your `<input onchange="...">` handlers.
3. Use `onProgress` to display the upload progress for each input element.
4. When `onUploaded` fires, record the `fileUrl` from the callback's argument to a local variable.
5. When `onUploaded` has fired for all files, the form is ready to be submitted.

Note: file uploads will safely run in parallel, despite using the same `Upload` instance.

### Resize Images

Given an uploaded image URL:

```
https://upcdn.io/W142hJk/raw/HhVSQ5ZQ5bfqvanQ
```

Resize with:

```
https://upcdn.io/W142hJk/thumbnail/HhVSQ5ZQ5bfqvanQ
```

Auto-crop (to square dimensions) with:

```
https://upcdn.io/W142hJk/thumbnail-square/HhVSQ5ZQ5bfqvanQ
```

**Tip:** for more transformations, please [create an account](https://upload.io/pricing).

### Crop Images — [Try on CodePen](https://codepen.io/upload-js/pen/JjOaWpB?editors=1010)

To crop images using manually-provided geometry:

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v2"></script>
    <script>
      const upload = Upload({
        // Get production API keys from Upload.io
        apiKey: "free"
      });

      // Step 1: Upload the original file.
      const onOriginalImageUploaded = async (originalImage) => {

        // Step 2: Configure crop geometry.
        const crop = {
          // Type Def: https://github.com/upload-io/upload-image-plugin/blob/main/src/types/ParamsFromFile.ts
          inputPath: originalImage.filePath,
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
        const croppedImage = await upload.uploadFile(blob);

        // Step 4: Done! Here's the cropped image:
        return croppedImage;
      };

      const onFileSelected = async (event) => {
        const [ file ]      = event.target.files;
        const originalImage = await upload.uploadFile(file);
        const croppedImage  = await onOriginalImageUploaded(originalImage)

        alert(`Cropped image:\n${croppedImage.fileUrl.replace("/raw/", "/thumbnail/")}`)
      }
    </script>
  </head>
  <body>
    <input type="file" onchange="onFileSelected(event)" />
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

## Need a File Upload Widget?

**[See Uploader »](https://upload.io/uploader)**

Uploader is a lightweight file upload widget, powered by Upload.js:

<p align="center"><a href="https://upload.io/uploader"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/jquery-uploader/main/.github/assets/demo.webp"></a></p>

## Building From Source

Please read: [`BUILD.md`](BUILD.md)

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-io/upload-js/stargazers) to the project (if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
