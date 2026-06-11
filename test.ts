import { readErc20TokenMetadata } from "./packages/wallet-core/src/evm/token-metadata.ts";
async function main() {
  try {
    const result = await readErc20TokenMetadata("0xDef1C0ded9bec7F1a1670819833240f027b25Efc", 56);
    console.log(result);
  } catch (err) {
    console.error("FAILED", err);
  }
}
main().catch(console.error);
