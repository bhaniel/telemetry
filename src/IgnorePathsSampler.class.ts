import { ParentBasedSampler, SamplingDecision } from "@opentelemetry/sdk-trace-node";

export class IgnorePathsSampler {
    private spanSymbol = Symbol.for("OpenTelemetry Context Key SPAN");

    constructor(
        private ignorePaths: { [key: string]: boolean },
        private delegateSampler: ParentBasedSampler,
    ) {}

    shouldSample(context, traceId, spanName, spanKind, attributes, links) {
        const span = context._currentContext.get(this.spanSymbol);
        if (this.ignorePaths[attributes["http.target"]] || (span && span._spanContext.traceFlags === 0)) {
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
