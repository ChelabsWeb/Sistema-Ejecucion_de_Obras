import type { Config } from "jest";

const config: Config = {
  rootDir: ".",
  roots: ["<rootDir>", "<rootDir>/../../packages"],
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
  verbose: false,
  moduleNameMapper: {
    "^@sistema/core$": "<rootDir>/../../packages/core/src/index.ts",
    "^@sistema/core/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "^@sistema/ui$": "<rootDir>/../../packages/ui/src/index.ts",
    "^@sistema/ui/(.*)$": "<rootDir>/../../packages/ui/src/$1",
    "^@sistema/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@sistema/db/(.*)$": "<rootDir>/../../packages/db/src/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json"
      }
    ]
  }
};

export default config;