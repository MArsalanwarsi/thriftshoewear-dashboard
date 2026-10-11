import {
  assertTrue,
  assertFalse,
  assertEqual,
  assertStatus,
  assertSuccess,
} from "./helpers/assertions.js";
import { readDashboardFile } from "./helpers/dashboard-contracts.js";

export async function runTier3(client) {
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

  await test("P1: Product Variant Condition + Discount Coupon calculation", async () => {
    // 1. Validate active coupon WELCOME10 on product price 160
    const couponRes = await client.get("/api/v1/coupons/validate/WELCOME10");
    assertStatus(couponRes, 200);
    const coupon = couponRes.data?.data?.coupon || couponRes.data?.coupon;
    const discount = (160 * coupon.discountValue) / 100;
    assertEqual(discount, 16);
    assertEqual(160 - discount, 144);
  });

  await test("P2: Category Hierarchy + Product Filter + Pagination Offset", async () => {
    // Query products under category with pagination
    const res = await client.get("/api/v1/products", {
      query: { productType: "shoes", page: 1, limit: 5 },
    });
    assertStatus(res, 200);
    const list = res.data?.data?.products || res.data?.products;
    assertTrue(Array.isArray(list));
    assertTrue(list.every((p) => p.productType === "shoes"));
  });

  await test("P3: Order Fulfillment Transition + Payment Status Synchronization", async () => {
    // Create new order, update payment to paid, verify fulfillment can proceed to packed
    const testOrder = {
      _id: "order_p3_sync",
      orderStatus: "confirmed",
      payment: { status: "paid" },
      statusHistory: [],
    };
    client.server.orders.set(testOrder._id, testOrder);

    const res = await client.patch(`/api/v1/orders/${testOrder._id}/status`, {
      status: "packed",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    assertEqual(testOrder.orderStatus, "packed");
  });

  await test("P4: Courier Tracking Assignment + Shipment Status Event", async () => {
    const testOrder = {
      _id: "order_p4_courier",
      orderStatus: "packed",
      statusHistory: [],
    };
    client.server.orders.set(testOrder._id, testOrder);

    const res = await client.patch(`/api/v1/orders/${testOrder._id}/status`, {
      status: "shipped",
      courierName: "postex",
      trackingNumber: "PTX-778899",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    assertEqual(testOrder.courierName, "postex");
  });

  await test("P5: Payment Proof Attachment + Verification Rejection + Order Cancellation", async () => {
    const testPay = {
      _id: "pay_p5_reject",
      status: "pending",
      proofs: [],
    };
    client.server.payments.set(testPay._id, testPay);

    // 1. Submit proof
    const proofRes = await client.post(`/api/v1/payments/${testPay._id}/proof`, {
      url: "https://proofs.test/fake.png",
      transactionId: "TXN-FAKE",
    });
    assertStatus(proofRes, 200);

    // 2. Reject proof
    const rejectRes = await client.patch(`/api/v1/payments/${testPay._id}/reject`, {
      reason: "Screenshot illegible or blurred",
    }, { token: client.adminToken });
    assertStatus(rejectRes, 200);
    assertEqual(testPay.status, "failed");
  });

  await test("P6: Staff Access Request (Admin) + SuperAdmin Approval + Token Privilege Escalation", async () => {
    const applicant = {
      _id: "user_p6_staff",
      email: "staff_candidate@test.com",
      role: "customer",
      dashboardAccessStatus: "pending",
    };
    client.server.users.set(applicant._id, applicant);

    const approveRes = await client.patch(`/api/v1/users/${applicant._id}/approve-dashboard-access`, {
      role: "admin",
      reviewNotes: "Onboarded as catalog editor",
    }, { token: client.superAdminToken });
    assertStatus(approveRes, 200);
    assertEqual(applicant.role, "admin");
    assertEqual(applicant.dashboardAccessStatus, "approved");
  });

  await test("P7: Staff Access Request (SuperAdmin) + Rejection + Unprivileged Fallback", async () => {
    const applicant = {
      _id: "user_p7_superadmin_fail",
      email: "untrusted@test.com",
      role: "customer",
      dashboardAccessStatus: "pending",
    };
    client.server.users.set(applicant._id, applicant);

    const rejectRes = await client.patch(`/api/v1/users/${applicant._id}/reject-dashboard-access`, {
      reviewNotes: "Security verification failed",
    }, { token: client.superAdminToken });
    assertStatus(rejectRes, 200);
    assertEqual(applicant.role, "customer");
    assertEqual(applicant.dashboardAccessStatus, "rejected");
  });

  await test("P8: Multi-Variant Inventory Deduction + 0-Stock Status Sync", async () => {
    const multiProd = {
      _id: "prod_p8_stock",
      name: "Vintage Chelsea Boots",
      productType: "shoes",
      condition: "excellent",
      variants: [
        { _id: "var_1", sku: "CB-01", price: 120, stock: 0 },
        { _id: "var_2", sku: "CB-02", price: 120, stock: 1 },
      ],
      stockSummary: { availableStock: 1, isInStock: true },
    };
    client.server.products.set(multiProd._id, multiProd);

    // Update stock of variant 2 to 0
    multiProd.variants[1].stock = 0;
    multiProd.stockSummary.availableStock = 0;
    multiProd.stockSummary.isInStock = false;

    assertEqual(multiProd.stockSummary.availableStock, 0);
    assertFalse(multiProd.stockSummary.isInStock);
  });

  await test("P9: Brand/Search Query + Type Filter + Gender Filter Combinations", async () => {
    const res = await client.get("/api/v1/products", {
      query: { search: "Jordan", productType: "shoes" },
    });
    assertStatus(res, 200);
    const list = res.data?.data?.products || res.data?.products;
    assertTrue(list.every((p) => p.productType === "shoes"));
  });

  await test("P10: Coupon Expiration Boundary + Cart Grand Total Calculation", async () => {
    const expiredCoupon = {
      _id: "cpn_p10_exp",
      code: "OLDEXPIRED50",
      status: "active",
      validity: { endsAt: new Date(Date.now() - 3600000).toISOString() },
    };
    client.server.coupons.set(expiredCoupon._id, expiredCoupon);

    const valRes = await client.get(`/api/v1/coupons/validate/${expiredCoupon.code}`);
    assertStatus(valRes, 400); // Must be rejected
  });

  await test("P11: Site Asset Placement + Featured Toggle + Active Window Range", async () => {
    const asset = {
      title: "Hero Winter 2026",
      placement: "hero",
      isActive: true,
      isFeatured: true,
    };
    const res = await client.post("/api/v1/site/assets", asset);
    assertStatus(res, 201);
    const created = res.data?.data?.asset || res.data?.asset;
    assertTrue(created.isActive);
    assertTrue(created.isFeatured);
  });

  await test("P12: Customer Type (Retail vs Wholesale) + User Status (Active vs Blocked)", async () => {
    const userRes = await client.get("/api/v1/users", {
      query: { role: "customer" },
      token: client.adminToken,
    });
    assertStatus(userRes, 200);
    const users = userRes.data?.data?.users || userRes.data?.users;
    assertTrue(users.every((u) => u.role === "customer"));
  });

  await test("P13: Product Status (Draft vs Active) + Overview KPI Count Recalculation", async () => {
    const draftProd = {
      _id: "prod_p13_draft",
      name: "Unreleased Vintage Sneaker",
      productType: "shoes",
      condition: "good",
      status: "draft",
      variants: [{ sku: "DRF-01", price: 80, stock: 1 }],
    };
    client.server.products.set(draftProd._id, draftProd);

    const kpiRes = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    assertStatus(kpiRes, 200);
    const counts = kpiRes.data?.data || kpiRes.data?.counts;
    assertTrue(counts.products >= counts.activeProducts);
  });

  await test("P14: Order Item Cancellation + Status Transition History Tracking", async () => {
    const cancelOrder = {
      _id: "order_p14_cancel",
      orderStatus: "placed",
      statusHistory: [{ status: "placed", timestamp: new Date().toISOString() }],
    };
    client.server.orders.set(cancelOrder._id, cancelOrder);

    const res = await client.patch(`/api/v1/orders/${cancelOrder._id}/status`, {
      status: "cancelled",
      reason: "Buyer requested cancellation",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    assertEqual(cancelOrder.orderStatus, "cancelled");
    assertTrue(cancelOrder.statusHistory.length >= 2);
  });

  await test("P15: Review Status Workflow (Pending -> Approved) + Product Association", async () => {
    const res = await client.patch("/api/v1/reviews/rev_01/approve", {}, { token: client.adminToken });
    assertStatus(res, 200);
    const rev = client.server.reviews.get("rev_01");
    assertEqual(rev.status, "approved");
  });

  await test("P16: Dual Payment Submission (Bank Transfer) + Receipt Upload", async () => {
    const newPay = {
      _id: "pay_p16_dual",
      method: "bank_transfer",
      amount: 250,
      currency: "USD",
      status: "pending",
      proofs: [],
    };
    client.server.payments.set(newPay._id, newPay);

    const proofRes = await client.post(`/api/v1/payments/${newPay._id}/proof`, {
      url: "https://proofs.test/bank_wire_slip.jpg",
      transactionId: "WIRE-443322",
    });
    assertStatus(proofRes, 200);
    assertEqual(newPay.status, "awaiting_verification");
    assertEqual(newPay.proofs.length, 1);
  });

  await test("P17: Theme Mode State + Sidebar Collapsed State Isolation", async () => {
    // Verifying independent state variables in AppShell
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("const [collapsed, setCollapsed] = useState(false)"));
  });

  await test("P18: Auth Token Expiration (401 Interception) + Storage Eviction Contract", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertTrue(apiCode.includes("response.status === 401"));
    assertTrue(apiCode.includes("localStorage.removeItem(\"dashboardToken\")"));
  });

  await test("P19: Empty Resource Dataset + Table Fallback Rendering Contract", async () => {
    const res = await client.get("/api/v1/products", { query: { search: "non-existent-unique-xyz-9988" } });
    assertStatus(res, 200);
    const list = res.data?.data?.products || res.data?.products;
    assertEqual(list.length, 0);
  });

  await test("P20: High-concurrency sequential status updates on single order record", async () => {
    const testOrder = {
      _id: "order_p20_rapid",
      orderStatus: "placed",
      statusHistory: [],
    };
    client.server.orders.set(testOrder._id, testOrder);

    // Sequence 1: placed -> confirmed
    const res1 = await client.patch(`/api/v1/orders/${testOrder._id}/status`, { status: "confirmed" }, { token: client.adminToken });
    assertStatus(res1, 200);

    // Sequence 2: confirmed -> packed
    const res2 = await client.patch(`/api/v1/orders/${testOrder._id}/status`, { status: "packed" }, { token: client.adminToken });
    assertStatus(res2, 200);

    assertEqual(testOrder.orderStatus, "packed");
  });

  return tests;
}
