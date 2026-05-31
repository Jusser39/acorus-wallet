import type { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassCard({ children, className = "", glow = false, ...props }: GlassCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 backdrop-blur-[24px] shadow-[0_22px_48px_rgba(44,31,84,0.1)] transition-all duration-300 ${
        glow ? "hover:shadow-[0_22px_48px_rgba(255,70,183,0.15)] hover:border-fuchsia-500/30" : ""
      } ${className}`}
      {...props}
    >
      {/* Optional Glow Effect Background layer */}
      {glow && (
        <div className="absolute inset-0 pointer-events-none z-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[100px] bg-gradient-to-r from-fuchsia-500/20 to-sky-500/20 blur-[50px]"></div>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
