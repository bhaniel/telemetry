import { api } from "@opentelemetry/sdk-node";
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";

export class IgnorePathsSampler {
    private ignorePaths;
    private delegateSampler;
    private spanSymbol = Symbol.for("OpenTelemetry Context Key SPAN");

    constructor(ignorePaths) {
        this.ignorePaths = ignorePaths;
        this.delegateSampler = new ParentBasedSampler({
            root: new TraceIdRatioBasedSampler(1),
        });
    }

    shouldSample(context, traceId, spanName, spanKind, attributes, links) {
        const span = context._currentContext.get(this.spanSymbol);
        if (this.ignorePaths[attributes["http.target"]] || (span && span._spanContext.traceFlags === 0)) {
            return { decision: api.SamplingDecision.NOT_RECORD };
        }

        return this.delegateSampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    }

    toString() {
        return "IgnorePathsSampler";
    }
}
