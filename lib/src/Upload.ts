import { CancellablePromise } from "upload-js/CommonTypes";
import { Cancellation } from "upload-js/Errors";

export class Upload {
  constructor(private readonly apiKey: string) {}

  createFileHandler(onUpload: (url: string) => void, onError?: (reason: any) => void): (file: File) => void {
    return (file: File) => {
      this.uploadFile(file, () => {}).promise.then(
        ({ uploadedFileURL }) => onUpload(uploadedFileURL),
        error => {
          if (onError !== undefined) {
            onError(error);
          } else {
            console.error(
              "Cannot upload file. To remove this console message, handle the error explicitly by providing a second callback parameter: upload.createFileHandler(onUpload, onError)",
              error
            );
          }
        }
      );
    };
  }

  uploadFile(
    file: File,
    progress: (status: { bytesSent: number; bytesTotal: number }) => void
  ): CancellablePromise<{ uploadedFileURL: string }> {
    // Initial progress, raised immediately and synchronously.
    progress({ bytesSent: 0, bytesTotal: file.size });

    const xhr = new XMLHttpRequest();
    const cancel = (): void => xhr.abort();
    const promise = new Promise<{ uploadedFileURL: string }>((resolve, reject) => {
      xhr.upload.addEventListener(
        "progress",
        evt => {
          if (evt.lengthComputable) {
            progress({ bytesSent: evt.loaded, bytesTotal: evt.total });
          }
        },
        false
      );
      xhr.addEventListener("load", () => {
        if (Math.floor(xhr.status / 100) === 2) {
          let json;
          try {
            json = JSON.parse(xhr.response);
          } catch {}
          if (json !== undefined) {
            resolve(json);
          } else {
            reject(new Error(`File upload error: unexpected response from server.`));
          }
        } else {
          reject(new Error(`File upload error: status code ${xhr.status}`));
        }
      });

      xhr.onabort = () => reject(new Cancellation("File upload cancelled."));
      xhr.onerror = () => reject(new Error("File upload error."));
      xhr.ontimeout = () => reject(new Error("File upload timeout."));

      const formData = new FormData();
      formData.append("file", file);
      xhr.setRequestHeader("Authorization", `Basic ${btoa(`api:${this.apiKey}`)}`);
      xhr.open("POST", `https://api.upload.io/files`);
      xhr.send(formData);
    });

    return { promise, cancel };
  }
}
