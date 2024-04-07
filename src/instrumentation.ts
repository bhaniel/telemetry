import { DiagConsoleLogger } from "@opentelemetry/api";
import { CustomDiagLogger } from "./customDiagLogger.class";
import { buildResource, getServiceName, initMetricsProvider, initTraceProvider, setupLogging } from "./util";

/* instrumentation.ts */
const customLogger = new CustomDiagLogger("OpenTelDebug: ", new DiagConsoleLogger());

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
        initTraceProvider(resource, process.env.OPENTELURL, process.env.OPENTELTOKEN, customLogger, false);
        setupLogging(process.env.OPENTELLOGGINGURL, process.env.OPENTELTOKEN, forwardLogToOpenTelemetry);
        customLogger.info("Instrumentation started", serviceName);
    } catch (err) {
        customLogger.error(err);
    }
}
