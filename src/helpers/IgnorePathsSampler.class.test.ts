/* eslint-disable @typescript-eslint/no-unused-vars */
import { Attributes, Context, Link, SpanContext, SpanKind, TraceFlags, context } from "@opentelemetry/api";
import { IgnorePathsSampler } from "./IgnorePathsSampler.class";
import { ParentBasedSampler, SamplingDecision, SamplingResult } from "@opentelemetry/sdk-trace-node";

describe("IgnorePathsSampler", () => {
    let sampler: IgnorePathsSampler;

    let _spanContext: SpanContext;
    const mockParentBasedSampler = new ParentBasedSampler({
        root: {
            shouldSample: (
                context: Context,
                traceId: string,
                spanName: string,
                spanKind: SpanKind,
                attributes: Attributes,
                links: Link[],
            ): SamplingResult => {
                return {
                    decision: SamplingDecision.RECORD,
                };
            },
        },
    });
    beforeEach(() => {
        _spanContext = {
            traceId: "",
            spanId: "",
            traceFlags: TraceFlags.NONE,
        };

        sampler = new IgnorePathsSampler(mockParentBasedSampler, { "/ignore": true });
    });

    it("should ignore specified paths", () => {
        const sampler = new IgnorePathsSampler(mockParentBasedSampler, {
            "/ignore": false,
            "/dont-ignore": true,
        });
        const ctx = context.active();

        expect(
            sampler.shouldSample(
                ctx,
                "45646456yfhgfgghfhg",
                "ignore",
                SpanKind.CLIENT,
                { "http.target": "/ignore" },
                [],
            ).decision,
        ).toEqual(SamplingDecision.RECORD);

        expect(
            sampler.shouldSample(
                ctx,
                "412412412sdsad",
                "dontIgnore",
                SpanKind.CLIENT,
                { "http.target": "/dont-ignore" },
                [],
            ).decision,
        ).toEqual(SamplingDecision.NOT_RECORD);
    });

    it("should not record because we ovrride", () => {
        const ctx = context.active();
        sampler.setIgnorePaths({}, false);
        const result: SamplingResult = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "notRecord",
            SpanKind.CLIENT,
            { "http.target": "/ignore" },
            [],
        );

        expect(result.decision).toEqual(SamplingDecision.RECORD);
        sampler.setIgnorePaths({ "/ignore": true });

        const result2: SamplingResult = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "notRecord",
            SpanKind.CLIENT,
            { "http.target": "/ignore" },
            [],
        );

        expect(result2.decision).toEqual(SamplingDecision.NOT_RECORD);
    });

    it("should not record if path is ignored", () => {
        const ctx = context.active();
        const result: SamplingResult = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "notRecord",
            SpanKind.CLIENT,
            { "http.target": "/ignore" },
            [],
        );

        expect(result.decision).toEqual(SamplingDecision.NOT_RECORD);
    });

    it("should delegate to ParentBasedSampler if path is not ignored", () => {
        const ctx = context.active();
        const result = sampler.shouldSample(
            ctx,
            "45646456yfhgfgghfhg",
            "record",
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
