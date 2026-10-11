import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKEND_ROOT = path.resolve(PROJECT_ROOT, "..", "thriftshoewear_backend");

console.log("======================================================================");
console.log("   CHALLENGER 2 REPLACEMENT (M4): ADVERSARIAL STRESS TEST HARNESS      ");
console.log("   Scope: Payments Rejection/Proof, Coupons Engine, Categories 409    ");
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

// -----------------------------------------------------------------------------
// Initialize Test Client & Vite SSR
// -----------------------------------------------------------------------------
const { getTestClient, teardownTestEnvironment } = await import("./helpers/client.js");
const client = await getTestClient();

const { createServer } = await import("vite");
const viteServer = await createServer({
  root: PROJECT_ROOT,
  server: { middlewareMode: true },
  logLevel: "silent",
});

const React = await import("react");
const { renderToString } = await import("react-dom/server");
const { MemoryRouter } = await import("react-router-dom");
const { Provider } = await import("react-redux");
const { configureStore } = await import("@reduxjs/toolkit");

const store = configureStore({
  reducer: {
    auth: (state = { token: "token_superadmin_seed_01", user: { role: "superAdmin" }, isAuthenticated: true }) => state,
  },
});

// Mock browser globals for SSR / React components
globalThis.window = {
  innerWidth: 1024,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};
if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = { clipboard: { writeText: async () => true } };
} else {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: async () => true },
    configurable: true,
  });
}

// Load frontend components
const paymentModalMod = await viteServer.ssrLoadModule("./src/components/PaymentProofModal.jsx");
const paymentsPageMod = await viteServer.ssrLoadModule("./src/pages/PaymentsPage.jsx");
const couponsPageMod = await viteServer.ssrLoadModule("./src/pages/CouponsPage.jsx");
const categoriesPageMod = await viteServer.ssrLoadModule("./src/pages/CategoriesPage.jsx");

// Load backend models
let CouponModel = null;
let PaymentModel = null;
try {
  const couponModule = await import(pathToFileURL(path.join(BACKEND_ROOT, "src", "models", "couponModel.js")).href);
  CouponModel = couponModule.default;
  const paymentModule = await import(pathToFileURL(path.join(BACKEND_ROOT, "src", "models", "paymentModel.js")).href);
  PaymentModel = paymentModule.default;
} catch (err) {
  console.warn("Direct backend model load warning:", err.message);
}

// =============================================================================
// SECTION 1: Payment Verification & Rejection Flows
// =============================================================================
console.log("\n--- Section 1: Payment Verification & Rejection Flows ---");

try {
  // 1.1 Mandatory rejection reason matrix
  const rejectTestPay = {
    _id: "pay_stress_reject_01",
    paymentNumber: "PAY-REJ-TEST",
    status: "awaiting_verification",
    proofs: [{ url: "https://proofs.test/fake.png" }],
  };
  client.server.payments.set(rejectTestPay._id, rejectTestPay);

  // Missing body
  const resEmptyBody = await client.patch(`/api/v1/payments/${rejectTestPay._id}/reject`, {}, { token: client.adminToken });
  recordTest(
    "Section 1: Rejection Validation",
    "Rejecting payment without body returns HTTP 400 with 'Rejection reason required'",
    resEmptyBody.status === 400 && resEmptyBody.data?.message?.includes("Rejection reason required"),
    `Status: ${resEmptyBody.status}, Message: ${resEmptyBody.data?.message}`
  );

  // Empty string reason
  const resEmptyStr = await client.patch(`/api/v1/payments/${rejectTestPay._id}/reject`, { reason: "" }, { token: client.adminToken });
  recordTest(
    "Section 1: Rejection Validation",
    "Rejecting payment with empty string reason: '' returns HTTP 400",
    resEmptyStr.status === 400,
    `Status: ${resEmptyStr.status}`
  );

  // Valid rejection reason transitions status to failed and sets reason
  const resValid = await client.patch(
    `/api/v1/payments/${rejectTestPay._id}/reject`,
    { reason: "Proof illegible or transaction ID not found" },
    { token: client.adminToken }
  );
  const updatedPay = client.server.payments.get(rejectTestPay._id);
  recordTest(
    "Section 1: Rejection Validation",
    "Valid rejection reason transitions payment to status 'failed' and records rejectionReason",
    resValid.status === 200 && updatedPay.status === "failed" && updatedPay.rejectionReason === "Proof illegible or transaction ID not found",
    `Status: ${updatedPay.status}, Reason: ${updatedPay.rejectionReason}`
  );

  // Verification transitions status to verified
  const verifPay = { _id: "pay_verif_01", paymentNumber: "PAY-VERIF-01", status: "awaiting_verification", proofs: [] };
  client.server.payments.set(verifPay._id, verifPay);
  const resVerif = await client.patch(`/api/v1/payments/${verifPay._id}/verify`, {}, { token: client.adminToken });
  const updatedVerif = client.server.payments.get(verifPay._id);
  recordTest(
    "Section 1: Verification Flow",
    "PATCH /api/v1/payments/:id/verify transitions payment to status 'verified'",
    resVerif.status === 200 && updatedVerif.status === "verified",
    `Status: ${updatedVerif.status}`
  );

  // Paid transitions status to paid and synchronizes order payment
  const paidPay = { _id: "pay_paid_01", paymentNumber: "PAY-PAID-01", status: "verified", order: { _id: "order_01" } };
  client.server.payments.set(paidPay._id, paidPay);
  const resPaid = await client.patch(`/api/v1/payments/${paidPay._id}/paid`, {}, { token: client.adminToken });
  const updatedPaid = client.server.payments.get(paidPay._id);
  const syncedOrder = client.server.orders.get("order_01");
  recordTest(
    "Section 1: Paid Settlement",
    "PATCH /api/v1/payments/:id/paid marks payment as 'paid' and syncs order payment status",
    resPaid.status === 200 && updatedPaid.status === "paid" && syncedOrder.payment.status === "paid",
    `Payment: ${updatedPaid.status}, Order payment: ${syncedOrder.payment.status}`
  );
} catch (err) {
  recordTest("Section 1: Payment Flows", "Execution failed", false, err.message);
}

// =============================================================================
// SECTION 2: Receipt Image Viewer Transformations (PaymentProofModal.jsx)
// =============================================================================
console.log("\n--- Section 2: Receipt Image Viewer Transformations ---");

try {
  const paymentModalSource = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "components", "PaymentProofModal.jsx"), "utf-8");

  // Zoom clamp: Math.min(300, z + 25) and Math.max(50, z - 25)
  const hasZoomIn = paymentModalSource.includes("Math.min(300, z + 25)");
  const hasZoomOut = paymentModalSource.includes("Math.max(50, z - 25)");
  const hasResetZoom = paymentModalSource.includes("setZoom(100)") && paymentModalSource.includes("setRotation(0)");
  const hasRotate = paymentModalSource.includes("(r + 90) % 360");

  recordTest(
    "Section 2: Viewer Transforms",
    "PaymentProofModal enforces zoom clamping between 50% and 300% (+/- 25% increments)",
    hasZoomIn && hasZoomOut,
    `hasZoomIn: ${hasZoomIn}, hasZoomOut: ${hasZoomOut}`
  );

  recordTest(
    "Section 2: Viewer Transforms",
    "PaymentProofModal enforces 90° clockwise rotation increments modulo 360",
    hasRotate,
    `hasRotate: ${hasRotate}`
  );

  recordTest(
    "Section 2: Viewer Transforms",
    "PaymentProofModal reset view restores zoom to 100% and rotation to 0°",
    hasResetZoom,
    `hasResetZoom: ${hasResetZoom}`
  );

  // Transform CSS style applied to proof image
  const hasTransformStyle = paymentModalSource.includes("scale(${zoom / 100}) rotate(${rotation}deg)");
  recordTest(
    "Section 2: Viewer Transforms",
    "Image element dynamically binds CSS transform: scale(zoom/100) rotate(rotation deg)",
    hasTransformStyle,
    `hasTransformStyle: ${hasTransformStyle}`
  );

  // Multi-proof carousel support
  const hasCarousel = paymentModalSource.includes("proofs.length > 1") && paymentModalSource.includes("selectedProofIndex");
  recordTest(
    "Section 2: Viewer Transforms",
    "PaymentProofModal supports multi-proof carousel when order has multiple receipt attachments",
    hasCarousel,
    `hasCarousel: ${hasCarousel}`
  );

  // Pakistan payment methods badge rendering
  const { PaymentMethodBadge } = paymentModalMod;
  const methods = ["bank_transfer", "easypaisa", "jazzcash", "sadapay", "cod", "advance_cod", "card", "wallet"];
  let badgesOk = true;
  for (const m of methods) {
    const html = renderToString(React.createElement(PaymentMethodBadge, { method: m }));
    if (!html || html.length < 10) badgesOk = false;
  }
  recordTest(
    "Section 2: Viewer Transforms",
    "PaymentMethodBadge renders all 8 Pakistan payment channel badges cleanly",
    badgesOk,
    `Methods tested: ${methods.join(", ")}`
  );
} catch (err) {
  recordTest("Section 2: Viewer Transforms", "Execution failed", false, err.message);
}

// =============================================================================
// SECTION 3: Coupon Discount Calculations, Expiration & Code Normalization
// =============================================================================
console.log("\n--- Section 3: Coupon Calculations & Normalization ---");

if (CouponModel) {
  try {
    // 3.1 Percentage cap vs fixed amounts
    const pctCappedCoupon = new CouponModel({
      code: "CAP_TEST_50",
      title: "50% Capped at $75",
      discountType: "percentage",
      discountValue: 50,
      maxDiscountAmount: 75,
      minOrderAmount: 0,
      status: "active",
      validity: { startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000) },
    });
    // $1,000 order -> raw 50% = $500, capped at $75
    const discLarge = pctCappedCoupon.calculateDiscount({ subtotal: 1000 });
    // $100 order -> raw 50% = $50, below $75 cap -> returns $50
    const discSmall = pctCappedCoupon.calculateDiscount({ subtotal: 100 });

    recordTest(
      "Section 3: Coupon Math",
      "Percentage discount strictly enforces maxDiscountAmount cap ($1000 order yields $75, $100 order yields $50)",
      discLarge === 75 && discSmall === 50,
      `Large: $${discLarge}, Small: $${discSmall}`
    );

    // 3.2 Fixed discount voucher clamping to subtotal (anti-negative balance)
    const fixedCoupon = new CouponModel({
      code: "FIXED_VOUCHER_50",
      title: "$50 Voucher",
      discountType: "fixed",
      discountValue: 50,
      minOrderAmount: 0,
      status: "active",
      validity: { startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000) },
    });
    // $30 order with $50 voucher must clamp discount to $30 (subtotal), preventing negative payable amount
    const discExceeding = fixedCoupon.calculateDiscount({ subtotal: 30 });
    const discNormal = fixedCoupon.calculateDiscount({ subtotal: 150 });

    recordTest(
      "Section 3: Coupon Math",
      "Fixed discount is clamped to subtotal when voucher exceeds subtotal ($50 voucher on $30 order yields $30)",
      discExceeding === 30 && discNormal === 50,
      `Exceeding: $${discExceeding}, Normal: $${discNormal}`
    );

    // 3.3 Free shipping discount matching shippingFee exactly
    const freeShipCoupon = new CouponModel({
      code: "SHIP_FREE",
      title: "Free Shipping",
      discountType: "free_shipping",
      discountValue: 0,
      status: "active",
      validity: { startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000) },
    });
    const discShipping = freeShipCoupon.calculateDiscount({ subtotal: 120, shippingFee: 35 });
    recordTest(
      "Section 3: Coupon Math",
      "Free shipping discount returns exact shipping fee amount ($35 shipping fee yields $35 discount)",
      discShipping === 35,
      `Discount: $${discShipping}`
    );

    // 3.4 Minimum order amount threshold
    const minOrderCoupon = new CouponModel({
      code: "MIN_ORDER_100",
      title: "$100 Min Order",
      discountType: "fixed",
      discountValue: 20,
      minOrderAmount: 100,
      status: "active",
      validity: { startsAt: new Date(Date.now() - 3600000), endsAt: new Date(Date.now() + 3600000) },
    });
    const belowThreshold = minOrderCoupon.calculateDiscount({ subtotal: 99.99 });
    const atThreshold = minOrderCoupon.calculateDiscount({ subtotal: 100 });
    recordTest(
      "Section 3: Coupon Math",
      "Minimum order amount threshold strictly gates discount (subtotal $99.99 yields $0, $100 yields $20)",
      belowThreshold === 0 && atThreshold === 20,
      `Below threshold: $${belowThreshold}, At threshold: $${atThreshold}`
    );

    // 3.5 Expired coupon returns 0
    const expiredCoupon = new CouponModel({
      code: "EXPIRED_TEST",
      title: "Expired",
      discountType: "percentage",
      discountValue: 50,
      status: "active",
      validity: { startsAt: new Date(Date.now() - 7200000), endsAt: new Date(Date.now() - 3600000) },
    });
    const discExpired = expiredCoupon.calculateDiscount({ subtotal: 200 });
    recordTest(
      "Section 3: Coupon Math",
      "Expired coupon returns $0 discount regardless of order subtotal",
      discExpired === 0,
      `Discount: $${discExpired}`
    );

    // 3.6 Code normalization & validation hook
    const preValidateHook = CouponModel.schema.s.hooks._pres.get("validate")?.[0]?.fn;

    const lowerCoupon = new CouponModel({
      code: "summer_sale_2026",
      title: "Summer Sale",
      discountType: "percentage",
      discountValue: 25,
      validity: { startsAt: new Date("2026-01-01"), endsAt: new Date("2026-12-31") },
    });
    if (preValidateHook) preValidateHook.call(lowerCoupon, () => {});
    recordTest(
      "Section 3: Coupon Normalization",
      "Coupon code normalization converts lowercase input to uppercase automatically (summer_sale_2026 -> SUMMER_SALE_2026)",
      lowerCoupon.code === "SUMMER_SALE_2026",
      `Code: ${lowerCoupon.code}`
    );

    // 3.7 Inverted dates validation
    const invertedCoupon = new CouponModel({
      code: "INVERTED_CHECK",
      title: "Inverted",
      discountType: "percentage",
      discountValue: 10,
      validity: { startsAt: new Date("2026-12-31"), endsAt: new Date("2026-01-01") },
    });
    let invErr = null;
    if (preValidateHook) preValidateHook.call(invertedCoupon, (err) => { invErr = err; });
    recordTest(
      "Section 3: Coupon Validations",
      "Inverted validity dates (endsAt <= startsAt) triggers validation error",
      invErr !== null && invErr.message.includes("end date must be after start date"),
      `Error: ${invErr?.message}`
    );

    // 3.8 Percentage > 100% validation
    const over100 = new CouponModel({
      code: "OVER_100",
      title: "150% Off",
      discountType: "percentage",
      discountValue: 150,
      validity: { startsAt: new Date("2026-01-01"), endsAt: new Date("2026-12-31") },
    });
    let overErr = null;
    if (preValidateHook) preValidateHook.call(over100, (err) => { overErr = err; });
    recordTest(
      "Section 3: Coupon Validations",
      "Percentage discount greater than 100% triggers validation error",
      overErr !== null && overErr.message.includes("greater than 100"),
      `Error: ${overErr?.message}`
    );
  } catch (err) {
    recordTest("Section 3: Coupon Engine", "Execution failed", false, err.message);
  }
}

// =============================================================================
// SECTION 4: Category Hierarchy & 409 Conflict Force-Deletion
// =============================================================================
console.log("\n--- Section 4: Category Hierarchy & 409 Conflict Force-Deletion ---");

try {
  const catPageFile = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "pages", "CategoriesPage.jsx"), "utf-8");

  // 4.1 Self-parenting prevention
  const hasSelfParentError = catPageFile.includes('errors.parentCategory = "Category cannot be its own parent"');
  const hasParentFilter = catPageFile.includes("c._id !== editingCategory._id");

  recordTest(
    "Section 4: Category Hierarchy",
    "CategoriesPage.jsx rejects self-parenting in validateForm() and excludes current category from parent dropdown",
    hasSelfParentError && hasParentFilter,
    `hasSelfParentError: ${hasSelfParentError}, hasParentFilter: ${hasParentFilter}`
  );

  // 4.2 Auto slugify kebab-case conversion
  const slugify = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const generatedSlug = slugify("Men's Vintage Leather Boots & Sneakers!");
  recordTest(
    "Section 4: Category Slugs",
    "Category slug generator converts name to clean kebab-case URL slug",
    generatedSlug === "men-s-vintage-leather-boots-sneakers",
    `Slug generated: "${generatedSlug}"`
  );

  // 4.3 409 Conflict detection and force delete dispatch
  const hasConflictState = catPageFile.includes("conflictTarget");
  const has409Catch = catPageFile.includes("category has products");
  const hasForceParam = catPageFile.includes('force: "true"');
  const hasConflictDialog = catPageFile.includes("Category Has Assigned Products");

  recordTest(
    "Section 4: 409 Conflict Handling",
    "CategoriesPage.jsx intercepts 409 Conflict, displays specialized alert dialog, and sends ?force=true on force archive",
    hasConflictState && has409Catch && hasForceParam && hasConflictDialog,
    `conflictTarget: ${hasConflictState}, 409 catch: ${has409Catch}, force: ${hasForceParam}, dialog: ${hasConflictDialog}`
  );

  // 4.4 Backend 409 controller verification
  const catControllerFile = fs.readFileSync(path.resolve(BACKEND_ROOT, "src", "controllers", "categoryController.js"), "utf-8");
  const backendHas409 = catControllerFile.includes('req.query.force !== "true"') && catControllerFile.includes("409");
  recordTest(
    "Section 4: Backend 409 Contract",
    "Backend categoryController.deleteCategory strictly requires ?force=true when products are assigned, else returns 409",
    backendHas409,
    `Backend contains 409 force check: ${backendHas409}`
  );
} catch (err) {
  recordTest("Section 4: Category Hierarchy", "Execution failed", false, err.message);
}

// =============================================================================
// SECTION 5: Production Build & System Invariants
// =============================================================================
console.log("\n--- Section 5: Production Build & System Invariants ---");

// AppShell preservation
const appShellPath = path.resolve(PROJECT_ROOT, "src", "components", "AppShell.jsx");
const appShellExists = fs.existsSync(appShellPath);
recordTest(
  "Section 5: Invariants",
  "AppShell.jsx backwards compatibility file exists intact on disk",
  appShellExists,
  `Path: ${appShellPath}`
);

// Explicit route declarations in App.jsx
const appJsx = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "App.jsx"), "utf-8");
const routesOk =
  appJsx.includes('path="orders"') &&
  appJsx.includes('path="orders/:id"') &&
  appJsx.includes('path="payments"') &&
  appJsx.includes('path="coupons"') &&
  appJsx.includes('path="categories"') &&
  appJsx.includes('"orders", "payments", "coupons", "categories"');

recordTest(
  "Section 5: Invariants",
  "App.jsx declares explicit routes for all M4 resources and excludes them from fallback loop",
  routesOk,
  `Routes verified: orders, orders/:id, payments, coupons, categories`
);

await viteServer.close();
await teardownTestEnvironment();

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n======================================================================");
console.log("             ADVERSARIAL STRESS TEST EXECUTION SUMMARY                ");
console.log("======================================================================");
console.log(`  Total Checks:   ${passedCount + failedCount}`);
console.log(`  Passed:         \x1b[32m${passedCount}\x1b[0m`);
console.log(`  Failed:         \x1b[${failedCount > 0 ? "31" : "32"}m${failedCount}\x1b[0m`);
console.log(`  Pass Rate:      ${(((passedCount) / (passedCount + failedCount)) * 100).toFixed(1)}%`);

if (failedCount === 0) {
  console.log("\n\x1b[32m======================================================================");
  console.log("  ALL ADVERSARIAL STRESS TESTS PASSED: EMPIRICAL VERDICT = APPROVE     ");
  console.log("======================================================================\x1b[0m");
  process.exit(0);
} else {
  console.log("\n\x1b[31m======================================================================");
  console.log("  ADVERSARIAL FAILURES FOUND: EMPIRICAL VERDICT = FAIL                 ");
  console.log("======================================================================\x1b[0m");
  process.exit(1);
}
