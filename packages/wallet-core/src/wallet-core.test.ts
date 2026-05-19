import { describe, expect, it } from "vitest";
import {
  createDefaultAdapterRegistry,
  createDefaultSwapQuoteEngine,
  createCustomViemChain,
  createEvmPublicClient,
  deriveEvmAccountFromMnemonic,
  deriveSolanaAddressFromMnemonic,
  buildExplorerTxUrl,
  formatRawAmount,
  decryptVault,
  encryptVault,
  generateWalletMnemonic,
  parseEncryptedVault,
  parseDecimalAmountToRaw,
  getEvmAddressFromMnemonic,
  getRpcUrl,
  isValidSolanaAddress,
  buildSolanaExplorerAddressUrl,
  buildSolanaExplorerTxUrl,
  createSolanaSendDraft,
  buildSplTransferDraft,
  buildErc20ApproveTransaction,
  encodeErc20Allowance,
  encodeErc20Approve,
  estimateSplTransferFee,
  formatLamports,
  getAssociatedTokenAddress,
  parseSolanaAmountToLamports,
  SendDraftEngine,
  validateSolanaOwnerAddress,
  validateSplTokenMint,
  validateWalletMnemonic,
  shouldRequestErc20Allowance,
} from "./index";
import type { WalletVaultPlaintext } from "./types";

describe("wallet-core", () => {
  it("generates a valid mnemonic", () => {
    const mnemonic = generateWalletMnemonic();

    expect(validateWalletMnemonic(mnemonic)).toBe(true);
  });

  it("encrypts and decrypts a vault", async () => {
    const plaintext: WalletVaultPlaintext = {
      mnemonic: "test test test test test test test test test test test junk",
      evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const encrypted = await encryptVault(plaintext, "123456");
    const decrypted = await decryptVault(encrypted, "123456");

    expect(decrypted).toEqual(plaintext);
  });

  it("rejects invalid mnemonic phrases", () => {
    expect(validateWalletMnemonic("hello world")).toBe(false);
  });

  it("fails on wrong passcode", async () => {
    const plaintext: WalletVaultPlaintext = {
      mnemonic: "test test test test test test test test test test test junk",
      evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const encrypted = await encryptVault(plaintext, "123456");

    await expect(decryptVault(encrypted, "654321")).rejects.toThrow(
      "Unable to unlock wallet with the provided passcode.",
    );
  });

  it("derives a stable EVM address", () => {
    expect(
      getEvmAddressFromMnemonic(
        "test test test test test test test test test test test junk",
      ),
    ).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    expect(
      deriveEvmAccountFromMnemonic(
        "test test test test test test test test test test test junk",
      ).address,
    ).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("builds custom EVM viem chain config", () => {
    const customChain = {
      chainId: 9999,
      name: "Acorus Testnet",
      nativeCurrency: {
        name: "Acorus",
        symbol: "ACR",
        decimals: 18,
      },
      rpcUrl: "https://rpc.example.test",
      blockExplorerUrl: "https://explorer.example.test",
    };
    const chain = createCustomViemChain(customChain);
    const client = createEvmPublicClient(9999, {}, { customChain });

    expect(chain.id).toBe(9999);
    expect(chain.rpcUrls.default.http).toEqual(["https://rpc.example.test"]);
    expect(client.chain?.id).toBe(9999);
  });

  it("encodes ERC-20 approve and allowance calldata", () => {
    const spender = "0x0000000000000000000000000000000000000001";
    const owner = "0x0000000000000000000000000000000000000002";

    expect(encodeErc20Approve(spender, "1000")).toMatch(/^0x095ea7b3/u);
    expect(encodeErc20Allowance(owner, spender)).toMatch(/^0xdd62ed3e/u);
  });

  it("builds explicit ERC-20 approve transactions", () => {
    const tx = buildErc20ApproveTransaction({
      chainId: 1,
      tokenAddress: "0x0000000000000000000000000000000000000003",
      owner: "0x0000000000000000000000000000000000000002",
      spender: "0x0000000000000000000000000000000000000001",
      amountRaw: "1000",
      approvalMode: "exact",
    });

    expect(tx.to).toBe("0x0000000000000000000000000000000000000003");
    expect(tx.value).toBe("0x0");
    expect(tx.approvalMode).toBe("exact");
    expect(tx.riskLabels).toContain("Token approval required");
    expect(shouldRequestErc20Allowance({ assetType: "native" })).toBe(false);
    expect(shouldRequestErc20Allowance({ assetType: "erc20", tokenAddress: tx.to })).toBe(true);
  });

  it("rejects invalid ERC-20 approval spender", () => {
    expect(() =>
      buildErc20ApproveTransaction({
        chainId: 1,
        tokenAddress: "0x0000000000000000000000000000000000000003",
        owner: "0x0000000000000000000000000000000000000002",
        spender: "invalid",
        amountRaw: "1000",
        approvalMode: "infinite",
      }),
    ).toThrow("Invalid EVM spender address.");
  });

  it("derives a stable Solana address from mnemonic", () => {
    const mnemonic = "test test test test test test test test test test test junk";

    const first = deriveSolanaAddressFromMnemonic({ mnemonic });
    const second = deriveSolanaAddressFromMnemonic({ mnemonic });

    expect(first.publicAddress).toBe(second.publicAddress);
    expect(first.derivationPath).toBe("m/44'/501'/0'/0'");
    expect(isValidSolanaAddress(first.publicAddress)).toBe(true);
  });

  it("default adapter registry includes EVM and Solana adapters", () => {
    const registry = createDefaultAdapterRegistry();

    expect(registry.require({ family: "evm", chainId: 1 }).name).toBeTruthy();
    expect(registry.require({ family: "solana", chainId: 101 }).name).toBe("Solana");
  });

  it("default adapter registry includes Tron and Bitcoin skeleton adapters", () => {
    const registry = createDefaultAdapterRegistry();

    expect(registry.require({ family: "tron", chainId: "tron-mainnet" }).capabilities.nativeBalance).toBe(false);
    expect(registry.require({ family: "utxo", chainId: "bitcoin-mainnet" }).capabilities.nativeBalance).toBe(false);
  });

  it("Solana adapter receive info is safe", () => {
    const registry = createDefaultAdapterRegistry();
    const adapter = registry.require({ family: "solana", chainId: 101 });

    const receive = adapter.getReceiveInfo({
      address: "11111111111111111111111111111111",
    });

    expect(receive.warning).toContain("Solana");
    expect(receive.qrValue).toBe("11111111111111111111111111111111");
  });

  it("rejects invalid Solana address", () => {
    expect(isValidSolanaAddress("not-a-solana-address")).toBe(false);
  });

  it("validates Solana addresses through the live wallet helper", () => {
    expect(isValidSolanaAddress("11111111111111111111111111111111")).toBe(true);
    expect(isValidSolanaAddress("bad-address")).toBe(false);
  });

  it("parses and formats SOL lamport amounts", () => {
    expect(parseSolanaAmountToLamports({ amountFormatted: "1.25" })).toBe(1_250_000_000n);
    expect(formatLamports(1_250_000_000n)).toBe("1.25");
  });

  it("builds Solana explorer URLs", () => {
    expect(buildSolanaExplorerTxUrl("abc 123")).toBe("https://solscan.io/tx/abc%20123");
    expect(buildSolanaExplorerAddressUrl("11111111111111111111111111111111")).toBe(
      "https://solscan.io/account/11111111111111111111111111111111",
    );
  });

  it("validates Solana send drafts", async () => {
    const draft = await createSolanaSendDraft({
      fromAddress: "11111111111111111111111111111111",
      toAddress: "bad-address",
      amountFormatted: "0",
      balanceLamports: "10000",
      estimatedFeeLamports: "5000",
    });

    expect(draft.canBroadcast).toBe(false);
    expect(draft.errors).toEqual(expect.arrayContaining([
      "Invalid Solana recipient address.",
      "Amount must be greater than zero.",
    ]));
  });

  it("creates valid Solana send drafts when balance covers amount and fee", async () => {
    const draft = await createSolanaSendDraft({
      fromAddress: "11111111111111111111111111111111",
      toAddress: "11111111111111111111111111111111",
      amountFormatted: "0.000001",
      balanceLamports: "10000",
      estimatedFeeLamports: "5000",
    });

    expect(draft.supportStatus).toBe("supported");
    expect(draft.canBroadcast).toBe(true);
    expect(draft.amountRaw).toBe("1000");
  });

  it("validates SPL mint and owner addresses", () => {
    const address = deriveSolanaAddressFromMnemonic({
      mnemonic: "test test test test test test test test test test test junk",
    }).publicAddress;

    expect(validateSplTokenMint(address)).toBe(true);
    expect(validateSolanaOwnerAddress(address)).toBe(true);
    expect(validateSplTokenMint("bad-mint")).toBe(false);
    expect(validateSolanaOwnerAddress("bad-owner")).toBe(false);
  });

  it("builds associated token addresses deterministically", () => {
    const owner = deriveSolanaAddressFromMnemonic({
      mnemonic: "test test test test test test test test test test test junk",
    }).publicAddress;
    const mint = "So11111111111111111111111111111111111111112";

    expect(getAssociatedTokenAddress({ mintAddress: mint, ownerAddress: owner })).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/u);
  });

  it("validates SPL transfer drafts", async () => {
    const owner = deriveSolanaAddressFromMnemonic({
      mnemonic: "test test test test test test test test test test test junk",
    }).publicAddress;
    const draft = await buildSplTransferDraft({
      mintAddress: "bad-mint",
      fromOwnerAddress: owner,
      toOwnerAddress: "bad-recipient",
      amountFormatted: "0",
      decimals: 6,
      balanceRaw: "1",
      recipientAtaExists: true,
      estimatedFeeLamports: "10000",
    });

    expect(draft.canBroadcast).toBe(false);
    expect(draft.errors).toEqual(expect.arrayContaining([
      "Invalid SPL token mint address.",
      "Invalid Solana recipient address.",
      "Amount must be greater than zero.",
    ]));
  });

  it("flags insufficient SPL balance and recipient ATA warnings", async () => {
    const owner = deriveSolanaAddressFromMnemonic({
      mnemonic: "test test test test test test test test test test test junk",
    }).publicAddress;
    const draft = await buildSplTransferDraft({
      mintAddress: "So11111111111111111111111111111111111111112",
      fromOwnerAddress: owner,
      toOwnerAddress: owner,
      amountFormatted: "2",
      decimals: 6,
      balanceRaw: "1000000",
      recipientAtaExists: false,
      estimatedFeeLamports: "15000",
    });

    expect(draft.canBroadcast).toBe(false);
    expect(draft.errors).toContain("Insufficient SPL token balance.");
    expect(draft.warnings.join(" ")).toContain("associated token account");
    expect(draft.feeEstimate?.feeFormatted).toBe("0.000015");
  });

  it("estimates higher SPL fee when recipient ATA is missing", async () => {
    await expect(estimateSplTransferFee({ recipientAtaExists: false })).resolves.toBe(15_000n);
    await expect(estimateSplTransferFee({ recipientAtaExists: true })).resolves.toBe(10_000n);
  });

  it("does not leak mnemonic in encrypted payload", async () => {
    const mnemonic = "test test test test test test test test test test test junk";
    const encrypted = await encryptVault(
      {
        mnemonic,
        evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      "123456",
    );

    expect(JSON.stringify(encrypted)).not.toContain(mnemonic);
  });

  it("resolves chain config through env", () => {
    const env = {
      NEXT_PUBLIC_ETH_RPC_URL: "https://example.com/eth",
      NEXT_PUBLIC_BSC_RPC_URL: "https://example.com/bsc",
      NEXT_PUBLIC_POLYGON_RPC_URL: "https://example.com/polygon",
      NEXT_PUBLIC_ARBITRUM_RPC_URL: "https://example.com/arbitrum",
      NEXT_PUBLIC_OPTIMISM_RPC_URL: "https://example.com/optimism",
      NEXT_PUBLIC_BASE_RPC_URL: "https://example.com/base",
      NEXT_PUBLIC_SOLANA_RPC_URL: "https://example.com/solana",
    };

    expect(getRpcUrl(1, env)).toBe("https://example.com/eth");
    expect(getRpcUrl(56, env)).toBe("https://example.com/bsc");
    expect(getRpcUrl(137, env)).toBe("https://example.com/polygon");
    expect(getRpcUrl(42161, env)).toBe("https://example.com/arbitrum");
    expect(getRpcUrl(10, env)).toBe("https://example.com/optimism");
    expect(getRpcUrl(8453, env)).toBe("https://example.com/base");
  });

  it("builds explorer links from chain config", () => {
    expect(
      buildExplorerTxUrl(
        1,
        "0x1111111111111111111111111111111111111111111111111111111111111111",
      ),
    ).toBe(
      "https://etherscan.io/tx/0x1111111111111111111111111111111111111111111111111111111111111111",
    );
    expect(buildExplorerTxUrl(101, "solana-signature")).toBe(
      "https://solscan.io/tx/solana-signature",
    );
  });

  it("rejects unsupported vault versions", () => {
    expect(() =>
      parseEncryptedVault({
        version: 2,
        kdf: "pbkdf2-sha256",
        iterations: 1,
        saltBase64: "salt",
        ivBase64: "iv",
        ciphertextBase64: "cipher",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow("Unsupported vault version.");
  });

  it("parses and formats decimal amounts", () => {
    expect(
      parseDecimalAmountToRaw({
        amountFormatted: "1.23",
        decimals: 6,
      }),
    ).toBe("1230000");

    expect(
      formatRawAmount({
        amountRaw: "1230000",
        decimals: 6,
      }),
    ).toBe("1.23");
  });

  it("creates EVM native send draft", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "evm",
      chainId: 1,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: "0x0000000000000000000000000000000000000001",
      asset: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.01",
      balance: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.supportStatus).toBe("supported");
    expect(draft.canProceed).toBe(true);
    expect(draft.canBroadcast).toBe(true);
    expect(draft.amountRaw).toBe("10000000000000000");
  });

  it("creates EVM ERC-20 send draft with gas warning", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "evm",
      chainId: 1,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: "0x0000000000000000000000000000000000000001",
      asset: {
        family: "evm",
        chainId: 1,
        type: "erc20",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        tokenAddress: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        isVerified: true,
      },
      amountFormatted: "12.5",
      balance: {
        family: "evm",
        chainId: 1,
        type: "erc20",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        tokenAddress: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        isVerified: true,
        balanceRaw: "50000000",
        balanceFormatted: "50",
      },
    });

    expect(draft.supportStatus).toBe("supported");
    expect(draft.warnings).toContain("Token transfers require native coin for gas.");
    expect(draft.feeEstimate?.gasLimit).toBe("65000");
  });

  it("blocks draft with invalid EVM recipient", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "evm",
      chainId: 1,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: "invalid",
      asset: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.01",
      balance: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.canProceed).toBe(false);
    expect(draft.errors.some((item) => item.includes("Invalid recipient"))).toBe(true);
  });

  it("blocks draft with insufficient balance", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "evm",
      chainId: 1,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: "0x0000000000000000000000000000000000000001",
      asset: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "2",
      balance: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.canProceed).toBe(false);
    expect(draft.errors.some((item) => item.includes("Insufficient balance"))).toBe(true);
  });

  it("returns supported draft for Solana", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "solana",
      chainId: 101,
      fromAddress: "11111111111111111111111111111111",
      toAddress: "11111111111111111111111111111111",
      asset: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.1",
      balance: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.supportStatus).toBe("supported");
    expect(draft.canBroadcast).toBe(true);
  });

  it("returns skeleton draft for Tron", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "tron",
      chainId: "tron-mainnet",
      fromAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      toAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      asset: {
        family: "tron",
        chainId: "tron-mainnet",
        type: "native",
        symbol: "TRX",
        name: "Tron",
        decimals: 6,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "1",
    });

    expect(draft.supportStatus).toBe("skeleton");
    expect(draft.canBroadcast).toBe(false);
  });

  it("returns skeleton draft for Bitcoin", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendDraftEngine(registry);

    const draft = await engine.createDraft({
      family: "utxo",
      chainId: "bitcoin-mainnet",
      fromAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
      toAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
      asset: {
        family: "utxo",
        chainId: "bitcoin-mainnet",
        type: "utxo",
        symbol: "BTC",
        name: "Bitcoin",
        decimals: 8,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "1",
    });

    expect(draft.supportStatus).toBe("skeleton");
    expect(draft.canBroadcast).toBe(false);
  });
});

// ── Wave 5: SendExecutionEngine tests ────────────────────────────────────────

import { SendExecutionEngine } from "./send/execution-engine";

describe("SendExecutionEngine", () => {
  it("returns unsupported for Solana adapter", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendExecutionEngine(registry);

    const result = await engine.execute({
      draft: {
        family: "solana",
        chainId: 101,
        fromAddress: "11111111111111111111111111111111",
        toAddress: "11111111111111111111111111111111",
        normalizedToAddress: "11111111111111111111111111111111",
        asset: {
          family: "solana",
          chainId: 101,
          type: "native",
          symbol: "SOL",
          name: "Solana",
          decimals: 9,
          tokenAddress: null,
          isVerified: true,
        },
        amountRaw: "100000000",
        amountFormatted: "0.1",
        supportStatus: "coming_soon",
        feeEstimate: null,
        issues: [],
        warnings: [],
        errors: [],
        canProceed: false,
        canBroadcast: false,
        createdAt: new Date().toISOString(),
      },
    });

    expect(result.status).toBe("unsupported");
    expect(result.family).toBe("solana");
  });

  it("returns rejected for EVM draft with missing_signer", async () => {
    const registry = createDefaultAdapterRegistry();
    const engine = new SendExecutionEngine(registry);

    const result = await engine.execute({
      draft: {
        family: "evm",
        chainId: 1,
        fromAddress: "0x0000000000000000000000000000000000000000",
        toAddress: "0x0000000000000000000000000000000000000001",
        normalizedToAddress: "0x0000000000000000000000000000000000000001",
        asset: {
          family: "evm",
          chainId: 1,
          type: "native",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          tokenAddress: null,
          isVerified: true,
        },
        amountRaw: "10000000000000000",
        amountFormatted: "0.01",
        supportStatus: "supported",
        feeEstimate: null,
        issues: [],
        warnings: [],
        errors: [],
        canProceed: true,
        canBroadcast: true,
        createdAt: new Date().toISOString(),
      },
      // no mnemonic supplied — should return missing_signer
    });

    expect(result.status).toBe("rejected");
    expect(result.errorCode).toBe("missing_signer");
    expect(result.family).toBe("evm");
  });
});

describe("SwapQuoteEngine", () => {
  it("creates mock same-chain swap quote", async () => {
    const engine = createDefaultSwapQuoteEngine();

    const quote = await engine.getQuote({
      from: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      to: {
        family: "evm",
        chainId: 1,
        type: "erc20",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        isVerified: true,
      },
      amountFormatted: "1",
      slippageBps: 50,
    });

    expect(quote.status).toBe("quoted");
    expect(quote.provider).toBe("mock");
    expect(quote.toAmountRaw).toBeTruthy();
    expect(quote.route.length).toBeGreaterThan(0);
    expect(quote.warnings.some((item) => item.includes("preview"))).toBe(true);
  });

  it("creates mock cross-chain swap quote", async () => {
    const engine = createDefaultSwapQuoteEngine();

    const quote = await engine.getQuote({
      from: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      to: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.5",
      slippageBps: 100,
    });

    expect(quote.status).toBe("quoted");
    expect(quote.warnings.some((item) => item.includes("Cross-chain"))).toBe(true);
  });
});
