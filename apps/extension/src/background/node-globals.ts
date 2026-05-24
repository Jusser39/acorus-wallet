import { Buffer } from "buffer";

const globalWithNodeCompat = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
};

if (!globalWithNodeCompat.Buffer) {
  globalWithNodeCompat.Buffer = Buffer;
}
