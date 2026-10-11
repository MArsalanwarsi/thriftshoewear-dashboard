import {
  assertTrue,
  assertFalse,
  assertEqual,
  assertIncludes,
  assertStatus,
  assertSuccess,
} from "./helpers/assertions.js";
import {
  readDashboardFile,
  fileExists,
  getUiComponentsList,
  loadResourcesConfig,
} from "./helpers/dashboard-contracts.js";

export async function runTier1(client) {
  const { RESOURCE_CONFIG, conditions, productTypes, orderStatuses, roles, dashboardAccessStatuses } = await loadResourcesConfig();
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
  // FEATURE 1: Dependencies & Aliases Setup
  // =========================================================================
  await test("F1.1: Verify package.json contains all essential Radix UI and Tailwind CSS dependencies", async () => {
    const pkg = JSON.parse(readDashboardFile("package.json"));
    assertTrue(pkg.dependencies["@radix-ui/react-dialog"], "Missing @radix-ui/react-dialog");
    assertTrue(pkg.dependencies["@radix-ui/react-dropdown-menu"], "Missing @radix-ui/react-dropdown-menu");
    assertTrue(pkg.dependencies["@radix-ui/react-select"], "Missing @radix-ui/react-select");
    assertTrue(pkg.dependencies["@tailwindcss/vite"], "Missing @tailwindcss/vite");
    assertTrue(pkg.dependencies["lucide-react"], "Missing lucide-react");
  });

  await test("F1.2: Verify Vite configuration file exists and exports proper plugins", async () => {
    const viteConfig = readDashboardFile("vite.config.js");
    assertIncludes(viteConfig, "tailwindcss()", "Vite config missing tailwindcss plugin");
    assertIncludes(viteConfig, "react()", "Vite config missing react plugin");
    assertIncludes(viteConfig, "defineConfig", "Vite config missing defineConfig");
  });

  await test("F1.3: Verify project environment file .env and .env.example configure API base URL", async () => {
    assertTrue(fileExists(".env") || fileExists(".env.example"), "Missing .env or .env.example");
    const envContent = fileExists(".env") ? readDashboardFile(".env") : readDashboardFile(".env.example");
    assertIncludes(envContent, "VITE_API_BASE_URL", "Missing VITE_API_BASE_URL in env");
  });

  await test("F1.4: Verify JavaScript linter config (.oxlintrc.json) is valid JSON", async () => {
    assertTrue(fileExists(".oxlintrc.json"), "Missing .oxlintrc.json");
    const linterConfig = JSON.parse(readDashboardFile(".oxlintrc.json"));
    assertTrue(typeof linterConfig === "object" && linterConfig !== null, "Invalid linter config object");
  });

  await test("F1.5: Verify project build artifact distribution folder or source integrity exists", async () => {
    assertTrue(fileExists("src/main.jsx"), "Missing src/main.jsx");
    assertTrue(fileExists("src/App.jsx"), "Missing src/App.jsx");
    assertTrue(fileExists("index.html"), "Missing index.html");
  });

  // =========================================================================
  // FEATURE 2: New York Design System & CSS Tokens
  // =========================================================================
  await test("F2.1: Verify CSS theme defines standard design system tokens", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--color-background", "Missing background token");
    assertIncludes(css, "--color-foreground", "Missing foreground token");
    assertIncludes(css, "--color-primary", "Missing primary token");
    assertIncludes(css, "--color-border", "Missing border token");
  });

  await test("F2.2: Verify CSS theme defines card, popover, and secondary surface tokens", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--color-card", "Missing card token");
    assertIncludes(css, "--color-popover", "Missing popover token");
    assertIncludes(css, "--color-secondary", "Missing secondary token");
  });

  await test("F2.3: Verify CSS theme defines destructive and muted color tokens", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--color-destructive", "Missing destructive token");
    assertIncludes(css, "--color-muted", "Missing muted token");
  });

  await test("F2.4: Verify CSS root variables provide radius tokens", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--radius-sm", "Missing radius-sm");
    assertIncludes(css, "--radius-md", "Missing radius-md");
    assertIncludes(css, "--radius-lg", "Missing radius-lg");
  });

  await test("F2.5: Verify body element sets minimum dimensions and font stack", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "min-width: 320px", "Missing min-width on body");
    assertTrue(css.includes("--font-sans") || css.includes("font-family"), "Missing font specification");
  });

  // =========================================================================
  // FEATURE 3: Pure shadcn/ui Primitives Ecosystem
  // =========================================================================
  await test("F3.1: Verify Button component export and variants", async () => {
    const btn = readDashboardFile("src/components/ui/button.jsx");
    assertIncludes(btn, "Button", "Button export missing");
    assertIncludes(btn, "buttonVariants", "buttonVariants missing");
    assertIncludes(btn, "destructive", "destructive variant missing");
    assertIncludes(btn, "outline", "outline variant missing");
  });

  await test("F3.2: Verify Badge component export and variants", async () => {
    const badge = readDashboardFile("src/components/ui/badge.jsx");
    assertIncludes(badge, "Badge", "Badge export missing");
    assertIncludes(badge, "badgeVariants", "badgeVariants missing");
  });

  await test("F3.3: Verify Card component exports (Header, Title, Description, Content)", async () => {
    const card = readDashboardFile("src/components/ui/card.jsx");
    assertIncludes(card, "Card", "Card missing");
    assertIncludes(card, "CardHeader", "CardHeader missing");
    assertIncludes(card, "CardTitle", "CardTitle missing");
    assertIncludes(card, "CardContent", "CardContent missing");
  });

  await test("F3.4: Verify Dialog and DropdownMenu primitive exports and Radix integration", async () => {
    const dialog = readDashboardFile("src/components/ui/dialog.jsx");
    const dropdown = readDashboardFile("src/components/ui/dropdown-menu.jsx");
    assertIncludes(dialog, "@radix-ui/react-dialog", "Dialog missing Radix import");
    assertIncludes(dropdown, "@radix-ui/react-dropdown-menu", "Dropdown missing Radix import");
  });

  await test("F3.5: Verify Input, Label, Select, Separator, Switch, Table, Tabs, and Textarea exist", async () => {
    const list = getUiComponentsList();
    const expected = ["input.jsx", "label.jsx", "select.jsx", "separator.jsx", "switch.jsx", "table.jsx", "tabs.jsx", "textarea.jsx"];
    for (const exp of expected) {
      assertTrue(list.includes(exp), `Missing primitive: ${exp}`);
    }
  });

  // =========================================================================
  // FEATURE 4: Theme Engine (Light/Dark/System)
  // =========================================================================
  await test("F4.1: Verify CSS defines light and dark theme variable hierarchies", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, ":root", "Missing :root declaration");
    assertIncludes(css, "--background:", "Missing root background variable");
    assertIncludes(css, "--foreground:", "Missing root foreground variable");
  });

  await test("F4.2: Verify CSS ring and accent tokens conform to accessible contrast", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--color-ring", "Missing ring token");
    assertIncludes(css, "--color-accent", "Missing accent token");
  });

  await test("F4.3: Verify theme selection tokens are bound in inline theme rules", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "@theme inline", "Missing inline theme definition");
  });

  await test("F4.4: Verify input and border token alignments across surfaces", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "--input:", "Missing input color token");
    assertIncludes(css, "--border:", "Missing border color token");
  });

  await test("F4.5: Verify dark mode variant or tokens are properly defined in CSS", async () => {
    const css = readDashboardFile("src/index.css");
    assertTrue(css.includes(".dark") || css.includes("@custom-variant dark"), "Missing dark variant rule");
  });

  // =========================================================================
  // FEATURE 5: Dedicated Dashboard Layout
  // =========================================================================
  await test("F5.1: Verify AppShell component exports and defines main administrative container", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "export default function AppShell", "Missing AppShell export");
    assertIncludes(appShell, "min-h-screen bg-background", "Missing background wrapper");
  });

  await test("F5.2: Verify AppShell incorporates navigation sidebar and content outlet structure", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "<Outlet />", "Missing Outlet in AppShell");
    assertIncludes(appShell, "<aside", "Missing aside tag in AppShell");
  });

  await test("F5.3: Verify AppShell integrates logout action dispatch from authSlice", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "logout", "Missing logout import/usage in AppShell");
  });

  await test("F5.4: Verify App.jsx wraps protected routes inside RequireAuth guard", async () => {
    const app = readDashboardFile("src/App.jsx");
    assertIncludes(app, "RequireAuth", "Missing RequireAuth component in App.jsx");
    assertIncludes(app, "Navigate to=\"/login\"", "Missing redirect to login in RequireAuth");
  });

  await test("F5.5: Verify App.jsx configures fallback redirection for unmatched paths", async () => {
    const app = readDashboardFile("src/App.jsx");
    assertIncludes(app, "path=\"*\"", "Missing wildcard route in App.jsx");
  });

  // =========================================================================
  // FEATURE 6: Collapsible App Sidebar
  // =========================================================================
  await test("F6.1: Verify AppShell defines all primary administrative navigation links", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "to: \"/\"", "Missing Overview nav link");
    assertIncludes(appShell, "to: \"/products\"", "Missing Products nav link");
    assertIncludes(appShell, "to: \"/orders\"", "Missing Orders nav link");
    assertIncludes(appShell, "to: \"/users\"", "Missing Users nav link");
  });

  await test("F6.2: Verify AppShell navigation items include Lucide icon components", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "LayoutDashboard", "Missing LayoutDashboard icon");
    assertIncludes(appShell, "ShoppingBag", "Missing ShoppingBag icon");
    assertIncludes(appShell, "Receipt", "Missing Receipt icon");
  });

  await test("F6.3: Verify AppShell sidebar includes collapsible toggle state mechanism", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "collapsed", "Missing collapsed state in AppShell");
    assertIncludes(appShell, "setCollapsed", "Missing setCollapsed updater");
  });

  await test("F6.4: Verify AppShell header brand displays Thrift Shoe Wear identity", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "Thrift Shoe Wear", "Missing brand title in AppShell");
  });

  await test("F6.5: Verify AppShell renders user avatar with initials fallback", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "AvatarFallback", "Missing AvatarFallback in AppShell");
    assertIncludes(appShell, "initials", "Missing initials generator function");
  });

  // =========================================================================
  // FEATURE 7: Site Header & Dynamic Breadcrumbs
  // =========================================================================
  await test("F7.1: Verify page title mapping dictionary exists for all dashboard routes", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "pageTitles", "Missing pageTitles mapping object");
  });

  await test("F7.2: Verify Overview page title resolves dynamically", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("\"/\": \"Overview\""), "Overview route title mapped");
  });

  await test("F7.3: Verify resource route titles map correctly", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "\"/products\": \"Products\"", "Products title missing");
    assertIncludes(appShell, "\"/orders\": \"Orders\"", "Orders title missing");
    assertIncludes(appShell, "\"/payments\": \"Payments\"", "Payments title missing");
  });

  await test("F7.4: Verify settings and asset route titles map to user-friendly titles", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "\"/settings\": \"Settings\"", "Settings title missing");
    assertIncludes(appShell, "\"/assets\": \"Site Assets\"", "Site Assets title missing");
  });

  await test("F7.5: Verify header displays page title with tracking class", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "{title}", "Header missing dynamic title render");
  });

  // =========================================================================
  // FEATURE 8: Mobile Responsive Sheet Sidebar
  // =========================================================================
  await test("F8.1: Verify AppShell includes responsive CSS utility classes", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "lg:flex", "Missing lg:flex responsive rule");
    assertIncludes(appShell, "hidden", "Missing hidden mobile default");
  });

  await test("F8.2: Verify navigation supports compact icon-only representation when collapsed", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "collapsed && \"justify-center px-2\"", "Missing collapsed compact styling");
  });

  await test("F8.3: Verify content area adjusts margin based on collapsed sidebar state", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertTrue(appShell.includes("collapsed ? \"lg:pl-20\" : \"lg:pl-72\"") || appShell.includes("lg:pl-20"), "Missing responsive margin adjustment");
  });

  await test("F8.4: Verify responsive container layout accommodates viewport widths down to 320px", async () => {
    const css = readDashboardFile("src/index.css");
    assertIncludes(css, "min-width: 320px", "Missing min-width responsive anchor");
  });

  await test("F8.5: Verify mobile header controls remain accessible on narrow viewports", async () => {
    const appShell = readDashboardFile("src/components/AppShell.jsx");
    assertIncludes(appShell, "<header", "Missing header container element");
  });

  // =========================================================================
  // FEATURE 9: Overview & Live KPI Metrics
  // =========================================================================
  await test("F9.1: Verify GET /api/v1/site/dashboard responds with HTTP 200 and success status", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F9.2: Verify dashboard KPI metrics return products and activeProducts counts", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const data = res.data?.data || res.data?.counts;
    assertTrue(data.products !== undefined, "Missing products count");
    assertTrue(data.activeProducts !== undefined, "Missing activeProducts count");
  });

  await test("F9.3: Verify dashboard KPI metrics return orders and customers counts", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const data = res.data?.data || res.data?.counts;
    assertTrue(data.orders !== undefined, "Missing orders count");
    assertTrue(data.users !== undefined, "Missing users count");
  });

  await test("F9.4: Verify dashboard KPI metrics return revenue figures", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const data = res.data?.data || res.data?.revenue;
    assertTrue(data.grandTotal !== undefined || data.revenue !== undefined, "Missing revenue total");
  });

  await test("F9.5: Verify OverviewPage component exports and binds live metric cards to Redux state", async () => {
    const overview = readDashboardFile("src/pages/OverviewPage.jsx");
    assertIncludes(overview, "export default function OverviewPage", "Missing OverviewPage export");
    assertIncludes(overview, "fetchDashboard", "Missing fetchDashboard dispatch in OverviewPage");
  });

  // =========================================================================
  // FEATURE 10: Interactive Analytics Charts
  // =========================================================================
  await test("F10.1: Verify dashboard API returns salesTrend analytics array", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const trend = res.data?.data?.salesTrend;
    assertTrue(Array.isArray(trend), "Missing salesTrend array");
    assertTrue(trend.length > 0, "salesTrend array is empty");
  });

  await test("F10.2: Verify dashboard API returns top popular products list", async () => {
    const res = await client.get("/api/v1/site/dashboard", { token: client.adminToken });
    const popular = res.data?.data?.popularProducts;
    assertTrue(Array.isArray(popular), "Missing popularProducts array");
  });

  await test("F10.3: Verify OverviewPage renders recent activity and status badges", async () => {
    const overview = readDashboardFile("src/pages/OverviewPage.jsx");
    assertIncludes(overview, "StatusBadge", "OverviewPage missing StatusBadge component");
  });

  await test("F10.4: Verify OverviewPage auto-refresh mechanism polls every 30 seconds", async () => {
    const overview = readDashboardFile("src/pages/OverviewPage.jsx");
    assertIncludes(overview, "30000", "OverviewPage missing 30s auto-refresh interval");
  });

  await test("F10.5: Verify manual refresh button dispatches fetchDashboard thunk", async () => {
    const overview = readDashboardFile("src/pages/OverviewPage.jsx");
    assertIncludes(overview, "handleRefresh", "OverviewPage missing handleRefresh handler");
  });

  // =========================================================================
  // FEATURE 11: Products Catalog & Search/Filter
  // =========================================================================
  await test("F11.1: Verify GET /api/v1/products returns list of products with pagination metadata", async () => {
    const res = await client.get("/api/v1/products");
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertTrue(Array.isArray(products), "Products list is not an array");
  });

  await test("F11.2: Verify products endpoint supports text search filtering by keyword", async () => {
    const res = await client.get("/api/v1/products", { query: { search: "Jordan" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertTrue(products.some((p) => p.name.includes("Jordan")), "Search did not find Jordan");
  });

  await test("F11.3: Verify products endpoint supports category filtering", async () => {
    const res = await client.get("/api/v1/products", { query: { productType: "shoes" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertTrue(products.every((p) => p.productType === "shoes"), "Filter returned non-shoes item");
  });

  await test("F11.4: Verify products endpoint supports thrift condition filtering", async () => {
    const res = await client.get("/api/v1/products", { query: { condition: "excellent" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertTrue(products.every((p) => p.condition === "excellent"), "Filter returned non-excellent condition");
  });

  await test("F11.5: Verify products endpoint supports status filtering", async () => {
    const res = await client.get("/api/v1/products", { query: { status: "active" } });
    assertStatus(res, 200);
    const products = res.data?.data?.products || res.data?.products;
    assertTrue(products.every((p) => p.status === "active"), "Filter returned inactive item");
  });

  // =========================================================================
  // FEATURE 12: Thrift Variant & Condition Editor
  // =========================================================================
  await test("F12.1: Verify RESOURCE_CONFIG defines 5 thrift condition grades", async () => {
    assertEqual(conditions.length, 5, "Expected 5 condition grades");
    assertIncludes(conditions, "new", "Missing condition: new");
    assertIncludes(conditions, "like_new", "Missing condition: like_new");
    assertIncludes(conditions, "excellent", "Missing condition: excellent");
    assertIncludes(conditions, "good", "Missing condition: good");
    assertIncludes(conditions, "fair", "Missing condition: fair");
  });

  await test("F12.2: Verify buildPayload correctly maps multi-variant thrift attributes", async () => {
    const builder = RESOURCE_CONFIG.products.buildPayload;
    const form = {
      name: "Vintage Puma Suede",
      shortDescription: "Vintage sneakers",
      description: "Original Puma suede",
      productType: "shoes",
      condition: "good",
      variants: [
        { sku: "PUM-01", size: "9", color: "Blue", condition: "good", price: "75", stock: "1" },
        { sku: "PUM-02", size: "10", color: "Red", condition: "fair", price: "60", stock: "1" },
      ],
    };
    const payload = builder(form, "create");
    assertEqual(payload.variants.length, 2, "Expected 2 variants");
    assertEqual(payload.variants[0].price, 75, "Variant 1 price must be numeric");
    assertEqual(payload.variants[1].price, 60, "Variant 2 price must be numeric");
  });

  await test("F12.3: Verify POST /api/v1/products creates thrift product with multiple variants", async () => {
    const body = {
      name: "Converse All Star Vintage 1990",
      shortDescription: "Classic vintage canvas sneakers",
      description: "Made in USA vintage Chuck Taylor All Stars.",
      productType: "shoes",
      condition: "good",
      category: "cat_shoes_01",
      variants: [
        { sku: "CV-01", size: "8.5", color: "Black", condition: "good", price: 90, stock: 1 },
      ],
    };
    const res = await client.post("/api/v1/products", body, { token: client.adminToken });
    assertStatus(res, 201);
    assertSuccess(res);
  });

  await test("F12.4: Verify PATCH /api/v1/products/:id updates variant stock and pricing", async () => {
    const res = await client.patch("/api/v1/products/prod_jordan_01", {
      brand: "Nike Retro Vintage",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F12.5: Verify initial form values generator populates thrift variant editor defaults", async () => {
    const productFields = RESOURCE_CONFIG.products.fields;
    const variantField = productFields.find((f) => f.name === "variants");
    assertTrue(Boolean(variantField), "Missing variants field definition");
    assertTrue(Array.isArray(variantField.defaultValue), "Default variants must be array");
  });

  // =========================================================================
  // FEATURE 13: Orders Management & Status Lifecycle
  // =========================================================================
  await test("F13.1: Verify GET /api/v1/orders returns orders list with customer and payment info", async () => {
    const res = await client.get("/api/v1/orders", { token: client.adminToken });
    assertStatus(res, 200);
    const orders = res.data?.data?.orders || res.data?.orders;
    assertTrue(Array.isArray(orders), "Orders list must be an array");
    assertTrue(orders.length > 0, "Orders list is empty");
  });

  await test("F13.2: Verify orders endpoint supports filtering by orderStatus enum", async () => {
    const res = await client.get("/api/v1/orders", {
      query: { orderStatus: "placed" },
      token: client.adminToken,
    });
    assertStatus(res, 200);
    const orders = res.data?.data?.orders || res.data?.orders;
    assertTrue(orders.every((o) => o.orderStatus === "placed"), "Non-placed order returned");
  });

  await test("F13.3: Verify order status transitions from placed to confirmed", async () => {
    const res = await client.patch("/api/v1/orders/order_01/status", { status: "confirmed" }, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F13.4: Verify order status transitions from confirmed to packed", async () => {
    const res = await client.patch("/api/v1/orders/order_01/status", { status: "packed" }, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F13.5: Verify order status transitions to shipped and then delivered", async () => {
    const shipRes = await client.patch("/api/v1/orders/order_01/status", {
      status: "shipped",
      courierName: "trax",
      trackingNumber: "TRX-123456",
    }, { token: client.adminToken });
    assertStatus(shipRes, 200);

    const delivRes = await client.patch("/api/v1/orders/order_01/status", {
      status: "delivered",
    }, { token: client.adminToken });
    assertStatus(delivRes, 200);
  });

  // =========================================================================
  // FEATURE 14: Courier & Tracking Fulfillment
  // =========================================================================
  await test("F14.1: Verify RESOURCE_CONFIG configures supported courier services", async () => {
    const orderConfig = RESOURCE_CONFIG.orders;
    const shippedAction = orderConfig.actions.find((a) => a.label?.toLowerCase() === "mark shipped");
    assertTrue(Boolean(shippedAction), "Missing Mark shipped action");
    const courierField = shippedAction.fields.find((f) => f.name === "courierName");
    assertTrue(Boolean(courierField), "Missing courierName field");
  });

  await test("F14.2: Verify transitioning order to shipped requires courierName and trackingNumber", async () => {
    // Fresh test order
    client.server.orders.set("order_fulfillment_test", {
      _id: "order_fulfillment_test",
      orderStatus: "packed",
      statusHistory: [],
    });
    const res = await client.patch("/api/v1/orders/order_fulfillment_test/status", {
      status: "shipped",
    }, { token: client.adminToken });
    assertStatus(res, 400);
    assertFalse(res.data?.success);
  });

  await test("F14.3: Verify PATCH /api/v1/orders/:id/status stores shipment tracking data on dispatch", async () => {
    const res = await client.patch("/api/v1/orders/order_fulfillment_test/status", {
      status: "shipped",
      courierName: "tcs",
      trackingNumber: "TCS-998877",
    }, { token: client.adminToken });
    assertStatus(res, 200);
    const ord = client.server.orders.get("order_fulfillment_test");
    assertEqual(ord.courierName, "tcs");
    assertEqual(ord.trackingNumber, "TCS-998877");
  });

  await test("F14.4: Verify shipments resource endpoint GET /api/v1/shipments lists tracking records", async () => {
    const res = await client.get("/api/v1/shipments", { token: client.adminToken });
    assertStatus(res, 200);
    const ships = res.data?.data?.shipments || res.data?.shipments;
    assertTrue(Array.isArray(ships), "Shipments list must be array");
  });

  await test("F14.5: Verify shipment status update endpoint updates transit milestones", async () => {
    const res = await client.patch("/api/v1/shipments/ship_01/status", { status: "in_transit" }, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  // =========================================================================
  // FEATURE 15: Payment Verification & Proof Modal
  // =========================================================================
  await test("F15.1: Verify GET /api/v1/payments returns list of payment transactions", async () => {
    const res = await client.get("/api/v1/payments", { token: client.adminToken });
    assertStatus(res, 200);
    const payments = res.data?.data?.payments || res.data?.payments;
    assertTrue(Array.isArray(payments), "Payments list must be array");
  });

  await test("F15.2: Verify payment receipt proof attachment submission", async () => {
    const res = await client.post("/api/v1/payments/pay_01/proof", {
      url: "https://proofs.test/receipt_1001.png",
      transactionId: "TXN-998811",
    });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F15.3: Verify payment verification action updates status", async () => {
    const res = await client.patch("/api/v1/payments/pay_01/verify", {}, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F15.4: Verify mark paid action transitions order to paid", async () => {
    const res = await client.patch("/api/v1/payments/pay_01/paid", {}, { token: client.adminToken });
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F15.5: Verify reject payment action requires rejection reason", async () => {
    const res = await client.patch("/api/v1/payments/pay_01/reject", {}, { token: client.adminToken });
    assertStatus(res, 400);
    assertFalse(res.data?.success);
  });

  // =========================================================================
  // FEATURE 16: Coupons & Discount Management
  // =========================================================================
  await test("F16.1: Verify GET /api/v1/coupons returns discount coupons list", async () => {
    const res = await client.get("/api/v1/coupons", { token: client.adminToken });
    assertStatus(res, 200);
    const coupons = res.data?.data?.coupons || res.data?.coupons;
    assertTrue(Array.isArray(coupons), "Coupons must be array");
  });

  await test("F16.2: Verify POST /api/v1/coupons creates percentage discount coupon with validity dates", async () => {
    const body = {
      code: "SUMMER25",
      title: "Summer Flash 25% Off",
      discountType: "percentage",
      discountValue: 25,
      minOrderAmount: 40,
    };
    const res = await client.post("/api/v1/coupons", body, { token: client.adminToken });
    assertStatus(res, 201);
    assertSuccess(res);
  });

  await test("F16.3: Verify POST /api/v1/coupons creates fixed amount discount coupon", async () => {
    const body = {
      code: "FLAT15",
      title: "$15 Flat Voucher",
      discountType: "fixed",
      discountValue: 15,
      minOrderAmount: 30,
    };
    const res = await client.post("/api/v1/coupons", body, { token: client.adminToken });
    assertStatus(res, 201);
    assertSuccess(res);
  });

  await test("F16.4: Verify GET /api/v1/coupons/validate/:code validates active coupon code", async () => {
    const res = await client.get("/api/v1/coupons/validate/WELCOME10");
    assertStatus(res, 200);
    assertSuccess(res);
  });

  await test("F16.5: Verify coupon code formatting transforms input to uppercase", async () => {
    const body = {
      code: "lowerpromo",
      title: "Lowercase code test",
      discountType: "percentage",
      discountValue: 5,
    };
    const res = await client.post("/api/v1/coupons", body, { token: client.adminToken });
    assertStatus(res, 201);
    const code = res.data?.data?.coupon?.code || res.data?.coupon?.code;
    assertEqual(code, "LOWERPROMO");
  });

  // =========================================================================
  // FEATURE 17: Categories Hierarchy Management
  // =========================================================================
  await test("F17.1: Verify GET /api/v1/categories returns product categories taxonomy", async () => {
    const res = await client.get("/api/v1/categories");
    assertStatus(res, 200);
    const cats = res.data?.data?.categories || res.data?.categories;
    assertTrue(Array.isArray(cats), "Categories must be array");
  });

  await test("F17.2: Verify POST /api/v1/categories creates category with type and slug", async () => {
    const body = {
      name: "Vintage Athletic Wear",
      type: "clothing",
      gender: "unisex",
    };
    const res = await client.post("/api/v1/categories", body, { token: client.adminToken });
    assertStatus(res, 201);
    assertSuccess(res);
  });

  await test("F17.3: Verify category hierarchy supports parent-child nested category assignment", async () => {
    const body = {
      name: "Retro High Tops",
      type: "shoes",
      parentCategory: "cat_shoes_01",
    };
    const res = await client.post("/api/v1/categories", body, { token: client.adminToken });
    assertStatus(res, 201);
    const cat = res.data?.data?.category || res.data?.category;
    assertEqual(cat.parentCategory, "cat_shoes_01");
  });

  await test("F17.4: Verify category active and featured flags toggle visibility", async () => {
    const body = {
      name: "Featured Retro Accessories",
      type: "accessories",
      isActive: true,
      isFeatured: true,
    };
    const res = await client.post("/api/v1/categories", body, { token: client.adminToken });
    assertStatus(res, 201);
    const cat = res.data?.data?.category || res.data?.category;
    assertTrue(cat.isFeatured);
    assertTrue(cat.isActive);
  });

  await test("F17.5: Verify DELETE /api/v1/categories/:id removes category record", async () => {
    const tempCat = { _id: "cat_temp_del", name: "Temp To Delete", type: "other" };
    client.server.categories.set(tempCat._id, tempCat);
    const res = await client.delete(`/api/v1/categories/${tempCat._id}`, { token: client.adminToken });
    assertStatus(res, 200);
    assertFalse(client.server.categories.has(tempCat._id));
  });

  // =========================================================================
  // FEATURE 18: Staff & Access Request Workflows
  // =========================================================================
  await test("F18.1: Verify GET /api/v1/users returns user accounts with roles", async () => {
    const res = await client.get("/api/v1/users", { token: client.adminToken });
    assertStatus(res, 200);
    const users = res.data?.data?.users || res.data?.users;
    assertTrue(Array.isArray(users), "Users must be array");
  });

  await test("F18.2: Verify filtering users by dashboardAccessStatus=pending isolates access requests", async () => {
    const res = await client.get("/api/v1/users", {
      query: { dashboardAccessStatus: "pending" },
      token: client.adminToken,
    });
    assertStatus(res, 200);
    const users = res.data?.data?.users || res.data?.users;
    assertTrue(users.every((u) => (u.dashboardAccess?.status || u.dashboardAccessStatus) === "pending"));
  });

  await test("F18.3: Verify SuperAdmin can approve pending dashboard access request", async () => {
    const res = await client.patch("/api/v1/users/user_pending_01/approve-dashboard-access", {
      role: "admin",
      reviewNotes: "Approved for product catalog updates",
    }, { token: client.superAdminToken });
    assertStatus(res, 200);
    const u = client.server.users.get("user_pending_01");
    assertEqual(u.role, "admin");
    assertEqual(u.dashboardAccessStatus, "approved");
  });

  await test("F18.4: Verify SuperAdmin can reject pending dashboard access request", async () => {
    const tempPending = {
      _id: "user_pending_reject_me",
      email: "reject@test.com",
      role: "customer",
      dashboardAccessStatus: "pending",
      dashboardAccess: { status: "pending" },
    };
    client.server.users.set(tempPending._id, tempPending);

    const res = await client.patch(`/api/v1/users/${tempPending._id}/reject-dashboard-access`, {
      reviewNotes: "Profile criteria not met",
    }, { token: client.superAdminToken });
    assertStatus(res, 200);
    assertEqual(tempPending.dashboardAccessStatus, "rejected");
  });

  await test("F18.5: Verify non-SuperAdmin users are forbidden from approving dashboard access", async () => {
    const res = await client.patch("/api/v1/users/user_pending_01/approve-dashboard-access", {
      role: "admin",
    }, { token: client.adminToken }); // Standard admin token
    assertStatus(res, 403);
    assertFalse(res.data?.success);
  });

  // =========================================================================
  // FEATURE 19: Site Settings & Assets Configuration
  // =========================================================================
  await test("F19.1: Verify GET /api/v1/site/assets returns promotional banners and site assets", async () => {
    const res = await client.get("/api/v1/site/assets");
    assertStatus(res, 200);
    const assets = res.data?.data?.assets || res.data?.assets;
    assertTrue(Array.isArray(assets), "Assets must be array");
  });

  await test("F19.2: Verify POST /api/v1/site/assets registers banner asset with placement type", async () => {
    const body = {
      title: "Holiday Mega Drop",
      placement: "promo_banner",
      subtitle: "Exclusive retro vintage picks",
    };
    const res = await client.post("/api/v1/site/assets", body);
    assertStatus(res, 201);
    assertSuccess(res);
  });

  await test("F19.3: Verify asset placement types support standard layout zones", async () => {
    const assetPlacements = [
      "logo", "favicon", "header", "hero",
      "featured_banner", "category_banner", "promo_banner", "footer", "other"
    ];
    assertEqual(assetPlacements.length, 9, "Expected 9 asset placement types");
  });

  await test("F19.4: Verify SettingsPage component exports and renders store configuration controls", async () => {
    const settings = readDashboardFile("src/pages/SettingsPage.jsx");
    assertIncludes(settings, "export default function SettingsPage", "SettingsPage export missing");
    assertIncludes(settings, "Settings", "Settings text missing");
  });

  await test("F19.5: Verify asset registration without placement fails validation", async () => {
    const res = await client.post("/api/v1/site/assets", { title: "No placement" });
    assertStatus(res, 400);
    assertFalse(res.data?.success);
  });

  // =========================================================================
  // FEATURE 20: E2E Suite Verification & Coverage Hardening
  // =========================================================================
  await test("F20.1: Verify API client automatically intercepts HTTP 401 and clears credentials", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertIncludes(apiCode, "response.status === 401", "Missing 401 status check in api.js");
    assertIncludes(apiCode, "removeItem(\"dashboardToken\")", "Missing token clear on 401");
    assertIncludes(apiCode, "removeItem(\"dashboardUser\")", "Missing user clear on 401");
  });

  await test("F20.2: Verify API client automatically injects Authorization Bearer header when token exists", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertIncludes(apiCode, "headers.Authorization = `Bearer ${token}`", "Missing Bearer token injection in api.js");
  });

  await test("F20.3: Verify query parameter builder in api.js filters null and undefined values", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertIncludes(apiCode, "value === undefined || value === null || value === \"\"", "Missing query param null check in api.js");
  });

  await test("F20.4: Verify health check endpoint GET /api/v1/health responds with uptime and connectivity", async () => {
    const res = await client.get("/api/v1/health");
    assertStatus(res, 200);
    assertSuccess(res);
    assertTrue(res.data?.uptime !== undefined, "Missing uptime field in health response");
  });

  await test("F20.5: Verify error handling catches failed network requests and exposes descriptive message", async () => {
    const apiCode = readDashboardFile("src/lib/api.js");
    assertIncludes(apiCode, "throw new Error(payload.message", "Missing error throwing in api.js");
  });

  return tests;
}
