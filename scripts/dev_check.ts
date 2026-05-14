import { access } from "node:fs/promises";
import { resolve } from "node:path";

const requiredPaths = [
  "apps/web/app/page.tsx",
  "apps/api/src/app.ts",
  "packages/shared/src/index.ts",
  "packages/wallet-core/src/index.ts",
  "docs/architecture.md",
  "infra/docker-compose.yml",
];

async function main() {
  await Promise.all(
    requiredPaths.map(async (path) => {
      await access(resolve(process.cwd(), path));
    }),
  );

  console.log("Acorus dev check passed.");
}

void main();
