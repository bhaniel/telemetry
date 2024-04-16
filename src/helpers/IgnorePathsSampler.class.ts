import { Attributes, Context, Link, SpanKind } from "@opentelemetry/api";
import { ParentBasedSampler, Sampler, SamplingDecision, Span } from "@opentelemetry/sdk-trace-node";

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

    shouldSample(
        context: Context,
        traceId: string,
        spanName: string,
        spanKind: SpanKind,
        attributes: Attributes,
        links: Link[],
    ) {
        // const span: Span = context.getValue(this.spanSymbol) as Span;
        if (typeof attributes["http.target"] === "string" && this.ignorePaths[attributes["http.target"]]) {
            // console.log("span", span);
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
