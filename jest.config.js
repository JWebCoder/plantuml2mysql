module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json'
    }
  },
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/test/",
  ],
  collectCoverage: true
}
