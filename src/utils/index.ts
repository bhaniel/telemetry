import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import * as fs from "fs";
import { StdoutInterceptor } from "../helpers/stdoutInterceptor.class";
import { customLogger } from "../init";
export const getServiceDetails = (customLogger) => {
    try {
        const servicePackage = JSON.parse(fs.readFileSync("package.json", "utf8"));
        return { serviceName: servicePackage.name, version: servicePackage.version };
    } catch (err) {
        customLogger.error(err);
        throw err; // rethrow the error after logging
    }
};

export const buildResource = (serviceName: string, version: string, attr = {}): Resource => {
    // Merges default resource with provided attributes for flexibility
    return Resource.default().merge(
        new Resource({
            [SEMRESATTRS_SERVICE_NAME]: serviceName,
            [SEMRESATTRS_SERVICE_VERSION]: version,
            ...attr,
        }),
    );
};

export const getBatchConfig = () => {
    return {
        scheduledDelayMillis: 1000,
        maxQueueSize: 100000,
        maxExportBatchSize: 1000,
    };
};

export const createExporterConfig = (baseUrl: string, endpoint: string, token: string) => {
    return {
        timeoutMillis: 10000,
        url: baseUrl + endpoint,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const getEnvironmentVariable = (key: string, parser: undefined | ((value: string) => never) = undefined) => {
    const value = process.env[key];
    if (value === undefined) {
        return undefined;
    }
    if (parser === undefined) {
        return value;
    }
    try {
        return parser(value);
    } catch (error) {
        customLogger.error(`Cannot parse ${key}, value is ${value}.`, error);
        return undefined;
    }
};

export const getEnvVar = () => {
    return {
        url: getEnvironmentVariable("OPENTEL_URL"),
        logUrl: getEnvironmentVariable("OPENTEL_LOG_URL"),
        logToken: getEnvironmentVariable("OPENTEL_LOG_TOKEN"),
        token: getEnvironmentVariable("OPENTEL_TOKEN"),
        isConsole: !!getEnvironmentVariable("OPENTEL_CONSOLE"),
        environment: getEnvironmentVariable("NODE_ENV"),
        isMetrics: !!getEnvironmentVariable("OPENTEL_METRICS"),
        isOpentel: !!getEnvironmentVariable("OPENTEL_INIT"),
        isDebug: !!getEnvironmentVariable("OPENTEL_DEBUG"),
    };
};

export function setupLogging(url, token, forwardLogToOpenTelemetry: (message: string) => void) {
    if (url && token) {
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const interceptor = new StdoutInterceptor(forwardLogToOpenTelemetry, originalStdoutWrite);
        process.stdout.write = interceptor.write.bind(interceptor) as typeof process.stdout.write;
    }
}
