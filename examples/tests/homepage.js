describe("Homepage", function () {
  it("should appear", function () {
    browser.get("/");

    const btnBrowse = element(by.css("input"));

    expect(btnBrowse.isDisplayed()).toBeTruthy();
  });
});
