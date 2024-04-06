import { Attributes, Context, Link, SpanContext, SpanKind, TraceFlags, context } from "@opentelemetry/api";
import { IgnorePathsSampler } from "./IgnorePathsSampler.class";
import { ParentBasedSampler, SamplingDecision, SamplingResult } from "@opentelemetry/sdk-trace-node";

describe("IgnorePathsSampler", () => {
    let sampler: IgnorePathsSampler;
    let mockParentBasedSampler: ParentBasedSampler;
    let _spanContext: SpanContext;

    beforeEach(() => {
        mockParentBasedSampler = new ParentBasedSampler({
            root: {
                shouldSample: (
                    context: Context,
                    traceId: string,
                    spanName: string,
                    spanKind: SpanKind,
                    attributes: Attributes,
                    links: Link[],
                ): SamplingResult => {
                    console.log(context, traceId, spanName, spanKind, attributes, links);
                    return {
                        decision: SamplingDecision.RECORD,
                    };
                },
            },
        });

        _spanContext = {
            traceId: "",
            spanId: "",
            traceFlags: TraceFlags.NONE,
        };

        sampler = new IgnorePathsSampler({ "/ignore": true }, mockParentBasedSampler);
    });

    it("should not record if path is ignored", () => {
        const ctx = context.active().setValue(Symbol.for("OpenTelemetry Context Key SPAN"), {
            _spanContext: { ..._spanContext, traceFlags: 0 },
        });
        const result: SamplingResult = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "spanName",
            SpanKind.CLIENT,
            { "http.target": "/ignore" },
            [],
        );

        expect(result.decision).toEqual(SamplingDecision.NOT_RECORD);
    });

    it("should not record if parent trace was marked has deleted", () => {
        const ctx = context.active().setValue(Symbol.for("OpenTelemetry Context Key SPAN"), {
            _spanContext: { ..._spanContext, traceFlags: 0 },
        });
        const result: SamplingResult = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "spanName",
            SpanKind.CLIENT,
            {},
            [],
        );

        expect(result.decision).toEqual(SamplingDecision.NOT_RECORD);
    });

    it("should delegate to ParentBasedSampler if path is not ignored", () => {
        const ctx = context.active();
        const result = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "spanName",
            SpanKind.SERVER,
            { "http.target": "/not-ignored" },
            [],
        );
        expect(result.decision).toEqual(SamplingDecision.RECORD);
    });

    it("should return 'IgnorePathsSampler' when toString is called", () => {
        expect(sampler.toString()).toBe("IgnorePathsSampler");
    });
});
