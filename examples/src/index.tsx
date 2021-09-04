import { Upload } from "upload-js";

const upload = new Upload("api-key-x821352641031");
const button = document.createElement("input");

button.type = "file";
button.innerHTML = "Upload";
button.onchange = upload.createFileHandler((url: string) => {
  console.log(`File uploaded to: ${url}`);
}) as any;

document.body.appendChild(button);
