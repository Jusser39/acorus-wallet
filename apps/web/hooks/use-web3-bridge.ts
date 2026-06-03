import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet-store";

export function useWeb3Bridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const profiles = useWalletStore((state) => state.profiles);
  const activeProfileId = useWalletStore((state) => state.activeProfileId);
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure message is from our iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const { type, payload, id } = event.data;

      if (!type || !id) return;

      const respond = (result: any, error?: any) => {
        iframeRef.current?.contentWindow?.postMessage(
          { id, type: `${type}_response`, result, error },
          "*"
        );
      };

      switch (type) {
        case "eth_requestAccounts":
        case "eth_accounts": {
          if (!activeProfile) {
            respond(null, { code: 4001, message: "User rejected the request." });
            return;
          }
          // Assuming the active profile's public address is the EVM address
          // for the demo, since it's a unified address across most chains.
          if (activeProfile.publicAddress) {
            respond([activeProfile.publicAddress]);
          } else {
            // Mock address for practice/demo wallets
            respond(["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"]);
          }
          break;
        }
        case "eth_chainId": {
          // Default to Ethereum mainnet (0x1)
          respond("0x1");
          break;
        }
        case "eth_sendTransaction":
        case "personal_sign":
        case "eth_signTypedData_v4": {
          // Simulate user prompt and approval/rejection
          console.log("Web3 request intercepted:", type, payload);
          // In a real implementation, we would open a modal here, wait for user confirmation,
          // then sign the payload with the active wallet and return the signature.
          
          // For now, auto-reject or mock signature (return error to prevent blind signing)
          respond(null, { code: 4001, message: "Signature simulation rejected for security in MVP." });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeRef, activeProfile]);
}
