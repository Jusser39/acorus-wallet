import { Buffer as NodeBuffer } from "buffer";

const nodeProcess = {
  browser: true,
  env: {},
  version: "",
};

export const Buffer = NodeBuffer;
export const global = globalThis;
export const process = nodeProcess;

const globalWithNodeCompat = globalThis as typeof globalThis & {
  Buffer?: typeof NodeBuffer;
  global?: typeof globalThis;
  process?: typeof nodeProcess;
};

if (!globalWithNodeCompat.Buffer) {
  globalWithNodeCompat.Buffer = NodeBuffer;
}

if (!globalWithNodeCompat.global) {
  globalWithNodeCompat.global = globalThis;
}

if (!globalWithNodeCompat.process) {
  globalWithNodeCompat.process = nodeProcess;
}
