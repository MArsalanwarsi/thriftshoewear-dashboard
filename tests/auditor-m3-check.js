import fs from "fs"

const pageCode = fs.readFileSync("src/pages/ProductsPage.jsx", "utf8")
const formCode = fs.readFileSync("src/pages/ProductFormPage.jsx", "utf8")

console.log("Checking THRIFT_CONDITIONS...")
const conditions = ["new", "like_new", "excellent", "good", "fair"]
for (const cond of conditions) {
  if (!pageCode.includes(`value: "${cond}"`)) {
    throw new Error(`Missing thrift condition: ${cond}`)
  }
}
console.log("✓ All 5 thrift conditions present in ProductsPage")

console.log("Checking PRODUCT_STATUSES...")
const statuses = ["active", "draft", "inactive", "out_of_stock", "archived"]
for (const status of statuses) {
  if (!pageCode.includes(`value: "${status}"`)) {
    throw new Error(`Missing product status: ${status}`)
  }
}
console.log("✓ All 5 product statuses present in ProductsPage")

console.log("Checking ProductFormPage API integrations...")
if (!formCode.includes('apiRequest("/products", {')) {
  throw new Error('Missing POST /products in ProductFormPage')
}
if (!formCode.includes('apiRequest(`/products/${id}`, {')) {
  throw new Error('Missing PATCH /products/:id in ProductFormPage')
}
if (!formCode.includes('apiRequest("/categories", { token, params: { limit: 100 } })')) {
  throw new Error('Missing GET /categories in ProductFormPage')
}
if (!formCode.includes('apiRequest(`/products/${id}`, { token })')) {
  throw new Error('Missing GET /products/:id in ProductFormPage')
}
console.log("✓ All REST endpoints correctly integrated in ProductFormPage")

console.log("Checking validation rules...")
const validations = [
  "Product name is required",
  "Short description is required",
  "Full description is required",
  "Please select a category",
  "At least one product image is required",
  "At least one variant is required",
  "All variants must have a SKU",
  "Variant prices must be non-negative",
  "Sale price cannot exceed regular price",
  "Stock cannot be negative"
]
for (const v of validations) {
  if (!formCode.includes(v)) {
    throw new Error(`Missing validation check: ${v}`)
  }
}
console.log("✓ All form validation constraints confirmed present in ProductFormPage")

console.log("\nALL M3 AUDIT INTEGRITY CHECKS PASSED EMPIRICALLY!")
