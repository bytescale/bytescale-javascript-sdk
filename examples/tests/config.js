const jasmineReporters = require("jasmine-reporters");
const HtmlScreenshotReporter = require("protractor-jasmine2-screenshot-reporter");

const testReportFolders = "tmp/test-report";

const junitReporter = new jasmineReporters.JUnitXmlReporter({
  consolidateAll: true,
  savePath: testReportFolders
});
const screenshotReporter = new HtmlScreenshotReporter({
  dest: testReportFolders,
  filename: "screenshots.html"
});

exports.config = {
  specs: ["homepage.js"],
  baseUrl: "http://localhost:3001/",
  directConnect: true,
  capabilities: {
    browserName: "chrome",
    chromeOptions: {
      args: ["--headless", "--disable-gpu", "--window-size=800,600"]
    }
  },

  beforeLaunch: function () {
    return new Promise(function (resolve) {
      screenshotReporter.beforeLaunch(resolve);
    });
  },

  onPrepare: function () {
    // Disables waiting for Angular.
    browser.ignoreSynchronization = true;

    jasmine.getEnv().addReporter(junitReporter);
    jasmine.getEnv().addReporter(screenshotReporter);
  },

  // Close the report after all tests finish
  afterLaunch: function (exitCode) {
    return new Promise(function (resolve) {
      screenshotReporter.afterLaunch(resolve.bind(this, exitCode));
    });
  }
};
