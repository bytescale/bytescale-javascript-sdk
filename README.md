<h1 align="center">
  <a href="https://upload.io/">
    <img alt="Upload.js" width="280" height="50" src="https://raw.githubusercontent.com/upload-io/assets/master/logo.svg">
  </a>
</h1>

<p align="center"><b>File uploads & transformations made easy.</b></p>
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

  <a href="https://twitter.com/intent/tweet?text=A%20new%20way%20to%20upload%20files%3F%20Upload.js%20lets%20you%20resize%2C%20crop%20and%20convert%20uploaded%20images%20%E2%80%94%20they%20take%20care%20of%20the%20file%20hosting%20%E2%80%94%20only%20needs%207%20lines%20of%20code%20to%20install%20https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js&hashtags=javascript,opensource,js,webdev,developers">
    <img alt="Twitter URL" src="https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2Fupload-js%2Fupload-js%2F" />
  </a>

</p>
<br/>
<p align="center"><a href="https://github.com/upload-js/upload-js/"><img alt="Upload.js Demo" width="100%" src="https://raw.githubusercontent.com/upload-io/assets/master/upload-js-demo.gif"></a></p>

## 🚀 Quickstart

```javascript
//
// <input type="file" onchange="uploadMyFile(event)" />
//
var upload = new Upload({ apiKey: "..." });
var uploadMyFile = upload.createFileInputHandler({
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded! ${fileUrl}`);
  }
});
```

## ⚙️ Prerequisites

1.  You must have an [Upload.js account](https://upload.io).

2.  You also need to install Upload.js:

    ```bash
    npm install upload-js
    ```

    Or:

    ```html
    <script src="https://js.upload.io/upload-js/v1"></script>
    ```

## 🎯 Features

Upload.js is a small file upload library (7KB) powered by a powerful file processing platform ([upload.io](https://upload.io/)).

You can use them together to:

- Upload files with [7 lines of code](#-examples). (Files are uploaded to the Upload CDN.)
- Download files with minimal latency. (Our CDN covers 200+ locations worldwide.)
- Limit file access. (Upload.js can integrate with your app's auth layer to decide who can download files.)
- Custom file transformations. (Build custom transformation plugins for the Upload CDN using JavaScript.)
- Resize images, crop images & convert images.
- And much more, [explore Upload.js](https://upload.io/docs/upload-js).

## 👀 Examples

#### 📖 **Uploading Files (React)**

```javascript
//
// <MyUploadButton />
//
var { Upload } = require("upload-js");
var upload = new Upload({ apiKey: "..." });

var MyUploadButton = () => {
  var uploadFile = upload.createFileInputHandler({
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
// <input type="file" on-change="uploadFile" />
//
var upload = new Upload({ apiKey: "..." });
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
// <input id="example" type="file" @change="uploadFile" />
//
var upload = new Upload({ apiKey: "..." });
var uploadFile = upload.createFileInputHandler({
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded! ${fileUrl}`);
  }
});
var vueApp = new Vue({
  el: "#example",
  methods: { uploadFile }
});
```

#### 📖 **Uploading Files (Plain HTML & JS)**

```javascript
//
// <input type="file" onchange="uploadFile(event)" />
//
var upload = new Upload({ apiKey: "..." });
var uploadFile = upload.createFileInputHandler({
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded! ${fileUrl}`);
  }
});
```

## Contribute

If you would like to contribute to Upload.js:

1. Add a [GitHub Star](https://github.com/upload-js/upload-js/stargazers) to the project (if you're feeling nice!).
2. Determine whether you're raising a bug, feature request or question.
3. Raise your issue or PR. 🚀

## License

[MIT](LICENSE)
