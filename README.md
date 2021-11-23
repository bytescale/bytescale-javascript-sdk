<h1 align="center">
  <a href="https://upload.io/">
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
<p align="center"><a href="https://github.com/upload-js/upload-js/"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

## ⚙️ Prerequisites

1.  [Create an Upload account](https://upload.io) (it only takes a few seconds).

2.  Install Upload.js:

    ```bash
    npm install upload-js
    ```

    Or:

    ```html
    <script src="https://js.upload.io/upload-js/v1"></script>
    ```

## 🎯 Features

Upload.js is a small file upload library (7KB) for a powerful file processing platform ([upload.io](https://upload.io/)).

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
          alert(`File uploaded! ${fileUrl}`);
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
      alert(`File uploaded! ${fileUrl}`);
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
        alert(`File uploaded! ${fileUrl}`);
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
    alert(`File uploaded! ${fileUrl}`);
  }
});
const vueApp = new Vue({
  el: "#example",
  methods: { uploadFile }
});
```

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (only if you're feeling generous!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
