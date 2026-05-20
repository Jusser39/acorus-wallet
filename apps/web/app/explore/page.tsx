import { fetchExploreMemes, fetchExploreTop, fetchExploreTrending } from "@/lib/api";
import { ExploreClient } from "./explore-client";

export default async function ExplorePage() {
  const [trendingResult, topResult, memesResult] = await Promise.allSettled([
    fetchExploreTrending(),
    fetchExploreTop({ view: "top", limit: 50 }),
    fetchExploreMemes(),
  ]);

  return (
    <ExploreClient
      initialTrending={trendingResult.status === "fulfilled" ? trendingResult.value.items : []}
      initialTop={topResult.status === "fulfilled" ? topResult.value.items : []}
      initialMemes={memesResult.status === "fulfilled" ? memesResult.value.items : []}
    />
  );
}
