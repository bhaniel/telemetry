import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import * as fs from "fs";
import { IgnorePathsSampler } from "./IgnorePathsSampler.class";
import {
    BatchSpanProcessor,
    ConsoleSpanExporter,
    NodeTracerProvider,
    SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { CustomDiagLogger } from "./customDiagLogger.class";
import { StdoutInterceptor } from "./stdoutInterceptor.class";
import otel, { DiagLogLevel, diag } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

export function getServiceName(customLogger) {
    try {
        return JSON.parse(fs.readFileSync("package.json", "utf8")).name;
    } catch (err) {
        customLogger.error(err);
        throw err; // rethrow the error after logging
    }
}

export function buildResource(serviceName: string, version: string, attr = {}) {
    // Merges default resource with provided attributes for flexibility
    return Resource.default().merge(
        new Resource({
            [SEMRESATTRS_SERVICE_NAME]: serviceName,
            [SEMRESATTRS_SERVICE_VERSION]: version,
            ...attr,
        }),
    );
}

function getBatchConfig() {
    return {
        scheduledDelayMillis: 1000,
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
    };
}

function createExporterConfig(baseUrl: string, endpoint: string, token: string) {
    return {
        timeoutMillis: 15000,
        url: baseUrl + endpoint,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
}

export function initTraceProvider(
    resource: Resource,
    url,
    token,
    logger,
    isConsole: boolean,
    sampler: IgnorePathsSampler,
) {
    if (process.env.OPENTELTRACE) {
        const exporter = new OTLPTraceExporter(createExporterConfig(url, "/v1/traces", token));
        const traceProvider = new NodeTracerProvider({
            resource,
            sampler,
        });

        traceProvider.addSpanProcessor(new BatchSpanProcessor(exporter, getBatchConfig()));
        if (isConsole) traceProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

        traceProvider.register();

        start(logger, resource);
    }
}

export function initMetricsProvider(resource: Resource, url, token) {
    if (process.env.OPENTELMETRICS) {
        const exporter = new OTLPMetricExporter(createExporterConfig(url, "/v1/metrics", token));
        const metricsProvider = new MeterProvider({
            resource,
            readers: [new PeriodicExportingMetricReader({ exporter })],
        });

        otel.metrics.setGlobalMeterProvider(metricsProvider);
    }
}

export function setupLogging(url, token, forwardLogToOpenTelemetry: (message: string) => void) {
    if (url) {
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const interceptor = new StdoutInterceptor(forwardLogToOpenTelemetry, originalStdoutWrite);
        process.stdout.write = interceptor.write.bind(interceptor) as typeof process.stdout.write;
    }
}

function start(logger: CustomDiagLogger, resource: Resource) {
    const sdk = new NodeSDK({
        resource,
        instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();

    if (process.env.NODE_ENV === "local" || process.env.OPENTELDEBUG) {
        diag.setLogger(logger, DiagLogLevel.INFO);
    }

    process.on("SIGTERM", () => {
        sdk.shutdown()
            .then(() => logger.info("Tracing terminated"))
            .catch((error) => logger.error("Error terminating tracing", error))
            .finally(() => process.exit(0));
    });
}
