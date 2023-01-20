import { FileInputChangeEvent, Upload } from "upload-js";

// For local development of Upload.js only: this is not an example of how you should set the API key in your app.
const apiKey: string | undefined = (window as any).UPLOAD_JS_API_KEY;

const upload = Upload({
  apiKey: apiKey ?? "free",
  internal: { apiUrl: (window as any).UPLOAD_JS_API_URL, cdnUrl: (window as any).UPLOAD_JS_CDN_URL }
});

const button = document.createElement("input");

button.id = "upload"; // For acceptance testing
button.type = "file";
button.innerHTML = "Upload";
button.onchange = e => {
  const file = ((e as any) as FileInputChangeEvent).target.files?.[0];
  if (file === undefined) {
    return;
  }

  upload
    .uploadFile(file, {
      path: {
        fileName: "example-{UNIQUE_DIGITS_2}{ORIGINAL_FILE_EXT}"
      },
      tags: ["foo"],
      metadata: {
        hello: "world",
        magic: 42
      }
    })
    .then(
      ({ fileUrl }) => {
        console.log(`File uploaded: ${fileUrl}`);
      },
      error => {
        console.error(error);
      }
    );
};

document.body.appendChild(button);
