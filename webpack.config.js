/* eslint @typescript-eslint/no-var-requires: 0 */
const config = require("./webpack.config.base.js");
const nodeBuiltInModules = require("./webpack.config.externals.js");
const path = require("path");
const nodeExternals = require("webpack-node-externals");

/**
 * 'esModuleInterop' in 'tsconfig.json' must be set to FALSE, else it injects '__importStar' around the 'buffer' and 'stream' imports.
 */
const baseCJS = {
  ...config,
  output: {
    filename: "main.js",
    libraryTarget: "commonjs2"
  },
  externalsType: "commonjs",
  externals: [nodeExternals({ importType: "commonjs" })]
};

const nodeCJS = {
  ...baseCJS,
  entry: "./src/index.node.ts",
  output: {
    ...baseCJS.output,
    path: path.join(__dirname, "dist/node/cjs")
  },
  externals: [...baseCJS.externals, ...nodeBuiltInModules]
};

const workerCJS = {
  ...baseCJS,
  entry: "./src/index.worker.ts",
  output: {
    ...baseCJS.output,
    path: path.join(__dirname, "dist/worker/cjs")
  }
};

const browserCJS = {
  ...baseCJS,
  entry: "./src/index.browser.ts",
  output: {
    ...baseCJS.output,
    path: path.join(__dirname, "dist/browser/cjs")
  }
};

const baseESM = {
  ...config,
  output: {
    filename: "main.mjs",
    library: { type: "module" },
    module: true,
    environment: {
      module: true
    }
  },
  externalsType: "module",
  externals: [nodeExternals({ importType: "module" }), ...nodeBuiltInModules],
  experiments: { outputModule: true }
};

const nodeESM = {
  ...baseESM,
  entry: "./src/index.node.ts",
  output: {
    ...baseESM.output,
    path: path.join(__dirname, "dist/node/esm")
  }
};

const workerESM = {
  ...baseESM,
  entry: "./src/index.worker.ts",
  output: {
    ...baseESM.output,
    path: path.join(__dirname, "dist/worker/esm")
  }
};

const browserESM = {
  ...baseESM,
  entry: "./src/index.browser.ts",
  output: {
    ...baseESM.output,
    path: path.join(__dirname, "dist/browser/esm")
  }
};

module.exports = [nodeCJS, nodeESM, workerCJS, workerESM, browserCJS, browserESM];
