import { KafkaJsInstrumentation, KafkaJsInstrumentationConfig } from "opentelemetry-instrumentation-kafkajs";
const getHeaders = (headers) => {
    const result = {};
    if (!headers) return result;
    Object.entries(headers).forEach(([key, value]) => {
        const newValue = value instanceof Buffer ? value.toString() : value;
        result[key] = newValue;
    });

    return result;
};

const kafkaHook = (span, topic, message) => {
    console.log("span kind", span.kind);
    console.log("isRecording", span.isRecording());
    console.log("isRecording", message);
    // if (!span.isRecording()) return;
    span.setAttribute("kafka.headers", JSON.stringify(getHeaders(message.headers)));
    span.setAttribute("kafka.message", message.value.toString());
    if (message.timestamp) {
        const timestamp = parseInt(message.timestamp, 10);
        if (!Number.isNaN(timestamp)) {
            span.setAttribute("kafka.queue_time", Date.now() - timestamp);
        }
    }
};

export const getKafkaInstrumentation = (
    config: KafkaJsInstrumentationConfig = {
        enabled: true,
        producerHook: kafkaHook,
        consumerHook: kafkaHook,
    },
) => {
    return new KafkaJsInstrumentation(config);
};
