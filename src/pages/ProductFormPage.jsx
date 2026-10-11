import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  ArrowLeft,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { apiRequest } from "../lib/api"
import { humanize } from "../lib/format"
import { ImageGalleryUpload } from "../components/common/ImageGalleryUpload"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Label } from "../components/ui/label"
import { Switch } from "../components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Separator } from "../components/ui/separator"
import { THRIFT_CONDITIONS } from "./ProductsPage"

const PRODUCT_TYPES = ["shoes", "bags", "jewelry", "accessories"]
const GENDERS = ["men", "women", "unisex", "kids", "none"]
const STATUSES = ["draft", "active", "inactive", "out_of_stock"]

const INITIAL_VARIANT = {
  sku: "TSW-1",
  size: "42 EU / 9 US",
  color: "Original",
  material: "Leather",
  condition: "good",
  price: 150,
  salePrice: "",
  stock: 1,
  lowStockThreshold: 1,
  isActive: true,
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const token = useSelector((state) => state.auth?.token)

  // Loading and Submitting states
  const [loading, setLoading] = React.useState(isEditMode)
  const [submitting, setSubmitting] = React.useState(false)

  // Live Categories list
  const [categories, setCategories] = React.useState([])

  // Core Product Form State
  const [form, setForm] = React.useState({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    brand: "Thrift Shoe Wear",
    category: "",
    subCategory: "",
    productType: "shoes",
    gender: "unisex",
    condition: "good",
    status: "active",
    tags: "",
    isFeatured: false,
    isNewArrival: true,
    isBestSeller: false,
    // Attributes
    sizeSystem: "EU",
    closureType: "Laces",
    // Shipping
    weight: 800,
    freeShipping: false,
    shippingClass: "standard",
    // SEO
    metaTitle: "",
    metaDescription: "",
    keywords: "",
  })

  // Images state
  const [images, setImages] = React.useState([])

  // Variants state
  const [variants, setVariants] = React.useState([INITIAL_VARIANT])

  // Load Categories
  React.useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await apiRequest("/categories", { token, params: { limit: 100 } })
        if (res.data?.categories) {
          setCategories(res.data.categories)
          if (!isEditMode && res.data.categories.length > 0) {
            setForm((prev) => ({ ...prev, category: res.data.categories[0]._id }))
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err)
      }
    }
    fetchCategories()
  }, [token, isEditMode])

  // Load Existing Product if Edit Mode
  React.useEffect(() => {
    if (!isEditMode) return

    async function loadProduct() {
      setLoading(true)
      try {
        const res = await apiRequest(`/products/${id}`, { token })
        const product = res.data?.product || res.product
        if (!product) throw new Error("Product record not found")

        setForm({
          name: product.name || "",
          slug: product.slug || "",
          shortDescription: product.shortDescription || "",
          description: product.description || "",
          brand: product.brand || "Thrift Shoe Wear",
          category: product.category?._id || product.category || "",
          subCategory: product.subCategory?._id || product.subCategory || "",
          productType: product.productType || "shoes",
          gender: product.gender || "unisex",
          condition: product.condition || "good",
          status: product.status || "draft",
          tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
          isFeatured: Boolean(product.isFeatured),
          isNewArrival: Boolean(product.isNewArrival),
          isBestSeller: Boolean(product.isBestSeller),
          sizeSystem: product.attributes?.shoe?.sizeSystem || "EU",
          closureType: product.attributes?.shoe?.closureType || "Laces",
          weight: product.shipping?.weight || 800,
          freeShipping: Boolean(product.shipping?.freeShipping),
          shippingClass: product.shipping?.shippingClass || "standard",
          metaTitle: product.seo?.metaTitle || "",
          metaDescription: product.seo?.metaDescription || "",
          keywords: Array.isArray(product.seo?.keywords) ? product.seo.keywords.join(", ") : "",
        })

        if (product.images?.length) {
          setImages(product.images)
        }

        if (product.variants?.length) {
          setVariants(
            product.variants.map((v) => ({
              _id: v._id,
              sku: v.sku || "",
              size: v.size || "",
              color: v.color || "",
              material: v.material || "",
              condition: v.condition || product.condition || "good",
              price: v.price ?? "",
              salePrice: v.salePrice ?? "",
              stock: v.stock ?? 1,
              lowStockThreshold: v.lowStockThreshold ?? 1,
              isActive: v.isActive !== false,
            }))
          )
        }
      } catch (err) {
        toast.error(err.message || "Failed to load product details")
        navigate("/products")
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [id, isEditMode, token, navigate])

  // Handle Field Change
  const updateField = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      // Auto-generate slug from name if creating
      if (key === "name" && !isEditMode && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))) {
        next.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      }
      return next
    })
  }

  // Variant operations
  const updateVariant = (index, key, val) => {
    setVariants((current) =>
      current.map((v, i) => (i === index ? { ...v, [key]: val } : v))
    )
  }

  const addVariant = () => {
    const nextIdx = variants.length + 1
    const baseSku = variants[0]?.sku ? variants[0].sku.replace(/-\d+$/, "") : "TSW"
    setVariants((current) => [
      ...current,
      {
        sku: `${baseSku}-${nextIdx}`,
        size: "",
        color: variants[0]?.color || "",
        material: variants[0]?.material || "",
        condition: form.condition || "good",
        price: variants[0]?.price || 100,
        salePrice: "",
        stock: 1,
        lowStockThreshold: 1,
        isActive: true,
      },
    ])
  }

  const duplicateVariant = (index) => {
    const target = variants[index]
    const nextIdx = variants.length + 1
    const baseSku = target.sku ? target.sku.replace(/-\d+$/, "") : "TSW"
    setVariants((current) => [
      ...current,
      {
        ...target,
        _id: undefined,
        sku: `${baseSku}-${nextIdx}`,
      },
    ])
  }

  const removeVariant = (index) => {
    if (variants.length <= 1) {
      toast.error("Product must have at least one variant")
      return
    }
    setVariants((current) => current.filter((_, i) => i !== index))
  }

  // Submit Handler
  const handleSubmit = async (overrideStatus) => {
    // 1. Validation
    if (!form.name.trim()) return toast.error("Product name is required")
    if (!form.shortDescription.trim()) return toast.error("Short description is required")
    if (!form.description.trim()) return toast.error("Full description is required")
    if (!form.category) return toast.error("Please select a category")
    if (!images.length || !images[0].url) return toast.error("At least one product image is required")
    if (!variants.length) return toast.error("At least one variant is required")

    for (const v of variants) {
      if (!v.sku.trim()) return toast.error("All variants must have a SKU")
      if (v.price === "" || Number(v.price) < 0) return toast.error("Variant prices must be non-negative")
      if (v.salePrice !== "" && Number(v.salePrice) > Number(v.price)) {
        return toast.error(`Sale price cannot exceed regular price for SKU: ${v.sku}`)
      }
      if (Number(v.stock) < 0) return toast.error(`Stock cannot be negative for SKU: ${v.sku}`)
    }

    setSubmitting(true)

    // Build Payload conforming directly to thriftshoewear_backend
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      brand: form.brand.trim() || "Thrift Shoe Wear",
      category: form.category,
      subCategory: form.subCategory || undefined,
      productType: form.productType,
      gender: form.gender,
      condition: form.condition,
      status: overrideStatus || form.status,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      images: images.map((img) => ({
        url: img.url.trim(),
        altText: img.altText?.trim() || undefined,
        isPrimary: Boolean(img.isPrimary),
      })),
      variants: variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        sku: v.sku.trim().toUpperCase(),
        size: v.size?.trim() || undefined,
        color: v.color?.trim() || undefined,
        material: v.material?.trim() || undefined,
        condition: v.condition || form.condition || "good",
        price: Number(v.price) || 0,
        salePrice: v.salePrice !== "" ? Number(v.salePrice) : null,
        stock: Number(v.stock) >= 0 ? Number(v.stock) : 1,
        lowStockThreshold: Number(v.lowStockThreshold) || 1,
        isActive: v.isActive !== false,
      })),
      attributes: {
        shoe: {
          sizeSystem: form.sizeSystem || "EU",
          closureType: form.closureType || undefined,
        },
      },
      shipping: {
        weight: Number(form.weight) || 0,
        freeShipping: Boolean(form.freeShipping),
        shippingClass: form.shippingClass || "standard",
      },
      seo: {
        metaTitle: form.metaTitle?.trim() || undefined,
        metaDescription: form.metaDescription?.trim() || undefined,
        keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean) : [],
      },
      isFeatured: Boolean(form.isFeatured),
      isNewArrival: Boolean(form.isNewArrival),
      isBestSeller: Boolean(form.isBestSeller),
    }

    try {
      if (isEditMode) {
        await apiRequest(`/products/${id}`, {
          method: "PATCH",
          token,
          body: payload,
        })
        toast.success("Product updated successfully")
      } else {
        await apiRequest("/products", {
          method: "POST",
          token,
          body: payload,
        })
        toast.success("Product created successfully")
      }
      navigate("/products")
    } catch (err) {
      toast.error(err.message || "Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar with Navigation & Submit Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/products")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEditMode ? "Edit Thrift Product" : "New Thrift Product"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? `Updating product ID: ${id}`
                : "List a new unique thrift shoe, handbag, or accessory listing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleSubmit("draft")}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("active")}
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {isEditMode ? "Save Changes" : "Publish Product"}
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[480px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
          <TabsTrigger value="images">Gallery ({images.length})</TabsTrigger>
          <TabsTrigger value="shipping">Attributes & SEO</TabsTrigger>
        </TabsList>

        {/* 1. General Info Tab */}
        <TabsContent value="general" className="space-y-4 pt-3">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Title, Slugs, Descriptions */}
            <div className="space-y-6 md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Details</CardTitle>
                  <CardDescription>Title, brand, condition grading, and descriptions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Title *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Nike Dunk Low Retro Vintage 1999"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        placeholder="Nike, Adidas, Jordan, Puma..."
                        value={form.brand}
                        onChange={(e) => updateField("brand", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input
                        id="slug"
                        placeholder="auto-generated-slug"
                        value={form.slug}
                        onChange={(e) => updateField("slug", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short Description * (Catalog snippet)</Label>
                    <Textarea
                      id="shortDescription"
                      rows={2}
                      placeholder="Concise overview of style, era, and standout thrift condition..."
                      value={form.shortDescription}
                      onChange={(e) => updateField("shortDescription", e.target.value)}
                      maxLength={300}
                    />
                    <p className="text-[11px] text-muted-foreground text-right">
                      {form.shortDescription.length}/300 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Full Description * (Story, wear assessment)</Label>
                    <Textarea
                      id="description"
                      rows={6}
                      placeholder="Detailed condition notes, signs of wear, sole tread depth, authentic markings..."
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (Comma-separated)</Label>
                    <Input
                      id="tags"
                      placeholder="retro, leather, streetwear, y2k, deadstock"
                      value={form.tags}
                      onChange={(e) => updateField("tags", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Category, Condition, Flags */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Classification</CardTitle>
                  <CardDescription>Category hierarchy & condition grade.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={form.category} onValueChange={(val) => updateField("category", val)}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Overall Thrift Condition */}
                  <div className="space-y-2">
                    <Label htmlFor="condition">Overall Condition Grade *</Label>
                    <Select value={form.condition} onValueChange={(val) => updateField("condition", val)}>
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THRIFT_CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Type & Gender */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="productType">Type</Label>
                      <Select value={form.productType} onValueChange={(val) => updateField("productType", val)}>
                        <SelectTrigger id="productType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {humanize(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={form.gender} onValueChange={(val) => updateField("gender", val)}>
                        <SelectTrigger id="gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {humanize(g)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={form.status} onValueChange={(val) => updateField("status", val)}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {humanize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Visibility Toggles */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs">Featured Product</Label>
                        <p className="text-[11px] text-muted-foreground">Show in hero featured section</p>
                      </div>
                      <Switch
                        checked={form.isFeatured}
                        onCheckedChange={(checked) => updateField("isFeatured", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs">New Arrival</Label>
                        <p className="text-[11px] text-muted-foreground">Badge as new thrift intake</p>
                      </div>
                      <Switch
                        checked={form.isNewArrival}
                        onCheckedChange={(checked) => updateField("isNewArrival", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs">Best Seller</Label>
                        <p className="text-[11px] text-muted-foreground">Highlight high demand sneaker</p>
                      </div>
                      <Switch
                        checked={form.isBestSeller}
                        onCheckedChange={(checked) => updateField("isBestSeller", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. Variants Tab */}
        <TabsContent value="variants" className="space-y-4 pt-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base">Thrift Variants & Inventory</CardTitle>
                <CardDescription>
                  Configure SKUs, sizes, individual condition grades, pricing, and stock.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 size-4" />
                Add Variant Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[140px]">SKU *</TableHead>
                    <TableHead className="w-[120px]">Size</TableHead>
                    <TableHead className="w-[120px]">Color</TableHead>
                    <TableHead className="w-[150px]">Condition *</TableHead>
                    <TableHead className="w-[110px]">Price *</TableHead>
                    <TableHead className="w-[110px]">Sale Price</TableHead>
                    <TableHead className="w-[90px]">Stock *</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant, index) => (
                    <TableRow key={variant._id || index}>
                      {/* SKU */}
                      <TableCell>
                        <Input
                          className="h-8 text-xs font-mono uppercase"
                          value={variant.sku}
                          placeholder="SKU-01"
                          onChange={(e) => updateVariant(index, "sku", e.target.value)}
                          required
                        />
                      </TableCell>

                      {/* Size */}
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          value={variant.size}
                          placeholder="42 EU / 9 US"
                          onChange={(e) => updateVariant(index, "size", e.target.value)}
                        />
                      </TableCell>

                      {/* Color */}
                      <TableCell>
                        <Input
                          className="h-8 text-xs"
                          value={variant.color}
                          placeholder="Red / White"
                          onChange={(e) => updateVariant(index, "color", e.target.value)}
                        />
                      </TableCell>

                      {/* Condition */}
                      <TableCell>
                        <Select
                          value={variant.condition || form.condition || "good"}
                          onValueChange={(val) => updateVariant(index, "condition", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {THRIFT_CONDITIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Regular Price */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs"
                          value={variant.price}
                          placeholder="0"
                          onChange={(e) => updateVariant(index, "price", e.target.value)}
                          required
                        />
                      </TableCell>

                      {/* Sale Price */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs"
                          value={variant.salePrice}
                          placeholder="Optional"
                          onChange={(e) => updateVariant(index, "salePrice", e.target.value)}
                        />
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-xs"
                          value={variant.stock}
                          placeholder="1"
                          onChange={(e) => updateVariant(index, "stock", e.target.value)}
                          required
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="Duplicate variant"
                            onClick={() => duplicateVariant(index)}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            title="Remove variant"
                            disabled={variants.length <= 1}
                            onClick={() => removeVariant(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Image Gallery Tab */}
        <TabsContent value="images" className="space-y-4 pt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Gallery</CardTitle>
              <CardDescription>
                Upload high resolution photos or select from existing media assets. Photos are compressed to WebP and hosted on Cloudflare R2.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageGalleryUpload
                images={images}
                onChange={setImages}
                folder="products"
                maxFiles={12}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Attributes & SEO Tab */}
        <TabsContent value="shipping" className="space-y-4 pt-3">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Footwear Attributes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Footwear Specific Attributes</CardTitle>
                <CardDescription>Size standards, closure mechanics, and weight.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sizeSystem">Size System</Label>
                    <Select value={form.sizeSystem} onValueChange={(val) => updateField("sizeSystem", val)}>
                      <SelectTrigger id="sizeSystem">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["EU", "UK", "US", "CM"].map((sys) => (
                          <SelectItem key={sys} value={sys}>
                            {sys} Standard
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closureType">Closure Type</Label>
                    <Input
                      id="closureType"
                      placeholder="Lace-up, Slip-on, Velcro"
                      value={form.closureType}
                      onChange={(e) => updateField("closureType", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (grams)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      value={form.weight}
                      onChange={(e) => updateField("weight", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingClass">Shipping Class</Label>
                    <Select value={form.shippingClass} onValueChange={(val) => updateField("shippingClass", val)}>
                      <SelectTrigger id="shippingClass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Courier</SelectItem>
                        <SelectItem value="fragile">Fragile / Collectible</SelectItem>
                        <SelectItem value="heavy">Heavy Package</SelectItem>
                        <SelectItem value="premium">Express Air</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Free Shipping Eligibility</Label>
                    <p className="text-xs text-muted-foreground">Exempt order from delivery calculations</p>
                  </div>
                  <Switch
                    checked={form.freeShipping}
                    onCheckedChange={(checked) => updateField("freeShipping", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO & Meta Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dynamic SEO & Social Metadata</CardTitle>
                <CardDescription>Custom page titles and meta snippets for search ranking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    placeholder="e.g. Vintage Nike Dunk Low Retro (1999) | Thrift Shoe Wear"
                    value={form.metaTitle}
                    onChange={(e) => updateField("metaTitle", e.target.value)}
                    maxLength={70}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    rows={3}
                    placeholder="Brief snippet displayed under Google search results..."
                    value={form.metaDescription}
                    onChange={(e) => updateField("metaDescription", e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">SEO Keywords (Comma-separated)</Label>
                  <Input
                    id="keywords"
                    placeholder="vintage sneakers, thrift shoes, collector footwear"
                    value={form.keywords}
                    onChange={(e) => updateField("keywords", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
