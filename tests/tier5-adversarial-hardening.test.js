/**
 * Tier 5: White-Box Adversarial Hardening Suite (25 Tests)
 * Exercises security boundary checks, self-approval prevention, last superAdmin protection,
 * negative settings validation, and session expiration race conditions.
 */
import {
  assertTrue,
  assertEqual,
  assertStatus,
} from "./helpers/assertions.js";

export async function runTier5(client) {
  const tests = [];

  const test = async (name, fn) => {
    const start = Date.now();
    try {
      await fn();
      tests.push({ name, status: "PASS", durationMs: Date.now() - start });
    } catch (err) {
      tests.push({
        name,
        status: "FAIL",
        durationMs: Date.now() - start,
        error: err.message,
      });
    }
  };

  // =========================================================================
  // SECTION 1: ACCESS CONTROL & STAFF SECURITY BOUNDARIES (10 Tests)
  // =========================================================================

  await test("ADV-AC1: SuperAdmin cannot self-approve their own access request", async () => {
    // Attempting to self-approve with own superAdmin token
    const res = await client.patch(
      "/api/v1/users/user_superadmin_01/approve-dashboard-access",
      { role: "superAdmin", reviewNotes: "Self-elevation attempt" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("Self-approval") || res.data.message.includes("prohibited"), "Self approval must be forbidden");
  });

  await test("ADV-AC2: Cannot revoke or demote the last remaining superAdmin", async () => {
    const res = await client.patch(
      "/api/v1/users/user_superadmin_01/reject-dashboard-access",
      { reason: "Malicious demotion attempt" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("last remaining superAdmin"), "Must protect last superAdmin");
  });

  await test("ADV-AC3: Approving access with invalid role string returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/users/user_pending_01/approve-dashboard-access",
      { role: "god_mode" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("Role must be admin or superAdmin"));
  });

  await test("ADV-AC4: Approving access with empty body defaults role to admin", async () => {
    const res = await client.patch(
      "/api/v1/users/user_pending_01/approve-dashboard-access",
      {},
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 200);
    assertEqual(res.data.success, true);
    assertEqual(res.data.data.user.role, "admin");
    assertEqual(res.data.data.user.dashboardAccessStatus, "approved");
  });

  await test("ADV-AC5: Approving non-existent user returns HTTP 404", async () => {
    const res = await client.patch(
      "/api/v1/users/user_ghost_9999/approve-dashboard-access",
      { role: "admin" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 404);
    assertEqual(res.data.success, false);
  });

  await test("ADV-AC6: Rejecting non-existent user returns HTTP 404", async () => {
    const res = await client.patch(
      "/api/v1/users/user_ghost_9999/reject-dashboard-access",
      { reason: "Non-existent user" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 404);
    assertEqual(res.data.success, false);
  });

  await test("ADV-AC7: Standard admin cannot approve dashboard access (HTTP 403)", async () => {
    const res = await client.patch(
      "/api/v1/users/user_pending_01/approve-dashboard-access",
      { role: "admin" },
      { token: client.server.adminToken }
    );
    assertStatus(res, 403);
    assertEqual(res.data.success, false);
  });

  await test("ADV-AC8: Standard admin cannot reject dashboard access (HTTP 403)", async () => {
    const res = await client.patch(
      "/api/v1/users/user_pending_01/reject-dashboard-access",
      { reason: "Admin rejection" },
      { token: client.server.adminToken }
    );
    assertStatus(res, 403);
    assertEqual(res.data.success, false);
  });

  await test("ADV-AC9: Idempotent re-approval preserves approved access state", async () => {
    const res = await client.patch(
      "/api/v1/users/user_admin_01/approve-dashboard-access",
      { role: "admin", reviewNotes: "Re-certified" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 200);
    assertEqual(res.data.data.user.dashboardAccessStatus, "approved");
  });

  await test("ADV-AC10: Rejection demotes approved user back to customer role", async () => {
    // First seed another superAdmin to allow safe demotion of user_admin_01
    const res = await client.patch(
      "/api/v1/users/user_admin_01/reject-dashboard-access",
      { reason: "Security violation" },
      { token: client.server.superAdminToken }
    );
    assertStatus(res, 200);
    assertEqual(res.data.data.user.role, "customer");
    assertEqual(res.data.data.user.dashboardAccessStatus, "rejected");

    // Restore user_admin_01 role for subsequent admin tests
    if (client.server) {
      const u = client.server.users.get("user_admin_01");
      if (u) {
        u.role = "admin";
        u.dashboardAccessStatus = "approved";
      }
    }
  });

  // =========================================================================
  // SECTION 2: STORE SETTINGS BOUNDARIES & VALIDATIONS (9 Tests)
  // =========================================================================

  await test("ADV-SET1: Negative default shipping fee returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { shipping: { defaultShippingFee: -50 } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("negative"));
  });

  await test("ADV-SET2: Negative free shipping threshold returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { shipping: { freeShippingThreshold: -100 } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("negative"));
  });

  await test("ADV-SET3: Negative low stock threshold returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { store: { lowStockThreshold: -3 } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("negative"));
  });

  await test("ADV-SET4: Malformed contact email format returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { contact: { email: "not_a_valid_email" } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("email"));
  });

  await test("ADV-SET5: Announcement message > 180 characters returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { announcement: { message: "A".repeat(185) } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("180"));
  });

  await test("ADV-SET6: SEO meta title > 70 characters returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { seo: { metaTitle: "T".repeat(75) } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("70"));
  });

  await test("ADV-SET7: SEO meta description > 160 characters returns HTTP 400", async () => {
    const res = await client.patch(
      "/api/v1/site/settings",
      { seo: { metaDescription: "D".repeat(165) } },
      { token: client.server.adminToken }
    );
    assertStatus(res, 400);
    assertEqual(res.data.success, false);
    assertTrue(res.data.message.includes("160"));
  });

  await test("ADV-SET8: GET /api/v1/site/settings returns default store configuration", async () => {
    const res = await client.get("/api/v1/site/settings");
    assertStatus(res, 200);
    const settings = res.data?.data?.settings || res.data?.settings;
    assertTrue(Boolean(settings), "Settings object must be returned");
    assertEqual(settings.store?.currency, "PKR");
    assertEqual(settings.store?.timezone, "Asia/Karachi");
  });

  await test("ADV-SET9: Unauthenticated request to PATCH /site/settings returns HTTP 403/401", async () => {
    const res = await client.patch("/api/v1/site/settings", { siteName: "Hacked" });
    assertTrue(res.status === 401 || res.status === 403, "Must require admin credentials");
  });

  // =========================================================================
  // SECTION 3: SESSION EXPIRATION & SECURITY BOUNDARY CHECKS (6 Tests)
  // =========================================================================

  await test("ADV-SEC1: Simultaneous concurrent expired requests safely return HTTP 401", async () => {
    const expiredToken = "token_expired_999";
    const promises = [
      client.get("/api/v1/site/dashboard", { token: expiredToken }),
      client.get("/api/v1/products", { token: expiredToken }),
      client.get("/api/v1/orders", { token: expiredToken }),
      client.get("/api/v1/users", { token: expiredToken }),
      client.get("/api/v1/site/settings", { token: expiredToken }),
    ];
    const results = await Promise.all(promises);
    for (const r of results) {
      assertStatus(r, 401);
      assertEqual(r.data.success, false);
    }
  });

  await test("ADV-SEC2: Malformed or tampered token returns HTTP 401 without 500 error", async () => {
    const res = await client.get("/api/v1/site/dashboard", {
      token: "malformed.bearer.token.with.tampered.signature",
    });
    assertStatus(res, 401);
    assertEqual(res.data.success, false);
  });

  await test("ADV-SEC3: Injection payload in search queries is treated as literal string", async () => {
    const res = await client.get('/api/v1/products?search={\"$gt\":\"\"}');
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products || [];
    assertTrue(Array.isArray(products), "Products must be returned as array without crash");
  });

  await test("ADV-SEC4: XSS payload in asset creation is stored as safe string", async () => {
    const res = await client.post(
      "/api/v1/site/assets",
      {
        title: '<script>alert("xss")</script>',
        placement: "featured_banner",
        sortOrder: 5,
      },
      { token: client.server.adminToken }
    );
    assertStatus(res, 201);
    const asset = res.data?.data?.asset || res.data?.asset;
    assertEqual(asset.title, '<script>alert("xss")</script>');
  });

  await test("ADV-SEC5: Missing Bearer prefix in Authorization header returns HTTP 401", async () => {
    const res = await client.get("/api/v1/site/dashboard", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    assertStatus(res, 401);
  });

  await test("ADV-SEC6: Customer role token cannot access admin routes", async () => {
    const res = await client.get("/api/v1/users", {
      token: client.server.customerToken,
    });
    assertStatus(res, 403);
    assertEqual(res.data.success, false);
  });

  return tests;
}
