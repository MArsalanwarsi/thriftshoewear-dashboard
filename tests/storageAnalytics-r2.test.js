/**
 * Comprehensive Test Suite for Cloudflare R2 Storage Analytics & Code-Splitting (R1, R2, R3)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TestServer } from "./helpers/test-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("    CLOUDFLARE R2 STORAGE ANALYTICS & CODE-SPLITTING VERIFICATION    ");
console.log("======================================================================");

// Bootstrap Vite SSR loader for JSX components
const { createServer } = await import("vite");
const viteServer = await createServer({
  root: PROJECT_ROOT,
  server: { middlewareMode: true },
  logLevel: "silent",
});

// Mock browser globals for SSR / testing
globalThis.window = {
  innerWidth: 1024,
  matchMedia: () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
};

// Load target modules via Vite SSR
const overviewModule = await viteServer.ssrLoadModule("./src/pages/OverviewPage.jsx");
const { normalizeDashboardData } = overviewModule;

let passedCount = 0;
let failedCount = 0;

function runCheck(category, description, fn) {
  try {
    fn();
    console.log(`[${category}] ✓ PASS: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`[${category}] ✗ FAIL: ${description}`);
    console.error(`       Error: ${err.message}`);
    failedCount++;
  }
}

async function runAsyncCheck(category, description, fn) {
  try {
    await fn();
    console.log(`[${category}] ✓ PASS: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`[${category}] ✗ FAIL: ${description}`);
    console.error(`       Error: ${err.message}`);
    failedCount++;
  }
}

// -----------------------------------------------------------------------------
// Suite 1: normalizeDashboardData Storage Defense & Boundaries
// -----------------------------------------------------------------------------
console.log("\n--- Suite 1: normalizeDashboardData Defense & Boundaries ---");

runCheck("Suite 1: Normalizer", "Normalizes standard production storage payload", () => {
  const raw = {
    data: {
      storage: {
        provider: "Cloudflare R2",
        bucket: "thriftshoewear",
        totalBytes: 5242880,
        fileCount: 42,
        formattedSize: "5.0 MB",
        freeTierAllowance: "10 GB",
        percentageUsed: 0.05,
        breakdown: {
          webp: { count: 35, bytes: 4000000 },
          avatars: { count: 4, bytes: 600000 },
          receipts: { count: 3, bytes: 642880 },
        },
        health: "healthy",
      },
    },
  };
  const normalized = normalizeDashboardData(raw);
  assert.equal(normalized.storage.provider, "Cloudflare R2");
  assert.equal(normalized.storage.bucket, "thriftshoewear");
  assert.equal(normalized.storage.totalBytes, 5242880);
  assert.equal(normalized.storage.fileCount, 42);
  assert.equal(normalized.storage.formattedSize, "5.0 MB");
  assert.equal(normalized.storage.freeTierAllowance, "10 GB");
  assert.equal(normalized.storage.percentageUsed, 0.05);
  assert.equal(normalized.storage.health, "healthy");
  assert.equal(normalized.storage.breakdown.webp.count, 35);
  assert.equal(normalized.storage.breakdown.avatars.count, 4);
  assert.equal(normalized.storage.breakdown.receipts.count, 3);
});

runCheck("Suite 1: Defense", "Gracefully handles empty, null, or undefined storage without crashing", () => {
  const cases = [
    {},
    { data: null },
    { data: { storage: null } },
    { data: { storage: {} } },
  ];
  for (const c of cases) {
    const res = normalizeDashboardData(c);
    assert.equal(res.storage.provider, "Cloudflare R2");
    assert.equal(res.storage.totalBytes, 0);
    assert.equal(res.storage.fileCount, 0);
    assert.equal(res.storage.formattedSize, "0 B");
    assert.equal(res.storage.freeTierAllowance, "10 GB");
    assert.equal(res.storage.percentageUsed, 0);
    assert.equal(res.storage.health, "healthy");
    assert.equal(typeof res.storage.breakdown, "object");
    assert.equal(res.storage.breakdown.webp.count, 0);
    assert.equal(res.storage.breakdown.avatars.count, 0);
    assert.equal(res.storage.breakdown.receipts.count, 0);
  }
});

runCheck("Suite 1: Finite Check", "Guarantees percentageUsed is finite number (prevents NaN.toFixed(1))", () => {
  const malformedCases = [
    { data: { storage: { percentageUsed: "invalid_string" } } },
    { data: { storage: { percentageUsed: NaN } } },
    { data: { storage: { percentageUsed: undefined } } },
    { data: { storage: { percentageUsed: null } } },
  ];
  for (const c of malformedCases) {
    const res = normalizeDashboardData(c);
    assert.ok(Number.isFinite(res.storage.percentageUsed), "percentageUsed must be finite");
    assert.equal(typeof res.storage.percentageUsed.toFixed(1), "string");
    assert.notEqual(res.storage.percentageUsed.toFixed(1), "NaN");
  }
});

runCheck("Suite 1: Boundary Health", "Assigns correct health status for usage thresholds", () => {
  // Healthy (< 90%)
  const resHealthy = normalizeDashboardData({ data: { storage: { percentageUsed: 45.0 } } });
  assert.equal(resHealthy.storage.health, "healthy");

  // Warning (> 90% and < 100%)
  const resWarning = normalizeDashboardData({ data: { storage: { percentageUsed: 92.5 } } });
  assert.equal(resWarning.storage.health, "warning");

  // Critical (>= 100%)
  const resCritical = normalizeDashboardData({ data: { storage: { percentageUsed: 105.0 } } });
  assert.equal(resCritical.storage.health, "critical");
});

runCheck("Suite 1: Breakdown Invariants", "Always populates webp, avatars, receipts even when raw breakdown is partially empty", () => {
  const partial = {
    data: {
      storage: {
        breakdown: {
          webp: { count: 12 },
          // avatars and receipts omitted
        },
      },
    },
  };
  const res = normalizeDashboardData(partial);
  assert.equal(res.storage.breakdown.webp.count, 12);
  assert.equal(res.storage.breakdown.avatars.count, 0);
  assert.equal(res.storage.breakdown.receipts.count, 0);
  assert.equal(res.storage.breakdown.products.count, 0);
});

// -----------------------------------------------------------------------------
// Suite 2: App.jsx Route-Level Dynamic Splitting & Suspense (R3)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 2: Route-Level Code Splitting & Suspense ---");

runCheck("Suite 2: Code Splitting", "App.jsx uses React.lazy for all page components", () => {
  const appCode = fs.readFileSync(path.resolve(__dirname, "../src/App.jsx"), "utf8");
  const expectedPages = [
    "OverviewPage",
    "ProductsPage",
    "ProductFormPage",
    "OrdersPage",
    "OrderDetailPage",
    "PaymentsPage",
    "CouponsPage",
    "CategoriesPage",
    "UsersPage",
    "AccessRequestsPage",
    "SettingsPage",
    "LoginPage",
    "RegisterPage",
    "ForgotPasswordPage",
    "ResetPasswordPage",
    "VerifyEmailPage",
    "ResourcePage",
  ];

  for (const page of expectedPages) {
    const lazyRegex = new RegExp(`const\\s+${page}\\s*=\\s*lazy\\s*\\(\\s*\\(\\)\\s*=>\\s*import\\(`, "m");
    assert.ok(lazyRegex.test(appCode), `App.jsx must dynamically import ${page} with lazy()`);
  }
});

runCheck("Suite 2: Suspense Boundary", "App.jsx wraps routes in Suspense with PageLoader fallback", () => {
  const appCode = fs.readFileSync(path.resolve(__dirname, "../src/App.jsx"), "utf8");
  assert.ok(appCode.includes("<Suspense fallback={<PageLoader />}>"), "Must have Suspense fallback={<PageLoader />}");
  assert.ok(appCode.includes("import PageLoader from \"./components/PageLoader\""), "Must import PageLoader");
});

runCheck("Suite 2: PageLoader Component", "PageLoader component exists and renders loader markup", () => {
  const loaderCode = fs.readFileSync(path.resolve(__dirname, "../src/components/PageLoader.jsx"), "utf8");
  assert.ok(loaderCode.includes("Loader2"), "PageLoader must use Lucide Loader2");
  assert.ok(loaderCode.includes("Loading..."), "PageLoader must display loading indicator");
});

// -----------------------------------------------------------------------------
// Suite 3: Vite Bundle Optimization & Chunk Sizes (R3)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 3: Vite Chunk Split Configuration & Distribution ---");

runCheck("Suite 3: Vite Config", "vite.config.js declares modular vendor manualChunks", () => {
  const viteConfig = fs.readFileSync(path.resolve(__dirname, "../vite.config.js"), "utf8");
  assert.ok(viteConfig.includes("manualChunks(id)"), "Must configure manualChunks function");
  assert.ok(viteConfig.includes("vendor-recharts"), "Must split recharts into vendor-recharts");
  assert.ok(viteConfig.includes("vendor-lucide"), "Must split lucide into vendor-lucide");
  assert.ok(viteConfig.includes("vendor-redux"), "Must split redux into vendor-redux");
  assert.ok(viteConfig.includes("vendor-ui"), "Must split radix/sonner into vendor-ui");
  assert.ok(viteConfig.includes("vendor-react"), "Must split react vendor libraries");
});

runCheck("Suite 3: Chunk Sizes", "Production build dist folder contains no chunk exceeding 500 kB", () => {
  const distAssetsDir = path.resolve(__dirname, "../dist/assets");
  if (!fs.existsSync(distAssetsDir)) {
    throw new Error("dist/assets does not exist. Run npm run build first.");
  }
  const files = fs.readdirSync(distAssetsDir);
  const jsFiles = files.filter((f) => f.endsWith(".js"));
  assert.ok(jsFiles.length > 0, "Build must produce javascript chunks");

  for (const jsFile of jsFiles) {
    const filePath = path.join(distAssetsDir, jsFile);
    const stat = fs.statSync(filePath);
    const sizeKb = stat.size / 1024;
    assert.ok(
      sizeKb <= 500,
      `Chunk ${jsFile} size is ${sizeKb.toFixed(2)} kB which exceeds 500 kB threshold!`
    );
  }
});

// -----------------------------------------------------------------------------
// Suite 4: OverviewPage KPI Card Contract & Media Gallery (R2)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 4: OverviewPage KPI Card & Media Gallery Integration ---");

runCheck("Suite 4: Card Markup", "OverviewPage contains Cloudflare R2 Storage KPI Card markup", () => {
  const pageCode = fs.readFileSync(path.resolve(__dirname, "../src/pages/OverviewPage.jsx"), "utf8");
  assert.ok(pageCode.includes("Cloudflare R2 Storage"), "Card description must be Cloudflare R2 Storage");
  assert.ok(pageCode.includes("{storage.formattedSize}"), "Must render formatted size title");
  assert.ok(pageCode.includes("WebP"), "Must render WebP breakdown");
  assert.ok(pageCode.includes("avatars"), "Must render avatars breakdown");
  assert.ok(pageCode.includes("receipts"), "Must render receipts breakdown");
  assert.ok(pageCode.includes("total assets"), "Must render total assets count");
  assert.ok(pageCode.includes("Media Gallery →"), "Must render Media Gallery action link in card");
  assert.ok(pageCode.includes("<MediaGalleryDialog"), "Must include MediaGalleryDialog modal");
});

runCheck("Suite 4: Media Gallery Component", "MediaGalleryDialog supports folders and permanent R2 deletion", () => {
  const galleryCode = fs.readFileSync(
    path.resolve(__dirname, "../src/components/common/MediaGalleryDialog.jsx"),
    "utf8"
  );
  assert.ok(galleryCode.includes("Cloudflare R2"), "Must reference Cloudflare R2");
  assert.ok(galleryCode.includes("fetchMedia"), "Must integrate fetchMedia");
  assert.ok(galleryCode.includes("deleteMedia"), "Must integrate deleteMedia");
  assert.ok(galleryCode.includes("uploadSingle"), "Must integrate uploadSingle");
  assert.ok(galleryCode.includes("uploadMultiple"), "Must integrate uploadMultiple");
});

// -----------------------------------------------------------------------------
// Suite 5: Mock REST API Server Storage & Upload Endpoints (R1 Integration)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 5: REST API Storage Endpoints Integration ---");

await runAsyncCheck("Suite 5: Endpoints", "TestServer responds to /api/v1/site/dashboard and /api/v1/upload endpoints", async () => {
  const server = new TestServer();
  const baseUrl = await server.start();

  try {
    // 1. Check /api/v1/site/dashboard returns storage
    const dashRes = await fetch(`${baseUrl}/api/v1/site/dashboard`, {
      headers: { Authorization: `Bearer ${server.adminToken}` },
    });
    assert.equal(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.equal(dashData.success, true);
    assert.ok(dashData.data.storage, "data.storage must be defined");
    assert.equal(dashData.data.storage.provider, "Cloudflare R2");
    assert.equal(dashData.data.storage.freeTierAllowance, "10 GB");

    // 2. Check /api/v1/upload/storage-stats returns storage
    const statsRes = await fetch(`${baseUrl}/api/v1/upload/storage-stats`);
    assert.equal(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.equal(statsData.success, true);
    assert.equal(statsData.data.provider, "Cloudflare R2");

    // 3. Check /api/v1/upload/media returns media list
    const mediaRes = await fetch(`${baseUrl}/api/v1/upload/media`);
    assert.equal(mediaRes.status, 200);
    const mediaData = await mediaRes.json();
    assert.equal(mediaData.success, true);
    assert.ok(Array.isArray(mediaData.media));
    assert.ok(mediaData.media.length > 0);

    // 4. Check DELETE /api/v1/upload
    const delRes = await fetch(`${baseUrl}/api/v1/upload`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.success, true);
  } finally {
    await server.stop();
  }
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`TOTAL CHECKS: ${passedCount + failedCount}`);
console.log(`PASSED:       ${passedCount}`);
console.log(`FAILED:       ${failedCount}`);
console.log("======================================================================");

await viteServer.close();

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED EMPIRICALLY!\n");
  process.exit(0);
}
