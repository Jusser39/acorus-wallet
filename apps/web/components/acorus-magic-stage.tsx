import { AcorusMage } from "@/components/acorus-mage";

const TOKENS = [
  { symbol: "ETH", className: "left-[8%] top-[25%]" },
  { symbol: "BTC", className: "right-[11%] top-[31%]" },
  { symbol: "SOL", className: "left-[16%] bottom-[25%]" },
  { symbol: "USDC", className: "right-[12%] bottom-[21%]" },
];

type AcorusMagicStageProps = {
  pose?: "home" | "swap" | "send" | "receive" | "security" | "explore";
  compact?: boolean;
};

export function AcorusMagicStage({
  pose = "home",
  compact = false,
}: AcorusMagicStageProps) {
  const poseLabel = {
    home: "Acorus Guardian",
    swap: "Swap Alchemy",
    send: "Send Beam",
    receive: "Receive Portal",
    security: "Shield Mode",
    explore: "Explore Atlas",
  }[pose];

  return (
    <div
      className={`magic-stage-shell relative flex items-center justify-center overflow-hidden ${
        compact ? "min-h-[360px]" : "min-h-[620px]"
      }`}
    >
      <div className="absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-full border border-white/70 bg-white/55 px-5 py-3 text-xs font-black uppercase tracking-[0.26em] text-violet-800 shadow-[0_18px_44px_rgba(85,166,255,0.18)] backdrop-blur-xl">
        {poseLabel}
      </div>

      <div className="absolute bottom-6 h-32 w-72 rounded-[999px] border border-white/60 bg-white/20 shadow-[0_0_80px_rgba(124,247,255,0.45)]" />
      <div className="absolute inset-10 rounded-full border border-dashed border-white/50" />
      <div className="absolute inset-[16%] rounded-full border border-dashed border-violet-200/60" />

      <AcorusMage compact={compact} />

      {TOKENS.map((token, index) => (
        <span
          key={token.symbol}
          className={`magic-token-chip magic-floating absolute z-30 ${token.className} px-4 py-2 text-sm font-black text-slate-900 shadow-lg`}
          style={{ animationDelay: `${index * 240}ms` }}
        >
          {token.symbol}
        </span>
      ))}
    </div>
  );
}
