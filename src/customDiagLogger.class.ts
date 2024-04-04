import { DiagConsoleLogger } from "@opentelemetry/api";

export class CustomDiagLogger {
    private logger;
    private prefix;
    constructor(prefix) {
        this.logger = new DiagConsoleLogger();
        this.prefix = prefix;
    }

    // Implement all methods required by the DiagLogger interface
    verbose(message, ...args) {
        this.logger.verbose(`${this.prefix}${message}`, ...args);
    }

    debug(message, ...args) {
        this.logger.debug(`${this.prefix}${message}`, ...args);
    }

    info(message, ...args) {
        this.logger.info(`${this.prefix}${message}`, ...args);
    }

    warn(message, ...args) {
        this.logger.warn(`${this.prefix}${message}`, ...args);
    }

    error(message, ...args) {
        this.logger.error(`${this.prefix}${message}`, ...args);
    }
}
