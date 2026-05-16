import Link from "next/link";
import type { ProductFeature, ProductFeatureStatus } from "@/lib/product-features";
import { getFeatureStatusLabel } from "@/lib/product-features";

const statusTone: Record<ProductFeatureStatus, string> = {
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  preview: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  planned: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  disabled: "border-slate-700 bg-slate-800/70 text-slate-300",
};

export function ProductFeatureCard(props: {
  feature: ProductFeature;
}) {
  const { feature } = props;

  return (
    <Link
      href={feature.href}
      className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)] transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {feature.title}
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            {feature.description}
          </p>
        </div>

        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-200">
          {feature.badge}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs">
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusTone[feature.status]}`}>
          {getFeatureStatusLabel(feature.status)}
        </span>

        <span className="text-violet-200 transition group-hover:translate-x-0.5">
          Open →
        </span>
      </div>
    </Link>
  );
}
