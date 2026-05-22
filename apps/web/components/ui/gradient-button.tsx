import type { ButtonHTMLAttributes, ReactNode } from "react";

type GradientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
};

export function GradientButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: GradientButtonProps) {
  const base =
    variant === "primary"
      ? "acorus-button-primary"
      : variant === "danger"
        ? "rounded-full bg-red-500 font-extrabold text-white shadow-lg shadow-red-500/20"
        : "acorus-button-secondary";

  return (
    <button className={`${base} px-4 py-3 ${className}`} {...props}>
      {children}
    </button>
  );
}
