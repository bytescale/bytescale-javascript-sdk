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

// We don't need the browser ESM module, because we use 'exports.default' to specify the browser environment, per the
// Node.js documentation recomendations of specifying non-browser envs using guards ("node", "worker") and then using
// "default" to effectively specify your "browser" environment. The "default" field only takes a string (i.e. it can't
// use "import" or "require" guards, since it's the default, so can only specify one export). Therefore, since we
// previously had a problem with browser ESM modules in Next.js (below), then we've selected the CJS module for our
// browser export, which means we don't need the ESM export. Note: the error below might no-longer occur now that we
// have "worker" exports to target the edge runtime.
// ---------
// Next.js gives 'ReferenceError: exports is not defined' from API routes when `export const config = { runtime: 'edge' }`
// is used, due to it loading browser ESM modules, but for some reason for the browser modules specifically, it gives
// 'exports is not defined', whereas the Node ESM module it's OK with. Anyhow, since Next.js is so popular, we disable
// browser ESM modules, as Next.js is OK with the CommonJS module we export.
// ---------
// const browserESM = {
//   ...baseESM,
//   entry: "./src/index.browser.ts",
//   output: {
//     ...baseESM.output,
//     path: path.join(__dirname, "dist/browser/esm")
//   }
// };

module.exports = [nodeCJS, nodeESM, workerCJS, workerESM, browserCJS];
