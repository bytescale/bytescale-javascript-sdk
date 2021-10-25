# Upload.js

Upload.js is the file upload library that handles everything, including the hosting of your files.

Note: [you need an API key to use Upload.js](https://upload.io).

## What does Upload.js do?

Upload.js provides a helper function for the `onchange` attribute for `<input type="file" ... />`: the function automatically uploads the selected file to [`upload.io`](https://upload.io), which then becomes hosted on the Upload CDN.

Files hosted on the Upload CDN benefit from:

- Transformations: you can easily transform any file hosted on the Upload CDN (e.g. resizing images, extracting archives, etc.)

- Security: you can select whether users must be signed-in to your web app before downloading any of your uploaded files.

- Fast downloads: 200+ edge locations across 47 countries. Files hosted on the Upload CDN download with **minimal** latency.

## Getting started

```bash
npm install upload-js
```

**Examples:**

- [Plain HTML](#Plain HTML)
- [React](#React)
- [Vue.js](#Vue.js)
- [Angular](#Angular)

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

## Cross-browser support

Upload.js provides two packages:

- `upload-js`: the standard package.
- `upload-js-compat`: the compatibility package, designed for older browsers (including IE11).

The browser compatibility of each package is as follows:

| Package          | Browser Support                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| upload-js        | [`> .01%, not dead, not IE 11`](https://browserslist.dev/?q=PiAuMDElLCBub3QgZGVhZCwgbm90IElFIDEx) |
| upload-js-compat | [`> .01%`](https://browserslist.dev/?q=PiAuMDEl)                                                  |

### Using the `upload-js` package

No additional steps required (just follow the [Getting started](#Getting started) section).

### Using the `upload-js-compat` package

The `upload-js-compat` package requires the following additional steps:

1. Install [`regenerator-runtime`](https://www.npmjs.com/package/regenerator-runtime).
2. Initialize [`regenerator-runtime`](https://www.npmjs.com/package/regenerator-runtime).

Installing with NPM:

```bash
npm install regenerator-runtime
```

Initializing the runtime:

```javascript
import "regenerator-runtime/runtime.js";
import { Upload } from "upload-js-compat";
```

**Or:**

```html
<script src="https://unpkg.com/regenerator-runtime@0.13.9/runtime.js"></script>
<script src="https://js.upload.io/upload-js-compat/v1"></script>
```
