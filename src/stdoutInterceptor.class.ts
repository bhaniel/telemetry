import { Writable } from "stream";

// Custom Writable stream to intercept stdout
export class StdoutInterceptor extends Writable {
    private buffer: string[] = [];
    private maxBufferSize = 500;
    private flushInterval = 1000;
    private forwardLog: (message: string) => void;
    private originalStdoutWrite;
    constructor(forwardLog: (message: string) => void, originalStdoutWrite) {
        super();
        this.forwardLog = forwardLog;
        this.originalStdoutWrite = originalStdoutWrite;
        setInterval(() => this.flushBuffer(), this.flushInterval);
    }

    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (this.buffer.length >= this.maxBufferSize) {
            callback();
            return;
        }
        // Convert the chunk into a readable format and add to buffer
        const message = chunk.toString();
        this.buffer.push(message);
        callback();
    }

    flushBuffer(): void {
        while (this.buffer.length > 0) {
            const message = this.buffer.shift();
            if (message) {
                this.forwardLog(message);
                this.originalStdoutWrite(Buffer.from(message), "utf8");
            }
        }
    }
}
