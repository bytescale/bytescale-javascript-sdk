const path = require("path");
const webpack = require("webpack");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  output: {
    path: path.join(__dirname, "dist"),
    publicPath: "/",
    filename: `index.js`
  },
  cache: true,
  mode: "development",
  entry: ["react-hot-loader/patch", "./src/index.tsx"],
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new ForkTsCheckerWebpackPlugin(),
    new webpack.NamedModulesPlugin(),
    new HtmlWebpackPlugin({
      title: "Upload file",
      template: path.resolve(__dirname, "src/index.html"),
      filename: "index.html" // output file
    })
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [path.resolve(__dirname, "src"), path.resolve(__dirname, "../lib/src")],
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
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      // Remember to keep in sync with `tsconfig.json`
      "@upload.io/upload-js-examples": path.resolve(__dirname, "../examples/src"),
      "upload-js-ui-react": path.resolve(__dirname, "../lib/src")
    },
    modules: [
      // Default value (resolve relative 'node_modules' from current dir, and up the ancestors).
      "node_modules",
      // Allows source files from 'upload-js' to resolve its peer dependencies from the host application's
      // 'node_modules' directory (which has the the peer dependencies installed).
      path.resolve(__dirname, "node_modules")
    ]
  },
  devServer: {
    hotOnly: true,
    open: true,
    port: 3001,
    contentBase: [path.join(__dirname, "dist")]
  }
};
