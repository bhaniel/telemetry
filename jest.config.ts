import type { Config } from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["text", "lcov"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};

export default config;
