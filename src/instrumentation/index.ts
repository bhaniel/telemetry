import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

import { Instrumentation } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { http } from "./http";

export function getInstrumentations(): Instrumentation[] {
    return [
        ...getNodeAutoInstrumentations({
            "@opentelemetry/instrumentation-fs": { enabled: false },
            "@opentelemetry/instrumentation-http": { enabled: false },
            "@opentelemetry/instrumentation-express": { enabled: false },
        }),
        http,
        new ExpressInstrumentation(),
    ];
}
