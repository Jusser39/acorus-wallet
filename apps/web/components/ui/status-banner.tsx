type StatusBannerProps = {
  title: string;
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
};

export function StatusBanner({ title, message, tone = "info" }: StatusBannerProps) {
  const toneClass = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="font-extrabold">{title}</div>
      <p className="mt-1 text-sm opacity-80">{message}</p>
    </div>
  );
}
