const config = require("./webpack.config.js");

module.exports = {
  ...config,
  output: {
    ...config.output,
    filename: `index-fat.js`
  },
  // Important: causes all dependencies to be bundled into one JS file.
  externals: [],
  resolve: {
    ...config.resolve,
    modules: [
      // Default value (resolve relative 'node_modules' from current dir, and up the ancestors).
      "node_modules",
      // Allows peer dependencies to be resolved, which are required when building the fat distribution.
      "peer_modules/node_modules"
    ]
  }
};
