import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const staticDir = path.join(root, "static");
const packageJsonPath = path.join(root, "package.json");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const manifest = {
  manifest_version: 3,
  name: "Acorus Wallet",
  version: packageJson.version,
  description: "Universal multichain wallet extension skeleton with no live site connectivity yet.",
  action: {
    default_title: "Acorus Wallet",
    default_popup: "popup.html",
  },
  options_page: "options.html",
  background: {
    service_worker: "background/index.js",
    type: "module",
  },
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: [],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.js"],
      run_at: "document_start",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["inpage/index.js"],
      matches: ["<all_urls>"],
    },
  ],
};

await mkdir(distDir, { recursive: true });
await cp(staticDir, distDir, { recursive: true });
await writeFile(
  path.join(distDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
