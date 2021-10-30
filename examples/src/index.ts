import { Upload } from "upload-js";

// For local development of Upload.js only: this is not an example of how you should set the API key in your app.
const apiKey: string | undefined = (window as any).UPLOAD_JS_API_KEY;
if (apiKey === undefined) {
  throw new Error("You must set the environment variable 'UPLOAD_JS_API_KEY' before running webpack.");
}

const upload = new Upload({
  apiKey,
  internal: { apiUrl: (window as any).UPLOAD_JS_API_URL, cdnUrl: (window as any).UPLOAD_JS_CDN_URL }
});
const button = document.createElement("input");

button.id = "upload"; // For acceptance testing
button.type = "file";
button.innerHTML = "Upload";
button.onchange = upload.createFileInputHandler({
  onUploaded: ({ fileUrl }) => {
    console.log(`File uploaded to: ${fileUrl}`);
  }
}) as any;

document.body.appendChild(button);
