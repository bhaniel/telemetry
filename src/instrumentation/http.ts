import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ClientRequest } from "http";
import * as shimmer from "shimmer";

const extractBody = (span, request: ClientRequest) => {
    const requestBodyChunks = [];
    shimmer.wrap(
        request,
        "write",
        (original) =>
            function (...data: unknown[]) {
                return original.apply(this, data);
            },
    );

    shimmer.wrap(
        request,
        "end",
        (original) =>
            function (...data) {
                if (data) {
                    const decodedData = decodeURIComponent(data.toString());
                    requestBodyChunks.push(decodedData);
                }
                if (requestBodyChunks.length > 0) {
                    const body = requestBodyChunks.join();
                    span.setAttribute("http.request_body", body);
                }
                return original.apply(this, data);
            },
    );
};

const extractData = (span, request) => {
    shimmer.wrap(
        request,
        "emit",
        (original) =>
            function (event, ...data) {
                if (original) {
                    if (request && event === "data" && data.length) {
                        span.setAttribute("http.request_body", data.toString());
                    }

                    return original.apply(this, [event, ...data]);
                }
            },
    );
};

export const http = new HttpInstrumentation({
    enabled: true,
    requestHook: (span, request) => {
        if (!span.isRecording()) return;
        if ((request === null || request === void 0 ? void 0 : request.method) === "GET") return;
        if (request instanceof ClientRequest) {
            extractBody(span, request);
        } else {
            extractData(span, request);
            // span.setAttribute("http.method", request.method);
            // span.setAttribute("http.url", request.url);
            // span.setAttribute("http.headers", JSON.stringify(request.headers));
            // console.log(request.headers);
        }
    },
});
