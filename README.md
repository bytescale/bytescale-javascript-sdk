# Upload.js

The upload library that handles everything, including the hosting of your files.

_Note: [you need an API key to use Upload.js](https://upload.io)._

## What does Upload.js do?

Upload.js provides a helper function for the `onchange` attribute for `<input type="file">` elements: the function uploads the selected file to the Upload CDN ([upload.io](https://upload.io)) from where your files benefit from:

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

Supported browsers: [`> .01%`](https://browserslist.dev/?q=PiAuMDEl)

_Note: some of these browsers will require polyfills ([`POLYFILLS.md`](POLYFILLS.md))._
