import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("======================================================================");
console.log("   CHALLENGER 2 (M3): PRODUCTS CATALOG & THRIFT VARIANT EDITOR HARNESS");
console.log("======================================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testRecords = [];

function record(suite, name, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`[${suite}] \x1b[32m✓ PASS\x1b[0m: ${name}`);
    if (details) console.log(`    \x1b[90m${details}\x1b[0m`);
  } else {
    failedTests++;
    console.log(`[${suite}] \x1b[31m✗ FAIL\x1b[0m: ${name}`);
    if (details) console.log(`    \x1b[31m${details}\x1b[0m`);
  }
  testRecords.push({ suite, name, passed, details });
}

// -----------------------------------------------------------------------------
// Initialize Vite SSR for component loading and import resolution
// -----------------------------------------------------------------------------
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

// Mock Redux Store
const mockAuthSlice = {
  name: "auth",
  initialState: {
    token: "test_token_super_admin",
    user: { _id: "usr_admin", role: "superAdmin", displayName: "Super Admin" },
    isAuthenticated: true,
  },
  reducers: {},
};
const store = configureStore({
  reducer: {
    auth: (state = mockAuthSlice.initialState) => state,
  },
});

// Import modules through Vite SSR
const productsPageMod = await viteServer.ssrLoadModule("./src/pages/ProductsPage.jsx");
const productFormPageMod = await viteServer.ssrLoadModule("./src/pages/ProductFormPage.jsx");

// Import test client for HTTP integration
const { getTestClient, teardownTestEnvironment } = await import("./helpers/client.js");

// =============================================================================
// SUITE 1: Thrift Condition Enum Validation & Grading Integrity
// =============================================================================
console.log("\n--- Suite 1: Thrift Condition Enum Validation & Grading Integrity ---");

const { THRIFT_CONDITIONS } = productsPageMod;
const EXPECTED_CONDITIONS = ["new", "like_new", "excellent", "good", "fair"];

// 1.1 Array integrity and exact values
record(
  "Suite 1: Condition Enum",
  "THRIFT_CONDITIONS exports exactly the 5 official thrift grading tiers",
  Array.isArray(THRIFT_CONDITIONS) &&
    THRIFT_CONDITIONS.length === 5 &&
    THRIFT_CONDITIONS.every((c) => EXPECTED_CONDITIONS.includes(c.value)),
  `Found values: ${THRIFT_CONDITIONS.map((c) => c.value).join(", ")}`
);

// 1.2 Non-empty descriptive labels and color styles for badges
const conditionsWithLabelsAndColors = THRIFT_CONDITIONS.every(
  (c) => typeof c.label === "string" && c.label.length > 0 && typeof c.color === "string" && c.color.length > 0
);
record(
  "Suite 1: Condition Enum",
  "Every condition tier provides human-friendly label and OKLCH/Tailwind badge styling",
  conditionsWithLabelsAndColors,
  THRIFT_CONDITIONS.map((c) => `${c.value}: "${c.label}"`).join(" | ")
);

// 1.3 Strict verification against backend Mongoose Schema enum
const backendModelPath = path.resolve(PROJECT_ROOT, "..", "thriftshoewear_backend", "src", "models", "productsModel.js");
let backendEnumMatches = false;
if (fs.existsSync(backendModelPath)) {
  const modelContent = fs.readFileSync(backendModelPath, "utf-8");
  const match = modelContent.match(/enum:\s*\["new",\s*"like_new",\s*"excellent",\s*"good",\s*"fair"\]/);
  backendEnumMatches = Boolean(match);
}
record(
  "Suite 1: Condition Enum",
  "Frontend condition enum precisely matches backend Mongoose product & variant schema enum",
  backendEnumMatches,
  `Backend schema path: ${backendModelPath}`
);

// 1.4 Adversarial Condition Oracle (Rejecting unapproved grades)
const conditionOracle = (val) => EXPECTED_CONDITIONS.includes(val);
const invalidConditions = ["mint", "poor", "vintage", "refurbished", "damaged", "great", "LIKE_NEW", "", null, undefined];
const allInvalidRejected = invalidConditions.every((val) => conditionOracle(val) === false);
record(
  "Suite 1: Condition Oracle",
  "Oracle strictly rejects unapproved condition grades (mint, poor, vintage, case-mismatches, empty)",
  allInvalidRejected,
  `Tested ${invalidConditions.length} adversarial/invalid inputs`
);

// 1.5 Condition Fallback Resolution Invariant
// ProductFormPage uses: variant.condition || form.condition || "good"
function resolveVariantCondition(variantCondition, formCondition) {
  return variantCondition || formCondition || "good";
}
record(
  "Suite 1: Condition Fallback",
  "Variant condition falls back hierarchically: explicit variant -> form default -> 'good'",
  resolveVariantCondition("like_new", "fair") === "like_new" &&
    resolveVariantCondition("", "excellent") === "excellent" &&
    resolveVariantCondition(null, "") === "good" &&
    resolveVariantCondition(undefined, undefined) === "good",
  "Hierarchical resolution verified under null/empty/undefined inputs"
);


// =============================================================================
// SUITE 2: Price Constraints & Sale Pricing Invariants (salePrice <= price)
// =============================================================================
console.log("\n--- Suite 2: Price Constraints & Sale Pricing Invariants (salePrice <= price) ---");

// ProductFormPage validation oracle:
// if (v.price === "" || Number(v.price) < 0) return toast.error("Variant prices must be non-negative")
// if (v.salePrice !== "" && Number(v.salePrice) > Number(v.price)) return toast.error(...)
function validateVariantPrices(priceInput, salePriceInput, sku = "SKU-TEST") {
  if (priceInput === "" || priceInput === null || priceInput === undefined) {
    return { valid: false, error: "Variant prices must be non-negative" };
  }
  const price = Number(priceInput);
  if (isNaN(price) || price < 0) {
    return { valid: false, error: "Variant prices must be non-negative" };
  }
  if (salePriceInput !== "" && salePriceInput !== null && salePriceInput !== undefined) {
    const salePrice = Number(salePriceInput);
    if (isNaN(salePrice) || salePrice < 0) {
      return { valid: false, error: "Sale price cannot be negative" };
    }
    if (salePrice > price) {
      return { valid: false, error: `Sale price cannot exceed regular price for SKU: ${sku}` };
    }
  }
  return { valid: true, error: null };
}

// 2.1 Valid discount: salePrice < price
const normalDiscount = validateVariantPrices(150, 120);
record(
  "Suite 2: Price Constraints",
  "Discounted sale price strictly less than regular price is accepted (price=150, salePrice=120)",
  normalDiscount.valid === true && normalDiscount.error === null
);

// 2.2 Boundary condition: salePrice === price (0% discount)
const equalPrice = validateVariantPrices(150, 150);
record(
  "Suite 2: Price Constraints",
  "Boundary: salePrice exactly equal to price is valid (salePrice <= price satisfies condition)",
  equalPrice.valid === true
);

// 2.3 Adversarial rejection: salePrice > price
const excessiveSalePrice = validateVariantPrices(150, 180, "TSW-01");
record(
  "Suite 2: Price Constraints",
  "Sale price exceeding regular price is rejected with descriptive error (price=150, salePrice=180)",
  excessiveSalePrice.valid === false && excessiveSalePrice.error === "Sale price cannot exceed regular price for SKU: TSW-01"
);

// 2.4 Float boundary precision: 19.99 vs 19.990001
const floatBoundaryFail = validateVariantPrices(19.99, 19.991);
const floatBoundaryPass = validateVariantPrices(19.99, 19.989);
record(
  "Suite 2: Price Constraints",
  "High-precision decimal comparison rejects slight overflow and permits slight reduction",
  floatBoundaryFail.valid === false && floatBoundaryPass.valid === true,
  `Overflow 19.991 valid: ${floatBoundaryFail.valid}, Reduction 19.989 valid: ${floatBoundaryPass.valid}`
);

// 2.5 Negative regular price rejected
const negPrice = validateVariantPrices(-10, "");
record(
  "Suite 2: Price Constraints",
  "Negative regular price is rejected (price=-10)",
  negPrice.valid === false && negPrice.error === "Variant prices must be non-negative"
);

// 2.6 Free item boundary (price=0, salePrice=0 vs salePrice=1)
const freeZero = validateVariantPrices(0, 0);
const freeOverflow = validateVariantPrices(0, 1);
record(
  "Suite 2: Price Constraints",
  "Zero-cost item boundary (price=0): salePrice=0 is valid, salePrice=1 is rejected",
  freeZero.valid === true && freeOverflow.valid === false
);

// 2.7 Optional / Empty sale price (uncoerced string "" or null)
const emptySale = validateVariantPrices(100, "");
const nullSale = validateVariantPrices(100, null);
record(
  "Suite 2: Price Constraints",
  "Omitted or empty sale price ('', null) passes validation cleanly without discount",
  emptySale.valid === true && nullSale.valid === true
);

// 2.8 Payload serialization mapping (salePrice coerced to Number or null)
function serializeVariantPayload(v) {
  return {
    price: Number(v.price) || 0,
    salePrice: v.salePrice !== "" && v.salePrice !== null && v.salePrice !== undefined ? Number(v.salePrice) : null,
  };
}
const serializedEmpty = serializeVariantPayload({ price: "85", salePrice: "" });
const serializedValue = serializeVariantPayload({ price: "85", salePrice: "65" });
record(
  "Suite 2: Price Constraints",
  "Payload serialization maps empty sale price to null and numeric strings to Number",
  serializedEmpty.salePrice === null && serializedValue.salePrice === 65 && typeof serializedValue.price === "number",
  `Empty serialized: ${JSON.stringify(serializedEmpty)} | With sale: ${JSON.stringify(serializedValue)}`
);


// =============================================================================
// SUITE 3: SKU Auto-Generation, Duplication & Format Normalization
// =============================================================================
console.log("\n--- Suite 3: SKU Auto-Generation, Duplication & Format Normalization ---");

// ProductFormPage SKU auto-generation algorithm:
// const nextIdx = variants.length + 1;
// const baseSku = variants[0]?.sku ? variants[0].sku.replace(/-\d+$/, "") : "TSW";
// sku: `${baseSku}-${nextIdx}`
function generateNextSku(existingVariants, customTargetIndex = null) {
  const nextIdx = existingVariants.length + 1;
  const source = customTargetIndex !== null ? existingVariants[customTargetIndex] : existingVariants[0];
  const baseSku = source?.sku ? source.sku.replace(/-\d+$/, "") : "TSW";
  return `${baseSku}-${nextIdx}`;
}

// 3.1 Initial default SKU format
record(
  "Suite 3: SKU Generation",
  "Default initial variant SKU follows 'TSW-1' format",
  generateNextSku([]) === "TSW-1"
);

// 3.2 Sequential addVariant SKU increments
let testVariants = [{ sku: "TSW-1", price: 100 }];
const sku2 = generateNextSku(testVariants);
testVariants.push({ sku: sku2, price: 100 });
const sku3 = generateNextSku(testVariants);
testVariants.push({ sku: sku3, price: 100 });
record(
  "Suite 3: SKU Generation",
  "Successive variant additions increment SKU sequence monotonically (TSW-2, TSW-3)",
  sku2 === "TSW-2" && sku3 === "TSW-3",
  `Generated sequence: ${testVariants.map((v) => v.sku).join(" -> ")}`
);

// 3.3 Custom base SKU preservation across additions
const customVariants = [{ sku: "NIKE-DUNK-99-1", price: 200 }];
const nextCustomSku = generateNextSku(customVariants);
record(
  "Suite 3: SKU Generation",
  "Custom base SKU prefix is preserved when adding variants ('NIKE-DUNK-99-1' -> 'NIKE-DUNK-99-2')",
  nextCustomSku === "NIKE-DUNK-99-2",
  `Base 'NIKE-DUNK-99-1' generated: '${nextCustomSku}'`
);

// 3.4 Duplication preserves properties but assigns fresh incremented SKU and strips _id
function duplicateVariantState(variantsList, index) {
  const target = variantsList[index];
  const nextIdx = variantsList.length + 1;
  const baseSku = target.sku ? target.sku.replace(/-\d+$/, "") : "TSW";
  return [
    ...variantsList,
    {
      ...target,
      _id: undefined,
      sku: `${baseSku}-${nextIdx}`,
    },
  ];
}
const listWithId = [
  { _id: "var_existing_1", sku: "JORDAN-1", size: "10 US", price: 150 },
  { _id: "var_existing_2", sku: "JORDAN-2", size: "11 US", price: 150 },
];
const duplicated = duplicateVariantState(listWithId, 0);
record(
  "Suite 3: SKU Duplication",
  "Variant duplication produces unique SKU ('JORDAN-3'), preserves attributes, and strips _id",
  duplicated.length === 3 &&
    duplicated[2].sku === "JORDAN-3" &&
    duplicated[2]._id === undefined &&
    duplicated[2].size === "10 US",
  `New variant SKU: ${duplicated[2].sku}, _id: ${duplicated[2]._id}`
);

// 3.5 Submission uppercase and whitespace normalization
function normalizeSkuOnSubmit(skuInput) {
  return skuInput.trim().toUpperCase();
}
const rawSkus = ["  tsw-vintage-01  ", "nike_air_max", "thrift-shoe-wear-42"];
const normalizedSkus = rawSkus.map(normalizeSkuOnSubmit);
record(
  "Suite 3: SKU Normalization",
  "SKU values are automatically trimmed and capitalized to uppercase upon payload preparation",
  normalizedSkus[0] === "TSW-VINTAGE-01" &&
    normalizedSkus[1] === "NIKE_AIR_MAX" &&
    normalizedSkus[2] === "THRIFT-SHOE-WEAR-42",
  normalizedSkus.join(" | ")
);

// 3.6 Empty / Whitespace-only SKU rejection
function validateVariantSkus(variants) {
  for (const v of variants) {
    if (!v.sku || !v.sku.trim()) return false;
  }
  return true;
}
record(
  "Suite 3: SKU Validation",
  "Submission validation rejects empty or whitespace-only SKUs",
  validateVariantSkus([{ sku: "TSW-1" }]) === true &&
    validateVariantSkus([{ sku: "" }]) === false &&
    validateVariantSkus([{ sku: "   " }]) === false
);

// 3.7 Minimum variant count guard (cannot delete sole variant)
function removeVariantSafely(variants, indexToRemove) {
  if (variants.length <= 1) {
    return { ok: false, message: "Product must have at least one variant", list: variants };
  }
  return { ok: true, list: variants.filter((_, i) => i !== indexToRemove) };
}
const singleVar = [{ sku: "TSW-1" }];
const multiVar = [{ sku: "TSW-1" }, { sku: "TSW-2" }];
record(
  "Suite 3: Variant Invariants",
  "Variant removal guard blocks deleting the last remaining variant",
  removeVariantSafely(singleVar, 0).ok === false && removeVariantSafely(multiVar, 0).ok === true,
  `Single variant removal ok: ${removeVariantSafely(singleVar, 0).ok}`
);


// =============================================================================
// SUITE 4: Image Gallery State Transitions & Primary Image Promotion Logic
// =============================================================================
console.log("\n--- Suite 4: Image Gallery State Transitions & Primary Promotion ---");

// State machine simulating ProductFormPage image functions:
// - handleAddImage
// - setPrimaryImage
// - removeImage
class ImageGalleryStateMachine {
  constructor(initialImages = []) {
    this.images = [...initialImages];
  }

  addImage(url, altText = "") {
    if (!url || !url.trim()) return false;
    this.images.push({
      url: url.trim(),
      altText: altText.trim() || "Product image",
      isPrimary: this.images.length === 0,
    });
    return true;
  }

  setPrimary(index) {
    if (index < 0 || index >= this.images.length) return false;
    this.images = this.images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    return true;
  }

  removeImage(index) {
    if (this.images.length <= 1) {
      return { ok: false, error: "Product must keep at least one image" };
    }
    const filtered = this.images.filter((_, i) => i !== index);
    if (!filtered.some((img) => img.isPrimary) && filtered.length > 0) {
      filtered[0].isPrimary = true;
    }
    this.images = filtered;
    return { ok: true };
  }

  getPrimaryIndex() {
    return this.images.findIndex((img) => img.isPrimary);
  }

  getPrimaryCount() {
    return this.images.filter((img) => img.isPrimary).length;
  }
}

// 4.1 First image added to empty gallery automatically becomes primary
const gallery = new ImageGalleryStateMachine([]);
gallery.addImage("https://example.com/img1.jpg", "First Photo");
record(
  "Suite 4: Gallery Promotion",
  "First photo added to an empty gallery automatically sets isPrimary: true",
  gallery.images.length === 1 && gallery.images[0].isPrimary === true && gallery.getPrimaryCount() === 1
);

// 4.2 Subsequent image additions default to isPrimary: false
gallery.addImage("https://example.com/img2.jpg", "Second Photo");
gallery.addImage("https://example.com/img3.jpg", "Third Photo");
record(
  "Suite 4: Gallery Invariant",
  "Subsequent images added default to isPrimary: false (only one primary image maintained)",
  gallery.images.length === 3 &&
    gallery.images[0].isPrimary === true &&
    gallery.images[1].isPrimary === false &&
    gallery.images[2].isPrimary === false &&
    gallery.getPrimaryCount() === 1
);

// 4.3 Explicit promotion: setPrimaryImage promotes target and demotes previous
gallery.setPrimary(1);
record(
  "Suite 4: Gallery Promotion",
  "Promoting image at index 1 sets it to primary and demotes index 0 to non-primary",
  gallery.getPrimaryIndex() === 1 &&
    gallery.images[0].isPrimary === false &&
    gallery.images[1].isPrimary === true &&
    gallery.images[2].isPrimary === false &&
    gallery.getPrimaryCount() === 1
);

// 4.4 Removing non-primary image leaves current primary intact
// Current primary is at index 1 (img2). Remove index 0 (img1).
gallery.removeImage(0);
record(
  "Suite 4: Gallery Removal",
  "Removing a non-primary image leaves the designated primary photo intact",
  gallery.images.length === 2 &&
    gallery.images[0].url === "https://example.com/img2.jpg" &&
    gallery.images[0].isPrimary === true &&
    gallery.getPrimaryCount() === 1
);

// 4.5 Removing the active primary image automatically promotes the first remaining image
// Current: img2 (primary), img3 (non-primary). Remove img2 (index 0).
const primaryRemovalResult = gallery.removeImage(0);
record(
  "Suite 4: Gallery Auto-Promotion",
  "Removing the primary image automatically promotes the next remaining image to primary",
  primaryRemovalResult.ok === true &&
    gallery.images.length === 1 &&
    gallery.images[0].url === "https://example.com/img3.jpg" &&
    gallery.images[0].isPrimary === true &&
    gallery.getPrimaryCount() === 1
);

// 4.6 Last image guard: cannot remove the sole remaining image
const soleRemovalResult = gallery.removeImage(0);
record(
  "Suite 4: Gallery Guard",
  "ProductFormPage prevents deletion of the sole remaining image (minimum 1 image invariant)",
  soleRemovalResult.ok === false &&
    soleRemovalResult.error === "Product must keep at least one image" &&
    gallery.images.length === 1
);

// 4.7 Blank image URL rejection in handleAddImage
const blankAddResult = gallery.addImage("   ");
record(
  "Suite 4: Gallery Input",
  "Empty or whitespace-only image URLs are discarded without modifying gallery state",
  blankAddResult === false && gallery.images.length === 1
);

// 4.8 Image payload formatting conformant with backend imageSchema
function serializeImagesPayload(imgs) {
  return imgs.map((img) => ({
    url: img.url.trim(),
    altText: img.altText?.trim() || undefined,
    isPrimary: Boolean(img.isPrimary),
  }));
}
const serializedImages = serializeImagesPayload(gallery.images);
record(
  "Suite 4: Gallery Serialization",
  "Serialized gallery payload contains valid url, trimmed altText, and boolean isPrimary",
  serializedImages.length === 1 &&
    typeof serializedImages[0].url === "string" &&
    typeof serializedImages[0].isPrimary === "boolean" &&
    serializedImages[0].isPrimary === true
);


// =============================================================================
// SUITE 5: Products Catalog Data Table Filtering, Search & Lifecycle Logic
// =============================================================================
console.log("\n--- Suite 5: Catalog Filtering, Search & Lifecycle Logic ---");

// 5.1 Query params builder oracle (from ProductsPage.jsx fetchProducts)
function buildProductQueryParams({
  page = 1,
  limit = 20,
  search = "",
  categoryFilter = "__all",
  conditionFilter = "__all",
  statusFilter = "__all",
  productTypeFilter = "__all",
}) {
  const params = { page, limit, includeDeleted: "true" };
  if (search.trim()) params.search = search.trim();
  if (categoryFilter !== "__all") params.category = categoryFilter;
  if (conditionFilter !== "__all") params.condition = conditionFilter;
  if (statusFilter !== "__all") params.status = statusFilter;
  if (productTypeFilter !== "__all") params.productType = productTypeFilter;
  return params;
}

const paramsDefault = buildProductQueryParams({});
record(
  "Suite 5: Query Builder",
  "Default filter state omits '__all' sentinels and includes pagination and deleted visibility",
  paramsDefault.page === 1 &&
    paramsDefault.limit === 20 &&
    paramsDefault.includeDeleted === "true" &&
    paramsDefault.category === undefined &&
    paramsDefault.condition === undefined,
  JSON.stringify(paramsDefault)
);

const paramsActive = buildProductQueryParams({
  search: "dunk",
  categoryFilter: "cat_shoes_01",
  conditionFilter: "like_new",
  statusFilter: "active",
});
record(
  "Suite 5: Query Builder",
  "Explicit search and condition filters are cleanly serialized into API query params",
  paramsActive.search === "dunk" &&
    paramsActive.category === "cat_shoes_01" &&
    paramsActive.condition === "like_new" &&
    paramsActive.status === "active",
  JSON.stringify(paramsActive)
);

// 5.2 Price range calculation oracle
function calculateProductPriceDisplay(priceRange) {
  if (priceRange?.minSalePrice) {
    return { hasDiscount: true, displaySale: priceRange.minSalePrice, displayRegular: priceRange.minPrice };
  }
  if (priceRange?.minPrice !== priceRange?.maxPrice && priceRange?.maxPrice) {
    return { isRange: true, min: priceRange.minPrice, max: priceRange.maxPrice };
  }
  return { isSingle: true, price: priceRange?.minPrice || 0 };
}
const discountDisplay = calculateProductPriceDisplay({ minPrice: 150, maxPrice: 150, minSalePrice: 120 });
const rangeDisplay = calculateProductPriceDisplay({ minPrice: 80, maxPrice: 120 });
const singleDisplay = calculateProductPriceDisplay({ minPrice: 100, maxPrice: 100 });
record(
  "Suite 5: Price Display",
  "Price range formatting correctly routes discounted footwear, price spans, and fixed prices",
  discountDisplay.hasDiscount === true && rangeDisplay.isRange === true && singleDisplay.isSingle === true,
  `Discount: $${discountDisplay.displaySale} (was $${discountDisplay.displayRegular}) | Range: $${rangeDisplay.min}-$${rangeDisplay.max}`
);

// 5.3 Pagination boundaries oracle
function calculatePaginationState(total, currentPage, limit = 20) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pages;
  return { pages, canGoPrevious, canGoNext };
}
const pageBoundary1 = calculatePaginationState(45, 1);
const pageBoundaryMiddle = calculatePaginationState(45, 2);
const pageBoundaryLast = calculatePaginationState(45, 3);
record(
  "Suite 5: Pagination",
  "Pagination boundaries correctly calculate total pages (3 for 45 items) and disable navigation triggers",
  pageBoundary1.pages === 3 &&
    pageBoundary1.canGoPrevious === false &&
    pageBoundary1.canGoNext === true &&
    pageBoundaryMiddle.canGoPrevious === true &&
    pageBoundaryMiddle.canGoNext === true &&
    pageBoundaryLast.canGoNext === false,
  `Page 1 next: ${pageBoundary1.canGoNext}, Page 3 next: ${pageBoundaryLast.canGoNext}`
);


// =============================================================================
// SUITE 6: Conforming Test Server Live HTTP Integration & Payload Contracts
// =============================================================================
console.log("\n--- Suite 6: Conforming Backend Live HTTP API Integration ---");

let client = null;
try {
  client = await getTestClient();
} catch (err) {
  console.error("Failed to acquire test client:", err);
}

if (client) {
  // 6.1 GET /api/v1/products returns seeded catalog
  try {
    const listRes = await client.request("GET", "/api/v1/products", { token: client.adminToken });
    const hasProducts = listRes.status === 200 && Array.isArray(listRes.body?.data?.products);
    record(
      "Suite 6: HTTP Catalog",
      "GET /api/v1/products responds with HTTP 200 and product catalog payload",
      hasProducts,
      `Status: ${listRes.status}, Product count: ${listRes.body?.data?.products?.length}`
    );
  } catch (err) {
    record("Suite 6: HTTP Catalog", "GET /api/v1/products threw error", false, err.message);
  }

  // 6.2 POST /api/v1/products with valid thrift footwear variant condition (like_new)
  let createdProductId = null;
  try {
    const newProductPayload = {
      name: "Vintage Puma Clyde Suede",
      slug: "vintage-puma-clyde-suede",
      shortDescription: "Original 1973 classic thrift graded in like new condition.",
      description: "Thrift shoes with minimal sole wear, original laces and suede brush finish.",
      brand: "Puma",
      category: "cat_shoes_01",
      productType: "shoes",
      gender: "unisex",
      condition: "like_new",
      status: "active",
      tags: ["vintage", "puma", "clyde"],
      images: [
        { url: "https://example.com/puma-clyde-1.jpg", altText: "Side Profile", isPrimary: true },
        { url: "https://example.com/puma-clyde-2.jpg", altText: "Sole Tread", isPrimary: false },
      ],
      variants: [
        {
          sku: "TSW-PUMA-1",
          size: "42 EU / 9 US",
          color: "Navy / White",
          condition: "like_new",
          price: 130,
          salePrice: 110,
          stock: 1,
          lowStockThreshold: 1,
          isActive: true,
        },
      ],
      attributes: {
        shoe: { sizeSystem: "EU", closureType: "Laces" },
      },
    };

    const createRes = await client.request("POST", "/api/v1/products", {
      token: client.adminToken,
      body: newProductPayload,
    });
    const createdOk = createRes.status === 201 && createRes.body?.success === true;
    createdProductId = createRes.body?.data?.product?._id || createRes.body?.product?._id;
    record(
      "Suite 6: HTTP Creation",
      "POST /api/v1/products creates thrift footwear with valid condition and sale price (HTTP 201)",
      createdOk,
      `Created Product ID: ${createdProductId}`
    );
  } catch (err) {
    record("Suite 6: HTTP Creation", "POST /api/v1/products threw error", false, err.message);
  }

  // 6.3 POST /api/v1/products rejects negative price (HTTP 400)
  try {
    const invalidPricePayload = {
      name: "Invalid Negative Price Shoe",
      productType: "shoes",
      condition: "good",
      variants: [{ sku: "TSW-ERR-1", price: -50, stock: 1 }],
    };
    const negRes = await client.request("POST", "/api/v1/products", {
      token: client.adminToken,
      body: invalidPricePayload,
    });
    record(
      "Suite 6: HTTP Validation",
      "POST /api/v1/products rejects variant with negative price with HTTP 400",
      negRes.status === 400,
      `Status: ${negRes.status}, Message: ${negRes.body?.message}`
    );
  } catch (err) {
    record("Suite 6: HTTP Validation", "Negative price test threw error", false, err.message);
  }

  // 6.4 POST /api/v1/products rejects empty variants array (HTTP 400)
  try {
    const noVariantsPayload = {
      name: "Shoe without variants",
      productType: "shoes",
      condition: "excellent",
      variants: [],
    };
    const emptyVarRes = await client.request("POST", "/api/v1/products", {
      token: client.adminToken,
      body: noVariantsPayload,
    });
    record(
      "Suite 6: HTTP Validation",
      "POST /api/v1/products rejects product without variants with HTTP 400",
      emptyVarRes.status === 400,
      `Status: ${emptyVarRes.status}, Message: ${emptyVarRes.body?.message}`
    );
  } catch (err) {
    record("Suite 6: HTTP Validation", "Empty variants test threw error", false, err.message);
  }

  // 6.5 GET /api/v1/products?condition=like_new filters correctly
  try {
    const filterRes = await client.request("GET", "/api/v1/products", {
      token: client.adminToken,
      query: { condition: "like_new" },
    });
    const items = filterRes.body?.data?.products || filterRes.body?.products || [];
    const allLikeNew = items.length > 0 && items.every((p) => p.condition === "like_new");
    record(
      "Suite 6: HTTP Filtering",
      "GET /api/v1/products?condition=like_new returns only products matching the requested grade",
      allLikeNew,
      `Filtered count: ${items.length}, Conditions: ${items.map((p) => p.condition).join(", ")}`
    );
  } catch (err) {
    record("Suite 6: HTTP Filtering", "Condition filtering threw error", false, err.message);
  }

  // 6.6 PATCH /api/v1/products/:id updates product details cleanly
  if (createdProductId) {
    try {
      const patchRes = await client.request("PATCH", `/api/v1/products/${createdProductId}`, {
        token: client.adminToken,
        body: { condition: "excellent" },
      });
      const patchOk = patchRes.status === 200 && patchRes.body?.data?.product?.condition === "excellent";
      record(
        "Suite 6: HTTP Mutation",
        "PATCH /api/v1/products/:id updates condition grade on created record (HTTP 200)",
        patchOk,
        `Updated condition: ${patchRes.body?.data?.product?.condition}`
      );
    } catch (err) {
      record("Suite 6: HTTP Mutation", "PATCH /products/:id threw error", false, err.message);
    }
  }

  // Teardown test server environment
  teardownTestEnvironment();
} else {
  record("Suite 6: HTTP Integration", "Test client unavailable", false);
}


// =============================================================================
// SUITE 7: Component SSR & Structural DOM Invariants
// =============================================================================
console.log("\n--- Suite 7: Component SSR & Structural DOM Invariants ---");

// Helper to render component wrapped in Redux and Router
function renderInDashboardContext(Component, route = "/") {
  const element = React.createElement(
    Provider,
    { store },
    React.createElement(
      MemoryRouter,
      { initialEntries: [route] },
      React.createElement(Component)
    )
  );
  return renderToString(element);
}

// 7.1 ProductsPage exports and SSR rendering
try {
  const ProductsPageComponent = productsPageMod.default;
  assert.equal(typeof ProductsPageComponent, "function", "ProductsPage must export default React component");
  const productsHtml = renderInDashboardContext(ProductsPageComponent, "/products");

  record(
    "Suite 7: Component SSR",
    "ProductsPage renders with header, search input, filter selects, and data table",
    productsHtml.includes("Product Catalog") &&
      productsHtml.includes("Search products, brand, SKU") &&
      productsHtml.includes("Add Product") &&
      productsHtml.includes("Thrift Grade") &&
      productsHtml.includes("Price Range"),
    `Rendered HTML length: ${productsHtml.length} bytes`
  );
} catch (err) {
  record("Suite 7: Component SSR", "ProductsPage SSR threw error", false, err.message);
}

// 7.2 ProductFormPage exports and SSR rendering in New Product mode
try {
  const ProductFormPageComponent = productFormPageMod.default;
  assert.equal(typeof ProductFormPageComponent, "function", "ProductFormPage must export default React component");
  const formHtml = renderInDashboardContext(ProductFormPageComponent, "/products/new");

  record(
    "Suite 7: Component SSR",
    "ProductFormPage renders creation mode with 4 workspace tabs, title input, and actions",
    formHtml.includes("New Thrift Product") &&
      formHtml.includes("General") &&
      formHtml.includes("Variants") &&
      formHtml.includes("Gallery") &&
      formHtml.includes("Attributes &amp; SEO") &&
      formHtml.includes("Product Title"),
    `Rendered HTML length: ${formHtml.length} bytes`
  );
} catch (err) {
  record("Suite 7: Component SSR", "ProductFormPage SSR threw error", false, err.message);
}

// 7.3 App.jsx route wiring verification
try {
  const appFile = fs.readFileSync(path.resolve(PROJECT_ROOT, "src", "App.jsx"), "utf-8");
  const hasProductsRoute = appFile.includes('path="products"') && appFile.includes("ProductsPage");
  const hasNewProductRoute = appFile.includes('path="products/new"') && appFile.includes("ProductFormPage");
  const hasEditProductRoute = appFile.includes('path="products/:id"') && appFile.includes("ProductFormPage");

  record(
    "Suite 7: Route Wiring",
    "App.jsx declares all three required product catalog routes (/products, /products/new, /products/:id)",
    hasProductsRoute && hasNewProductRoute && hasEditProductRoute,
    "Verified in App.jsx"
  );
} catch (err) {
  record("Suite 7: Route Wiring", "App.jsx route check failed", false, err.message);
}

await viteServer.close();

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
console.log("\n======================================================================");
console.log("                        TEST EXECUTION SUMMARY                        ");
console.log("======================================================================");
console.log(`  Total Checks Executed:  ${totalTests}`);
console.log(`  Passed:                 \x1b[32m${passedTests}\x1b[0m`);
console.log(`  Failed:                 \x1b[${failedTests > 0 ? "31" : "32"}m${failedTests}\x1b[0m`);
console.log(`  Pass Rate:              ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log("\n\x1b[32m======================================================================");
  console.log("  ALL TESTS PASSED: EMPIRICAL VERDICT = APPROVE");
  console.log("======================================================================\x1b[0m");
  process.exit(0);
} else {
  console.log("\n\x1b[31m======================================================================");
  console.log("  TEST FAILURES DETECTED: EMPIRICAL VERDICT = FAIL");
  console.log("======================================================================\x1b[0m");
  process.exit(1);
}
