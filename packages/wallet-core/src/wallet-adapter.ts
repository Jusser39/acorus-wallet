import type { WalletAdapter } from "./types";
import { getEvmAddressFromMnemonic } from "./mnemonic";
import { getNativeBalance } from "./evm/balance";
import type { Address } from "viem";

export const evmWalletAdapter: WalletAdapter = {
  chainFamily: "evm",
  async createAddressFromMnemonic(mnemonic) {
    return getEvmAddressFromMnemonic(mnemonic);
  },
  async getNativeBalance(address, chainIdOrNetwork, env) {
    if (typeof chainIdOrNetwork !== "number") {
      throw new Error("EVM adapter requires numeric chainId.");
    }

    const balance = await getNativeBalance(address as Address, chainIdOrNetwork, env);

    return balance.toString();
  },
};
