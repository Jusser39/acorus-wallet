const meta = {
  activeProfileId: "extension_evm_0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
  profiles: [
    {
      profileId: "extension_evm_0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      name: "My Wallet",
      account: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      chainFamily: "evm",
      chainIds: [1, 10, 56, 137, 42161, 8453],
      selected: true
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  passcodeInitialized: true,
  passcodeMode: "user",
  passcodeSetupConfirmedAt: new Date().toISOString()
};

function isDappWalletExposure(value) {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const candidate = value;
    return typeof candidate.profileId === "string" && typeof candidate.name === "string" && typeof candidate.account === "string" && (candidate.chainFamily === "evm" || candidate.chainFamily === "solana" || candidate.chainFamily === "tron" || candidate.chainFamily === "utxo" || candidate.chainFamily === "ton") && Array.isArray(candidate.chainIds) && typeof candidate.selected === "boolean";
}

function normalizeVaultMeta(value) {
    if (typeof value !== "object" || value === null) {
      return null;
    }
    const candidate = value;
    if (typeof candidate.activeProfileId !== "string" || !Array.isArray(candidate.profiles) || typeof candidate.createdAt !== "string" || typeof candidate.updatedAt !== "string" || candidate.passcodeInitialized !== true || (candidate.passcodeMode !== "user" && candidate.passcodeMode !== "pin" && candidate.passcodeMode !== "random") || typeof candidate.passcodeSetupConfirmedAt !== "string") {
      return null;
    }
    return {
      activeProfileId: candidate.activeProfileId,
      profiles: candidate.profiles.filter(isDappWalletExposure),
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      passcodeInitialized: candidate.passcodeInitialized,
      passcodeMode: candidate.passcodeMode,
      passcodeSetupConfirmedAt: candidate.passcodeSetupConfirmedAt
    };
}

console.log(normalizeVaultMeta(meta));
