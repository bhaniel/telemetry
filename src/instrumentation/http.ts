import { HttpInstrumentation, HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import * as shimmer from "shimmer";
import * as MIMEType from "whatwg-mimetype";
const MAX_CONTENT_LENGTH = 0;
const RESPONSE_BODY = "http.response_body";
const REQUEST_BODY = "http.request_body";

const extractData = (reqOrRes, param) => {
    shimmer.wrap(
        reqOrRes,
        "emit",
        (original) =>
            function (event, ...data) {
                if (original) {
                    if (reqOrRes && event === "data" && data.length) {
                        reqOrRes[param] = reqOrRes[param] || "";
                        reqOrRes[param] += data[0].toString();
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

const patchSendMethod = (reqOrRes, param) => {
    if (reqOrRes && reqOrRes._send) {
        shimmer.wrap(reqOrRes, "_send", function (original) {
            return function (...chunk) {
                reqOrRes[param] = reqOrRes[param] || "";
                reqOrRes[param] += chunk[0].toString();
                return original.apply(this, [...chunk]);
            };
        });
    }
};

const requestHook = (span, request) => {
    if (!span.isRecording()) return;
    if (request?.method === "GET") return;
    if (request instanceof ClientRequest) {
        patchSendMethod(request, REQUEST_BODY);
    } else {
        extractData(request, REQUEST_BODY);
    }
};

const responseHook = (span, response) => {
    if (!span.isRecording()) return;
    if (shouldSkipResponseContent(response)) return;
    if (response instanceof IncomingMessage) {
        extractData(response, RESPONSE_BODY);
    } else {
        patchSendMethod(response, RESPONSE_BODY);
    }
};
// TODO: check compression and decompression options in the future such as gzip , brotli, etc.
// TODO: Also check content length so we can limit the size of the span attributes
const applyCustomAttributesOnSpan = (span, request, response) => {
    if (!span.isRecording()) return;
    if (request && request[REQUEST_BODY]) {
        span?.setAttribute(REQUEST_BODY, request[REQUEST_BODY]);
        delete request[REQUEST_BODY];
    }
    if (response && response[RESPONSE_BODY]) {
        span?.setAttribute(RESPONSE_BODY, response[RESPONSE_BODY]);
        delete response[RESPONSE_BODY];
    }
};

export const getHttpInstrumentation = (
    config: HttpInstrumentationConfig = { enabled: true, requestHook, responseHook, applyCustomAttributesOnSpan },
) => {
    return new HttpInstrumentation(config);
};
