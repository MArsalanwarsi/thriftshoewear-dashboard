import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "../../");

export function readDashboardFile(relativePath) {
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf-8");
}

export function fileExists(relativePath) {
  const fullPath = path.resolve(PROJECT_ROOT, relativePath);
  return fs.existsSync(fullPath);
}

export function getUiComponentsList() {
  const uiDir = path.resolve(PROJECT_ROOT, "src/components/ui");
  if (!fs.existsSync(uiDir)) return [];
  return fs.readdirSync(uiDir).filter((f) => f.endsWith(".jsx") || f.endsWith(".js"));
}

let cachedResources = null;
export async function loadResourcesConfig() {
  if (cachedResources) return cachedResources;
  const configPath = path.resolve(PROJECT_ROOT, "src/config/resources.js");
  const formatPath = path.resolve(PROJECT_ROOT, "src/lib/format.js");
  const formatUrl = pathToFileURL(formatPath).href;

  const raw = fs.readFileSync(configPath, "utf-8");
  const patched = raw.replace('../lib/format', formatUrl);
  const mod = await import("data:text/javascript," + encodeURIComponent(patched));
  cachedResources = mod;
  return mod;
}
