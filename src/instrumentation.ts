import { DiagConsoleLogger } from "@opentelemetry/api";
import { CustomDiagLogger } from "./customDiagLogger.class";
import { buildResource, getServiceName, initMetricsProvider, initTraceProvider, setupLogging } from "./util";
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
    console.log("Forwarding log:", message);
    // Here you would forward the message to OpenTelemetry Collector or other backend
}
customLogger.info("Starting instrumentation");
if (process.env.OPENTELURL && process.env.OPENTELTOKEN) {
    try {
        const serviceName = getServiceName(customLogger);
        const resource = buildResource(serviceName, "1.0.0", {
            ["cx.application.name"]: serviceName,
            ["cx.subsystem.name"]: "nodejs",
            ["environment"]: process.env.NODE_ENV,
        });
        initMetricsProvider(resource, process.env.OPENTELURL, process.env.OPENTELTOKEN);
        initTraceProvider(resource, process.env.OPENTELURL, process.env.OPENTELTOKEN, customLogger, false, sampler);
        setupLogging(process.env.OPENTELLOGGINGURL, process.env.OPENTELTOKEN, forwardLogToOpenTelemetry);
        customLogger.info("Instrumentation started", serviceName);
    } catch (err) {
        customLogger.error(err);
    }
}
