module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.config.pretest.js"],
  // [...]
  preset: "ts-jest/presets/default-esm", // or other ESM presets
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: { module: "ESNext" } }]
  }
};
