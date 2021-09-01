const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const nodeExternals = require("webpack-node-externals");
const path = require("path");
const webpack = require("webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  output: {
    libraryTarget: "commonjs2"
  },
  cache: false,
  mode: "production",
  target: "web",
  entry: "./src/index.ts",
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.AggressiveMergingPlugin()
  ],
  optimization: {
    minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      // Remember to keep in sync with `tsconfig.json`
      "upload-js": path.resolve(__dirname, "../lib/src")
    }
  },
  externals: nodeExternals({ additionalModuleDirs: [path.resolve(__dirname, "peer_modules/node_modules")] }),
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [path.resolve(__dirname, "src")],
        use: [
          {
            loader: "babel-loader" // Options are in 'babel.config.js'
          },
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              experimentalWatchApi: true
            }
          }
        ]
      },
      {
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      }
    ]
  }
};
