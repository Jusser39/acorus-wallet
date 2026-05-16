import { ProductFeatureCard } from "@/components/product-feature-card";
import { WALLET_ACTION_FEATURES } from "@/lib/product-features";

export function WalletActionGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {WALLET_ACTION_FEATURES.map((feature) => (
        <ProductFeatureCard key={feature.id} feature={feature} />
      ))}
    </section>
  );
}
