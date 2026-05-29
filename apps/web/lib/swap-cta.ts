export type SwapCtaState = {
  extensionDetected: boolean;
  connected: boolean;
  quoteLoading: boolean;
  quoteReady: boolean;
  approvalRequired: boolean;
  wrongChain: boolean;
  quoteExpired: boolean;
  hasAmount: boolean;
};

export function getSwapCtaLabel(input: SwapCtaState): string {
  if (!input.extensionDetected) return "Install Acorus Extension";
  if (!input.connected) return "Connect wallet";
  if (input.wrongChain) return "Switch network";
  if (input.quoteLoading) return "Finding best route...";
  if (input.quoteExpired) return "Refresh quote";
  if (!input.hasAmount) return "Enter an amount";
  if (!input.quoteReady) return "Get quote";
  if (input.approvalRequired) return "Approve token";
  return "Review swap";
}
