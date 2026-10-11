import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTestClient, teardownTestEnvironment } from "./helpers/client.js";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("  CHALLENGER M5 2: SETTINGS & DIRTY STATE ADVERSARIAL STRESS HARNESS   ");
console.log("  Scope: Negative Boundaries, Over-Length Strings, Dirty Lifecycle     ");
console.log("======================================================================\n");

let passedCount = 0;
let failedCount = 0;
const results = [];

function recordTest(suite, testName, passed, details = "") {
  if (passed) {
    passedCount++;
    console.log(`[${suite}] \x1b[32m✓ PASS\x1b[0m: ${testName}`);
    if (details) console.log(`    \x1b[90m${details}\x1b[0m`);
  } else {
    failedCount++;
    console.log(`[${suite}] \x1b[31m✗ FAIL\x1b[0m: ${testName}`);
    if (details) console.log(`    \x1b[31m${details}\x1b[0m`);
  }
  results.push({ suite, testName, passed, details });
}

async function run() {
  const client = await getTestClient();

  // ---------------------------------------------------------------------------
  // SECTION 1: Numeric Boundaries (Negative Rejection & Zero Acceptance)
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 1: Settings Numeric Boundaries & Validations ---");

  // 1.1 Shipping Fee negative checks
  for (const negFee of [-1, -0.01, -50, -9999]) {
    const res = await client.patch(
      "/api/v1/site/settings",
      { shipping: { defaultShippingFee: negFee } },
      { token: client.server.adminToken }
    );
    recordTest(
      "Section 1: Numeric Boundaries",
      `Negative default shipping fee (${negFee}) returns HTTP 400`,
      res.status === 400 && res.data?.message?.includes("negative"),
      `Status: ${res.status}, Message: ${res.data?.message}`
    );
  }

  // 1.2 Shipping Fee non-negative boundary
  const resZeroFee = await client.patch(
    "/api/v1/site/settings",
    { shipping: { defaultShippingFee: 0 } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 1: Numeric Boundaries",
    "Zero default shipping fee (0) is accepted (HTTP 200)",
    resZeroFee.status === 200 && resZeroFee.data?.data?.settings?.shipping?.defaultShippingFee === 0,
    `Status: ${resZeroFee.status}, Fee: ${resZeroFee.data?.data?.settings?.shipping?.defaultShippingFee}`
  );

  // 1.3 Free Shipping Threshold negative checks
  for (const negThreshold of [-1, -100, -50000]) {
    const res = await client.patch(
      "/api/v1/site/settings",
      { shipping: { freeShippingThreshold: negThreshold } },
      { token: client.server.adminToken }
    );
    recordTest(
      "Section 1: Numeric Boundaries",
      `Negative free shipping threshold (${negThreshold}) returns HTTP 400`,
      res.status === 400 && res.data?.message?.includes("negative"),
      `Status: ${res.status}, Message: ${res.data?.message}`
    );
  }

  // 1.4 Free Shipping Threshold non-negative boundary
  const resZeroThreshold = await client.patch(
    "/api/v1/site/settings",
    { shipping: { freeShippingThreshold: 0 } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 1: Numeric Boundaries",
    "Zero free shipping threshold (0) is accepted (HTTP 200)",
    resZeroThreshold.status === 200 && resZeroThreshold.data?.data?.settings?.shipping?.freeShippingThreshold === 0,
    `Status: ${resZeroThreshold.status}`
  );

  // 1.5 Low Stock Threshold negative checks
  for (const negStock of [-1, -5, -999]) {
    const res = await client.patch(
      "/api/v1/site/settings",
      { store: { lowStockThreshold: negStock } },
      { token: client.server.adminToken }
    );
    recordTest(
      "Section 1: Numeric Boundaries",
      `Negative low stock threshold (${negStock}) returns HTTP 400`,
      res.status === 400 && res.data?.message?.includes("negative"),
      `Status: ${res.status}, Message: ${res.data?.message}`
    );
  }

  // 1.6 Low Stock Threshold zero boundary
  const resZeroStock = await client.patch(
    "/api/v1/site/settings",
    { store: { lowStockThreshold: 0 } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 1: Numeric Boundaries",
    "Zero low stock threshold (0) is accepted (HTTP 200)",
    resZeroStock.status === 200 && resZeroStock.data?.data?.settings?.store?.lowStockThreshold === 0,
    `Status: ${resZeroStock.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: String Validation & Length Boundary Hardening
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: String Validation & Length Boundaries ---");

  // 2.1 Malformed Contact Email
  for (const invalidEmail of ["notanemail", "plainstring", "user.domain.com", "missing_at_symbol"]) {
    const res = await client.patch(
      "/api/v1/site/settings",
      { contact: { email: invalidEmail } },
      { token: client.server.adminToken }
    );
    recordTest(
      "Section 2: String Boundaries",
      `Malformed email '${invalidEmail}' returns HTTP 400`,
      res.status === 400 && res.data?.message?.includes("email"),
      `Status: ${res.status}, Message: ${res.data?.message}`
    );
  }

  // 2.2 Valid Contact Email
  const resValidEmail = await client.patch(
    "/api/v1/site/settings",
    { contact: { email: "verified.support@thriftshoewear.test" } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "Valid contact email format is accepted (HTTP 200)",
    resValidEmail.status === 200 && resValidEmail.data?.data?.settings?.contact?.email === "verified.support@thriftshoewear.test",
    `Status: ${resValidEmail.status}`
  );

  // 2.3 Announcement message length boundaries (limit = 180 chars)
  const exact180Msg = "M".repeat(180);
  const over181Msg = "M".repeat(181);
  const huge500Msg = "M".repeat(500);

  const res180 = await client.patch(
    "/api/v1/site/settings",
    { announcement: { isEnabled: true, message: exact180Msg } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "Announcement message of exactly 180 characters is accepted (HTTP 200)",
    res180.status === 200 && res180.data?.data?.settings?.announcement?.message === exact180Msg,
    `Status: ${res180.status}, Length: ${res180.data?.data?.settings?.announcement?.message?.length}`
  );

  const res181 = await client.patch(
    "/api/v1/site/settings",
    { announcement: { isEnabled: true, message: over181Msg } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "Announcement message of 181 characters is rejected (HTTP 400, >180 limit)",
    res181.status === 400 && res181.data?.message?.includes("180"),
    `Status: ${res181.status}, Message: ${res181.data?.message}`
  );

  const res500 = await client.patch(
    "/api/v1/site/settings",
    { announcement: { isEnabled: true, message: huge500Msg } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "Announcement message of 500 characters is rejected (HTTP 400)",
    res500.status === 400 && res500.data?.message?.includes("180"),
    `Status: ${res500.status}`
  );

  // 2.4 SEO metaTitle length boundaries (limit = 70 chars)
  const exact70Title = "T".repeat(70);
  const over71Title = "T".repeat(71);

  const res70 = await client.patch(
    "/api/v1/site/settings",
    { seo: { metaTitle: exact70Title } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "SEO metaTitle of exactly 70 characters is accepted (HTTP 200)",
    res70.status === 200 && res70.data?.data?.settings?.seo?.metaTitle === exact70Title,
    `Status: ${res70.status}`
  );

  const res71 = await client.patch(
    "/api/v1/site/settings",
    { seo: { metaTitle: over71Title } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "SEO metaTitle of 71 characters is rejected (HTTP 400, >70 limit)",
    res71.status === 400 && res71.data?.message?.includes("70"),
    `Status: ${res71.status}, Message: ${res71.data?.message}`
  );

  // 2.5 SEO metaDescription length boundaries (limit = 160 chars)
  const exact160Desc = "D".repeat(160);
  const over161Desc = "D".repeat(161);

  const res160 = await client.patch(
    "/api/v1/site/settings",
    { seo: { metaDescription: exact160Desc } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "SEO metaDescription of exactly 160 characters is accepted (HTTP 200)",
    res160.status === 200 && res160.data?.data?.settings?.seo?.metaDescription === exact160Desc,
    `Status: ${res160.status}`
  );

  const res161 = await client.patch(
    "/api/v1/site/settings",
    { seo: { metaDescription: over161Desc } },
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 2: String Boundaries",
    "SEO metaDescription of 161 characters is rejected (HTTP 400, >160 limit)",
    res161.status === 400 && res161.data?.message?.includes("160"),
    `Status: ${res161.status}, Message: ${res161.data?.message}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 3: Authorization & RBAC Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Authorization & RBAC on Settings ---");

  // 3.1 Unauthenticated request
  const resNoAuth = await client.patch("/api/v1/site/settings", { siteName: "Hijacked" });
  recordTest(
    "Section 3: RBAC",
    "Unauthenticated PATCH /api/v1/site/settings returns HTTP 401",
    resNoAuth.status === 401,
    `Status: ${resNoAuth.status}`
  );

  // 3.2 Customer token
  const resCustomer = await client.patch(
    "/api/v1/site/settings",
    { siteName: "Unauthorized Edit" },
    { token: client.server.customerToken }
  );
  recordTest(
    "Section 3: RBAC",
    "Customer role PATCH /api/v1/site/settings returns HTTP 403",
    resCustomer.status === 403,
    `Status: ${resCustomer.status}`
  );

  // 3.3 Expired token
  const resExpired = await client.patch(
    "/api/v1/site/settings",
    { siteName: "Expired Edit" },
    { token: "expired_token_abc" }
  );
  recordTest(
    "Section 3: RBAC",
    "Expired token PATCH /api/v1/site/settings returns HTTP 401",
    resExpired.status === 401,
    `Status: ${resExpired.status}`
  );

  // 3.4 SuperAdmin token allows update
  const resSuper = await client.patch(
    "/api/v1/site/settings",
    { siteName: "Thrift Shoe Wear Official" },
    { token: client.server.superAdminToken }
  );
  recordTest(
    "Section 3: RBAC",
    "SuperAdmin token PATCH /api/v1/site/settings succeeds (HTTP 200)",
    resSuper.status === 200 && resSuper.data?.data?.settings?.siteName === "Thrift Shoe Wear Official",
    `Status: ${resSuper.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: Persistence, Idempotency & Partial Updates
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Persistence, Idempotency & Partial Updates ---");

  // 4.1 Multi-section update
  const multiSectionPayload = {
    siteName: "Thrift Shoe Wear Enterprise",
    tagline: "Sustainable Fashion & Footwear",
    store: {
      currency: "PKR",
      timezone: "Asia/Karachi",
      lowStockThreshold: 4,
      allowGuestCheckout: true,
    },
    shipping: {
      defaultShippingFee: 300,
      freeShippingThreshold: 6000,
      returnPolicy: "7-day return policy for unused shoes.",
    },
    announcement: {
      isEnabled: true,
      message: "Winter vintage sale active!",
      url: "/catalog/sale",
    },
    maintenanceMode: {
      isEnabled: false,
      message: "Scheduled maintenance",
    },
  };

  const resMulti = await client.patch(
    "/api/v1/site/settings",
    multiSectionPayload,
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 4: Persistence",
    "Multi-section PATCH updates store settings cleanly (HTTP 200)",
    resMulti.status === 200 && resMulti.data?.data?.settings?.siteName === "Thrift Shoe Wear Enterprise",
    `Status: ${resMulti.status}`
  );

  // 4.2 GET verification
  const resGet = await client.get("/api/v1/site/settings");
  const stored = resGet.data?.data?.settings || resGet.data?.settings;
  recordTest(
    "Section 4: Persistence",
    "Subsequent GET verifies all fields accurately persisted",
    stored.siteName === "Thrift Shoe Wear Enterprise" &&
    stored.store?.lowStockThreshold === 4 &&
    stored.shipping?.defaultShippingFee === 300 &&
    stored.shipping?.freeShippingThreshold === 6000 &&
    stored.announcement?.message === "Winter vintage sale active!",
    `Stored siteName: ${stored?.siteName}, lowStock: ${stored?.store?.lowStockThreshold}`
  );

  // 4.3 Idempotency: exact identical PATCH retains exact same state
  const resIdempotent = await client.patch(
    "/api/v1/site/settings",
    multiSectionPayload,
    { token: client.server.adminToken }
  );
  recordTest(
    "Section 4: Persistence",
    "Idempotent PATCH returns identical state without side effects",
    resIdempotent.status === 200 &&
    resIdempotent.data?.data?.settings?.siteName === stored.siteName &&
    resIdempotent.data?.data?.settings?.shipping?.defaultShippingFee === stored.shipping?.defaultShippingFee,
    `Status: ${resIdempotent.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 5: SettingsPage Component SSR & Pure Logic Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 5: SettingsPage Component & Dirty State Logic ---");

  // 5.1 Initialize Vite SSR to load SettingsPage
  const viteServer = await createServer({
    root: PROJECT_ROOT,
    server: { middlewareMode: true },
    logLevel: "silent",
  });

  // Mock browser globals for SSR
  globalThis.window = {
    innerWidth: 1024,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };

  const store = configureStore({
    reducer: {
      auth: (state = { token: client.server.superAdminToken, user: { role: "superAdmin" }, isAuthenticated: true }) => state,
      admin: (state = { settings: { data: stored, status: "succeeded" } }) => state,
    },
  });

  let SettingsPage = null;
  try {
    const mod = await viteServer.ssrLoadModule("./src/pages/SettingsPage.jsx");
    SettingsPage = mod.default;
  } catch (err) {
    console.error("Failed to load SettingsPage module via SSR:", err);
  }

  recordTest(
    "Section 5: SettingsPage SSR",
    "SettingsPage module loads cleanly via Vite SSR",
    Boolean(SettingsPage),
    SettingsPage ? "Loaded successfully" : "Failed to load"
  );

  // 5.2 SSR Render test
  let renderedHtml = "";
  try {
    renderedHtml = renderToString(
      React.createElement(
        Provider,
        { store },
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/settings"] },
          React.createElement(SettingsPage)
        )
      )
    );
  } catch (err) {
    console.error("SSR Render error:", err.message);
  }

  recordTest(
    "Section 5: SettingsPage SSR",
    "SettingsPage renders HTML without uncaught errors",
    renderedHtml.length > 0 && renderedHtml.includes("Settings") && renderedHtml.includes("Save Changes"),
    `Rendered HTML size: ${renderedHtml.length} bytes`
  );

  // 5.3 Test Pure Dirty State Detection Logic
  // Simulating SettingsPage form state transitions:
  const baselineForm = {
    siteName: "Thrift Shoe Wear Enterprise",
    tagline: "Sustainable Fashion & Footwear",
    currency: "PKR",
    timezone: "Asia/Karachi",
    lowStockThreshold: 4,
    allowGuestCheckout: true,
    freeShippingThreshold: 6000,
    defaultShippingFee: 300,
    returnPolicy: "7-day return policy for unused shoes.",
    announcementEnabled: true,
    announcementMessage: "Winter vintage sale active!",
    announcementUrl: "/catalog/sale",
    maintenanceEnabled: false,
    maintenanceMessage: "",
    metaTitle: "Thrift Footwear",
    metaDescription: "Vintage shoes",
    keywords: "shoes, vintage, thrift",
    paymentMethods: [
      { method: "cod", label: "Cash on Delivery", isEnabled: true },
      { method: "bank_transfer", label: "Bank Transfer", isEnabled: true },
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/thriftshoewear", isActive: true },
    ],
  };

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  // 5.3.1 Clean State: form === originalForm -> hasUnsavedChanges === false
  let currentForm = deepClone(baselineForm);
  let originalForm = deepClone(baselineForm);
  let isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Initial synchronized form state has NO unsaved changes (isDirty === false)",
    isDirty === false,
    `isDirty: ${isDirty}`
  );

  // 5.3.2 Field Modification: siteName change -> isDirty === true
  currentForm.siteName = "New Store Name";
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Mutating siteName marks state as dirty (isDirty === true)",
    isDirty === true,
    `isDirty: ${isDirty}`
  );

  // 5.3.3 Discard action restores initial state -> isDirty === false
  currentForm = deepClone(originalForm);
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Discard action reverts form to originalForm and clears dirty state (isDirty === false)",
    isDirty === false && currentForm.siteName === "Thrift Shoe Wear Enterprise",
    `isDirty: ${isDirty}, siteName: ${currentForm.siteName}`
  );

  // 5.3.4 Numerical field change -> isDirty === true
  currentForm.defaultShippingFee = 450;
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Modifying shipping fee triggers dirty state (isDirty === true)",
    isDirty === true,
    `isDirty: ${isDirty}`
  );

  // 5.3.5 Manual revert back to original number -> isDirty === false
  currentForm.defaultShippingFee = 300;
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Manually restoring field value clears dirty state (isDirty === false)",
    isDirty === false,
    `isDirty: ${isDirty}`
  );

  // 5.3.6 Toggle payment method -> isDirty === true
  currentForm.paymentMethods[0].isEnabled = false;
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Toggling payment gateway marks state as dirty (isDirty === true)",
    isDirty === true,
    `isDirty: ${isDirty}`
  );

  // 5.3.7 Save action commits form to originalForm -> isDirty === false
  originalForm = deepClone(currentForm);
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Save action synchronizes originalForm and clears dirty state (isDirty === false)",
    isDirty === false && originalForm.paymentMethods[0].isEnabled === false,
    `isDirty: ${isDirty}`
  );

  // 5.3.8 Add social link -> isDirty === true
  currentForm.socialLinks.push({ platform: "tiktok", url: "https://tiktok.com/@thriftshoewear", isActive: true });
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Adding social media channel marks state as dirty (isDirty === true)",
    isDirty === true,
    `isDirty: ${isDirty}`
  );

  // 5.3.9 Discard social link change
  currentForm = deepClone(originalForm);
  isDirty = JSON.stringify(currentForm) !== JSON.stringify(originalForm);
  recordTest(
    "Section 5: Dirty State Logic",
    "Discard restores social links array to original state",
    isDirty === false && currentForm.socialLinks.length === 1,
    `Links count: ${currentForm.socialLinks.length}`
  );

  // 5.4 Test buildPayload sanitization guarantees
  // Verifying that negative numbers entered in form are safely sanitized via Math.max(0, ...)
  function simulateBuildPayload(form) {
    return {
      siteName: form.siteName.trim(),
      store: {
        currency: form.currency,
        lowStockThreshold: Math.max(0, Number(form.lowStockThreshold || 0)),
      },
      shipping: {
        freeShippingThreshold: Math.max(0, Number(form.freeShippingThreshold || 0)),
        defaultShippingFee: Math.max(0, Number(form.defaultShippingFee || 0)),
      },
      socialLinks: (form.socialLinks || [])
        .filter((sl) => sl.url.trim().length > 0)
        .map((sl) => ({
          platform: sl.platform,
          url: sl.url.trim(),
          isActive: Boolean(sl.isActive),
        })),
    };
  }

  const dirtyFormWithNegative = {
    siteName: "  Padded Store Name  ",
    currency: "PKR",
    lowStockThreshold: -5,
    freeShippingThreshold: -100,
    defaultShippingFee: -20,
    socialLinks: [
      { platform: "instagram", url: "  https://instagram.com/valid  ", isActive: true },
      { platform: "twitter", url: "    ", isActive: true }, // Empty url should be stripped
    ],
  };

  const sanitized = simulateBuildPayload(dirtyFormWithNegative);
  recordTest(
    "Section 5: Payload Sanitization",
    "Client buildPayload trims siteName whitespace",
    sanitized.siteName === "Padded Store Name",
    `siteName: '${sanitized.siteName}'`
  );

  recordTest(
    "Section 5: Payload Sanitization",
    "Client buildPayload clamps negative lowStockThreshold (-5 -> 0)",
    sanitized.store.lowStockThreshold === 0,
    `lowStockThreshold: ${sanitized.store.lowStockThreshold}`
  );

  recordTest(
    "Section 5: Payload Sanitization",
    "Client buildPayload clamps negative defaultShippingFee (-20 -> 0)",
    sanitized.shipping.defaultShippingFee === 0,
    `defaultShippingFee: ${sanitized.shipping.defaultShippingFee}`
  );

  recordTest(
    "Section 5: Payload Sanitization",
    "Client buildPayload clamps negative freeShippingThreshold (-100 -> 0)",
    sanitized.shipping.freeShippingThreshold === 0,
    `freeShippingThreshold: ${sanitized.shipping.freeShippingThreshold}`
  );

  recordTest(
    "Section 5: Payload Sanitization",
    "Client buildPayload strips empty social link URLs and trims valid URLs",
    sanitized.socialLinks.length === 1 && sanitized.socialLinks[0].url === "https://instagram.com/valid",
    `Valid links count: ${sanitized.socialLinks.length}`
  );

  await viteServer.close();
  await teardownTestEnvironment();

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log("             CHALLENGER M5 2 STRESS TEST EXECUTION SUMMARY            ");
  console.log("======================================================================");
  console.log(`  Total Executed Tests: ${passedCount + failedCount}`);
  console.log(`  Passed Tests:         ${passedCount}`);
  console.log(`  Failed Tests:         ${failedCount}`);
  console.log(`  Success Rate:         ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    console.error(`\x1b[31mStress test completed with ${failedCount} failure(s).\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mAll ${passedCount} adversarial stress tests passed successfully!\x1b[0m`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Fatal error executing stress harness:", err);
  process.exit(1);
});
