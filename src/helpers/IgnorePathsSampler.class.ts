import { ParentBasedSampler, Sampler, SamplingDecision } from "@opentelemetry/sdk-trace-node";

export class IgnorePathsSampler implements Sampler {
    private spanSymbol = Symbol.for("OpenTelemetry Context Key SPAN");

    constructor(
        private delegateSampler: ParentBasedSampler,
        private ignorePaths: { [key: string]: boolean } = {
            "/version": true,
            "/health_check": true,
            "/metrics": true,
            "/swagger": true,
            "/swagger-json": true,
            "/favicon.ico": true,
        },
    ) {}

    shouldSample(context, traceId, spanName, spanKind, attributes, links) {
        const span = context._currentContext.get(this.spanSymbol);

        if (this.ignorePaths[attributes["http.target"]] || (span && !span.isRecording())) {
            return { decision: SamplingDecision.NOT_RECORD };
        }

        return this.delegateSampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    }

    setIgnorePaths(ignores: { [key: string]: boolean }, merge = true) {
        this.ignorePaths = merge
            ? {
                  ...this.ignorePaths,
                  ...ignores,
              }
            : ignores;
    }

    toString() {
        return "IgnorePathsSampler";
    }
}
