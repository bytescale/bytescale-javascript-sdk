describe("Homepage", function () {
  it("should appear", function () {
    browser.get("/");

    const btnBrowse = element(by.css('[data-qa="btn-browse"]'));

    expect(btnBrowse.isDisplayed()).toBeTruthy();
  });
});
