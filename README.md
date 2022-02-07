<h1 align="center">
  <a href="https://upload.io/upload-js">
    <img alt="Upload.js" width="280" height="78" src="https://raw.githubusercontent.com/upload-io/assets/master/logo.svg">
  </a>
</h1>

<p align="center"><b>The easiest way to upload & transform files.</b></p>
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

## ⚙️ Prerequisites

1.  [Create an Upload account](https://upload.io/) (it only takes a few seconds).

2.  Install Upload.js:

    ```bash
    npm install upload-js
    ```

    Or:

    ```html
    <script src="https://js.upload.io/upload-js/v1"></script>
    ```

## 🎯 Features

Upload.js is a small file upload library (7KB) for a powerful file processing platform ([upload.io](https://upload.io/upload-js)).

You can use them together to:

- Upload files with [7 lines of code](#-examples). (Files are uploaded to the Upload CDN.)
- Download files with minimal latency. (Our CDN covers 200+ locations worldwide.)
- Secure your files. (Upload.js can integrate with your app's auth layer to decide who can download files.)
- Transform files. (Upload.js uses a plugin-based architecture: you can build your own transformations.)
- Resize images, crop images & convert images. (Upload.js offers many transformations out-the-box.)
- And much more, [explore Upload.js](https://upload.io/docs/upload-js).

## 👀 Examples

#### 📖 **Uploading Files (Plain HTML & JS)**

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v1"></script>
    <script>
      const upload = new Upload({

        // Replace with your API key. (Get from: https://upload.io/)
        apiKey: "..."

      });
      const uploadFile = upload.createFileInputHandler({
        onUploaded: ({ fileUrl, fileId }) => {
          alert(`File uploaded!\n${fileUrl}`);
        }
      });
    </script>
  </head>
  <body>
    <input type="file" onchange="uploadFile(event)" />
  </body>
</html>
```

#### 📖 **Uploading Files (React)**

```javascript
//
// JSX: <MyUploadButton />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "..." });

const MyUploadButton = () => {
  const uploadFile = upload.createFileInputHandler({
    onUploaded: ({ fileUrl, fileId }) => {
      alert(`File uploaded!\n${fileUrl}`);
    }
  });

  return <input type="file" onChange={uploadFile} />;
};
```

#### 📖 **Uploading Files (Angular)**

```javascript
//
// HTML: <input type="file" on-change="uploadFile" />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "..." });
angular
  .module("exampleApp", [])
  .controller("exampleController", $scope => {
    $scope.uploadFile = upload.createFileInputHandler({
      onUploaded: ({ fileUrl, fileId }) => {
        alert(`File uploaded!\n${fileUrl}`);
      }
    });
  })
  .directive("onChange", () => ({
    link: (scope, element, attrs) => {
      element.on("change", scope.$eval(attrs.onChange));
    }
  }));
```

#### 📖 **Uploading Files (Vue.js)**

```javascript
//
// HTML: <input id="example" type="file" @change="uploadFile" />
//
const { Upload } = require("upload-js");
const upload = new Upload({ apiKey: "..." });
const uploadFile = upload.createFileInputHandler({
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded!\n${fileUrl}`);
  }
});
const vueApp = new Vue({
  el: "#example",
  methods: { uploadFile }
});
```

## Transforming Files

### Resizing Images

To resize an image:


1. Login to the [Upload Dashboard](https://upload.io/dashboard).
2. Click 'Transformations' in the side navigation.
3. Click 'Create a transformation' -> 'Transform an image'
4. Complete the transformation wizard.
5. Copy the resulting transformation URL, e.g.:
   ```
   https://files.upload.io/<file_id>/jpg;w=400
   ```
6. Substitute `<file_id>` with a real file ID (for an image).
7. The returned file will be the resized image.

### Cropping Images

This example assumes you'll be collecting crop geometry from the user (i.e. through a UI component you've built).

This code works by uploading the original image to Upload.io, and then uploading the crop dimensions as a secondary metadata file. When the metadata file is downloaded via an image transformation (see above) the output will be the cropped image.

See below:

```html
<html>
  <head>
    <script src="https://js.upload.io/upload-js/v1"></script>
    <script>
      const upload = new Upload({
        // Replace with your API key. (Get from: https://upload.io/)
        apiKey: "..."
      });

      // Step 1: Wait for the original file to upload...
      const onOriginalImageUploaded = ({ fileId, fileUrl: originalImageUrl }) => {

        // Step 2: Create your crop metadata.
        const crop = {
          // Full type definition:
          // https://github.com/upload-js/upload-image-plugin/blob/main/src/types/ParamsFromFile.ts
          input: fileId,
          pipeline: {
            steps: [
              {
                geometry: {
                  // Prompt your user for this...
                  offset: {
                    x: 20,
                    y: 40
                  },
                  size: {
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

        // Step 3: Turn crop metadata into a BLOB.
        const blob = new Blob([JSON.stringify(crop)], {type: "application/json"});

        // Step 4: Upload the crop metadata.
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
            // Step 5: Wait for the crop metadata to upload...
            ({ fileUrl: croppedImageUrl }) => {
              // Step 6: Get the cropped image by appending an image transformation slug (e.g. '/jpg') to the crop metadata file's URL.
              //         Note: '/jpg' is only illustrative -- you must use a transformation slug you've configured in the Upload Dashboard.
              alert(`Original image:\n${originalImageUrl}\n\nCropped image:\n${croppedImageUrl}/jpg`)
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

Note: with this approach you can reuse the same original image with multiple different crops (say if the user later changes their mind on the cropping dimensions), so you don't need to keep re-uploading the same original image.

---

**Note: in future we'll provide a UI component that performs this flow out of the box.**

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (only if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
