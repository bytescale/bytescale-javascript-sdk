const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const babel = require("@babel/core");

const browsersMD = path.resolve(__dirname, "../BROWSERS.md");
const browsersMDTemplate = path.resolve(__dirname, "BROWSERS.md.template.md");
const reactUploaderDir = path.resolve(__dirname, "../lib");
const distFile = path.resolve(reactUploaderDir, "dist/index-fat.js");
const browsersList = path.resolve(reactUploaderDir, ".browserslistrc");

// See: https://stackoverflow.com/a/32197381/592768
const deleteFolderRecursive = function (dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
};

const updateFileContents = function (file, update) {
  const data = fs.readFileSync(file);
  const fd = fs.openSync(file, "w+");
  const buffer = new Buffer.from(update(data.toString()));
  fs.writeSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);
};

const splitLines = function (string) {
  return string.split(/\r?\n/);
};

// Create 'upload-js' fat distribution (so all transitive dependencies can be inspected for polyfills).
execSync("npm run prepack:fat", { stdio: "inherit", cwd: reactUploaderDir });

// Polyfill a temporary version of the 'upload-js' module.
// webpackBootstrap
const distCode = fs.readFileSync(distFile).toString();
if (distCode.includes("// webpackBootstrap")) {
  throw new Error("Distribution must be compiled with 'mode=production' -- else incorrect polyfills will be inferred.");
}
const { code: polyfilledCode } = babel.transformSync(distCode, {
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: "usage",
        corejs: 3,
        debug: true
      }
    ]
  ]
});

// Extract all the core-js imports.
const requireLines = splitLines(polyfilledCode).filter(l => l.startsWith("require("));
const requireModules = requireLines.map(m => m.replace(/^.*?['"]([^'"]*).*$/, "$1"));
const requireCoreJS = requireModules.filter(m => m.startsWith("core-js/"));
const requireCoreJSFormatted = requireCoreJS.map(x => `- ${x}`);
if (requireCoreJSFormatted.length === 0) throw new Error("Did not find any core-js modules.");

// Extract all supported browsers
const splitBrowserLine = line => {
  let split = line.split(">=");
  if (split.length === 1) split = line.split(" ");
  return { browser: split[0].trim(), minVersion: split[1].trim() };
};
const supportedBrowsersString = fs.readFileSync(browsersList).toString();
const supportedBrowsers = splitLines(supportedBrowsersString);
const supportedBrowsersFormatted = supportedBrowsers
  .filter(x => !!x)
  .map(splitBrowserLine)
  .map(x => `- ${x.browser} \`${x.minVersion}+\``);
if (supportedBrowsersFormatted.length === 0) throw new Error("Did not find any browsers.");

// Generate new 'BROWSERS.md' file
fs.copyFileSync(browsersMDTemplate, browsersMD);
updateFileContents(browsersMD, x =>
  x
    .replace("[browser-list]", supportedBrowsersFormatted.join("\n"))
    .replace("[polyfill-list]", requireCoreJSFormatted.join("\n"))
);
