import { FileInputChangeEvent, Upload, UploadError } from "upload-js";

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

  upload.uploadFile(file).then(
    ({ url }) => {
      console.log(`File uploaded: ${url}`);
    },
    error => {
      if (error instanceof UploadError) {
        console.error(`Error: ${error.errorCode}`);
      } else {
        console.error(error);
      }
    }
  );
};

document.body.appendChild(button);
