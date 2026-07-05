import { formatCurrency, formatDate, humanize, readPath, shortId, splitCsv, toDateInput } from "../lib/format"

export const productTypes = ["shoes", "bags", "jewelry", "accessories"]
export const categoryTypes = [...productTypes, "clothing", "other"]
export const genders = ["men", "women", "unisex", "kids", "none"]
export const conditions = ["new", "like_new", "excellent", "good", "fair"]
export const productStatuses = ["draft", "active", "inactive", "out_of_stock", "archived"]
export const roles = ["customer", "admin", "superAdmin"]
export const userStatuses = ["active", "inactive", "blocked", "deleted"]
export const dashboardAccessStatuses = ["none", "pending", "approved", "rejected"]
export const customerTypes = ["retail", "wholesale"]
export const discountTypes = ["percentage", "fixed", "free_shipping"]
export const couponStatuses = ["draft", "active", "inactive", "expired"]
export const orderStatuses = ["placed", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"]
export const paymentStatuses = ["pending", "awaiting_verification", "verified", "paid", "failed", "cancelled"]
export const paymentMethods = ["cod", "advance_cod", "bank_transfer", "easypaisa", "jazzcash", "sadapay", "card", "wallet", "manual"]
export const courierNames = ["leopards", "tcs", "postex", "trax", "mnp", "blue_ex", "bykea", "self_delivery", "other"]
export const shipmentStatuses = ["pending", "ready_to_ship", "booked", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "returned_to_sender", "cancelled"]
export const reviewStatuses = ["pending", "approved", "rejected", "hidden"]
export const assetPlacements = ["logo", "favicon", "header", "hero", "featured_banner", "category_banner", "promo_banner", "footer", "other"]

const boolOptions = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
]

const optionList = (values) => values.map((value) => ({ label: humanize(value), value }))

const baseListParams = { page: 1, limit: 20, includeDeleted: "true" }

const scalar = (value) => (value === "" ? undefined : value)
const numberValue = (value) => (value === "" || value === undefined ? undefined : Number(value))
const booleanValue = (value) => value === true || value === "true"
const dateValue = (value) => (value ? new Date(value).toISOString() : undefined)

const createImage = (url, altText, isPrimary = true) =>
  url
    ? {
        url,
        altText: altText || undefined,
        isPrimary,
      }
    : undefined

const firstVariant = (item) => item?.variants?.[0] || {}
const firstImage = (item) => item?.images?.[0] || {}

export const RESOURCE_CONFIG = {
  products: {
    label: "Products",
    singular: "Product",
    route: "products",
    endpoint: "/products",
    dataKey: "products",
    singleKey: "product",
    searchPlaceholder: "Search products, descriptions, brand...",
    defaultParams: baseListParams,
    requiresCategories: true,
    filters: [
      { name: "status", label: "Status", options: optionList(productStatuses) },
      { name: "productType", label: "Type", options: optionList(productTypes) },
      { name: "gender", label: "Gender", options: optionList(genders) },
      { name: "isFeatured", label: "Featured", options: boolOptions },
    ],
    columns: [
      { key: "name", label: "Product", value: (item) => item.name },
      { key: "category", label: "Category", value: (item) => item.category?.name || "Unassigned" },
      { key: "price", label: "Price", value: (item) => formatCurrency(item.priceRange?.minSalePrice || item.priceRange?.minPrice) },
      { key: "stock", label: "Stock", value: (item) => item.stockSummary?.availableStock ?? 0 },
      { key: "flags", label: "Flags", value: (item) => [item.isFeatured && "Featured", item.isNewArrival && "New", item.isBestSeller && "Best"].filter(Boolean).join(", ") || "None" },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug" },
      { name: "shortDescription", label: "Short description", type: "textarea", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "brand", label: "Brand", defaultValue: "Thrift Shoe Wear" },
      { name: "category", label: "Category", type: "category", required: true, from: (item) => item.category?._id || item.category || "" },
      { name: "productType", label: "Product type", type: "select", options: optionList(productTypes), required: true },
      { name: "gender", label: "Gender", type: "select", options: optionList(genders), defaultValue: "none" },
      { name: "condition", label: "Condition", type: "select", options: optionList(conditions), required: true },
      { name: "status", label: "Status", type: "select", options: optionList(productStatuses), defaultValue: "draft" },
      { name: "tags", label: "Tags", placeholder: "comma, separated", from: (item) => item.tags?.join(", ") || "" },
      { name: "imageUrl", label: "Primary image URL", type: "url", required: true, from: (item) => firstImage(item).url || "" },
      { name: "sku", label: "Variant SKU", required: true, from: (item) => firstVariant(item).sku || "" },
      { name: "size", label: "Size", from: (item) => firstVariant(item).size || "" },
      { name: "color", label: "Color", from: (item) => firstVariant(item).color || "" },
      { name: "price", label: "Price", type: "number", required: true, from: (item) => firstVariant(item).price || "" },
      { name: "salePrice", label: "Sale price", type: "number", from: (item) => firstVariant(item).salePrice ?? "" },
      { name: "stock", label: "Stock", type: "number", defaultValue: 1, from: (item) => firstVariant(item).stock ?? 1 },
      { name: "isFeatured", label: "Featured", type: "switch" },
      { name: "isNewArrival", label: "New arrival", type: "switch" },
      { name: "isBestSeller", label: "Best seller", type: "switch" },
    ],
    buildPayload: (form) => ({
      name: form.name,
      slug: scalar(form.slug),
      shortDescription: form.shortDescription,
      description: form.description,
      brand: form.brand || "Thrift Shoe Wear",
      category: form.category,
      productType: form.productType,
      gender: form.gender || "none",
      condition: form.condition,
      status: form.status || "draft",
      tags: splitCsv(form.tags),
      images: [createImage(form.imageUrl, form.name)].filter(Boolean),
      variants: [
        {
          sku: form.sku,
          size: scalar(form.size),
          color: scalar(form.color),
          condition: form.condition,
          price: numberValue(form.price),
          salePrice: numberValue(form.salePrice) ?? null,
          stock: numberValue(form.stock) ?? 1,
          isActive: true,
        },
      ],
      isFeatured: booleanValue(form.isFeatured),
      isNewArrival: booleanValue(form.isNewArrival),
      isBestSeller: booleanValue(form.isBestSeller),
    }),
  },
  categories: {
    label: "Categories",
    singular: "Category",
    route: "categories",
    endpoint: "/categories",
    dataKey: "categories",
    singleKey: "category",
    searchPlaceholder: "Search categories...",
    defaultParams: baseListParams,
    requiresCategories: true,
    filters: [
      { name: "type", label: "Type", options: optionList(categoryTypes) },
      { name: "gender", label: "Gender", options: optionList(genders) },
      { name: "isActive", label: "Active", options: boolOptions },
      { name: "isFeatured", label: "Featured", options: boolOptions },
    ],
    columns: [
      { key: "name", label: "Category", value: (item) => item.name },
      { key: "type", label: "Type", value: (item) => item.type },
      { key: "gender", label: "Gender", value: (item) => item.gender },
      { key: "featured", label: "Featured", value: (item) => (item.isFeatured ? "Yes" : "No") },
      { key: "status", label: "Status", value: (item) => (item.isActive ? "active" : "inactive"), badge: true },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "parentCategory", label: "Parent category", type: "category", allowNone: true, from: (item) => item.parentCategory?._id || item.parentCategory || "" },
      { name: "type", label: "Type", type: "select", options: optionList(categoryTypes), required: true },
      { name: "gender", label: "Gender", type: "select", options: optionList(genders), defaultValue: "none" },
      { name: "imageUrl", label: "Image URL", type: "url", from: (item) => item.image?.url || "" },
      { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
      { name: "isActive", label: "Active", type: "switch", defaultValue: true },
      { name: "isFeatured", label: "Featured", type: "switch" },
    ],
    buildPayload: (form) => ({
      name: form.name,
      slug: scalar(form.slug),
      description: scalar(form.description),
      parentCategory: scalar(form.parentCategory) || null,
      type: form.type,
      gender: form.gender || "none",
      image: {
        url: scalar(form.imageUrl) || null,
      },
      sortOrder: numberValue(form.sortOrder) ?? 0,
      isActive: booleanValue(form.isActive),
      isFeatured: booleanValue(form.isFeatured),
    }),
  },
  orders: {
    label: "Orders",
    singular: "Order",
    route: "orders",
    endpoint: "/orders",
    dataKey: "orders",
    singleKey: "order",
    searchDisabled: true,
    defaultParams: baseListParams,
    filters: [
      { name: "orderStatus", label: "Order status", options: optionList(orderStatuses) },
      { name: "paymentStatus", label: "Payment status", options: optionList(["pending", "paid", "partial_paid", "failed", "cancelled"]) },
      { name: "paymentMethod", label: "Method", options: optionList(paymentMethods) },
    ],
    columns: [
      { key: "order", label: "Order", value: (item) => item.orderNumber },
      { key: "customer", label: "Customer", value: (item) => item.customerSnapshot?.fullName || item.user?.displayName || "Customer" },
      { key: "total", label: "Total", value: (item) => formatCurrency(item.totals?.grandTotal, item.totals?.currency) },
      { key: "payment", label: "Payment", value: (item) => item.payment?.status, badge: true },
      { key: "status", label: "Status", value: (item) => item.orderStatus, badge: true },
      { key: "date", label: "Date", value: (item) => formatDate(item.createdAt) },
    ],
    canCreate: false,
    canEdit: false,
    actions: orderStatuses
      .filter((status) => status !== "placed")
      .map((status) => ({
        label: `Mark ${humanize(status)}`,
        endpoint: (item) => `/orders/${item._id}/status`,
        body: () => ({ status }),
        fields:
          status === "shipped"
            ? [
                { name: "courierName", label: "Courier name", required: true },
                { name: "trackingNumber", label: "Tracking number", required: true },
                { name: "trackingUrl", label: "Tracking URL", type: "url" },
              ]
            : status === "cancelled"
              ? [
                  { name: "reason", label: "Reason", required: true },
                  { name: "notes", label: "Notes", type: "textarea" },
                ]
              : [],
      })),
  },
  users: {
    label: "Customers",
    singular: "User",
    route: "users",
    endpoint: "/users",
    dataKey: "users",
    singleKey: "user",
    searchPlaceholder: "Search name or email...",
    defaultParams: baseListParams,
    filters: [
      { name: "role", label: "Role", options: optionList(roles) },
      { name: "status", label: "Status", options: optionList(userStatuses) },
      { name: "customerType", label: "Customer type", options: optionList(customerTypes) },
      { name: "dashboardAccessStatus", label: "Dashboard access", options: optionList(dashboardAccessStatuses) },
    ],
    columns: [
      { key: "name", label: "Name", value: (item) => item.displayName || `${item.firstName} ${item.lastName || ""}`.trim() },
      { key: "email", label: "Email", value: (item) => item.email },
      { key: "role", label: "Role", value: (item) => item.role, badge: true },
      { key: "access", label: "Dashboard", value: (item) => item.dashboardAccess?.status || "none", badge: true },
      { key: "requested", label: "Requested", value: (item) => item.dashboardAccess?.requestedRole || "None" },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
    ],
    fields: [
      { name: "firstName", label: "First name", required: true },
      { name: "lastName", label: "Last name" },
      { name: "displayName", label: "Display name" },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", createOnly: true, required: true },
      { name: "primaryPhone", label: "Primary phone" },
      { name: "role", label: "Role", type: "select", options: optionList(roles), defaultValue: "customer" },
      { name: "customerType", label: "Customer type", type: "select", options: optionList(customerTypes), defaultValue: "retail" },
      { name: "status", label: "Status", type: "select", options: optionList(userStatuses), defaultValue: "active" },
      { name: "emailVerified", label: "Email verified", type: "switch" },
    ],
    actions: [
      {
        label: "Approve dashboard access",
        superAdminOnly: true,
        endpoint: (item) => `/users/${item._id}/approve-dashboard-access`,
        fields: [
          { name: "role", label: "Role", type: "select", options: optionList(["admin", "superAdmin"]), defaultValue: "admin", required: true },
          { name: "reviewNotes", label: "Review notes", type: "textarea" },
        ],
      },
      {
        label: "Reject dashboard access",
        superAdminOnly: true,
        endpoint: (item) => `/users/${item._id}/reject-dashboard-access`,
        fields: [{ name: "reviewNotes", label: "Review notes", type: "textarea" }],
      },
    ],
    buildPayload: (form, mode) => {
      const payload = {
        firstName: form.firstName,
        lastName: scalar(form.lastName),
        displayName: scalar(form.displayName),
        email: form.email,
        primaryPhone: scalar(form.primaryPhone),
        role: form.role || "customer",
        customerType: form.customerType || "retail",
        status: form.status || "active",
        emailVerified: booleanValue(form.emailVerified),
      }
      if (mode === "create" && form.password) payload.password = form.password
      return payload
    },
  },
  coupons: {
    label: "Coupons",
    singular: "Coupon",
    route: "coupons",
    endpoint: "/coupons",
    dataKey: "coupons",
    singleKey: "coupon",
    searchPlaceholder: "Search coupon code or title...",
    defaultParams: baseListParams,
    filters: [
      { name: "status", label: "Status", options: optionList(couponStatuses) },
      { name: "discountType", label: "Discount", options: optionList(discountTypes) },
    ],
    columns: [
      { key: "code", label: "Code", value: (item) => item.code },
      { key: "title", label: "Title", value: (item) => item.title },
      { key: "discount", label: "Discount", value: (item) => item.discountType === "percentage" ? `${item.discountValue}%` : formatCurrency(item.discountValue) },
      { key: "used", label: "Used", value: (item) => item.usageStats?.totalUsed || 0 },
      { key: "ends", label: "Ends", value: (item) => formatDate(item.validity?.endsAt) },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
    ],
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "title", label: "Title", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "discountType", label: "Discount type", type: "select", options: optionList(discountTypes), defaultValue: "percentage" },
      { name: "discountValue", label: "Discount value", type: "number", required: true },
      { name: "maxDiscountAmount", label: "Max discount", type: "number" },
      { name: "minOrderAmount", label: "Minimum order", type: "number", defaultValue: 0 },
      { name: "startsAt", label: "Starts at", type: "date", required: true, from: (item) => toDateInput(item.validity?.startsAt) },
      { name: "endsAt", label: "Ends at", type: "date", required: true, from: (item) => toDateInput(item.validity?.endsAt) },
      { name: "status", label: "Status", type: "select", options: optionList(couponStatuses), defaultValue: "draft" },
    ],
    buildPayload: (form) => ({
      code: form.code,
      title: form.title,
      description: scalar(form.description) || null,
      discountType: form.discountType,
      discountValue: numberValue(form.discountValue) ?? 0,
      maxDiscountAmount: numberValue(form.maxDiscountAmount) ?? null,
      minOrderAmount: numberValue(form.minOrderAmount) ?? 0,
      validity: {
        startsAt: dateValue(form.startsAt),
        endsAt: dateValue(form.endsAt),
      },
      status: form.status || "draft",
    }),
  },
  payments: {
    label: "Payments",
    singular: "Payment",
    route: "payments",
    endpoint: "/payments",
    dataKey: "payments",
    singleKey: "payment",
    searchDisabled: true,
    defaultParams: baseListParams,
    filters: [
      { name: "status", label: "Status", options: optionList(paymentStatuses) },
      { name: "method", label: "Method", options: optionList(paymentMethods) },
    ],
    columns: [
      { key: "payment", label: "Payment", value: (item) => item.paymentNumber },
      { key: "order", label: "Order", value: (item) => item.order?.orderNumber || shortId(item.order) },
      { key: "method", label: "Method", value: (item) => item.method },
      { key: "amount", label: "Amount", value: (item) => formatCurrency(item.amount, item.currency) },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
      { key: "date", label: "Date", value: (item) => formatDate(item.createdAt) },
    ],
    canCreate: false,
    canEdit: false,
    actions: [
      { label: "Verify", endpoint: (item) => `/payments/${item._id}/verify`, fields: [{ name: "notes", label: "Notes", type: "textarea" }] },
      { label: "Mark paid", endpoint: (item) => `/payments/${item._id}/paid` },
      { label: "Reject", endpoint: (item) => `/payments/${item._id}/reject`, fields: [{ name: "reason", label: "Reason", required: true }, { name: "notes", label: "Notes", type: "textarea" }] },
      { label: "Cancel", endpoint: (item) => `/payments/${item._id}/cancel`, fields: [{ name: "reason", label: "Reason", required: true }] },
    ],
  },
  shipments: {
    label: "Shipments",
    singular: "Shipment",
    route: "shipments",
    endpoint: "/shipments",
    dataKey: "shipments",
    singleKey: "shipment",
    searchDisabled: true,
    defaultParams: baseListParams,
    filters: [
      { name: "status", label: "Status", options: optionList(shipmentStatuses) },
      { name: "courierName", label: "Courier", options: optionList(courierNames) },
      { name: "paymentMethod", label: "Method", options: optionList(paymentMethods) },
    ],
    columns: [
      { key: "shipment", label: "Shipment", value: (item) => item.shipmentNumber },
      { key: "order", label: "Order", value: (item) => item.order?.orderNumber || shortId(item.order) },
      { key: "courier", label: "Courier", value: (item) => item.courierName },
      { key: "tracking", label: "Tracking", value: (item) => item.trackingNumber || "Not set" },
      { key: "city", label: "City", value: (item) => item.shippingAddress?.city || "Not set" },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
    ],
    canCreate: false,
    canEdit: false,
    actions: shipmentStatuses
      .filter((status) => !["pending", "ready_to_ship"].includes(status))
      .map((status) => ({
        label: `Set ${humanize(status)}`,
        endpoint: (item) => `/shipments/${item._id}/status`,
        body: () => ({ status }),
        fields:
          status === "booked"
            ? [
                { name: "trackingNumber", label: "Tracking number", required: true },
                { name: "trackingUrl", label: "Tracking URL", type: "url" },
                { name: "courierBookingId", label: "Courier booking ID" },
              ]
            : ["delivery_failed", "returned_to_sender"].includes(status)
              ? [{ name: "reason", label: "Reason", required: true }]
              : status === "in_transit"
                ? [{ name: "location", label: "Current location" }]
                : [],
      })),
  },
  reviews: {
    label: "Reviews",
    singular: "Review",
    route: "reviews",
    endpoint: "/reviews",
    dataKey: "reviews",
    singleKey: "review",
    searchDisabled: true,
    defaultParams: baseListParams,
    filters: [
      { name: "status", label: "Status", options: optionList(reviewStatuses) },
      { name: "rating", label: "Rating", options: optionList(["1", "2", "3", "4", "5"]) },
    ],
    columns: [
      { key: "product", label: "Product", value: (item) => item.product?.name || item.productSnapshot?.productName || "Product" },
      { key: "customer", label: "Customer", value: (item) => item.user?.displayName || "Customer" },
      { key: "rating", label: "Rating", value: (item) => `${item.rating}/5` },
      { key: "title", label: "Title", value: (item) => item.title || item.comment?.slice(0, 42) || "Review" },
      { key: "reports", label: "Reports", value: (item) => item.reportCount || 0 },
      { key: "status", label: "Status", value: (item) => item.status, badge: true },
    ],
    canCreate: false,
    canEdit: false,
    actions: [
      { label: "Approve", endpoint: (item) => `/reviews/${item._id}/approve`, fields: [{ name: "notes", label: "Notes", type: "textarea" }] },
      { label: "Reject", endpoint: (item) => `/reviews/${item._id}/reject`, fields: [{ name: "reason", label: "Reason", required: true }, { name: "notes", label: "Notes", type: "textarea" }] },
      { label: "Hide", endpoint: (item) => `/reviews/${item._id}/hide`, fields: [{ name: "reason", label: "Reason", required: true }, { name: "notes", label: "Notes", type: "textarea" }] },
      { label: "Reply", endpoint: (item) => `/reviews/${item._id}/reply`, method: "POST", fields: [{ name: "message", label: "Reply", type: "textarea", required: true }] },
    ],
  },
  assets: {
    label: "Site Assets",
    singular: "Asset",
    route: "assets",
    endpoint: "/site/assets",
    dataKey: "assets",
    singleKey: "asset",
    searchPlaceholder: "Search title or subtitle...",
    defaultParams: baseListParams,
    filters: [
      { name: "placement", label: "Placement", options: optionList(assetPlacements) },
      { name: "isActive", label: "Active", options: boolOptions },
      { name: "isFeatured", label: "Featured", options: boolOptions },
    ],
    columns: [
      { key: "title", label: "Title", value: (item) => item.title },
      { key: "placement", label: "Placement", value: (item) => item.placement },
      { key: "featured", label: "Featured", value: (item) => (item.isFeatured ? "Yes" : "No") },
      { key: "sort", label: "Sort", value: (item) => item.sortOrder },
      { key: "active", label: "Status", value: (item) => (item.isActive ? "active" : "inactive"), badge: true },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "subtitle", label: "Subtitle", type: "textarea" },
      { name: "placement", label: "Placement", type: "select", options: optionList(assetPlacements), required: true },
      { name: "imageUrl", label: "Image URL", type: "url", required: true, from: (item) => firstImage(item).url || "" },
      { name: "ctaLabel", label: "CTA label", from: (item) => item.cta?.label || "" },
      { name: "ctaUrl", label: "CTA URL", type: "url", from: (item) => item.cta?.url || "" },
      { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
      { name: "startsAt", label: "Starts at", type: "date", from: (item) => toDateInput(item.startsAt) },
      { name: "endsAt", label: "Ends at", type: "date", from: (item) => toDateInput(item.endsAt) },
      { name: "isActive", label: "Active", type: "switch", defaultValue: true },
      { name: "isFeatured", label: "Featured", type: "switch" },
    ],
    buildPayload: (form) => ({
      title: form.title,
      subtitle: scalar(form.subtitle) || null,
      placement: form.placement,
      images: [createImage(form.imageUrl, form.title)].filter(Boolean),
      cta: {
        label: scalar(form.ctaLabel) || null,
        url: scalar(form.ctaUrl) || null,
      },
      sortOrder: numberValue(form.sortOrder) ?? 0,
      startsAt: dateValue(form.startsAt) || null,
      endsAt: dateValue(form.endsAt) || null,
      isActive: booleanValue(form.isActive),
      isFeatured: booleanValue(form.isFeatured),
    }),
  },
}

export const getInitialFormValues = (fields, item = null) =>
  fields.reduce((values, field) => {
    if (field.createOnly && item) return values
    if (item) {
      values[field.name] = field.from ? field.from(item) : readPath(item, field.name) ?? ""
      return values
    }
    values[field.name] = field.defaultValue ?? (field.type === "switch" ? false : "")
    return values
  }, {})
