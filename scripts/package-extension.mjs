import AdmZip from "adm-zip";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extensionDist = path.join(root, "apps", "extension", "dist");
const downloadsDir = path.join(root, "apps", "web", "public", "downloads");
const outputPath = path.join(downloadsDir, "acorus-wallet-extension.zip");

try {
  await stat(path.join(extensionDist, "manifest.json"));
} catch {
  throw new Error(
    "Extension dist is missing. Run pnpm --filter @acorus/extension build first.",
  );
}

await mkdir(downloadsDir, { recursive: true });

const zip = new AdmZip();
zip.addLocalFolder(extensionDist);
zip.writeZip(outputPath);

console.log(`Packaged Acorus extension: ${outputPath}`);
