/* eslint-disable @typescript-eslint/explicit-function-return-type */

class App {
  /**
   * elements
   */
  get uploadButton() {
    return $("#upload");
  }

  /**
   * methods
   */
  async open(path = "/") {
    await browser.url(path);
  }
}

export default new App();
