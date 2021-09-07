import { Upload } from "upload-js";
import "regenerator-runtime/runtime.js";

// For local development of Upload.js only: this is not an example of how you should set the API key in your app.
const apiKey: string | undefined = (window as any).UPLOAD_JS_API_KEY;
if (apiKey === undefined) {
  throw new Error("You must set the environment variable 'UPLOAD_JS_API_KEY' before running webpack.");
}

const upload = new Upload({ apiKey });
const button = document.createElement("input");

button.type = "file";
button.innerHTML = "Upload";
button.onchange = upload.createFileHandler({
  onUploaded: (url: string) => {
    console.log(`File uploaded to: ${url}`);
  }
});

document.body.appendChild(button);
