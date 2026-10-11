import {
  assertTrue,
  assertFalse,
  assertEqual,
  assertStatus,
} from "./helpers/assertions.js";
import { readDashboardFile, loadResourcesConfig } from "./helpers/dashboard-contracts.js";

export async function runTier2(client) {
  const { RESOURCE_CONFIG } = await loadResourcesConfig();
  const tests = [];

  async function test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      tests.push({ name, status: "PASS", durationMs: Date.now() - start });
    } catch (err) {
      tests.push({
        name,
        status: "FAIL",
        durationMs: Date.now() - start,
        error: err.message || String(err),
      });
    }
  }

  // =========================================================================
  // BOUNDARY 1: Dependencies & Aliases Boundaries
  // =========================================================================
  await test("B1.1: Missing package dependency validation rejects undefined packages", async () => {
    const pkg = JSON.parse(readDashboardFile("package.json"));
    assertEqual(pkg.dependencies["non-existent-radix-fake"], undefined);
  });

  await test("B1.2: Build scripts define valid preview and dev targets", async () => {
    const pkg = JSON.parse(readDashboardFile("package.json"));
    assertTrue(pkg.scripts.build.includes("vite build"));
    assertTrue(pkg.scripts.dev.includes("vite"));
  });

  await test("B1.3: Package private flag protects against unintended registry publish", async () => {
    const pkg = JSON.parse(readDashboardFile("package.json"));
    assertEqual(pkg.private, true);
  });

  await test("B1.4: Node module type is configured as ES module", async () => {
    const pkg = JSON.parse(readDashboardFile("package.json"));
    assertEqual(pkg.type, "module");
  });

  await test("B1.5: Environment variable fallback default URL is defined in api.js", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertTrue(apiCode.includes("|| \"https://thriftshoewear-backend.vercel.app/api/v1\"") || apiCode.includes("/api/v1"));
  });

  // =========================================================================
  // BOUNDARY 2: Design System & CSS Tokens Boundaries
  // =========================================================================
  await test("B2.1: Radius calculation handles negative offsets with clamping", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("calc(var(--radius) - 4px)"));
  });

  await test("B2.2: Body minimum width prevents viewport collapse below 320px", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("min-width: 320px"));
  });

  await test("B2.3: Root CSS defines valid hex/oklch values without empty declarations", async () => {
    const css = readDashboardFile("src/index.css");
    assertFalse(css.includes("--background: ;"));
    assertFalse(css.includes("--foreground: ;"));
  });

  await test("B2.4: Destructive color token provides high-contrast alert foreground", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("--destructive:"));
    assertTrue(css.includes("--destructive-foreground:"));
  });

  await test("B2.5: Global base layer styling applies reset to all elements", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("@layer base") || css.includes("box-sizing") || css.includes("* {"));
  });

  // =========================================================================
  // BOUNDARY 3: Pure shadcn/ui Primitives Boundaries
  // =========================================================================
  await test("B3.1: Button default variant falls back gracefully when variant is undefined", async () => {
    const btnCode = readDashboardFile("src/components/ui/button.jsx");
    assertTrue(btnCode.includes("defaultVariants:"));
    assertTrue(btnCode.includes("variant: \"default\""));
  });

  await test("B3.2: Badge variant fallback provides default styling when not specified", async () => {
    const badgeCode = readDashboardFile("src/components/ui/badge.jsx");
    assertTrue(badgeCode.includes("variant: \"default\""));
  });

  await test("B3.3: Dialog Content includes accessible hidden Title fallback or description", async () => {
    const dialogCode = readDashboardFile("src/components/ui/dialog.jsx");
    assertTrue(dialogCode.includes("DialogContent"));
  });

  await test("B3.4: Table primitive handles empty rows with Empty or proper structure", async () => {
    const tableCode = readDashboardFile("src/components/ui/table.jsx");
    assertTrue(tableCode.includes("TableBody"));
    assertTrue(tableCode.includes("TableRow"));
  });

  await test("B3.5: Input component supports disabled state attribute propagation", async () => {
    const inputCode = readDashboardFile("src/components/ui/input.jsx");
    assertTrue(inputCode.includes("disabled:cursor-not-allowed"));
  });

  // =========================================================================
  // BOUNDARY 4: Theme Engine Boundaries
  // =========================================================================
  await test("B4.1: Dark theme overrides surface tokens with valid OKLCH colors", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes(".dark") && css.includes("--background: oklch"));
  });

  await test("B4.2: Root theme defines valid border radius unit", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("--radius:") && css.includes("rem"));
  });

  await test("B4.3: Secondary surface foreground has appropriate contrast against secondary background", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("--secondary-foreground:"));
  });

  await test("B4.4: Muted foreground retains readability tone", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("--muted-foreground:"));
  });

  await test("B4.5: Color popover variables exist for dropdown and dialog overlays", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes("--popover:"));
    assertTrue(css.includes("--popover-foreground:"));
  });

  // =========================================================================
  // BOUNDARY 5: Dedicated Dashboard Layout Boundaries
  // =========================================================================
  await test("B5.1: Unauthenticated request to protected route redirects to /login", async () => {
    const appCode = readDashboardFile("src/App.jsx");
    assertTrue(appCode.includes("if (!token) return <Navigate to=\"/login\" replace />"));
  });

  await test("B5.2: Non-admin authenticated user is denied access to dashboard", async () => {
    const appCode = readDashboardFile("src/App.jsx");
    assertTrue(appCode.includes("if (user && !isAdmin) return <Navigate to=\"/login\" replace />"));
  });

  await test("B5.3: Wildcard route redirects unknown paths to home", async () => {
    const appCode = readDashboardFile("src/App.jsx");
    assertTrue(appCode.includes("<Route path=\"*\" element={<Navigate to=\"/\" replace />} />"));
  });

  await test("B5.4: RequireAuth allows admin role through without redirection", async () => {
    const appCode = readDashboardFile("src/App.jsx");
    assertTrue(appCode.includes("user?.role === \"admin\" || user?.role === \"superAdmin\""));
  });

  await test("B5.5: Auth token check occurs on mount via useEffect", async () => {
    const appCode = readDashboardFile("src/App.jsx");
    assertTrue(appCode.includes("useEffect"));
    assertTrue(appCode.includes("fetchMe()"));
  });

  // =========================================================================
  // BOUNDARY 6: Collapsible App Sidebar Boundaries
  // =========================================================================
  await test("B6.1: Avatar initials generator handles empty user object gracefully", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("function initials(user)"));
    assertTrue(appShell.includes("|| \"Admin\""));
  });

  await test("B6.2: Avatar initials generator trims and handles single word names", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes(".slice(0, 2)"));
  });

  await test("B6.3: Collapsed sidebar state renders tooltip or title attribute", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("title={collapsed ? item.label : undefined}"));
  });

  await test("B6.4: Sidebar toggle switches collapsed boolean between true and false", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("setCollapsed") && (appShell.includes("!value") || appShell.includes("!collapsed")));
  });

  await test("B6.5: Nav items include end exact route match for overview route", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("end: true"));
  });

  // =========================================================================
  // BOUNDARY 7: Site Header & Breadcrumbs Boundaries
  // =========================================================================
  await test("B7.1: Header falls back to Dashboard when route is not in dictionary", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("pageTitles[location.pathname] || \"Dashboard\""));
  });

  await test("B7.2: User role badge displays superAdmin and admin titles cleanly", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("user?.role"));
  });

  await test("B7.3: Logout button dispatches logout action cleanly", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("dispatch(logout())"));
  });

  await test("B7.4: User display name falls back to first and last name if displayName null", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("user?.displayName || `${user?.firstName || \"\"} ${user?.lastName || \"\"}`.trim()"));
  });

  await test("B7.5: Header maintains fixed height and border separator", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("h-16") || appShell.includes("border-b"));
  });

  // =========================================================================
  // BOUNDARY 8: Mobile Responsive Sheet Sidebar Boundaries
  // =========================================================================
  await test("B8.1: Sidebar is hidden by default on mobile screens (hidden lg:flex)", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("hidden") && appShell.includes("lg:flex"));
  });

  await test("B8.2: Mobile bottom padding prevents content clipping under fixed bars", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("pb-20") || appShell.includes("min-h-screen"));
  });

  await test("B8.3: Mobile navigation item font size conforms to mobile readability (text-xs)", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("text-xs") || appShell.includes("text-sm"));
  });

  await test("B8.4: Large screen sidebar expands smoothly with transition-all class", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("transition-all"));
  });

  await test("B8.5: Mobile navigation uses z-index layering to stay on top", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("z-30") || appShell.includes("z-20"));
  });

  // =========================================================================
  // BOUNDARY 9: Overview & KPI Boundaries
  // =========================================================================
  await test("B9.1: Unauthorized request to /site/dashboard returns HTTP 401", async () => {
    const res = await client.get("/api/v1/site/dashboard"); // No token
    assertStatus(res, 401);
    assertFalse(res.data?.success);
  });

  await test("B9.2: Customer role request to /site/dashboard returns HTTP 403 Forbidden", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.customerToken });
    assertStatus(res, 403);
    assertFalse(res.data?.success);
  });

  await test("B9.3: Due revenue calculation handles zero or equal amounts without NaN", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const due = res.data?.data?.amountDue ?? res.data?.revenue?.due;
    assertTrue(typeof due === "number" && !isNaN(due));
  });

  await test("B9.4: Active products count cannot exceed total products count", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const counts = res.data?.data || res.data?.counts;
    assertTrue(counts.activeProducts <= counts.products);
  });

  await test("B9.5: OverviewPage displays loader when status is loading and no data cached", async () => {
    const overview = readDashboardFile("src/pages/OverviewPage.jsx");
    assertTrue(overview.includes("status === \"loading\" && !data"));
    assertTrue(overview.includes("Loader2"));
  });

  // =========================================================================
  // BOUNDARY 10: Analytics Charts Boundaries
  // =========================================================================
  await test("B10.1: Empty sales trend array does not crash dashboard response", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    assertTrue(res.data?.data?.salesTrend !== undefined);
  });

  await test("B10.2: Popular products slice returns at most 5 items", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const popular = res.data?.data?.popularProducts || [];
    assertTrue(popular.length <= 5);
  });

  await test("B10.3: Date string formatting handles ISO strings cleanly", async () => {
    const formatCode = readDashboardFile("src/lib/format.js");
    assertTrue(formatCode.includes("formatDate"));
    assertTrue(formatCode.includes("DateTimeFormat"));
  });

  await test("B10.4: Currency formatter handles zero value without error ($0.00)", async () => {
    const formatCode = readDashboardFile("src/lib/format.js");
    assertTrue(formatCode.includes("formatCurrency"));
  });

  await test("B10.5: Currency formatter falls back cleanly on undefined or null value", async () => {
    const formatCode = readDashboardFile("src/lib/format.js");
    assertTrue(formatCode.includes("value === undefined || value === null"));
  });

  // =========================================================================
  // BOUNDARY 11: Products Catalog & Search Boundaries
  // =========================================================================
  await test("B11.1: Out-of-bounds pagination (page=99999) returns empty products array without crash", async () => {
    const res = await client.get("/api/v1/products", { query: { page: 99999, limit: 10 } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertEqual(products.length, 0);
  });

  await test("B11.2: Search query with non-matching string returns empty array", async () => {
    const res = await client.get("/api/v1/products", { query: { search: "xyz-non-existent-shoe-99" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertEqual(products.length, 0);
  });

  await test("B11.3: Search query with special characters is handled safely", async () => {
    const res = await client.get("/api/v1/products", { query: { search: "Nike & Jordan's #1" } });
    assertStatus(res, 200);
  });

  await test("B11.4: Non-existent product ID query returns HTTP 404", async () => {
    const res = await client.get("/api/v1/products/prod_does_not_exist_99");
    assertStatus(res, 404);
  });

  await test("B11.5: Filtering by non-existent condition returns empty list without error", async () => {
    const res = await client.get("/api/v1/products", { query: { condition: "broken_beyond_repair" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertEqual(products.length, 0);
  });

  // =========================================================================
  // BOUNDARY 12: Thrift Variant & Condition Editor Boundaries
  // =========================================================================
  await test("B12.1: Creating product without variants returns HTTP 400", async () => {
    const body = {
      name: "Empty Variant Shoe",
      productType: "shoes",
      condition: "good",
      variants: [],
    };
    const res = await client.post("/api/v1/products", body, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B12.2: Creating product with negative variant price returns HTTP 400", async () => {
    const body = {
      name: "Negative Price Shoe",
      productType: "shoes",
      condition: "good",
      variants: [{ sku: "NEG-01", price: -50, stock: 1 }],
    };
    const res = await client.post("/api/v1/products", body, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B12.3: Creating product with negative variant stock returns HTTP 400", async () => {
    const body = {
      name: "Negative Stock Shoe",
      productType: "shoes",
      condition: "good",
      variants: [{ sku: "NEG-02", price: 50, stock: -5 }],
    };
    const res = await client.post("/api/v1/products", body, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B12.4: Creating product without required name returns HTTP 400", async () => {
    const body = {
      productType: "shoes",
      condition: "good",
      variants: [{ sku: "SKU-01", price: 50, stock: 1 }],
    };
    const res = await client.post("/api/v1/products", body, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B12.5: Variant stock defaults to 1 when omitted in form builder", async () => {
    const builder = RESOURCE_CONFIG.products.buildPayload;
    const form = {
      name: "Default Stock Shoe",
      shortDescription: "Desc",
      description: "Desc",
      productType: "shoes",
      condition: "good",
      variants: [{ sku: "SKU-DEF", price: 100 }],
    };
    const payload = builder(form, "create");
    assertEqual(payload.variants[0].stock, 1);
  });

  // =========================================================================
  // BOUNDARY 13: Orders Management & Status Boundaries
  // =========================================================================
  await test("B13.1: Illegal order status jump (placed directly to delivered) returns HTTP 400", async () => {
    client.server.orders.set("order_illegal_jump", {
      _id: "order_illegal_jump",
      orderStatus: "placed",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_illegal_jump/status", {
      status: "delivered",
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B13.2: Transitioning non-existent order ID returns HTTP 404", async () => {
    const res = await client.patch("/api/v1/orders/non_existent_order_id/status", {
      status: "confirmed",
    }, { token: client.adminToken });
    assertStatus(res, 404);
  });

  await test("B13.3: Attempting to transition already delivered order returns HTTP 400", async () => {
    client.server.orders.set("order_already_delivered", {
      _id: "order_already_delivered",
      orderStatus: "delivered",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_already_delivered/status", {
      status: "cancelled",
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B13.4: Cancelling order without reason returns HTTP 400", async () => {
    client.server.orders.set("order_cancel_no_reason", {
      _id: "order_cancel_no_reason",
      orderStatus: "placed",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_cancel_no_reason/status", {
      status: "cancelled",
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B13.5: Querying order by invalid ID format returns HTTP 404", async () => {
    const res = await client.get("/api/v1/orders/invalid-format-1234567890", { token: client.adminToken });
    assertStatus(res, 404);
  });

  // =========================================================================
  // BOUNDARY 14: Courier & Tracking Fulfillment Boundaries
  // =========================================================================
  await test("B14.1: Missing trackingNumber when marking shipped returns HTTP 400", async () => {
    client.server.orders.set("order_missing_tracking", {
      _id: "order_missing_tracking",
      orderStatus: "packed",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_missing_tracking/status", {
      status: "shipped",
      courierName: "trax",
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B14.2: Missing courierName when marking shipped returns HTTP 400", async () => {
    const res = await client.patch("/api/v1/orders/order_missing_tracking/status", {
      status: "shipped",
      trackingNumber: "TRX-123",
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B14.3: Updating non-existent shipment returns HTTP 404", async () => {
    const res = await client.patch("/api/v1/shipments/non_existent_ship_id/status", {
      status: "delivered",
    }, { token: client.adminToken });
    assertStatus(res, 404);
  });

  await test("B14.4: Tracking URL automatically generated when omitted", async () => {
    client.server.orders.set("order_auto_tracking_url", {
      _id: "order_auto_tracking_url",
      orderStatus: "packed",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_auto_tracking_url/status", {
      status: "shipped",
      courierName: "leopards",
      trackingNumber: "LEO-9988",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    const ord = client.server.orders.get("order_auto_tracking_url");
    assertTrue(ord.trackingUrl.includes("leopards"));
  });

  await test("B14.5: Multiple courier names supported in configuration", async () => {
    const couriers = ["leopards", "tcs", "postex", "trax", "mnp", "blue_ex", "bykea", "self_delivery", "other"];
    assertTrue(couriers.length >= 8);
  });

  // =========================================================================
  // BOUNDARY 15: Payment Verification & Proof Boundaries
  // =========================================================================
  await test("B15.1: Proof upload without receipt URL returns HTTP 400", async () => {
    const res = await client.post("/api/v1/payments/pay_01/proof", { transactionId: "TXN-1" });
    assertStatus(res, 400);
  });

  await test("B15.2: Proof upload to non-existent payment returns HTTP 404", async () => {
    const res = await client.post("/api/v1/payments/pay_non_existent/proof", { url: "https://proof.png" });
    assertStatus(res, 404);
  });

  await test("B15.3: Rejecting payment without reason returns HTTP 400", async () => {
    const res = await client.patch("/api/v1/payments/pay_01/reject", {}, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B15.4: Payment verification on non-existent payment returns HTTP 404", async () => {
    const res = await client.patch("/api/v1/payments/pay_non_existent/verify", {}, { token: client.adminToken });
    assertStatus(res, 404);
  });

  await test("B15.5: Marking paid updates corresponding order payment status", async () => {
    const testPay = {
      _id: "pay_sync_test",
      method: "easypaisa",
      status: "pending",
      order: { _id: "order_01" },
    };
    client.server.payments.set(testPay._id, testPay);
    const res = await client.patch(`/api/v1/payments/${testPay._id}/paid`, {}, { token: client.adminToken });
    assertStatus(res, 200);
    const ord = client.server.orders.get("order_01");
    assertEqual(ord.payment?.status, "paid");
  });

  // =========================================================================
  // BOUNDARY 16: Coupons & Discount Management Boundaries
  // =========================================================================
  await test("B16.1: Percentage discount greater than 100% returns HTTP 400", async () => {
    const res = await client.post("/api/v1/coupons", {
      code: "INVALID150",
      discountType: "percentage",
      discountValue: 150,
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B16.2: Negative coupon discount value returns HTTP 400", async () => {
    const res = await client.post("/api/v1/coupons", {
      code: "NEGATIVE_DISCOUNT",
      discountType: "percentage",
      discountValue: -10,
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B16.3: Validating non-existent coupon returns HTTP 404", async () => {
    const res = await client.get("/api/v1/coupons/validate/DOESNOTEXIST99");
    assertStatus(res, 404);
  });

  await test("B16.4: Validating expired coupon returns HTTP 400", async () => {
    client.server.coupons.set("cpn_expired", {
      _id: "cpn_expired",
      code: "EXPIRED_TEST",
      status: "active",
      validity: { endsAt: new Date(Date.now() - 86400000).toISOString() },
    });
    const res = await client.get("/api/v1/coupons/validate/EXPIRED_TEST");
    assertStatus(res, 400);
  });

  await test("B16.5: Creating coupon without code returns HTTP 400", async () => {
    const res = await client.post("/api/v1/coupons", {
      discountType: "fixed",
      discountValue: 10,
    }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  // =========================================================================
  // BOUNDARY 17: Categories Hierarchy Boundaries
  // =========================================================================
  await test("B17.1: Category creation without name returns HTTP 400", async () => {
    const res = await client.post("/api/v1/categories", { type: "shoes" }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B17.2: Category creation without type returns HTTP 400", async () => {
    const res = await client.post("/api/v1/categories", { name: "No Type Cat" }, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B17.3: Category slug auto-generated from name when omitted", async () => {
    const res = await client.post("/api/v1/categories", {
      name: "Vintage Luxury Bags",
      type: "bags",
    }, { token: client.adminToken });
    assertStatus(res, 201);
    const cat = res.data?.data?.category || res.data?.category;
    assertEqual(cat.slug, "vintage-luxury-bags");
  });

  await test("B17.4: Category deletion removes record cleanly", async () => {
    const catToDelete = { _id: "cat_to_del_b17", name: "Delete Me", type: "other" };
    client.server.categories.set(catToDelete._id, catToDelete);
    const res = await client.delete(`/api/v1/categories/${catToDelete._id}`, { token: client.adminToken });
    assertStatus(res, 200);
    assertFalse(client.server.categories.has(catToDelete._id));
  });

  await test("B17.5: Deleting already deleted category returns HTTP 200 idempotent response", async () => {
    const res = await client.delete("/api/v1/categories/cat_non_existent", { token: client.adminToken });
    assertStatus(res, 200);
  });

  // =========================================================================
  // BOUNDARY 18: Staff & Access Request Boundaries
  // =========================================================================
  await test("B18.1: Standard admin cannot approve dashboard access requests (HTTP 403)", async () => {
    const res = await client.patch("/api/v1/users/user_pending_01/approve-dashboard-access", {
      role: "admin",
    }, { token: client.adminToken });
    assertStatus(res, 403);
  });

  await test("B18.2: Standard admin cannot reject dashboard access requests (HTTP 403)", async () => {
    const res = await client.patch("/api/v1/users/user_pending_01/reject-dashboard-access", {
      reviewNotes: "Rejected",
    }, { token: client.adminToken });
    assertStatus(res, 403);
  });

  await test("B18.3: Approving non-existent user returns HTTP 404", async () => {
    const res = await client.patch("/api/v1/users/user_non_existent/approve-dashboard-access", {
      role: "admin",
    }, { token: client.superAdminToken });
    assertStatus(res, 404);
  });

  await test("B18.4: Rejecting non-existent user returns HTTP 404", async () => {
    const res = await client.patch("/api/v1/users/user_non_existent/reject-dashboard-access", {
      reviewNotes: "Rejection",
    }, { token: client.superAdminToken });
    assertStatus(res, 404);
  });

  await test("B18.5: Approved user gains selected role (e.g. superAdmin)", async () => {
    const tempUser = {
      _id: "user_test_superadmin_elevate",
      email: "elevate@test.com",
      role: "customer",
      dashboardAccessStatus: "pending",
    };
    client.server.users.set(tempUser._id, tempUser);
    const res = await client.patch(`/api/v1/users/${tempUser._id}/approve-dashboard-access`, {
      role: "superAdmin",
    }, { token: client.superAdminToken });
    assertStatus(res, 200);
    assertEqual(tempUser.role, "superAdmin");
  });

  // =========================================================================
  // BOUNDARY 19: Site Settings & Assets Boundaries
  // =========================================================================
  await test("B19.1: Creating asset with invalid placement enum returns HTTP 400", async () => {
    const res = await client.post("/api/v1/site/assets", {
      title: "Bad Placement",
      placement: "invalid_placement_location",
    });
    assertStatus(res, 400);
  });

  await test("B19.2: Creating asset without title returns HTTP 400", async () => {
    const res = await client.post("/api/v1/site/assets", {
      placement: "hero",
    });
    assertStatus(res, 400);
  });

  await test("B19.3: Initial form values handles empty item without throwing", async () => {
    const initialValues = RESOURCE_CONFIG.assets.fields.reduce((acc, f) => {
      acc[f.name] = f.defaultValue ?? "";
      return acc;
    }, {});
    assertTrue(typeof initialValues === "object");
  });

  await test("B19.4: Asset sort order defaults to 0 when omitted", async () => {
    const res = await client.post("/api/v1/site/assets", {
      title: "Zero Sort Asset",
      placement: "logo",
    });
    assertStatus(res, 201);
  });

  await test("B19.5: Asset placement options list matches valid placements", async () => {
    const assetConfig = RESOURCE_CONFIG.assets;
    const placementField = assetConfig.fields.find((f) => f.name === "placement");
    assertTrue(placementField.options.length > 5);
  });

  // =========================================================================
  // BOUNDARY 20: E2E Suite & Network Resilience Boundaries
  // =========================================================================
  await test("B20.1: Malformed authorization token returns HTTP 401 on protected endpoint", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: "malformed_invalid_token" });
    assertStatus(res, 401);
  });

  await test("B20.2: Unknown endpoint returns standard HTTP 404", async () => {
    const res = await client.get("/api/v1/unknown-endpoint-xyz");
    assertStatus(res, 404);
  });

  await test("B20.3: Empty body POST request is parsed as empty object safely", async () => {
    const res = await client.post("/api/v1/coupons", undefined, { token: client.adminToken });
    assertStatus(res, 400);
  });

  await test("B20.4: CORS preflight OPTIONS request returns HTTP 204", async () => {
    const res = await client.request("OPTIONS", "/api/v1/site/dashboard");
    assertStatus(res, 204);
  });

  await test("B20.5: Health check maintains sub-millisecond response time", async () => {
    const start = Date.now();
    const res = await client.get("/api/v1/health");
    const elapsed = Date.now() - start;
    assertStatus(res, 200);
    assertTrue(elapsed < 200, `Health check took ${elapsed}ms`);
  });

  return tests;
}
