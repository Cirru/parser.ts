module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^lodash-es$": "lodash",
  },
  silent: false,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
