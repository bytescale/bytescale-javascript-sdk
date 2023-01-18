import App from "../pageobjects/app.page";

describe("upload-js sandbox", () => {
  it("should contain an upload button", async () => {
    await App.open();

    // @ts-expect-error
    await expect(App.uploadButton).toHaveText("Upload");
  });
});
