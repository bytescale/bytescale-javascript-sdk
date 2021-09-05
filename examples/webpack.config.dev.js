/* eslint @typescript-eslint/no-var-requires: 0 */
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const port = 3001;

module.exports = {
  output: {
    path: path.join(__dirname, "dist"),
    publicPath: "/",
    filename: `index.js`
  },
  cache: true,
  mode: "development",
  entry: [`webpack-dev-server/client?http://localhost:${port}/`, "./src/index.ts"],
  plugins: [
    new HtmlWebpackPlugin({
      title: "Upload file",
      template: path.resolve(__dirname, "src/index.html"),
      filename: "index.html" // output file
    }),
    new webpack.DefinePlugin({
      "window.UPLOAD_JS_API_KEY": JSON.stringify(process.env.UPLOAD_JS_API_KEY),
      "window.UPLOAD_JS_API_URL": JSON.stringify(process.env.UPLOAD_JS_API_URL)
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
            loader: "ts-loader"
          }
        ]
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
    hot: true,
    open: true,
    port,
    contentBase: [path.join(__dirname, "dist")]
  }
};
