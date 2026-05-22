import type { ReactNode } from "react";

type PremiumCardProps = {
  children: ReactNode;
  className?: string;
};

export function PremiumCard({ children, className = "" }: PremiumCardProps) {
  return <section className={`acorus-card ${className}`}>{children}</section>;
}
