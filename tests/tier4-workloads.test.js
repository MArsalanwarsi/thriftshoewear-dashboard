import {
  assertTrue,
  assertEqual,
  assertStatus,
  assertSuccess,
} from "./helpers/assertions.js";

export async function runTier4(client) {
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
  // WORKFLOW 1: Admin Onboarding & Dashboard Access Approval Lifecycle
  // =========================================================================
  await test("W1: Admin Onboarding & Dashboard Access Approval Lifecycle", async () => {
    // Step 1: New employee registers requesting staff dashboard access
    const regRes = await client.post("/api/v1/auth/register", {
      email: "new_ops_lead@thriftshoewear.test",
      password: "SecureStaffPass2026!",
      firstName: "Marcus",
      lastName: "Vance",
      requestDashboardAccess: true,
      requestedRole: "admin",
    });
    assertStatus(regRes, 201);
    const userId = regRes.data?.user?._id;
    const initialToken = regRes.data?.token;

    // Step 2: SuperAdmin queries pending access requests list
    const pendingListRes = await client.get("/api/v1/users", {
      query: { dashboardAccessStatus: "pending" },
      token: client.superAdminToken,
    });
    assertStatus(pendingListRes, 200);
    const pendingUsers = pendingListRes.data?.data?.users || pendingListRes.data?.users;
    assertTrue(pendingUsers.some((u) => u._id === userId), "Applicant not found in pending list");

    // Step 3: SuperAdmin approves dashboard access request
    const approveRes = await client.patch(`/api/v1/users/${userId}/approve-dashboard-access`, {
      role: "admin",
      reviewNotes: "Authorized for inventory intake and order fulfillment operations.",
    }, { token: client.superAdminToken });
    assertStatus(approveRes, 200);

    // Step 4: Approved staff logs in and queries profile
    const meRes = await client.get("/api/v1/auth/me", { token: initialToken });
    assertStatus(meRes, 200);
    const profile = meRes.data?.user;
    assertEqual(profile.role, "admin");
    assertEqual(profile.dashboardAccess?.status, "approved");
  });

  // =========================================================================
  // WORKFLOW 2: End-to-End Thrift Inventory Intake & Multi-Variant Catalog Management
  // =========================================================================
  await test("W2: End-to-End Thrift Inventory Intake & Multi-Variant Catalog Management", async () => {
    // Step 1: Admin creates new taxonomy category for vintage running shoes
    const catRes = await client.post("/api/v1/categories", {
      name: "Vintage Running Shoes",
      type: "shoes",
      gender: "unisex",
      isActive: true,
    }, { token: client.adminToken });
    assertStatus(catRes, 201);
    const category = catRes.data?.data?.category || catRes.data?.category;

    // Step 2: Admin lists product with distinct thrift condition grades across variants
    const prodRes = await client.post("/api/v1/products", {
      name: "Vintage Nike Air Max 90 Infrared",
      shortDescription: "1990 classic sneaker release.",
      description: "Thrift graded original colorway.",
      category: category._id,
      productType: "shoes",
      condition: "like_new",
      variants: [
        { sku: "AM90-95-LN", size: "9.5 US", color: "Infrared", condition: "like_new", price: 150, stock: 1 },
        { sku: "AM90-10-EX", size: "10 US", color: "Infrared", condition: "excellent", price: 130, stock: 1 },
      ],
    }, { token: client.adminToken });
    assertStatus(prodRes, 201);
    const product = prodRes.data?.data?.product || prodRes.data?.product;

    // Step 3: Verify product appears in catalog search
    const searchRes = await client.get("/api/v1/products", {
      query: { search: "Air Max 90" },
    });
    assertStatus(searchRes, 200);
    const prods = searchRes.data?.data?.products || searchRes.data?.products;
    assertTrue(prods.some((p) => p._id === product._id));

    // Step 4: Admin updates pricing on variant
    const patchRes = await client.patch(`/api/v1/products/${product._id}`, {
      brand: "Nike Air",
    }, { token: client.adminToken });
    assertStatus(patchRes, 200);
  });

  // =========================================================================
  // WORKFLOW 3: Complete Order Fulfillment & Shipping Workflow
  // =========================================================================
  await test("W3: Complete Order Fulfillment & Shipping Workflow", async () => {
    // Step 1: Seed new active order in placed state
    const orderId = `order_w3_${Date.now()}`;
    const newOrder = {
      _id: orderId,
      orderNumber: "TSW-991100",
      orderStatus: "placed",
      customerSnapshot: { fullName: "Robert Miller", email: "robert@test.com" },
      totals: { grandTotal: 180, currency: "USD" },
      statusHistory: [{ status: "placed", timestamp: new Date().toISOString() }],
    };
    client.server.orders.set(orderId, newOrder);

    // Step 2: Operations team confirms order
    const confirmRes = await client.patch(`/api/v1/orders/${orderId}/status`, {
      status: "confirmed",
    }, { token: client.adminToken });
    assertStatus(confirmRes, 200);

    // Step 3: Warehouse team packs order
    const packRes = await client.patch(`/api/v1/orders/${orderId}/status`, {
      status: "packed",
    }, { token: client.adminToken });
    assertStatus(packRes, 200);

    // Step 4: Dispatch team assigns courier and tracking number
    const shipRes = await client.patch(`/api/v1/orders/${orderId}/status`, {
      status: "shipped",
      courierName: "trax",
      trackingNumber: "TRX-77441199",
      trackingUrl: "https://trax.pk/tracking/TRX-77441199",
    }, { token: client.adminToken });
    assertStatus(shipRes, 200);
    assertEqual(newOrder.orderStatus, "shipped");
    assertEqual(newOrder.courierName, "trax");

    // Step 5: Mark order delivered upon courier confirmation
    const deliverRes = await client.patch(`/api/v1/orders/${orderId}/status`, {
      status: "delivered",
    }, { token: client.adminToken });
    assertStatus(deliverRes, 200);
    assertEqual(newOrder.orderStatus, "delivered");
  });

  // =========================================================================
  // WORKFLOW 4: Manual Bank Transfer Verification & Financial Settlement
  // =========================================================================
  await test("W4: Manual Bank Transfer Verification & Financial Settlement", async () => {
    // Step 1: Create manual transfer payment transaction
    const payId = `pay_w4_${Date.now()}`;
    const ordId = `ord_w4_${Date.now()}`;
    const orderRecord = {
      _id: ordId,
      orderNumber: "TSW-7788",
      totals: { grandTotal: 220 },
      payment: { status: "pending", method: "bank_transfer" },
    };
    client.server.orders.set(ordId, orderRecord);

    const paymentRecord = {
      _id: payId,
      order: orderRecord,
      method: "bank_transfer",
      amount: 220,
      currency: "USD",
      status: "pending",
      proofs: [],
    };
    client.server.payments.set(payId, paymentRecord);

    // Step 2: Customer uploads receipt screenshot proof
    const proofRes = await client.post(`/api/v1/payments/${payId}/proof`, {
      url: "https://proofs.test/wire_transfer_receipt_220.pdf",
      transactionId: "WIRE-992200",
    });
    assertStatus(proofRes, 200);
    assertEqual(paymentRecord.status, "awaiting_verification");

    // Step 3: Finance admin verifies bank statement match
    const verifyRes = await client.patch(`/api/v1/payments/${payId}/verify`, {}, { token: client.adminToken });
    assertStatus(verifyRes, 200);
    assertEqual(paymentRecord.status, "verified");

    // Step 4: Mark payment paid and confirm order payment sync
    const paidRes = await client.patch(`/api/v1/payments/${payId}/paid`, {}, { token: client.adminToken });
    assertStatus(paidRes, 200);
    assertEqual(paymentRecord.status, "paid");
    assertEqual(orderRecord.payment.status, "paid");
  });

  // =========================================================================
  // WORKFLOW 5: Marketing Campaign Launch & Store Asset Deployment
  // =========================================================================
  await test("W5: Marketing Campaign Launch & Store Asset Deployment", async () => {
    // Step 1: Create promotional campaign discount coupon
    const couponRes = await client.post("/api/v1/coupons", {
      code: "FESTIVE30",
      title: "Festive Flash Sale 30% Off",
      discountType: "percentage",
      discountValue: 30,
      minOrderAmount: 80,
      validity: {
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    }, { token: client.adminToken });
    assertStatus(couponRes, 201);

    // Step 2: Register featured campaign promotional banner asset
    const assetRes = await client.post("/api/v1/site/assets", {
      title: "Festive Vintage Shoes Drop",
      subtitle: "30% off with code FESTIVE30",
      placement: "featured_banner",
      isActive: true,
      isFeatured: true,
    });
    assertStatus(assetRes, 201);

    // Step 3: Validate coupon availability for storefront checkout
    const valRes = await client.get("/api/v1/coupons/validate/FESTIVE30");
    assertStatus(valRes, 200);
    assertSuccess(valRes);

    // Step 4: Verify Overview Dashboard KPI reflect current platform state
    const kpiRes = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    assertStatus(kpiRes, 200);
    assertSuccess(kpiRes);
  });

  return tests;
}
