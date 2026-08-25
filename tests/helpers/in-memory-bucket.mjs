// In-memory R2-compatible bucket for deterministic Office media tests.
//
// Implements only what lib/integration/office-media.ts and the media route use:
// put / get / delete / list. Bytes are really retained, so a test can prove the
// stored object matches what was uploaded.

class StoredObject {
  constructor(key, bytes, options) {
    this.key = key;
    this.bytes = new Uint8Array(bytes);
    this.size = this.bytes.byteLength;
    this.httpMetadata = options?.httpMetadata ?? {};
    this.customMetadata = options?.customMetadata ?? {};
    this.etag = `etag-${key}-${this.size}`;
  }

  get body() {
    const bytes = this.bytes;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  async arrayBuffer() {
    return this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.byteLength);
  }
}

export class InMemoryBucket {
  constructor() {
    this.objects = new Map();
    this.putCount = 0;
    this.deleteCount = 0;
    this.failNextPut = false;
    this.failNextDelete = false;
  }

  async put(key, value, options) {
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new Error("simulated storage failure");
    }
    this.putCount += 1;
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value);
    this.objects.set(key, new StoredObject(key, bytes, options));
    return this.objects.get(key);
  }

  async get(key) {
    return this.objects.get(key) ?? null;
  }

  async delete(key) {
    if (this.failNextDelete) {
      this.failNextDelete = false;
      throw new Error("simulated storage delete failure");
    }
    this.deleteCount += 1;
    this.objects.delete(key);
  }

  keys() {
    return [...this.objects.keys()];
  }

  bytesOf(key) {
    const object = this.objects.get(key);
    return object ? object.bytes : null;
  }
}

export function createInMemoryBucket() {
  return new InMemoryBucket();
}

/** A minimal valid PNG (8-byte signature + a little payload). */
export function pngBytes(payload = "office-media") {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return new Uint8Array([...signature, ...new TextEncoder().encode(payload)]);
}

/** A minimal valid JPEG (FF D8 FF + payload). */
export function jpegBytes(payload = "office-media") {
  return new Uint8Array([0xff, 0xd8, 0xff, ...new TextEncoder().encode(payload)]);
}

/** Bytes that are NOT an image — a script disguised with an image name. */
export function scriptBytes() {
  return new TextEncoder().encode("<?php system($_GET['c']); ?>");
}
