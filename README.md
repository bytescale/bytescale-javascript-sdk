# Upload.js

The upload library that handles everything, including the hosting of your files.

_Note: [you need an API key to use Upload.js](https://upload.io)._

## What does Upload.js do?

Upload.js provides a helper function for the `onchange` attribute for `<input type="file">` elements: the function uploads the selected file to the Upload CDN ([upload.io](https://upload.io)) from where you benefit from:

- Fast downloads: 200+ edge locations across 47 countries.

- Transformations: you can use URL-based transformations to transform any uploaded file on-demand (e.g. resizing images, extracting archives, etc.)

- Security: you can select whether users must be signed-in to your web app before downloading your files, or whether anyone on the Internet can access them.

## Getting started

```bash
npm install upload-js
```

**Examples:**

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

Upload.js provides two packages:

- `upload-js`: the standard package.
- `upload-js-compat`: the compatibility package, designed for older browsers (including IE11).

The browser compatibility of each package is as follows:

| Package          | Browser Support                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| upload-js        | [`> .01%, not dead, not IE 11`](https://browserslist.dev/?q=PiAuMDElLCBub3QgZGVhZCwgbm90IElFIDEx) |
| upload-js-compat | [`> .01%`](https://browserslist.dev/?q=PiAuMDEl)                                                  |

### Using the `upload-js` package

No additional steps are required. Simply follow the [Getting started](#getting-started) section.

### Using the `upload-js-compat` package

The `upload-js-compat` package requires the following additional steps:

1. Install `regenerator-runtime`.
2. Initialize `regenerator-runtime`.

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
