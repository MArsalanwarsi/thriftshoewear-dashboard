import http from "node:http";
import crypto from "node:crypto";

/**
 * Conforming In-Memory REST API Server for Administrative Dashboard
 * Implements full REST contracts specified in PROJECT.md and src/config/resources.js
 */
export class TestServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.baseUrl = "";
    this.resetState();
  }

  resetState() {
    this.users = new Map();
    this.sessions = new Map(); // token -> user
    this.categories = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.payments = new Map();
    this.shipments = new Map();
    this.coupons = new Map();
    this.reviews = new Map();
    this.assets = new Map();

    this.seedInitialData();
  }

  hashPassword(pw) {
    return crypto.createHash("sha256").update(pw).digest("hex");
  }

  seedInitialData() {
    // 1. SuperAdmin User
    const superAdmin = {
      _id: "user_superadmin_01",
      firstName: "Super",
      lastName: "Admin",
      displayName: "Super Admin",
      email: "superadmin@thriftshoewear.test",
      passwordHash: this.hashPassword("SuperAdminPass123!"),
      role: "superAdmin",
      status: "active",
      customerType: "retail",
      dashboardAccess: {
        status: "approved",
        requestedRole: "superAdmin",
        reviewedBy: "system",
      },
      dashboardAccessStatus: "approved",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(superAdmin._id, superAdmin);
    this.superAdminToken = "token_superadmin_seed_01";
    this.sessions.set(this.superAdminToken, superAdmin);

    // 2. Standard Admin User
    const admin = {
      _id: "user_admin_01",
      firstName: "Staff",
      lastName: "Manager",
      displayName: "Operations Admin",
      email: "admin@thriftshoewear.test",
      passwordHash: this.hashPassword("AdminPass123!"),
      role: "admin",
      status: "active",
      customerType: "retail",
      dashboardAccess: {
        status: "approved",
        requestedRole: "admin",
        reviewedBy: superAdmin._id,
      },
      dashboardAccessStatus: "approved",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(admin._id, admin);
    this.adminToken = "token_admin_seed_01";
    this.sessions.set(this.adminToken, admin);

    // 3. Customer User
    const customer = {
      _id: "user_customer_01",
      firstName: "Jane",
      lastName: "Shopper",
      displayName: "Jane Shopper",
      email: "customer@thriftshoewear.test",
      passwordHash: this.hashPassword("CustomerPass123!"),
      role: "customer",
      status: "active",
      customerType: "retail",
      dashboardAccess: {
        status: "none",
        requestedRole: null,
      },
      dashboardAccessStatus: "none",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(customer._id, customer);
    this.customerToken = "token_customer_seed_01";
    this.sessions.set(this.customerToken, customer);

    // 4. Pending Access Request User
    const pendingStaff = {
      _id: "user_pending_01",
      firstName: "Alex",
      lastName: "Applicant",
      displayName: "Alex Applicant",
      email: "alex@thriftshoewear.test",
      passwordHash: this.hashPassword("AlexPass123!"),
      role: "customer",
      status: "active",
      customerType: "retail",
      dashboardAccess: {
        status: "pending",
        requestedRole: "admin",
      },
      dashboardAccessStatus: "pending",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(pendingStaff._id, pendingStaff);

    // 5. Seed Categories
    const shoesCat = {
      _id: "cat_shoes_01",
      name: "Vintage Shoes",
      slug: "vintage-shoes",
      type: "shoes",
      gender: "unisex",
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
    };
    const bootsCat = {
      _id: "cat_boots_02",
      name: "Leather Boots",
      slug: "leather-boots",
      type: "shoes",
      gender: "men",
      parentCategory: shoesCat._id,
      isActive: true,
      isFeatured: false,
      sortOrder: 2,
      createdAt: new Date().toISOString(),
    };
    this.categories.set(shoesCat._id, shoesCat);
    this.categories.set(bootsCat._id, bootsCat);

    // 6. Seed Products with Thrift Condition Grades
    const jordan = {
      _id: "prod_jordan_01",
      name: "Air Jordan 1 Retro High",
      slug: "air-jordan-1-retro-high",
      shortDescription: "Iconic 1985 silhouette in vintage condition.",
      description: "Thrift graded collectible high-top sneaker.",
      brand: "Nike",
      category: shoesCat,
      productType: "shoes",
      gender: "unisex",
      condition: "excellent",
      status: "active",
      tags: ["retro", "vintage", "jordan"],
      images: [{ url: "https://example.com/jordan.jpg", isPrimary: true }],
      variants: [
        {
          _id: "var_jordan_10",
          sku: "TSW-AJ1-10",
          size: "10 US",
          color: "Chicago",
          condition: "excellent",
          price: 180,
          salePrice: 160,
          stock: 2,
          isActive: true,
        },
      ],
      priceRange: { minPrice: 180, maxPrice: 180, minSalePrice: 160, maxSalePrice: 160 },
      stockSummary: { availableStock: 2, isInStock: true },
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: true,
      createdAt: new Date().toISOString(),
    };
    this.products.set(jordan._id, jordan);

    // 7. Seed Orders
    const order01 = {
      _id: "order_01",
      orderNumber: "TSW-100001",
      customerSnapshot: { fullName: "Jane Shopper", email: "customer@thriftshoewear.test" },
      user: customer,
      totals: { grandTotal: 160, currency: "USD", subtotal: 160, shippingFee: 0 },
      orderStatus: "placed",
      payment: { status: "pending", method: "bank_transfer" },
      paymentMethod: "bank_transfer",
      items: [
        {
          product: jordan._id,
          productName: jordan.name,
          variantId: "var_jordan_10",
          quantity: 1,
          price: 160,
        },
      ],
      statusHistory: [{ status: "placed", timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order01._id, order01);

    // 8. Seed Payments
    const pay01 = {
      _id: "pay_01",
      paymentNumber: "PAY-100001",
      order: order01,
      method: "bank_transfer",
      amount: 160,
      currency: "USD",
      status: "pending",
      proofs: [],
      createdAt: new Date().toISOString(),
    };
    this.payments.set(pay01._id, pay01);

    // 9. Seed Shipments
    const ship01 = {
      _id: "ship_01",
      shipmentNumber: "SHP-100001",
      order: order01,
      courierName: "trax",
      trackingNumber: "TRX-998877",
      shippingAddress: { city: "New York" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.shipments.set(ship01._id, ship01);

    // 10. Seed Coupons
    const coupon01 = {
      _id: "cpn_01",
      code: "WELCOME10",
      title: "Welcome Discount",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 50,
      validity: {
        startsAt: new Date(Date.now() - 86400000).toISOString(),
        endsAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
      status: "active",
      usageStats: { totalUsed: 4 },
      createdAt: new Date().toISOString(),
    };
    this.coupons.set(coupon01._id, coupon01);

    // 11. Seed Reviews
    const rev01 = {
      _id: "rev_01",
      product: jordan,
      user: customer,
      rating: 5,
      title: "Authentic condition!",
      comment: "Arrived in great vintage condition, exactly as graded.",
      status: "pending",
      reportCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(rev01._id, rev01);

    // 12. Seed Assets
    const asset01 = {
      _id: "asset_01",
      title: "Autumn Thrift Showcase",
      subtitle: "Curated vintage sneakers and classic shoes.",
      placement: "featured_banner",
      images: [{ url: "https://example.com/banner.jpg" }],
      cta: { label: "Explore Catalog", url: "/products" },
      sortOrder: 1,
      isActive: true,
      isFeatured: true,
      createdAt: new Date().toISOString(),
    };
    this.assets.set(asset01._id, asset01);

    // 13. Seed Settings
    this.settings = {
      siteName: "Thrift Shoe Wear",
      tagline: "Curated thrift shoes, bags and jewelry",
      contact: { email: "support@thriftshoewear.test", phone: "+92 300 1234567" },
      store: { currency: "PKR", timezone: "Asia/Karachi", lowStockThreshold: 2, allowGuestCheckout: false },
      announcement: { isEnabled: false, message: "" },
      seo: { metaTitle: "Thrift Shoe Wear", metaDescription: "Best thrift footwear" },
      shipping: { freeShippingThreshold: 5000, defaultShippingFee: 250 },
      maintenanceMode: { isEnabled: false },
    };
  }

  async parseBody(req) {
    return new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        if (!data) return resolve({});
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({});
        }
      });
    });
  }

  sendJson(res, statusCode, body) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    res.end(JSON.stringify(body));
  }

  getUserFromAuth(req) {
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return this.sessions.get(token) || null;
  }

  async start() {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          });
          return res.end();
        }

        const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
        const pathname = url.pathname;
        const method = req.method;

        // Health Check
        if (pathname === "/api/v1/health" && method === "GET") {
          return this.sendJson(res, 200, {
            success: true,
            status: "healthy",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          });
        }

        // Bearer Token Validation: If an Authorization Bearer header is present, validate token session
        const authHeader = req.headers["authorization"] || "";
        if (authHeader.startsWith("Bearer ")) {
          const token = authHeader.slice(7).trim();
          if (token && !this.sessions.has(token)) {
            return this.sendJson(res, 401, { success: false, message: "Invalid or expired token. Please login again" });
          }
        }

        // Auth: Login
        if (pathname === "/api/v1/auth/login" && method === "POST") {
          const body = await this.parseBody(req);
          const { email, password } = body;
          const user = Array.from(this.users.values()).find((u) => u.email === email);
          if (!user || user.passwordHash !== this.hashPassword(password || "")) {
            return this.sendJson(res, 401, { success: false, message: "Invalid credentials" });
          }
          const token = `token_${crypto.randomUUID().slice(0, 12)}`;
          this.sessions.set(token, user);
          const { passwordHash, ...safeUser } = user;
          return this.sendJson(res, 200, { success: true, token, user: safeUser, data: { token, user: safeUser } });
        }

        // Auth: Register
        if (pathname === "/api/v1/auth/register" && method === "POST") {
          const body = await this.parseBody(req);
          const { email, password, firstName, lastName, requestDashboardAccess, requestedRole } = body;
          if (!email || !password || !firstName) {
            return this.sendJson(res, 400, { success: false, message: "Missing required registration fields" });
          }
          if (Array.from(this.users.values()).some((u) => u.email === email)) {
            return this.sendJson(res, 409, { success: false, message: "User already exists with this email" });
          }
          const newUser = {
            _id: `user_${crypto.randomUUID().slice(0, 8)}`,
            firstName,
            lastName: lastName || "",
            displayName: `${firstName} ${lastName || ""}`.trim(),
            email,
            passwordHash: this.hashPassword(password),
            role: "customer",
            status: "active",
            customerType: "retail",
            dashboardAccess: {
              status: requestDashboardAccess ? "pending" : "none",
              requestedRole: requestedRole || "admin",
            },
            dashboardAccessStatus: requestDashboardAccess ? "pending" : "none",
            emailVerified: false,
            createdAt: new Date().toISOString(),
          };
          this.users.set(newUser._id, newUser);
          const token = `token_${crypto.randomUUID().slice(0, 12)}`;
          this.sessions.set(token, newUser);
          const { passwordHash, ...safeUser } = newUser;
          return this.sendJson(res, 201, { success: true, token, user: safeUser, data: { token, user: safeUser } });
        }

        // Auth: Me
        if (pathname === "/api/v1/auth/me" && method === "GET") {
          const user = this.getUserFromAuth(req);
          if (!user) return this.sendJson(res, 401, { success: false, message: "Unauthorized" });
          const { passwordHash, ...safeUser } = user;
          return this.sendJson(res, 200, { success: true, user: safeUser, data: { user: safeUser } });
        }

        // Auth: Forgot & Reset Password
        if (pathname === "/api/v1/auth/forgot-password" && method === "POST") {
          const body = await this.parseBody(req);
          if (!body.email) return this.sendJson(res, 400, { success: false, message: "Email required" });
          return this.sendJson(res, 200, { success: true, message: "Password reset link dispatched" });
        }
        if (pathname === "/api/v1/auth/reset-password" && method === "POST") {
          const body = await this.parseBody(req);
          if (!body.token || !body.password) return this.sendJson(res, 400, { success: false, message: "Token and password required" });
          return this.sendJson(res, 200, { success: true, message: "Password updated successfully" });
        }

        // Dashboard Overview KPI Metrics
        if (pathname === "/api/v1/site/dashboard" && method === "GET") {
          const user = this.getUserFromAuth(req);
          if (!user) return this.sendJson(res, 401, { success: false, message: "Unauthorized" });
          if (user.role !== "admin" && user.role !== "superAdmin") {
            return this.sendJson(res, 403, { success: false, message: "Forbidden: Admin access required" });
          }
          const activeProductsCount = Array.from(this.products.values()).filter((p) => p.status === "active").length;
          const ordersList = Array.from(this.orders.values());
          const grandTotal = ordersList.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);
          const amountPaid = ordersList.filter((o) => o.payment?.status === "paid").reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

          return this.sendJson(res, 200, {
            success: true,
            data: {
              products: this.products.size,
              activeProducts: activeProductsCount,
              orders: ordersList.length,
              users: this.users.size,
              grandTotal,
              amountPaid,
              amountDue: grandTotal - amountPaid,
              popularProducts: Array.from(this.products.values()).slice(0, 5),
              salesTrend: [
                { date: "2026-10-01", orders: 12, revenue: 1920 },
                { date: "2026-10-02", orders: 15, revenue: 2400 },
                { date: "2026-10-03", orders: 18, revenue: 2880 },
              ],
              storage: {
                provider: "Cloudflare R2",
                bucket: "thriftshoewear",
                bucketName: "thriftshoewear",
                totalBytes: 2516582,
                fileCount: 42,
                formattedSize: "2.4 MB",
                formatted: "2.4 MB",
                freeTierAllowance: "10 GB",
                percentageUsed: 0.02,
                formatBreakdown: {
                  webp: { count: 35, bytes: 2200000, formattedSize: "2.1 MB" },
                  png: { count: 7, bytes: 316582, formattedSize: "309.2 KB" },
                },
                breakdown: {
                  webp: { count: 35, bytes: 2200000, formattedSize: "2.1 MB" },
                  avatars: { count: 4, bytes: 150000, formattedSize: "146.5 KB" },
                  receipts: { count: 3, bytes: 166582, formattedSize: "162.7 KB" },
                },
                status: "healthy",
                health: "healthy",
              },
            },
            counts: {
              products: this.products.size,
              activeProducts: activeProductsCount,
              orders: ordersList.length,
              users: this.users.size,
            },
            revenue: {
              revenue: grandTotal,
              paid: amountPaid,
              due: grandTotal - amountPaid,
            },
          });
        }

        // Site Settings
        if (pathname === "/api/v1/site/settings" && method === "GET") {
          return this.sendJson(res, 200, {
            success: true,
            data: { settings: this.settings },
            settings: this.settings,
          });
        }

        if (pathname === "/api/v1/site/settings" && method === "PATCH") {
          const user = this.getUserFromAuth(req);
          if (!user) {
            return this.sendJson(res, 401, { success: false, message: "Unauthorized" });
          }
          if (user.role !== "admin" && user.role !== "superAdmin") {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const body = await this.parseBody(req);
          if (body.shipping?.defaultShippingFee !== undefined && Number(body.shipping.defaultShippingFee) < 0) {
            return this.sendJson(res, 400, { success: false, message: "Shipping fee cannot be negative" });
          }
          if (body.shipping?.freeShippingThreshold !== undefined && Number(body.shipping.freeShippingThreshold) < 0) {
            return this.sendJson(res, 400, { success: false, message: "Free shipping threshold cannot be negative" });
          }
          if (body.store?.lowStockThreshold !== undefined && Number(body.store.lowStockThreshold) < 0) {
            return this.sendJson(res, 400, { success: false, message: "Low stock threshold cannot be negative" });
          }
          if (body.contact?.email && !body.contact.email.includes("@")) {
            return this.sendJson(res, 400, { success: false, message: "Invalid contact email format" });
          }
          if (body.announcement?.message && body.announcement.message.length > 180) {
            return this.sendJson(res, 400, { success: false, message: "Announcement message cannot exceed 180 characters" });
          }
          if (body.seo?.metaTitle && body.seo.metaTitle.length > 70) {
            return this.sendJson(res, 400, { success: false, message: "Meta title cannot exceed 70 characters" });
          }
          if (body.seo?.metaDescription && body.seo.metaDescription.length > 160) {
            return this.sendJson(res, 400, { success: false, message: "Meta description cannot exceed 160 characters" });
          }
          this.settings = { ...this.settings, ...body };
          return this.sendJson(res, 200, {
            success: true,
            data: { settings: this.settings },
            settings: this.settings,
          });
        }

        // Products CRUD & Search
        if (pathname === "/api/v1/products" && method === "GET") {
          let list = Array.from(this.products.values());
          const q = url.searchParams.get("search") || url.searchParams.get("q");
          if (q) {
            const query = q.toLowerCase();
            list = list.filter((p) => p.name?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
          }
          const status = url.searchParams.get("status");
          if (status) list = list.filter((p) => p.status === status);
          const condition = url.searchParams.get("condition");
          if (condition) list = list.filter((p) => p.condition === condition);
          const productType = url.searchParams.get("productType");
          if (productType) list = list.filter((p) => p.productType === productType);
          const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
          const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10));

          return this.sendJson(res, 200, {
            success: true,
            data: {
              products: list.slice((page - 1) * limit, page * limit),
              pagination: { total: list.length, page, limit, pages: Math.ceil(list.length / limit) },
            },
            products: list.slice((page - 1) * limit, page * limit),
            total: list.length,
          });
        }

        if (pathname === "/api/v1/products" && method === "POST") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const body = await this.parseBody(req);
          if (!body.name || !body.productType || !body.condition) {
            return this.sendJson(res, 400, { success: false, message: "Missing required product fields" });
          }
          if (!Array.isArray(body.variants) || body.variants.length === 0) {
            return this.sendJson(res, 400, { success: false, message: "Product must contain at least one variant" });
          }
          for (const v of body.variants) {
            if (v.price === undefined || Number(v.price) < 0) {
              return this.sendJson(res, 400, { success: false, message: "Variant price cannot be negative" });
            }
            if (v.stock !== undefined && Number(v.stock) < 0) {
              return this.sendJson(res, 400, { success: false, message: "Variant stock cannot be negative" });
            }
          }
          const newProd = {
            _id: `prod_${crypto.randomUUID().slice(0, 8)}`,
            slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            stockSummary: {
              availableStock: body.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0),
              isInStock: true,
            },
            priceRange: {
              minPrice: Math.min(...body.variants.map((v) => Number(v.price))),
              maxPrice: Math.max(...body.variants.map((v) => Number(v.price))),
            },
            createdAt: new Date().toISOString(),
            ...body,
          };
          this.products.set(newProd._id, newProd);
          return this.sendJson(res, 201, { success: true, data: { product: newProd }, product: newProd });
        }

        if (pathname.startsWith("/api/v1/products/") && method === "GET") {
          const id = pathname.replace("/api/v1/products/", "");
          const prod = this.products.get(id);
          if (!prod) return this.sendJson(res, 404, { success: false, message: "Product not found" });
          return this.sendJson(res, 200, { success: true, data: { product: prod }, product: prod });
        }

        if (pathname.startsWith("/api/v1/products/") && method === "PATCH") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const id = pathname.replace("/api/v1/products/", "");
          const prod = this.products.get(id);
          if (!prod) return this.sendJson(res, 404, { success: false, message: "Product not found" });
          const body = await this.parseBody(req);
          Object.assign(prod, body);
          return this.sendJson(res, 200, { success: true, data: { product: prod }, product: prod });
        }

        if (pathname.startsWith("/api/v1/products/") && method === "DELETE") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const id = pathname.replace("/api/v1/products/", "");
          this.products.delete(id);
          return this.sendJson(res, 200, { success: true, message: "Product deleted" });
        }

        // Categories CRUD
        if (pathname === "/api/v1/categories" && method === "GET") {
          const list = Array.from(this.categories.values());
          return this.sendJson(res, 200, { success: true, data: { categories: list }, categories: list });
        }

        if (pathname === "/api/v1/categories" && method === "POST") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const body = await this.parseBody(req);
          if (!body.name || !body.type) {
            return this.sendJson(res, 400, { success: false, message: "Name and type required" });
          }
          const cat = {
            _id: `cat_${crypto.randomUUID().slice(0, 8)}`,
            slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            isActive: body.isActive !== false,
            createdAt: new Date().toISOString(),
            ...body,
          };
          this.categories.set(cat._id, cat);
          return this.sendJson(res, 201, { success: true, data: { category: cat }, category: cat });
        }

        if (pathname.startsWith("/api/v1/categories/") && method === "DELETE") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const id = pathname.replace("/api/v1/categories/", "");
          this.categories.delete(id);
          return this.sendJson(res, 200, { success: true, message: "Category deleted" });
        }

        // Orders Management & Transitions
        if (pathname === "/api/v1/orders" && method === "GET") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          let list = Array.from(this.orders.values());
          const orderStatus = url.searchParams.get("orderStatus");
          if (orderStatus) list = list.filter((o) => o.orderStatus === orderStatus);
          return this.sendJson(res, 200, { success: true, data: { orders: list }, orders: list });
        }

        if (pathname.startsWith("/api/v1/orders/") && pathname.endsWith("/status") && method === "PATCH") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          const id = pathname.replace("/api/v1/orders/", "").replace("/status", "");
          const order = this.orders.get(id);
          if (!order) return this.sendJson(res, 404, { success: false, message: "Order not found" });
          const body = await this.parseBody(req);
          const nextStatus = body.status || body.orderStatus;

          const allowedTransitions = {
            placed: ["confirmed", "cancelled"],
            confirmed: ["processing", "packed", "cancelled"],
            processing: ["packed", "cancelled"],
            packed: ["shipped", "cancelled"],
            shipped: ["delivered"],
            delivered: [],
            cancelled: [],
          };

          const allowed = allowedTransitions[order.orderStatus] || [];
          if (!allowed.includes(nextStatus)) {
            return this.sendJson(res, 400, {
              success: false,
              message: `Cannot transition from ${order.orderStatus} to ${nextStatus}`,
            });
          }

          if (nextStatus === "shipped") {
            if (!body.courierName || !body.trackingNumber) {
              return this.sendJson(res, 400, { success: false, message: "Courier name and tracking number are required" });
            }
            order.courierName = body.courierName;
            order.trackingNumber = body.trackingNumber;
            order.trackingUrl = body.trackingUrl || `https://tracking.test/${body.courierName}/${body.trackingNumber}`;
          }

          if (nextStatus === "cancelled" && !body.reason) {
            return this.sendJson(res, 400, { success: false, message: "Cancellation reason is required" });
          }

          order.orderStatus = nextStatus;
          order.statusHistory.push({ status: nextStatus, timestamp: new Date().toISOString() });
          return this.sendJson(res, 200, { success: true, data: { order }, order });
        }

        if (pathname.startsWith("/api/v1/orders/") && method === "GET") {
          const id = pathname.replace("/api/v1/orders/", "");
          const order = this.orders.get(id);
          if (!order) return this.sendJson(res, 404, { success: false, message: "Order not found" });
          return this.sendJson(res, 200, { success: true, data: { order }, order });
        }

        // Shipments
        if (pathname === "/api/v1/shipments" && method === "GET") {
          const list = Array.from(this.shipments.values());
          return this.sendJson(res, 200, { success: true, data: { shipments: list }, shipments: list });
        }

        if (pathname.startsWith("/api/v1/shipments/") && pathname.endsWith("/status") && method === "PATCH") {
          const id = pathname.replace("/api/v1/shipments/", "").replace("/status", "");
          const shipment = this.shipments.get(id);
          if (!shipment) return this.sendJson(res, 404, { success: false, message: "Shipment not found" });
          const body = await this.parseBody(req);
          shipment.status = body.status;
          return this.sendJson(res, 200, { success: true, data: { shipment }, shipment });
        }

        // Users & Dashboard Access Workflows
        if (pathname === "/api/v1/users" && method === "GET") {
          const user = this.getUserFromAuth(req);
          if (!user || (user.role !== "admin" && user.role !== "superAdmin")) {
            return this.sendJson(res, 403, { success: false, message: "Admin authorization required" });
          }
          let list = Array.from(this.users.values()).map((u) => {
            const { passwordHash, ...safe } = u;
            return safe;
          });
          const accessStatus = url.searchParams.get("dashboardAccessStatus");
          if (accessStatus) {
            list = list.filter((u) => (u.dashboardAccess?.status || u.dashboardAccessStatus) === accessStatus);
          }
          const role = url.searchParams.get("role");
          if (role) list = list.filter((u) => u.role === role);

          return this.sendJson(res, 200, { success: true, data: { users: list }, users: list });
        }

        if (pathname.startsWith("/api/v1/users/") && pathname.endsWith("/approve-dashboard-access") && method === "PATCH") {
          const user = this.getUserFromAuth(req);
          if (!user || user.role !== "superAdmin") {
            return this.sendJson(res, 403, { success: false, message: "SuperAdmin authorization required" });
          }
          const id = pathname.replace("/api/v1/users/", "").replace("/approve-dashboard-access", "");
          if (user._id === id) {
            return this.sendJson(res, 400, { success: false, message: "Self-approval of dashboard access is prohibited" });
          }
          const target = this.users.get(id);
          if (!target) return this.sendJson(res, 404, { success: false, message: "User not found" });
          const body = await this.parseBody(req);
          if (body.role && !["admin", "superAdmin"].includes(body.role)) {
            return this.sendJson(res, 400, { success: false, message: "Role must be admin or superAdmin" });
          }
          target.role = body.role || "admin";
          target.dashboardAccess = { status: "approved", approvedBy: user.displayName, notes: body.reviewNotes || "" };
          target.dashboardAccessStatus = "approved";
          const { passwordHash: _passwordHash, ...safe } = target;
          return this.sendJson(res, 200, { success: true, data: { user: safe }, user: safe });
        }

        if (pathname.startsWith("/api/v1/users/") && pathname.endsWith("/reject-dashboard-access") && method === "PATCH") {
          const user = this.getUserFromAuth(req);
          if (!user || user.role !== "superAdmin") {
            return this.sendJson(res, 403, { success: false, message: "SuperAdmin authorization required" });
          }
          const id = pathname.replace("/api/v1/users/", "").replace("/reject-dashboard-access", "");
          const target = this.users.get(id);
          if (!target) return this.sendJson(res, 404, { success: false, message: "User not found" });
          const activeSuperAdmins = Array.from(this.users.values()).filter(
            (u) => u.role === "superAdmin" && u.status === "active"
          ).length;
          if (target.role === "superAdmin" && activeSuperAdmins <= 1) {
            return this.sendJson(res, 400, { success: false, message: "Cannot revoke access for the last remaining superAdmin" });
          }
          const body = await this.parseBody(req);
          target.role = "customer";
          target.dashboardAccess = { status: "rejected", rejectedBy: user.displayName, notes: body.reviewNotes || body.reason || "" };
          target.dashboardAccessStatus = "rejected";
          const { passwordHash: _passwordHash, ...safe } = target;
          return this.sendJson(res, 200, { success: true, data: { user: safe }, user: safe });
        }

        // Payments & Proof
        if (pathname === "/api/v1/payments" && method === "GET") {
          const list = Array.from(this.payments.values());
          return this.sendJson(res, 200, { success: true, data: { payments: list }, payments: list });
        }

        if (pathname.startsWith("/api/v1/payments/") && pathname.endsWith("/proof") && method === "POST") {
          const id = pathname.replace("/api/v1/payments/", "").replace("/proof", "");
          const payment = this.payments.get(id);
          if (!payment) return this.sendJson(res, 404, { success: false, message: "Payment not found" });
          const body = await this.parseBody(req);
          if (!body.url) return this.sendJson(res, 400, { success: false, message: "Proof URL required" });
          payment.proofs.push({ url: body.url, transactionId: body.transactionId, submittedAt: new Date().toISOString() });
          payment.status = "awaiting_verification";
          return this.sendJson(res, 200, { success: true, data: { payment }, payment });
        }

        if (pathname.startsWith("/api/v1/payments/") && pathname.endsWith("/verify") && method === "PATCH") {
          const id = pathname.replace("/api/v1/payments/", "").replace("/verify", "");
          const payment = this.payments.get(id);
          if (!payment) return this.sendJson(res, 404, { success: false, message: "Payment not found" });
          payment.status = "verified";
          return this.sendJson(res, 200, { success: true, data: { payment }, payment });
        }

        if (pathname.startsWith("/api/v1/payments/") && pathname.endsWith("/paid") && method === "PATCH") {
          const id = pathname.replace("/api/v1/payments/", "").replace("/paid", "");
          const payment = this.payments.get(id);
          if (!payment) return this.sendJson(res, 404, { success: false, message: "Payment not found" });
          payment.status = "paid";
          if (payment.order?._id && this.orders.has(payment.order._id)) {
            const ord = this.orders.get(payment.order._id);
            ord.payment = { status: "paid", method: payment.method };
          }
          return this.sendJson(res, 200, { success: true, data: { payment }, payment });
        }

        if (pathname.startsWith("/api/v1/payments/") && pathname.endsWith("/reject") && method === "PATCH") {
          const id = pathname.replace("/api/v1/payments/", "").replace("/reject", "");
          const payment = this.payments.get(id);
          if (!payment) return this.sendJson(res, 404, { success: false, message: "Payment not found" });
          const body = await this.parseBody(req);
          if (!body.reason) return this.sendJson(res, 400, { success: false, message: "Rejection reason required" });
          payment.status = "failed";
          payment.rejectionReason = body.reason;
          return this.sendJson(res, 200, { success: true, data: { payment }, payment });
        }

        // Coupons CRUD & Validate
        if (pathname === "/api/v1/coupons" && method === "GET") {
          const list = Array.from(this.coupons.values());
          return this.sendJson(res, 200, { success: true, data: { coupons: list }, coupons: list });
        }

        if (pathname === "/api/v1/coupons" && method === "POST") {
          const body = await this.parseBody(req);
          if (!body.code || !body.discountType || body.discountValue === undefined) {
            return this.sendJson(res, 400, { success: false, message: "Code, discountType, and discountValue required" });
          }
          if (Number(body.discountValue) < 0) {
            return this.sendJson(res, 400, { success: false, message: "Discount value cannot be negative" });
          }
          if (body.discountType === "percentage" && Number(body.discountValue) > 100) {
            return this.sendJson(res, 400, { success: false, message: "Percentage discount cannot exceed 100%" });
          }
          const coupon = {
            _id: `cpn_${crypto.randomUUID().slice(0, 8)}`,
            ...body,
            code: body.code.toUpperCase(),
            title: body.title || body.code,
            status: body.status || "active",
            usageStats: { totalUsed: 0 },
            createdAt: new Date().toISOString(),
          };
          this.coupons.set(coupon._id, coupon);
          return this.sendJson(res, 201, { success: true, data: { coupon }, coupon });
        }

        if (pathname.startsWith("/api/v1/coupons/validate/") && method === "GET") {
          const code = pathname.replace("/api/v1/coupons/validate/", "").toUpperCase();
          const coupon = Array.from(this.coupons.values()).find((c) => c.code === code);
          if (!coupon || coupon.status !== "active") {
            return this.sendJson(res, 404, { success: false, message: "Coupon not found or inactive" });
          }
          if (coupon.validity?.endsAt && new Date(coupon.validity.endsAt) < new Date()) {
            return this.sendJson(res, 400, { success: false, message: "Coupon expired" });
          }
          return this.sendJson(res, 200, { success: true, data: { coupon }, coupon });
        }

        // Reviews Moderation
        if (pathname === "/api/v1/reviews" && method === "GET") {
          const list = Array.from(this.reviews.values());
          return this.sendJson(res, 200, { success: true, data: { reviews: list }, reviews: list });
        }

        if (pathname.startsWith("/api/v1/reviews/") && pathname.endsWith("/approve") && method === "PATCH") {
          const id = pathname.replace("/api/v1/reviews/", "").replace("/approve", "");
          const rev = this.reviews.get(id);
          if (!rev) return this.sendJson(res, 404, { success: false, message: "Review not found" });
          rev.status = "approved";
          return this.sendJson(res, 200, { success: true, data: { review: rev }, review: rev });
        }

        // Site Assets
        if (pathname === "/api/v1/site/assets" && method === "GET") {
          const list = Array.from(this.assets.values());
          return this.sendJson(res, 200, { success: true, data: { assets: list }, assets: list });
        }

        if (pathname === "/api/v1/site/assets" && method === "POST") {
          const body = await this.parseBody(req);
          if (!body.title || !body.placement) {
            return this.sendJson(res, 400, { success: false, message: "Title and placement required" });
          }
          const validPlacements = ["logo", "favicon", "header", "hero", "featured_banner", "category_banner", "promo_banner", "footer", "other"];
          if (!validPlacements.includes(body.placement)) {
            return this.sendJson(res, 400, { success: false, message: "Invalid asset placement" });
          }
          const asset = {
            _id: `asset_${crypto.randomUUID().slice(0, 8)}`,
            createdAt: new Date().toISOString(),
            ...body,
          };
          this.assets.set(asset._id, asset);
          return this.sendJson(res, 201, { success: true, data: { asset }, asset });
        }

        // Storage Stats
        if (pathname === "/api/v1/upload/storage-stats" && method === "GET") {
          return this.sendJson(res, 200, {
            success: true,
            message: "Storage statistics fetched successfully",
            data: {
              provider: "Cloudflare R2",
              bucket: "thriftshoewear",
              bucketName: "thriftshoewear",
              totalBytes: 2516582,
              fileCount: 42,
              formattedSize: "2.4 MB",
              formatted: "2.4 MB",
              freeTierAllowance: "10 GB",
              percentageUsed: 0.02,
              formatBreakdown: {
                webp: { count: 35, bytes: 2200000, formattedSize: "2.1 MB" },
                png: { count: 7, bytes: 316582, formattedSize: "309.2 KB" },
              },
              breakdown: {
                webp: { count: 35, bytes: 2200000, formattedSize: "2.1 MB" },
                avatars: { count: 4, bytes: 150000, formattedSize: "146.5 KB" },
                receipts: { count: 3, bytes: 166582, formattedSize: "162.7 KB" },
              },
              status: "healthy",
              health: "healthy",
            },
          });
        }

        // Media Library Listing
        if (pathname === "/api/v1/upload/media" && method === "GET") {
          const sampleMedia = [
            {
              _id: "media_01",
              key: "products/sample1.webp",
              url: "https://pub-thriftshoewear.r2.dev/products/sample1.webp",
              originalName: "sample1.webp",
              size: 64200,
              format: "webp",
              createdAt: new Date().toISOString(),
            },
            {
              _id: "media_02",
              key: "profiles/user_avatar.webp",
              url: "https://pub-thriftshoewear.r2.dev/profiles/user_avatar.webp",
              originalName: "avatar.webp",
              size: 32100,
              format: "webp",
              createdAt: new Date().toISOString(),
            },
            {
              _id: "media_03",
              key: "payments/bank_slip.webp",
              url: "https://pub-thriftshoewear.r2.dev/payments/bank_slip.webp",
              originalName: "receipt.webp",
              size: 45000,
              format: "webp",
              createdAt: new Date().toISOString(),
            },
          ];
          return this.sendJson(res, 200, {
            success: true,
            media: sampleMedia,
            pagination: { page: 1, limit: 20, total: sampleMedia.length, pages: 1 },
          });
        }

        // Single Image Upload
        if (pathname === "/api/v1/upload/single" && method === "POST") {
          return this.sendJson(res, 200, {
            success: true,
            url: "https://pub-thriftshoewear.r2.dev/products/mock-uploaded.webp",
            key: "products/mock-uploaded.webp",
            size: 45000,
            format: "webp",
            width: 800,
            height: 800,
            originalName: "mock-uploaded.webp",
            mediaId: "media_mock_99",
          });
        }

        // Multiple Images Upload
        if (pathname === "/api/v1/upload/multiple" && method === "POST") {
          return this.sendJson(res, 200, {
            success: true,
            files: [
              {
                url: "https://pub-thriftshoewear.r2.dev/products/mock-multi1.webp",
                key: "products/mock-multi1.webp",
                size: 45000,
                format: "webp",
                width: 800,
                height: 800,
                originalName: "mock-multi1.webp",
                mediaId: "media_mock_multi_1",
              },
            ],
          });
        }

        // Delete Media
        if (pathname === "/api/v1/upload" && method === "DELETE") {
          return this.sendJson(res, 200, {
            success: true,
            message: "Media deleted successfully",
          });
        }

        // Default 404
        return this.sendJson(res, 404, { success: false, message: `Route not found: ${method} ${pathname}` });
      });

      this.server.listen(this.port, () => {
        const addr = this.server.address();
        this.baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve(this.baseUrl);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
