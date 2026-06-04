import { Core } from "@walletconnect/core";
import { Web3Wallet, type IWeb3Wallet, type Web3WalletTypes } from "@walletconnect/web3wallet";

export class WalletConnectClient {
  private wallet: IWeb3Wallet | null = null;
  private isInitializing = false;
  
  public async initialize(): Promise<IWeb3Wallet> {
    if (this.wallet) return this.wallet;
    if (this.isInitializing) {
      // wait until initialized
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.wallet!;
    }

    this.isInitializing = true;
    try {
      const core = new Core({
        // Standard public test project ID or fallback
        projectId: "8d39c9f0b5d90e0c030d9fb82abdcfa2", 
      });

      this.wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: "Acorus Extension",
          description: "Ultimate Multi-Chain Wallet",
          url: "https://24wallet.ru",
          icons: ["https://24wallet.ru/favicon.ico"],
        },
      });

      // Hook up default listeners
      this.wallet.on("session_proposal", this.onSessionProposal.bind(this));
      this.wallet.on("session_request", this.onSessionRequest.bind(this));
      this.wallet.on("session_delete", this.onSessionDelete.bind(this));

      console.log("[WalletConnect] Initialized Web3Wallet");
      return this.wallet;
    } finally {
      this.isInitializing = false;
    }
  }

  public async pair(uri: string): Promise<void> {
    const wallet = await this.initialize();
    await wallet.core.pairing.pair({ uri });
  }

  public async approveSession(id: number, namespaces: Record<string, any>): Promise<void> {
    const wallet = await this.initialize();
    await wallet.approveSession({
      id,
      namespaces,
    });
  }

  public async rejectSession(id: number, reason: string): Promise<void> {
    const wallet = await this.initialize();
    await wallet.rejectSession({
      id,
      reason: {
        code: 5000,
        message: reason,
      },
    });
  }

  public async respondSessionRequest(topic: string, response: any): Promise<void> {
    const wallet = await this.initialize();
    await wallet.respondSessionRequest({
      topic,
      response,
    });
  }

  private onSessionProposal(proposal: Web3WalletTypes.SessionProposal) {
    console.log("[WalletConnect] Session Proposal:", proposal);
    // TODO: Bridge this to the extension state so the UI can prompt the user
    // For now we will auto-reject to prevent hanging while we build the UI
    this.rejectSession(proposal.id, "User rejection").catch(console.error);
  }

  private onSessionRequest(request: Web3WalletTypes.SessionRequest) {
    console.log("[WalletConnect] Session Request:", request);
    // TODO: Bridge this to the standard acorus_signTransaction pipeline
  }

  private onSessionDelete(event: any) {
    console.log("[WalletConnect] Session Delete:", event);
  }
}

export const walletConnectClient = new WalletConnectClient();
