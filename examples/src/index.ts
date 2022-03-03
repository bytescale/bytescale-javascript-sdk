import { Upload, UploadError } from "upload-js";

// For local development of Upload.js only: this is not an example of how you should set the API key in your app.
const apiKey: string | undefined = (window as any).UPLOAD_JS_API_KEY;

const upload = new Upload({
  apiKey: apiKey ?? "free",
  internal: { apiUrl: (window as any).UPLOAD_JS_API_URL, cdnUrl: (window as any).UPLOAD_JS_CDN_URL }
});

const button = document.createElement("input");

button.id = "upload"; // For acceptance testing
button.type = "file";
button.innerHTML = "Upload";
button.onchange = upload.createFileInputHandler({
  onUploaded: ({ fileUrl }) => {
    console.log(`File uploaded to: ${fileUrl}`);
  },
  onError: error => {
    if (error instanceof UploadError) {
      alert(error.errorCode);
    } else {
      alert(error);
    }
  }
}) as any;

document.body.appendChild(button);
