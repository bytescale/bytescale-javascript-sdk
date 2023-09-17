/* eslint @typescript-eslint/no-var-requires: 0 */
const path = require("path");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");

module.exports = {
  // Added by the deriving config.
  // output: {
  //   libraryTarget: "commonjs2",
  //   path: path.resolve(__dirname, "dist"),
  //   filename: "main.js"
  // },
  // externals: [nodeExternals(), ...externals],
  cache: false,
  mode: "production",
  optimization: {
    // Packages on NPM shouldn't be minimized.
    minimize: false,
    // Several options to make the generated code a little easier to read (for debugging).
    chunkIds: "named",
    moduleIds: "named",
    mangleExports: false
  },
  target: "browserslist",
  plugins: [
    new WebpackShellPluginNext({
      safe: true, // Required to make Webpack fail on script failure (else string-style scripts, as opposed to function scripts, silently fail when blocking && !parallel)
      // Next.js has a bug which causes it to break with Webpack-compiled libraries:
      // https://github.com/vercel/next.js/issues/52542
      // The following is a (bad) workaround that fixes the issue by find/replacing the webpack-specific variable names that clash with Next.js's build system.
      onBuildEnd: {
        scripts: [`(cd build && ./RemoveWebpackArtifacts.sh)`],
        blocking: true,
        parallel: false
      }
    })
  ],
  resolve: {
    extensions: [".ts"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "babel-loader" // Options are in 'babel.config.js'
          },
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.build.json"
            }
          }
        ],
        include: [path.resolve(__dirname, "src")]
      }
    ]
  }
};
