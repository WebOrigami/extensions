export default function toBuffer(value, descriptor) {
  if (value instanceof String || typeof value === "string") {
    return new TextEncoder().encode(value);
  } else if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  } else if (value instanceof Uint8Array) {
    return value;
  } else {
    throw new TypeError(`Couldn't convert to buffer: ${descriptor}`);
  }
}
