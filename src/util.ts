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
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";

export function getServiceName(customLogger) {
    try {
        return JSON.parse(fs.readFileSync("package.json", "utf8")).name;
    } catch (err) {
        customLogger.error(err);
        throw err; // rethrow the error after logging
    }
}

export function buildResource(serviceName: string, version: string, attr = {}): Resource {
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
        scheduledDelayMillis: 500,
        maxQueueSize: 10000,
        maxExportBatchSize: 1000,
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

export function getEnvVar() {
    return {
        url: process.env.OPENTEL_URL,
        logUrl: process.env.OPENTEL_LOG_URL,
        logToken: process.env.OPENTEL_LOG_TOKEN,
        token: process.env.OPENTEL_TOKEN,
        isConsole: !!process.env.OPENTEL_CONSOLE,
        environment: process.env.NODE_ENV,
        isMetrics: !!process.env.OPENTEL_METRICS,
        isZipKin: !!process.env.OPENTEL_ZIPKIN,
        isOpentel: !!process.env.OPENTEL_INIT,
        isDebug: !!process.env.OPENTEL_DEBUG,
    };
}

export function initTraceProvider(
    resource: Resource,
    url,
    token,
    isConsole: boolean,
    sampler: IgnorePathsSampler,
    isZipKin: boolean,
) {
    const traceProvider = new NodeTracerProvider({
        resource,
        sampler,
    });
    traceProvider.register();
    if (url && token) {
        const exporter = new OTLPTraceExporter(createExporterConfig(url, "/v1/traces", token));
        traceProvider.addSpanProcessor(new BatchSpanProcessor(exporter, getBatchConfig()));
    }
    if (isZipKin) traceProvider.addSpanProcessor(new BatchSpanProcessor(new ZipkinExporter(), getBatchConfig()));
    if (isConsole) traceProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
}

export function initMetricsProvider(resource: Resource, url, token, isMetrics: boolean) {
    if (isMetrics && url && token) {
        const exporter = new OTLPMetricExporter(createExporterConfig(url, "/v1/metrics", token));
        const metricsProvider = new MeterProvider({
            resource,
            readers: [new PeriodicExportingMetricReader({ exporter })],
        });

        otel.metrics.setGlobalMeterProvider(metricsProvider);
    }
}

export function setupLogging(url, token, forwardLogToOpenTelemetry: (message: string) => void) {
    if (url && token) {
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const interceptor = new StdoutInterceptor(forwardLogToOpenTelemetry, originalStdoutWrite);
        process.stdout.write = interceptor.write.bind(interceptor) as typeof process.stdout.write;
    }
}

export function start(logger: CustomDiagLogger, resource: Resource, isDebug = false) {
    const sdk = new NodeSDK({
        resource,
        instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();

    if (isDebug) {
        diag.setLogger(logger, DiagLogLevel.INFO);
    }

    process.on("SIGTERM", () => {
        sdk.shutdown()
            .then(() => logger.info("Tracing terminated"))
            .catch((error) => logger.error("Error terminating tracing", error))
            .finally(() => process.exit(0));
    });
}
