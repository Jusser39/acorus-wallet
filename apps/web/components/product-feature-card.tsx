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
      className="premium-card group p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
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

        <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 text-xs font-semibold text-fuchsia-100">
          {feature.badge}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs">
        <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusTone[feature.status]}`}>
          {getFeatureStatusLabel(feature.status)}
        </span>

        <span className="text-fuchsia-200 transition group-hover:translate-x-0.5">
          Open →
        </span>
      </div>
    </Link>
  );
}
