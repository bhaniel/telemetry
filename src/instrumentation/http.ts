import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import * as shimmer from "shimmer";
import * as MIMEType from "whatwg-mimetype";
const MAX_CONTENT_LENGTH = 0;
const RESPONSE_BODY = "http.response_body";
const REQUEST_BODY = "http.request_body";

const extractData = (span, request, param) => {
    shimmer.wrap(
        request,
        "emit",
        (original) =>
            function (event, ...data) {
                if (original) {
                    if (request && event === "data" && data.length) {
                        request[param] = request[param] || "";
                        request[param] += data[0].toString();
                    }
                    // if (request && event === "end") {
                    //     span.setAttribute(param, request[param]);
                    //     // delete request[param];
                    // }

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
    const { type, subtype } = new MIMEType(contentType);
    const excludedTypes = ["audio", "image", "multipart", "video"];
    const excludedTextSubTypes = ["css", "html", "javascript"];
    const excludedApplicationSubTypes = ["javascript"];

    if (excludedTypes.includes(type)) return true;

    if (type === "text" && (excludedTextSubTypes.includes(subtype) || subtype?.startsWith("vnd"))) return true;

    if (type === "application" && excludedApplicationSubTypes.includes(subtype)) return true;

    return false;
};

const patchSendMethod = (span, request, param) => {
    if (request && request._send) {
        shimmer.wrap(request, "_send", function (original) {
            return function (...chunk) {
                request[param] = request[param] || "";
                request[param] += chunk[0].toString();
                return original.apply(this, [...chunk]);
            };
        });

        // // Assuming `patched` could be a response object in an HTTP server context
        // request.on("finish", () => {
        //     console.log("finish", request[param]);
        //     // 'finish' event is emitted when the response has been sent
        //     if (request[param].length > 0) {
        //         span.setAttribute(param, request[param]);
        //         // delete request[param];
        //     }
        // });
    }
};

export const http = new HttpInstrumentation({
    enabled: true,
    requestHook: (span, request) => {
        if (!span.isRecording()) return;
        if (request?.method === "GET") return;
        if (request instanceof ClientRequest) {
            patchSendMethod(span, request, REQUEST_BODY);
        } else {
            extractData(span, request, REQUEST_BODY);
        }
    },
    responseHook: (span, response) => {
        if (!span.isRecording()) return;
        if (shouldSkipResponseContent(response)) return;
        if (response instanceof IncomingMessage) {
            extractData(span, response, RESPONSE_BODY);
        } else {
            patchSendMethod(span, response, RESPONSE_BODY);
        }
    },
    applyCustomAttributesOnSpan: (span, request, response) => {
        if (!span.isRecording()) return;
        if (request && request[REQUEST_BODY]) span?.setAttribute(REQUEST_BODY, request[REQUEST_BODY]);
        if (response && response[RESPONSE_BODY]) span?.setAttribute(RESPONSE_BODY, response[RESPONSE_BODY]);
    },
});
