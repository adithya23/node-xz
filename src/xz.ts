import * as stream from "stream";

const node_xz = require("../build/Release/node_xz.node");

const DEFAULT_BUFSIZE = 128 * 1024;

interface Engine {
  close(): void;
  feed(buffer: Buffer): number;
  drain(buffer: Buffer, flags?: number): number;
}

class XzStream extends stream.Transform {
  engine: Engine;

  constructor(mode?: number, preset?: number, options?: stream.TransformOptions) {
    super(options);
    this.engine = new node_xz.Engine(mode, preset);
  }

  _transform(chunk: Buffer, encoding: string, callback: stream.TransformCallback) {
    this.engine.feed(chunk);
    this._drain(chunk.length);
    callback(undefined);
  }

  _flush(callback: stream.TransformCallback) {
    this._drain(DEFAULT_BUFSIZE, node_xz.ENCODE_FINISH);
    callback(undefined);
  }

  private _drain(estimate: number, flags?: number) {
    const bufSize = Math.min(estimate * 1.1, DEFAULT_BUFSIZE);
    const segments = [];
    let n = -1;
    while (n < 0) {
      const buffer = Buffer.alloc(bufSize);
      n = this.engine.drain(buffer, flags);
      segments.push(buffer.slice(0, Math.abs(n)));
    }
    this.push(Buffer.concat(segments));
  }
}

export class Compressor extends XzStream {
  constructor(preset?: number, options?: stream.TransformOptions) {
    super(node_xz.MODE_ENCODE, preset, options);
  }
}

export class Decompressor extends XzStream {
  constructor(options?: stream.TransformOptions) {
    super(node_xz.MODE_DECODE, undefined, options);
  }
}