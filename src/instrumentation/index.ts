import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { getHttpInstrumentation } from "./http";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { getKafkaInstrumentation } from "./kafka";

export function getInstrumentations(): Instrumentation[] {
    return [
        ...getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-fs": { enabled: false },
            "@opentelemetry/instrumentation-http": { enabled: false },
            "@opentelemetry/instrumentation-express": { enabled: false },
        }),
        getHttpInstrumentation(),
        new ExpressInstrumentation(),
        new NestInstrumentation(),
        getKafkaInstrumentation(),
    ];
}
