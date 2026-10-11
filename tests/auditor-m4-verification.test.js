import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("   AUDITOR M4 FORENSIC INTEGRITY & EMPIRICAL VERIFICATION HARNESS    ");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`\x1b[32m✓ PASS\x1b[0m: ${name}`);
  } catch (err) {
    failed++;
    console.log(`\x1b[31m✗ FAIL\x1b[0m: ${name}`);
    console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
  }
}

// -----------------------------------------------------------------------------
// Suite 1: orderConstants.js Forensic Analysis
// -----------------------------------------------------------------------------
console.log("--- Suite 1: orderConstants.js Forensic Structure ---");
const orderConstantsPath = path.join(PROJECT_ROOT, "src/config/orderConstants.js");
const orderConstantsSource = fs.readFileSync(orderConstantsPath, "utf8");

check("orderConstants.js exists and exports ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, COURIER_OPTIONS, ALLOWED_TRANSITIONS, CANCELLATION_REASONS", () => {
  assert.ok(orderConstantsSource.includes("export const ORDER_STATUSES"));
  assert.ok(orderConstantsSource.includes("export const PAYMENT_STATUSES"));
  assert.ok(orderConstantsSource.includes("export const PAYMENT_METHODS"));
  assert.ok(orderConstantsSource.includes("export const COURIER_OPTIONS"));
  assert.ok(orderConstantsSource.includes("export const ALLOWED_TRANSITIONS"));
  assert.ok(orderConstantsSource.includes("export const CANCELLATION_REASONS"));
});

check("ORDER_STATUSES contains all 7 lifecycle statuses with step ranks", () => {
  const expected = ["placed", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"];
  for (const s of expected) {
    assert.ok(orderConstantsSource.includes(`value: "${s}"`), `Missing order status: ${s}`);
  }
});

check("ALLOWED_TRANSITIONS defines correct directed graph", () => {
  assert.ok(orderConstantsSource.includes('placed: ["confirmed", "cancelled"]'));
  assert.ok(orderConstantsSource.includes('shipped: ["delivered"]'));
  assert.ok(orderConstantsSource.includes('delivered: []'));
  assert.ok(orderConstantsSource.includes('cancelled: []'));
});

check("COURIER_OPTIONS includes Pakistani couriers (trax, leopards, tcs, postex, mnp, blue_ex, bykea)", () => {
  const couriers = ["trax", "leopards", "tcs", "postex", "mnp", "blue_ex", "bykea"];
  for (const c of couriers) {
    assert.ok(orderConstantsSource.includes(`value: "${c}"`), `Missing courier: ${c}`);
  }
});

// -----------------------------------------------------------------------------
// Suite 2: OrdersPage.jsx & OrderDetailPage.jsx Forensic Analysis
// -----------------------------------------------------------------------------
console.log("\n--- Suite 2: Orders & Fulfillment Pages ---");
const ordersPageSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/pages/OrdersPage.jsx"), "utf8");
const orderDetailPageSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/pages/OrderDetailPage.jsx"), "utf8");

check("OrdersPage queries GET /orders with search, sort, pagination, and filter params", () => {
  assert.ok(ordersPageSource.includes('apiRequest("/orders", { token, params })'));
  assert.ok(ordersPageSource.includes("params.orderStatus = statusTab"));
  assert.ok(ordersPageSource.includes("params.paymentStatus = paymentStatusFilter"));
  assert.ok(ordersPageSource.includes("params.paymentMethod = paymentMethodFilter"));
});

check("OrdersPage implements live PATCH /orders/:id/status transitions", () => {
  assert.ok(ordersPageSource.includes("`/orders/${order._id}/status`"));
  assert.ok(ordersPageSource.includes("`/orders/${dispatchOrder._id}/status`"));
  assert.ok(ordersPageSource.includes("`/orders/${cancelOrderTarget._id}/status`"));
});

check("OrdersPage dispatch modal enforces trackingNumber and submits courierName", () => {
  assert.ok(ordersPageSource.includes("Tracking number is required to mark order as shipped"));
  assert.ok(ordersPageSource.includes("courierName: dispatchCourier"));
  assert.ok(ordersPageSource.includes("trackingNumber: dispatchTrackingNumber.trim()"));
});

check("OrderDetailPage contains 5-stage fulfillment pipeline with stepper rank progression", () => {
  assert.ok(orderDetailPageSource.includes('key: "placed"'));
  assert.ok(orderDetailPageSource.includes('key: "confirmed"'));
  assert.ok(orderDetailPageSource.includes('key: "packed"'));
  assert.ok(orderDetailPageSource.includes('key: "shipped"'));
  assert.ok(orderDetailPageSource.includes('key: "delivered"'));
  assert.ok(orderDetailPageSource.includes("statusRanks = {"));
});

check("OrderDetailPage renders thrift condition grades on line items", () => {
  assert.ok(orderDetailPageSource.includes("<StatusBadge value={item.condition || \"good\"} />"));
  assert.ok(orderDetailPageSource.includes("SKU: {item.sku}"));
});

check("OrderDetailPage displays financial breakdown including COD amount due", () => {
  assert.ok(orderDetailPageSource.includes("formatCurrency(totals.grandTotal"));
  assert.ok(orderDetailPageSource.includes("formatCurrency(totals.shippingFee"));
});

// -----------------------------------------------------------------------------
// Suite 3: Payments & Verification Forensic Analysis
// -----------------------------------------------------------------------------
console.log("\n--- Suite 3: Payments & Verification System ---");
const paymentModalSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/components/PaymentProofModal.jsx"), "utf8");
const paymentsPageSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/pages/PaymentsPage.jsx"), "utf8");

check("PaymentProofModal implements zoom, reset, and rotate controls", () => {
  assert.ok(paymentModalSource.includes("handleZoomIn = () => setZoom((z) => Math.min(300, z + 25))"));
  assert.ok(paymentModalSource.includes("handleZoomOut = () => setZoom((z) => Math.max(50, z - 25))"));
  assert.ok(paymentModalSource.includes("handleResetZoom"));
  assert.ok(paymentModalSource.includes("handleRotate = () => setRotation((r) => (r + 90) % 360)"));
});

check("PaymentProofModal supports multi-proof thumbnail carousel", () => {
  assert.ok(paymentModalSource.includes("proofs.length > 1"));
  assert.ok(paymentModalSource.includes("selectedProofIndex"));
});

check("PaymentProofModal enforces rejection reason and calls onReject", () => {
  assert.ok(paymentModalSource.includes("REJECTION_REASONS = ["));
  assert.ok(paymentModalSource.includes("handleConfirmReject"));
  assert.ok(paymentModalSource.includes("onReject(payment, { reason: finalReason, notes: rejectNote })"));
});

check("PaymentMethodBadge configures Pakistani payment channels", () => {
  const methods = ["bank_transfer", "easypaisa", "jazzcash", "sadapay", "cod", "advance_cod", "card", "wallet"];
  for (const m of methods) {
    assert.ok(paymentModalSource.includes(`${m}:`), `Missing PaymentMethodBadge config for: ${m}`);
  }
});

check("PaymentsPage connects to PATCH /payments/:id/paid, /verify, and /reject", () => {
  assert.ok(paymentsPageSource.includes("`/payments/${payment._id}/paid`"));
  assert.ok(paymentsPageSource.includes("`/payments/${payment._id}/reject`"));
  assert.ok(paymentsPageSource.includes("`/payments/${payment._id}/verify`"));
});

check("PaymentsPage calculates 4 KPI metrics: Paid Volume, Awaiting Verification, Verified, Failed", () => {
  assert.ok(paymentsPageSource.includes("totalVolume"));
  assert.ok(paymentsPageSource.includes("awaitingVerificationCount"));
  assert.ok(paymentsPageSource.includes("verifiedCount"));
  assert.ok(paymentsPageSource.includes("failedCount"));
});

// -----------------------------------------------------------------------------
// Suite 4: Coupons & Categories Forensic Analysis
// -----------------------------------------------------------------------------
console.log("\n--- Suite 4: Coupons & Categories Modules ---");
const couponsPageSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/pages/CouponsPage.jsx"), "utf8");
const categoriesPageSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/pages/CategoriesPage.jsx"), "utf8");

check("CouponsPage enforces code format regex ^[A-Z0-9_-]+$ and percentage cap <= 100", () => {
  assert.ok(couponsPageSource.includes("/^[A-Z0-9_-]+$/"));
  assert.ok(couponsPageSource.includes("val <= 0 || val > 100"));
});

check("CouponsPage connects to all coupon lifecycle endpoints (POST, PATCH, DELETE, restore, usages)", () => {
  assert.ok(couponsPageSource.includes('apiRequest("/coupons", {'));
  assert.ok(couponsPageSource.includes('`/coupons/${editingCoupon._id}`'));
  assert.ok(couponsPageSource.includes('`/coupons/${deleteTarget._id}`'));
  assert.ok(couponsPageSource.includes('`/coupons/${coupon._id}/restore`'));
  assert.ok(couponsPageSource.includes('apiRequest("/coupons/usages"'));
});

check("CategoriesPage implements auto-slugify and forbids self-parenting", () => {
  assert.ok(categoriesPageSource.includes("slugify = (value) =>"));
  assert.ok(categoriesPageSource.includes('errors.parentCategory = "Category cannot be its own parent"'));
});

check("CategoriesPage implements 409 conflict detection with ?force=true force archive", () => {
  assert.ok(categoriesPageSource.includes('err.message.toLowerCase().includes("category has products")'));
  assert.ok(categoriesPageSource.includes("params: { force: \"true\" }"));
});

check("CategoriesPage connects to all taxonomy endpoints (GET, POST, PATCH, DELETE, restore)", () => {
  assert.ok(categoriesPageSource.includes('apiRequest("/categories", { token, params })'));
  assert.ok(categoriesPageSource.includes('apiRequest("/categories", {\n          method: "POST"'));
  assert.ok(categoriesPageSource.includes('`/categories/${editingCategory._id}`'));
  assert.ok(categoriesPageSource.includes('`/categories/${deleteTarget._id}`'));
  assert.ok(categoriesPageSource.includes('`/categories/${cat._id}/restore`'));
});

// -----------------------------------------------------------------------------
// Suite 5: Routing & Invariants
// -----------------------------------------------------------------------------
console.log("\n--- Suite 5: Routing, Layout & Invariants ---");
const appSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/App.jsx"), "utf8");
const appShellPath = path.join(PROJECT_ROOT, "src/components/AppShell.jsx");

check("App.jsx registers dedicated routes for orders, order detail, payments, coupons, and categories", () => {
  assert.ok(appSource.includes('<Route path="orders" element={<OrdersPage />} />'));
  assert.ok(appSource.includes('<Route path="orders/:id" element={<OrderDetailPage />} />'));
  assert.ok(appSource.includes('<Route path="payments" element={<PaymentsPage />} />'));
  assert.ok(appSource.includes('<Route path="coupons" element={<CouponsPage />} />'));
  assert.ok(appSource.includes('<Route path="categories" element={<CategoriesPage />} />'));
});

check("App.jsx excludes all 5 implemented resources from generic fallback loop", () => {
  assert.ok(appSource.includes('!["products", "orders", "payments", "coupons", "categories"].includes('));
});

check("AppShell.jsx backwards compatibility file is present and intact on disk", () => {
  assert.ok(fs.existsSync(appShellPath));
  const shellSource = fs.readFileSync(appShellPath, "utf8");
  assert.ok(shellSource.includes("export default function AppShell"));
});

console.log("\n======================================================================");
console.log(`TOTAL FORENSIC INTEGRITY CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
}
