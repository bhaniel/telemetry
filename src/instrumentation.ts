import { DiagConsoleLogger } from "@opentelemetry/api";
import { CustomDiagLogger } from "./customDiagLogger.class";
import {
    buildResource,
    getEnvVar,
    getServiceName,
    initMetricsProvider,
    initTraceProvider,
    setupLogging,
    start,
} from "./util";
import { IgnorePathsSampler } from "./IgnorePathsSampler.class";
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";

/* instrumentation.ts */
const defaultPaths: { [key: string]: boolean } = {
    "/version": true,
    "/health_check": true,
    "/metrics": true,
    "/swagger": true,
    "/swagger-json": true,
    "/favicon.ico": true,
};
const customLogger = new CustomDiagLogger("OpenTelDebug: ", new DiagConsoleLogger());
export const sampler: IgnorePathsSampler = new IgnorePathsSampler(
    defaultPaths,
    new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(1),
    }),
);
function forwardLogToOpenTelemetry(message: string): void {
    customLogger.info("Forwarding log:", message);
    // Here you would forward the message to OpenTelemetry Collector or other backend
}
// customLogger.info("Starting instrumentation");

const config = getEnvVar();
if (config.isOpentel) {
    try {
        customLogger.info("Starting instrumentation");
        const serviceName = getServiceName(customLogger);
        const resource = buildResource(serviceName, "1.0.0", {
            ["cx.application.name"]: serviceName,
            ["cx.subsystem.name"]: "nodejs",
            ["environment"]: config.environment,
        });
        initMetricsProvider(resource, config.url, config.token, config.isMetrics);
        initTraceProvider(resource, config.url, config.token, config.isConsole, sampler, config.isZipKin);
        setupLogging(config.logUrl, config.logToken, forwardLogToOpenTelemetry);
        start(customLogger, resource, config.isDebug);
        customLogger.info(`Instrumentation started on ${serviceName} and send trace to ${process.env.OPENTELURL}`);
    } catch (err) {
        customLogger.error(err);
    }
}
