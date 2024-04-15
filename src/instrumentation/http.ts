import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import * as shimmer from "shimmer";
import * as MIMEType from "whatwg-mimetype";
const MAX_CONTENT_LENGTH = 0;

const extractData = (span, request, param) => {
    shimmer.wrap(
        request,
        "emit",
        (original) =>
            function (event, ...data) {
                if (original) {
                    if (request && event === "data" && data.length) {
                        span.setAttribute(param, data.toString());
                    }

                    return original.apply(this, [event, ...data]);
                }
            },
    );
};

function shouldSkipResponseContent(response: ServerResponse<IncomingMessage> | IncomingMessage) {
    let contentType;
    let contentLength;
    if (response instanceof IncomingMessage) {
        contentType = response?.headers?.["content-type"];
        contentLength = response?.headers?.["content-length"];
    } else {
        contentType = response.getHeader("content-type") || response.getHeader("Content-Type");
        if (Array.isArray(contentType)) {
            [contentType] = contentType;
        }
        contentLength = response.getHeader("content-length") || response.getHeader("Content-Length");
        if (typeof contentLength === "number") {
            contentLength = contentLength.toString();
        } else if (Array.isArray(contentLength)) {
            [contentLength] = contentLength;
        }
    }
    console.log("contentType", contentType);
    console.log("contentLength", contentLength);
    if (isNotAllowedContentType(contentType) || isNotAllowedContetLength(contentLength)) return true;

    return false;
}
const isNotAllowedContetLength = (contentLength: string): boolean => {
    if (!contentLength || isNaN(Number(contentLength))) {
        return false;
    }
    if (MAX_CONTENT_LENGTH === 0) return false;
    if (Number(contentLength) > MAX_CONTENT_LENGTH) {
        return true;
    }

    return false;
};
const isNotAllowedContentType = (contentType: string): boolean => {
    if (!contentType) return false;
    console.log("contentType2", contentType);
    const { type, subtype } = new MIMEType(contentType);
    console.log("type", type);
    const excludedTypes = ["audio", "image", "multipart", "video"];
    const excludedTextSubTypes = ["css", "html", "javascript"];
    const excludedApplicationSubTypes = ["javascript"];

    if (excludedTypes.includes(type)) return true;

    if (type === "text" && (excludedTextSubTypes.includes(subtype) || subtype?.startsWith("vnd"))) return true;

    if (type === "application" && excludedApplicationSubTypes.includes(subtype)) return true;

    return false;
};

const patchSendMethod = (span, patched, param) => {
    if (patched && patched._send) {
        shimmer.wrap(patched, "_send", function (original) {
            return function (chunk) {
                const data = chunk.toString();
                if (data.length > 0) {
                    span.setAttribute(param, data);
                }
                return original.apply(this, arguments);
            };
        });
    }
};

export const http = new HttpInstrumentation({
    enabled: true,
    requestHook: (span, request) => {
        if (!span.isRecording()) return;
        if (request?.method === "GET") return;
        if (request instanceof ClientRequest) {
            patchSendMethod(span, request, "http.request_body");
        } else {
            extractData(span, request, "http.request_body");
        }
    },
    responseHook: (span, response) => {
        if (!span.isRecording()) return;
        console.log("response data record");
        if (shouldSkipResponseContent(response)) return;
        console.log("response data method");
        if (response instanceof IncomingMessage) {
            console.log("response data extract");
            extractData(span, response, "http.response_body");
        } else {
            console.log("response data patch");
            patchSendMethod(span, response, "http.response_body");
        }
    },
});
