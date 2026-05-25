import { Buffer } from "buffer";

const globalWithNodeCompat = globalThis as unknown as {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: {
    env: Record<string, string | undefined>;
    version: string;
    browser: boolean;
  };
};

if (!globalWithNodeCompat.Buffer) {
  globalWithNodeCompat.Buffer = Buffer;
}

if (!globalWithNodeCompat.global) {
  globalWithNodeCompat.global = globalThis;
}

if (!globalWithNodeCompat.process) {
  globalWithNodeCompat.process = {
    env: {},
    version: "",
    browser: true,
  };
}
