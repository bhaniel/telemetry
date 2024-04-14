import { DiagConsoleLogger } from "@opentelemetry/api";
import { CustomDiagLogger } from "./helpers/customDiagLogger.class";
import otel, { DiagLogLevel, diag } from "@opentelemetry/api";
import {
    buildResource,
    createExporterConfig,
    getBatchConfig,
    getEnvVar,
    getServiceDetails,
    setupLogging,
} from "./utils";
import { IgnorePathsSampler } from "./helpers/IgnorePathsSampler.class";
import {
    BatchSpanProcessor,
    ConsoleSpanExporter,
    NodeTracerProvider,
    ParentBasedSampler,
    SimpleSpanProcessor,
    TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getInstrumentations } from "./instrumentation";

export const customLogger = new CustomDiagLogger("OpenTelDebug: ", new DiagConsoleLogger());
export const sampler: IgnorePathsSampler = new IgnorePathsSampler(
    new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(1),
    }),
);
let sdk: NodeSDK;
function forwardLogToOpenTelemetry(message: string): void {
    customLogger.info("Forwarding log:", message);
    // Here you would forward the message to OpenTelemetry Collector or other backend
}
// customLogger.info("Starting instrumentation");

const config = getEnvVar();

if (config.isOpentel) {
    try {
        customLogger.info("Starting instrumentation");
        const servicePackage = getServiceDetails(customLogger);
        const resource: Resource = buildResource(servicePackage.serviceName, servicePackage.version, {
            ["cx.application.name"]: servicePackage.serviceName,
            ["cx.subsystem.name"]: "nodejs",
            ["environment"]: config.environment,
        });
        initMetricsProvider(resource);
        initTraceProvider(resource);
        setupLogging(config.logUrl, config.logToken, forwardLogToOpenTelemetry);
        start(resource);
        customLogger.info(`Instrumentation started on ${servicePackage.serviceName} and send trace to ${config.url}`);
    } catch (err) {
        customLogger.error(err);
    }
}

function initTraceProvider(resource: Resource) {
    const traceProvider = new NodeTracerProvider({
        resource,
        sampler,
    });

    if (config.url && config.token) {
        const exporter = new OTLPTraceExporter(createExporterConfig(config.url, "/v1/traces", config.token));
        traceProvider.addSpanProcessor(new BatchSpanProcessor(exporter, getBatchConfig()));
    }
    if (config.isConsole) traceProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

    traceProvider.register();
}

function initMetricsProvider(resource: Resource) {
    if (config.isMetrics && config.url && config.token) {
        const exporter = new OTLPMetricExporter(createExporterConfig(config.url, "/v1/metrics", config.token));
        const metricsProvider = new MeterProvider({
            resource,
            readers: [new PeriodicExportingMetricReader({ exporter })],
        });

        otel.metrics.setGlobalMeterProvider(metricsProvider);
    }
}

function start(resource: Resource, isDebug = false) {
    sdk = new NodeSDK({
        resource,
        instrumentations: getInstrumentations(),
    });

    sdk.start();

    if (isDebug) {
        diag.setLogger(customLogger, DiagLogLevel.INFO);
    }

    process.on("SIGTERM", () => {
        sdk.shutdown()
            .then(() => customLogger.info("Tracing terminated"))
            .catch((error) => customLogger.error("Error terminating tracing", error))
            .finally(() => process.exit(0));
    });
}
