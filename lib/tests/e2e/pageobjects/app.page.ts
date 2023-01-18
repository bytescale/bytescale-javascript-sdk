/* eslint-disable @typescript-eslint/explicit-function-return-type */

class App {
  /**
   * elements
   */
  get uploadButton() {
    // @ts-expect-error
    return $("#upload");
  }

  /**
   * methods
   */
  async open(path = "/") {
    // @ts-expect-error
    await browser.url(path);
  }
}

export default new App();
