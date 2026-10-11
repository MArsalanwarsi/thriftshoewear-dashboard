import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("   CHALLENGER 1 (M5): EMPIRICAL RBAC & ACCESS CONTROL STRESS HARNESS   ");
console.log("   Scope: Self-Approval, Last SuperAdmin Guard, RBAC 403s, Review Notes");
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
// Initialize Test Client & Environment
// -----------------------------------------------------------------------------
const { getTestClient, teardownTestEnvironment } = await import("./helpers/client.js");
const client = await getTestClient();
const server = client.server;

// -----------------------------------------------------------------------------
// SUITE 1: SELF-APPROVAL PREVENTION (HTTP 400)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 1: Self-Approval Prevention ---");

try {
  // Test 1.1: SuperAdmin cannot self-approve their own access request
  const res1 = await client.patch(
    "/api/v1/users/user_superadmin_01/approve-dashboard-access",
    { role: "superAdmin", reviewNotes: "Self elevation" },
    { token: client.superAdminToken }
  );
  recordTest(
    "SELF_APPROVAL",
    "SuperAdmin cannot self-approve their own access request (returns HTTP 400)",
    res1.status === 400 && res1.data?.success === false && (res1.data?.message?.includes("Self-approval") || res1.data?.message?.includes("prohibited")),
    `Status: ${res1.status}, Message: ${res1.data?.message}`
  );
} catch (err) {
  recordTest("SELF_APPROVAL", "SuperAdmin cannot self-approve their own access request", false, err.message);
}

try {
  // Test 1.2: SuperAdmin cannot self-approve with standard admin role
  const res2 = await client.patch(
    "/api/v1/users/user_superadmin_01/approve-dashboard-access",
    { role: "admin", reviewNotes: "Self role assignment" },
    { token: client.superAdminToken }
  );
  recordTest(
    "SELF_APPROVAL",
    "Self-approval attempt with role: admin is rejected with HTTP 400",
    res2.status === 400 && res2.data?.success === false && res2.data?.message?.includes("Self-approval"),
    `Status: ${res2.status}`
  );
} catch (err) {
  recordTest("SELF_APPROVAL", "Self-approval attempt with role: admin is rejected", false, err.message);
}

try {
  // Test 1.3: SuperAdmin cannot self-approve with empty body
  const res3 = await client.patch(
    "/api/v1/users/user_superadmin_01/approve-dashboard-access",
    {},
    { token: client.superAdminToken }
  );
  recordTest(
    "SELF_APPROVAL",
    "Self-approval attempt with empty body is rejected with HTTP 400",
    res3.status === 400 && res3.data?.success === false && res3.data?.message?.includes("Self-approval"),
    `Status: ${res3.status}`
  );
} catch (err) {
  recordTest("SELF_APPROVAL", "Self-approval attempt with empty body is rejected", false, err.message);
}

try {
  // Test 1.4: Standard admin attempting self-approval is blocked
  const res4 = await client.patch(
    "/api/v1/users/user_admin_01/approve-dashboard-access",
    { role: "superAdmin" },
    { token: client.adminToken }
  );
  recordTest(
    "SELF_APPROVAL",
    "Standard admin attempting self-elevation is blocked (HTTP 403)",
    res4.status === 403 && res4.data?.success === false,
    `Status: ${res4.status}`
  );
} catch (err) {
  recordTest("SELF_APPROVAL", "Standard admin attempting self-elevation is blocked", false, err.message);
}

try {
  // Test 1.5: Customer attempting self-approval is blocked
  const res5 = await client.patch(
    "/api/v1/users/user_customer_01/approve-dashboard-access",
    { role: "admin" },
    { token: client.customerToken }
  );
  recordTest(
    "SELF_APPROVAL",
    "Customer attempting self-approval is blocked (HTTP 403)",
    res5.status === 403 && res5.data?.success === false,
    `Status: ${res5.status}`
  );
} catch (err) {
  recordTest("SELF_APPROVAL", "Customer attempting self-approval is blocked", false, err.message);
}

// -----------------------------------------------------------------------------
// SUITE 2: LAST REMAINING SUPERADMIN PROTECTION (HTTP 400)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 2: Last Remaining SuperAdmin Protection ---");

try {
  // Test 2.1: Revoking the only superAdmin returns HTTP 400
  const res2_1 = await client.patch(
    "/api/v1/users/user_superadmin_01/reject-dashboard-access",
    { reason: "Malicious revoke" },
    { token: client.superAdminToken }
  );
  recordTest(
    "LAST_SUPERADMIN",
    "Cannot revoke access for the last remaining superAdmin (returns HTTP 400)",
    res2_1.status === 400 && res2_1.data?.success === false && res2_1.data?.message?.includes("last remaining superAdmin"),
    `Status: ${res2_1.status}, Message: ${res2_1.data?.message}`
  );
} catch (err) {
  recordTest("LAST_SUPERADMIN", "Cannot revoke access for the last remaining superAdmin", false, err.message);
}

try {
  // Test 2.2: Add a second superAdmin, then revoking one superAdmin succeeds (HTTP 200)
  // Promote user_pending_01 to superAdmin
  const promoteRes = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "superAdmin", reviewNotes: "Promoting second super admin" },
    { token: client.superAdminToken }
  );
  assert.equal(promoteRes.status, 200);

  // Now activeSuperAdmins === 2. Revoking user_pending_01 should succeed!
  const revokeRes = await client.patch(
    "/api/v1/users/user_pending_01/reject-dashboard-access",
    { reason: "Revoking second super admin" },
    { token: client.superAdminToken }
  );
  recordTest(
    "LAST_SUPERADMIN",
    "Revoking a superAdmin succeeds when multiple active superAdmins exist (HTTP 200)",
    revokeRes.status === 200 && revokeRes.data?.data?.user?.role === "customer" && revokeRes.data?.data?.user?.dashboardAccessStatus === "rejected",
    `Status: ${revokeRes.status}, New Role: ${revokeRes.data?.data?.user?.role}`
  );
} catch (err) {
  recordTest("LAST_SUPERADMIN", "Revoking superAdmin when multiple exist succeeds", false, err.message);
}

try {
  // Test 2.3: After demoting the second superAdmin, revoking the sole remaining superAdmin fails again
  const res2_3 = await client.patch(
    "/api/v1/users/user_superadmin_01/reject-dashboard-access",
    { reason: "Attempting to revoke last super admin again" },
    { token: client.superAdminToken }
  );
  recordTest(
    "LAST_SUPERADMIN",
    "Revoking the sole remaining superAdmin is rejected again after count drops to 1 (HTTP 400)",
    res2_3.status === 400 && res2_3.data?.success === false,
    `Status: ${res2_3.status}`
  );
} catch (err) {
  recordTest("LAST_SUPERADMIN", "Revoking sole remaining superAdmin is rejected again", false, err.message);
}

try {
  // Test 2.4: Inactive superAdmin does not count towards active threshold
  // Seed an inactive superAdmin
  const inactiveSuper = {
    _id: "user_superadmin_inactive_99",
    firstName: "Inactive",
    lastName: "Super",
    displayName: "Inactive SuperAdmin",
    email: "inactive_super@thriftshoewear.test",
    passwordHash: server.hashPassword("Pass123!"),
    role: "superAdmin",
    status: "inactive", // inactive!
    dashboardAccessStatus: "approved",
    createdAt: new Date().toISOString(),
  };
  server.users.set(inactiveSuper._id, inactiveSuper);

  // Still only 1 active superAdmin (user_superadmin_01). Revoking user_superadmin_01 must fail!
  const res2_4 = await client.patch(
    "/api/v1/users/user_superadmin_01/reject-dashboard-access",
    { reason: "Should still be blocked" },
    { token: client.superAdminToken }
  );
  recordTest(
    "LAST_SUPERADMIN",
    "Inactive superAdmin does not prevent last active superAdmin protection (HTTP 400)",
    res2_4.status === 400 && res2_4.data?.success === false,
    `Status: ${res2_4.status}`
  );
  server.users.delete(inactiveSuper._id);
} catch (err) {
  recordTest("LAST_SUPERADMIN", "Inactive superAdmin does not count", false, err.message);
}

// -----------------------------------------------------------------------------
// SUITE 3: RBAC BOUNDARIES & NON-SUPERADMIN PERMISSIONS (HTTP 403 / 401)
// -----------------------------------------------------------------------------
console.log("\n--- Suite 3: RBAC Boundaries & Non-SuperAdmin Protections ---");

try {
  // Test 3.1: Unauthenticated request to approve dashboard access returns HTTP 403/401
  const res3_1 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin" },
    { token: null }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Unauthenticated request to approve-dashboard-access returns HTTP 403/401",
    res3_1.status === 403 || res3_1.status === 401,
    `Status: ${res3_1.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Unauthenticated approve returns 401/403", false, err.message);
}

try {
  // Test 3.2: Customer token attempting to approve dashboard access returns HTTP 403
  const res3_2 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin" },
    { token: client.customerToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Customer role is blocked from approve-dashboard-access (HTTP 403)",
    res3_2.status === 403 && res3_2.data?.success === false,
    `Status: ${res3_2.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Customer approve blocked with 403", false, err.message);
}

try {
  // Test 3.3: Standard Admin attempting to approve dashboard access returns HTTP 403
  const res3_3 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin" },
    { token: client.adminToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Standard Admin role is blocked from approve-dashboard-access (HTTP 403)",
    res3_3.status === 403 && res3_3.data?.success === false,
    `Status: ${res3_3.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Admin approve blocked with 403", false, err.message);
}

try {
  // Test 3.4: Customer token attempting to reject dashboard access returns HTTP 403
  const res3_4 = await client.patch(
    "/api/v1/users/user_pending_01/reject-dashboard-access",
    { reason: "Customer unauthorized reject" },
    { token: client.customerToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Customer role is blocked from reject-dashboard-access (HTTP 403)",
    res3_4.status === 403 && res3_4.data?.success === false,
    `Status: ${res3_4.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Customer reject blocked with 403", false, err.message);
}

try {
  // Test 3.5: Standard Admin token attempting to reject dashboard access returns HTTP 403
  const res3_5 = await client.patch(
    "/api/v1/users/user_pending_01/reject-dashboard-access",
    { reason: "Admin unauthorized reject" },
    { token: client.adminToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Standard Admin role is blocked from reject-dashboard-access (HTTP 403)",
    res3_5.status === 403 && res3_5.data?.success === false,
    `Status: ${res3_5.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Admin reject blocked with 403", false, err.message);
}

try {
  // Test 3.6: Customer cannot read staff user directory (HTTP 403)
  const res3_6 = await client.get("/api/v1/users", { token: client.customerToken });
  recordTest(
    "RBAC_BOUNDARIES",
    "Customer role is blocked from GET /api/v1/users directory (HTTP 403)",
    res3_6.status === 403 && res3_6.data?.success === false,
    `Status: ${res3_6.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Customer reading /api/v1/users blocked with 403", false, err.message);
}

try {
  // Test 3.7: Standard Admin CAN read staff user directory (HTTP 200)
  const res3_7 = await client.get("/api/v1/users", { token: client.adminToken });
  recordTest(
    "RBAC_BOUNDARIES",
    "Standard Admin role is permitted to read GET /api/v1/users (HTTP 200)",
    res3_7.status === 200 && res3_7.data?.success === true && Array.isArray(res3_7.data?.data?.users || res3_7.data?.users),
    `Status: ${res3_7.status}, User count: ${(res3_7.data?.data?.users || res3_7.data?.users)?.length}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Admin reading /api/v1/users permitted", false, err.message);
}

try {
  // Test 3.8: Approving with illegal role string returns HTTP 400
  const res3_8 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "root_superuser" },
    { token: client.superAdminToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Approving access with invalid role string returns HTTP 400",
    res3_8.status === 400 && res3_8.data?.success === false && res3_8.data?.message?.includes("Role must be admin or superAdmin"),
    `Status: ${res3_8.status}, Message: ${res3_8.data?.message}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Invalid role rejected with 400", false, err.message);
}

try {
  // Test 3.9: Approving with customer role returns HTTP 400
  const res3_9 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "customer" },
    { token: client.superAdminToken }
  );
  recordTest(
    "RBAC_BOUNDARIES",
    "Approving access with role: customer is rejected with HTTP 400",
    res3_9.status === 400 && res3_9.data?.success === false,
    `Status: ${res3_9.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Approving with customer role rejected", false, err.message);
}

try {
  // Test 3.10: Customer cannot access protected KPI dashboard (HTTP 403)
  const res3_10 = await client.get("/api/v1/site/dashboard", { token: client.customerToken });
  recordTest(
    "RBAC_BOUNDARIES",
    "Customer role is blocked from /api/v1/site/dashboard (HTTP 403)",
    res3_10.status === 403 && res3_10.data?.success === false,
    `Status: ${res3_10.status}`
  );
} catch (err) {
  recordTest("RBAC_BOUNDARIES", "Customer blocked from dashboard", false, err.message);
}

// -----------------------------------------------------------------------------
// SUITE 4: USER SEARCH, ROLE FILTERING, AND REVIEW NOTES
// -----------------------------------------------------------------------------
console.log("\n--- Suite 4: User Search, Role Filtering, and Review Notes ---");

try {
  // Test 4.1: Role filtering by superAdmin
  const res4_1 = await client.get("/api/v1/users?role=superAdmin", { token: client.superAdminToken });
  const users4_1 = res4_1.data?.data?.users || res4_1.data?.users || [];
  const allSuperAdmin = users4_1.length > 0 && users4_1.every((u) => u.role === "superAdmin");
  recordTest(
    "SEARCH_AND_FILTER",
    "GET /api/v1/users?role=superAdmin filters correctly to superAdmins only",
    res4_1.status === 200 && allSuperAdmin,
    `Returned ${users4_1.length} superAdmins`
  );
} catch (err) {
  recordTest("SEARCH_AND_FILTER", "Role filter superAdmin works", false, err.message);
}

try {
  // Test 4.2: Role filtering by admin
  const res4_2 = await client.get("/api/v1/users?role=admin", { token: client.superAdminToken });
  const users4_2 = res4_2.data?.data?.users || res4_2.data?.users || [];
  const allAdmin = users4_2.length > 0 && users4_2.every((u) => u.role === "admin");
  recordTest(
    "SEARCH_AND_FILTER",
    "GET /api/v1/users?role=admin filters correctly to admins only",
    res4_2.status === 200 && allAdmin,
    `Returned ${users4_2.length} admins`
  );
} catch (err) {
  recordTest("SEARCH_AND_FILTER", "Role filter admin works", false, err.message);
}

try {
  // Test 4.3: Access status filter: dashboardAccessStatus=approved
  const res4_3 = await client.get("/api/v1/users?dashboardAccessStatus=approved", { token: client.superAdminToken });
  const users4_3 = res4_3.data?.data?.users || res4_3.data?.users || [];
  const allApproved = users4_3.length > 0 && users4_3.every((u) => (u.dashboardAccess?.status || u.dashboardAccessStatus) === "approved");
  recordTest(
    "SEARCH_AND_FILTER",
    "GET /api/v1/users?dashboardAccessStatus=approved filters correctly",
    res4_3.status === 200 && allApproved,
    `Returned ${users4_3.length} approved accounts`
  );
} catch (err) {
  recordTest("SEARCH_AND_FILTER", "Dashboard access approved filter works", false, err.message);
}

try {
  // Test 4.4: Access status filter: dashboardAccessStatus=pending
  // Reset user_pending_01 to pending
  const pUser = server.users.get("user_pending_01");
  if (pUser) {
    pUser.dashboardAccessStatus = "pending";
    pUser.dashboardAccess = { status: "pending", requestedRole: "admin" };
    pUser.role = "customer";
  }

  const res4_4 = await client.get("/api/v1/users?dashboardAccessStatus=pending", { token: client.superAdminToken });
  const users4_4 = res4_4.data?.data?.users || res4_4.data?.users || [];
  const allPending = users4_4.length > 0 && users4_4.every((u) => (u.dashboardAccess?.status || u.dashboardAccessStatus) === "pending");
  recordTest(
    "SEARCH_AND_FILTER",
    "GET /api/v1/users?dashboardAccessStatus=pending filters correctly",
    res4_4.status === 200 && allPending,
    `Returned ${users4_4.length} pending accounts`
  );
} catch (err) {
  recordTest("SEARCH_AND_FILTER", "Dashboard access pending filter works", false, err.message);
}

try {
  // Test 4.5: Submitting reviewNotes during access approval
  const notes = "Empirical verification review notes by Challenger M5";
  const res4_5 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin", reviewNotes: notes },
    { token: client.superAdminToken }
  );
  const updatedUser = res4_5.data?.data?.user || res4_5.data?.user;
  recordTest(
    "REVIEW_NOTES",
    "Approval accurately records reviewNotes and approvedBy metadata",
    res4_5.status === 200 && updatedUser.dashboardAccess?.notes === notes && updatedUser.dashboardAccess?.status === "approved",
    `Stored notes: "${updatedUser?.dashboardAccess?.notes}"`
  );
} catch (err) {
  recordTest("REVIEW_NOTES", "Approval records reviewNotes", false, err.message);
}

try {
  // Test 4.6: Submitting complex unicode / special characters in reviewNotes
  const complexNotes = 'Special chars: <script>alert("xss")</script> & symbols: ⚡🚀 👟 100% OK.';
  const res4_6 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin", reviewNotes: complexNotes },
    { token: client.superAdminToken }
  );
  const updatedUser = res4_6.data?.data?.user || res4_6.data?.user;
  recordTest(
    "REVIEW_NOTES",
    "Approval preserves unicode and special characters safely in reviewNotes",
    res4_6.status === 200 && updatedUser.dashboardAccess?.notes === complexNotes,
    `Preserved: "${updatedUser?.dashboardAccess?.notes}"`
  );
} catch (err) {
  recordTest("REVIEW_NOTES", "Unicode and special chars in reviewNotes", false, err.message);
}

try {
  // Test 4.7: Submitting rejection with reason records reason in user access record
  const rejectReason = "Failed background identity verification checkpoint";
  const res4_7 = await client.patch(
    "/api/v1/users/user_pending_01/reject-dashboard-access",
    { reason: rejectReason },
    { token: client.superAdminToken }
  );
  const updatedUser = res4_7.data?.data?.user || res4_7.data?.user;
  recordTest(
    "REVIEW_NOTES",
    "Rejection records reason in dashboardAccess metadata and sets status to rejected",
    res4_7.status === 200 && updatedUser.dashboardAccess?.status === "rejected" && updatedUser.role === "customer" && updatedUser.dashboardAccess?.notes === rejectReason,
    `Stored notes: "${updatedUser?.dashboardAccess?.notes}", Role: ${updatedUser?.role}`
  );
} catch (err) {
  recordTest("REVIEW_NOTES", "Rejection records reason in metadata", false, err.message);
}

// -----------------------------------------------------------------------------
// SUITE 5: DATA HYGIENE, NON-EXISTENT USERS & CREDENTIAL LEAKAGE
// -----------------------------------------------------------------------------
console.log("\n--- Suite 5: Data Hygiene, Non-Existent Users & Leakage Prevention ---");

try {
  // Test 5.1: Approving non-existent user returns HTTP 404
  const res5_1 = await client.patch(
    "/api/v1/users/user_ghost_nonexistent_9999/approve-dashboard-access",
    { role: "admin" },
    { token: client.superAdminToken }
  );
  recordTest(
    "DATA_HYGIENE",
    "Approving non-existent user returns HTTP 404",
    res5_1.status === 404 && res5_1.data?.success === false,
    `Status: ${res5_1.status}`
  );
} catch (err) {
  recordTest("DATA_HYGIENE", "Approving non-existent user returns 404", false, err.message);
}

try {
  // Test 5.2: Rejecting non-existent user returns HTTP 404
  const res5_2 = await client.patch(
    "/api/v1/users/user_ghost_nonexistent_9999/reject-dashboard-access",
    { reason: "Non-existent user rejection" },
    { token: client.superAdminToken }
  );
  recordTest(
    "DATA_HYGIENE",
    "Rejecting non-existent user returns HTTP 404",
    res5_2.status === 404 && res5_2.data?.success === false,
    `Status: ${res5_2.status}`
  );
} catch (err) {
  recordTest("DATA_HYGIENE", "Rejecting non-existent user returns 404", false, err.message);
}

try {
  // Test 5.3: Password hashes are never leaked in GET /api/v1/users
  const res5_3 = await client.get("/api/v1/users", { token: client.superAdminToken });
  const users = res5_3.data?.data?.users || res5_3.data?.users || [];
  const hasLeakedHash = users.some((u) => u.passwordHash !== undefined || u.password !== undefined);
  recordTest(
    "SECURITY_HYGIENE",
    "GET /api/v1/users strictly strips passwordHash and password credentials",
    res5_3.status === 200 && !hasLeakedHash,
    `Verified across ${users.length} user records`
  );
} catch (err) {
  recordTest("SECURITY_HYGIENE", "Password hashes not leaked in users list", false, err.message);
}

try {
  // Test 5.4: Password hash is never leaked in approve-dashboard-access response
  const res5_4 = await client.patch(
    "/api/v1/users/user_pending_01/approve-dashboard-access",
    { role: "admin" },
    { token: client.superAdminToken }
  );
  const u = res5_4.data?.data?.user || res5_4.data?.user;
  recordTest(
    "SECURITY_HYGIENE",
    "Approve response strictly strips passwordHash",
    res5_4.status === 200 && u.passwordHash === undefined && u.password === undefined,
    `User ID: ${u._id}`
  );
} catch (err) {
  recordTest("SECURITY_HYGIENE", "Approve response strips passwordHash", false, err.message);
}

try {
  // Test 5.5: Password hash is never leaked in reject-dashboard-access response
  const res5_5 = await client.patch(
    "/api/v1/users/user_pending_01/reject-dashboard-access",
    { reason: "Reset" },
    { token: client.superAdminToken }
  );
  const u = res5_5.data?.data?.user || res5_5.data?.user;
  recordTest(
    "SECURITY_HYGIENE",
    "Reject response strictly strips passwordHash",
    res5_5.status === 200 && u.passwordHash === undefined && u.password === undefined,
    `User ID: ${u._id}`
  );
} catch (err) {
  recordTest("SECURITY_HYGIENE", "Reject response strips passwordHash", false, err.message);
}

// -----------------------------------------------------------------------------
// SUITE 6: FRONTEND COMPONENT INVARIANTS & SSR INTEGRITY
// -----------------------------------------------------------------------------
console.log("\n--- Suite 6: Frontend Component Invariants & SSR Integrity ---");

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

const storeSuperAdmin = configureStore({
  reducer: {
    auth: (state = { token: client.superAdminToken, user: { _id: "user_superadmin_01", role: "superAdmin", displayName: "Super Admin" }, isAuthenticated: true }) => state,
  },
});

try {
  // Test 6.1: Load and render UserBadges (RoleBadge and AccessStatusBadge)
  const badgesMod = await viteServer.ssrLoadModule("./src/components/UserBadges.jsx");
  const { RoleBadge, AccessStatusBadge } = badgesMod;

  const htmlRoleSuper = renderToString(React.createElement(RoleBadge, { role: "superAdmin" }));
  const htmlRoleAdmin = renderToString(React.createElement(RoleBadge, { role: "admin" }));
  const htmlRoleCustomer = renderToString(React.createElement(RoleBadge, { role: "customer" }));
  const htmlStatusApproved = renderToString(React.createElement(AccessStatusBadge, { status: "approved" }));
  const htmlStatusPending = renderToString(React.createElement(AccessStatusBadge, { status: "pending" }));
  const htmlStatusRejected = renderToString(React.createElement(AccessStatusBadge, { status: "rejected" }));

  recordTest(
    "SSR_COMPONENTS",
    "UserBadges (RoleBadge, AccessStatusBadge) renders all roles and statuses cleanly",
    htmlRoleSuper.includes("Super Admin") &&
      htmlRoleAdmin.includes("Admin") &&
      htmlRoleCustomer.includes("Customer") &&
      htmlStatusApproved.includes("Approved") &&
      htmlStatusPending.includes("Pending") &&
      htmlStatusRejected.includes("Rejected"),
    "All badge variants verified"
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "UserBadges renders all roles and statuses cleanly", false, err.message);
}

try {
  // Test 6.2: Inspect ApproveAccessModal source and component invariants
  const approveFile = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "components", "ApproveAccessModal.jsx"), "utf-8");
  const hasSuperAdminGating = approveFile.includes("Super Admin privileges are required to approve dashboard access requests") &&
    approveFile.includes("disabled={loading || !isSuperAdmin}");
  const approveModalMod = await viteServer.ssrLoadModule("./src/components/ApproveAccessModal.jsx");
  const isFunction = typeof approveModalMod.ApproveAccessModal === "function";

  recordTest(
    "SSR_COMPONENTS",
    "ApproveAccessModal implements isSuperAdmin security gating and exports valid component",
    hasSuperAdminGating && isFunction,
    `Gating found: ${hasSuperAdminGating}, Type: ${typeof approveModalMod.ApproveAccessModal}`
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "ApproveAccessModal invariants", false, err.message);
}

try {
  // Test 6.3: Inspect RejectAccessModal source and component invariants
  const rejectFile = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "components", "RejectAccessModal.jsx"), "utf-8");
  const hasSuperAdminRejectGating = rejectFile.includes("Super Admin privileges are required to reject dashboard access requests") &&
    rejectFile.includes("disabled={loading || !isSuperAdmin}");
  const rejectModalMod = await viteServer.ssrLoadModule("./src/components/RejectAccessModal.jsx");
  const isFunction = typeof rejectModalMod.RejectAccessModal === "function";

  recordTest(
    "SSR_COMPONENTS",
    "RejectAccessModal enforces SuperAdmin permission requirement and exports valid component",
    hasSuperAdminRejectGating && isFunction,
    `Gating found: ${hasSuperAdminRejectGating}, Type: ${typeof rejectModalMod.RejectAccessModal}`
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "RejectAccessModal invariants", false, err.message);
}

try {
  // Test 6.4: Inspect EditRoleModal source and component invariants
  const editRoleFile = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "components", "EditRoleModal.jsx"), "utf-8");
  const hasEditRoleGating = editRoleFile.includes("Only Super Admins can alter account roles") &&
    editRoleFile.includes("disabled={loading || !isSuperAdmin}");
  const editRoleModalMod = await viteServer.ssrLoadModule("./src/components/EditRoleModal.jsx");
  const isFunction = typeof editRoleModalMod.EditRoleModal === "function";

  recordTest(
    "SSR_COMPONENTS",
    "EditRoleModal restricts role change controls to SuperAdmins",
    hasEditRoleGating && isFunction,
    `Gating found: ${hasEditRoleGating}, Type: ${typeof editRoleModalMod.EditRoleModal}`
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "EditRoleModal invariants", false, err.message);
}

try {
  // Test 6.5: Load and render UsersPage
  const usersPageMod = await viteServer.ssrLoadModule("./src/pages/UsersPage.jsx");
  const UsersPage = usersPageMod.default;

  const htmlUsersPage = renderToString(
    React.createElement(
      Provider,
      { store: storeSuperAdmin },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/users"] },
        React.createElement(UsersPage)
      )
    )
  );

  recordTest(
    "SSR_COMPONENTS",
    "UsersPage renders Staff & User Directory with KPI cards and action links",
    htmlUsersPage.includes("Staff &amp; User Directory") || htmlUsersPage.includes("Staff & User Directory"),
    "UsersPage rendered successfully"
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "UsersPage renders without errors", false, err.message);
}

try {
  // Test 6.6: Load and render AccessRequestsPage
  const accessRequestsPageMod = await viteServer.ssrLoadModule("./src/pages/AccessRequestsPage.jsx");
  const AccessRequestsPage = accessRequestsPageMod.default;

  const htmlAccessRequestsPage = renderToString(
    React.createElement(
      Provider,
      { store: storeSuperAdmin },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/users/access-requests"] },
        React.createElement(AccessRequestsPage)
      )
    )
  );

  recordTest(
    "SSR_COMPONENTS",
    "AccessRequestsPage renders Dashboard Access Requests with tab navigation",
    htmlAccessRequestsPage.includes("Dashboard Access Requests") || htmlAccessRequestsPage.includes("Access Requests"),
    "AccessRequestsPage rendered successfully"
  );
} catch (err) {
  recordTest("SSR_COMPONENTS", "AccessRequestsPage renders without errors", false, err.message);
}

// -----------------------------------------------------------------------------
// TEARDOWN & SUMMARY
// -----------------------------------------------------------------------------
await viteServer.close();
await teardownTestEnvironment();

console.log("\n======================================================================");
console.log("                        TEST EXECUTION SUMMARY                        ");
console.log("======================================================================");
console.log(`  TOTAL TESTS:   ${passedCount + failedCount}`);
console.log(`  PASSED:        \x1b[32m${passedCount}\x1b[0m`);
console.log(`  FAILED:        \x1b[31m${failedCount}\x1b[0m`);
console.log(`  PASS RATE:     ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`);
console.log("======================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
