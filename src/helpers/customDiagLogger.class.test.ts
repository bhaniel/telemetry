import { DiagConsoleLogger } from "@opentelemetry/api";
import { CustomDiagLogger } from "./customDiagLogger.class";

jest.mock("@opentelemetry/api", () => {
    return {
        DiagConsoleLogger: jest.fn().mockImplementation(() => {
            return {
                verbose: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
        }),
    };
});

describe("CustomDiagLogger", () => {
    let logger: CustomDiagLogger;
    let mockDiagConsoleLogger: jest.Mocked<DiagConsoleLogger>;

    beforeEach(() => {
        mockDiagConsoleLogger = new DiagConsoleLogger() as jest.Mocked<DiagConsoleLogger>;
        logger = new CustomDiagLogger("Prefix: ", mockDiagConsoleLogger);
    });

    it("should log verbose messages with prefix", () => {
        logger.verbose("test message");
        expect(mockDiagConsoleLogger.verbose).toHaveBeenCalledWith("Prefix: test message");
    });

    it("should log debug messages with prefix", () => {
        logger.debug("test message");
        expect(mockDiagConsoleLogger.debug).toHaveBeenCalledWith("Prefix: test message");
    });

    it("should log info messages with prefix", () => {
        logger.info("test message");
        expect(mockDiagConsoleLogger.info).toHaveBeenCalledWith("Prefix: test message");
    });

    it("should log warn messages with prefix", () => {
        logger.warn("test message");
        expect(mockDiagConsoleLogger.warn).toHaveBeenCalledWith("Prefix: test message");
    });

    it("should log error messages with prefix", () => {
        logger.error("test message");
        expect(mockDiagConsoleLogger.error).toHaveBeenCalledWith("Prefix: test message");
    });
});
