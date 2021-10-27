# Upload.js

**New library: launched December 2021!**

How to use:

1.  [Create an Upload.js account](https://upload.io).

2.  Grab your API key.

3.  Use one of [the examples](#examples) to create an upload button!

## What does Upload.js do?

**Upload.js makes it incredibly easy to add file uploads and file transformations to your website.**

Upload.js is both a platform ([upload.io](https://upload.io/)) and an NPM package (`upload-js`): the platform provides beautiful dashboards to monitor usage and for creating URL-based file transformations, while the NPM package provides a lightweight helper function for easily adding file upload buttons to your website.

Upload.js benefits:

- **🚀 Fast uploads & downloads** 

  Our CDN covers 200+ edge locations across 47 countries.

- **🏗 URL-based transformations**

  Transform any uploaded file on-demand, e.g. resizing images, extracting archives, etc.

- **🔓 File security**

  Limit downloads to only the signed-in users of your web app, or grant access to everyone on the Internet.

## Getting started

### Installing Upload.js

```bash
npm install upload-js
```

Or:

```html
<script src="https://js.upload.io/upload-js/v1"></script>
```

## Documentation

See: [Upload.js documentation](https://upload.io/docs/upload-js).

## Examples

- [Plain HTML](#plain-html)
- [React](#react)
- [Vue.js](#vuejs)
- [Angular](#angular)

### Plain HTML

#### `index.html`

```html
<input type="file" onchange="uploadFile(event)" />
```

#### `index.js`

```javascript
var upload = new Upload({ apiKey: "..." });
var uploadFile = upload.createFileInputHandler({
  onUploaded: ({ fileUrl, fileId }) => {
    alert(`File uploaded! ${fileUrl}`);
  }
});
```

### React

#### `index.js`

```javascript
var { Upload } = require("upload-js");
var upload = new Upload({ apiKey: "..." });

var UploadButton = () => {
  var uploadFile = upload.createFileInputHandler({
    onUploaded: ({ fileUrl, fileId }) => {
      alert(`File uploaded! ${fileUrl}`);
    }
  });

  return <input type="file" onChange={uploadFile} />;
};

ReactDOM.render(<UploadButton />, document.querySelector("body"));
```

### Vue.js

#### `index.html`

```html
<input id="example" type="file" @change="uploadFile" />
```

#### `index.js`

```javascript
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

### Angular

#### `index.html`

```html
<input type="file" on-change="uploadFile" />
```

#### `index.js`

```javascript
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

## Browser compatibility

Supported browsers: [`> .01%`](https://browserslist.dev/?q=PiAuMDEl)

_Note: some of these browsers will require polyfills ([`POLYFILLS.md`](POLYFILLS.md))._
