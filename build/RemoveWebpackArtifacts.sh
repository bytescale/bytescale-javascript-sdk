#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"
cd ..

replaceInFiles() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    find "$1" -type f -iname "$2" -exec sed -i '' -e "$3" {} \;
  else
    find "$1" -type f -iname "$2" -exec sed -i -e "$3" {} \;
  fi
}

# Next.js has a bug which causes it to break with Webpack-compiled libraries:
# https://github.com/vercel/next.js/issues/52542
# The following is a (bad) workaround that fixes the issue by find/replacing the webpack-specific variable names that clash with Next.js's build system.
replaceInFiles dist/ "*js" "s|__webpack_|__lib_|g"

# We only want to rename 'module' to 'lib' for ESM modules.
replaceInFiles dist/ "*.mjs" "s|module|lib|g"
