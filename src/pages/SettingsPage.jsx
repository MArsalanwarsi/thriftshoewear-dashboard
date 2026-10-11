import * as React from "react"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "sonner"
import {
  AlertTriangle,
  Building2,
  CreditCard,
  ExternalLink,
  Eye,
  Globe,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Plus,
  RotateCcw,
  Save,
  Share2,
  ShieldAlert,
  Store,
  Trash2,
  Truck,
} from "lucide-react"

import { fetchSettings, updateSettings } from "../store/adminSlice"
import { ImageUpload } from "../components/common/ImageUpload"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Separator } from "../components/ui/separator"
import { Switch } from "../components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Textarea } from "../components/ui/textarea"

const DEFAULT_PAYMENT_METHODS = [
  {
    method: "cod",
    label: "Cash on Delivery (COD)",
    instructions: "Pay with exact cash to the courier upon parcel delivery.",
    isEnabled: true,
  },
  {
    method: "bank_transfer",
    label: "Direct Bank Transfer",
    instructions: "Bank: Meezan Bank | Title: Thrift Shoe Wear | IBAN: PK36MEZN00019283746501 | Send receipt via WhatsApp.",
    isEnabled: true,
  },
  {
    method: "easypaisa",
    label: "Easypaisa Mobile Wallet",
    instructions: "Easypaisa Account: 0300-1234567 | Title: Thrift Shoe Wear | Attach transaction ID at checkout.",
    isEnabled: true,
  },
  {
    method: "jazzcash",
    label: "JazzCash Mobile Wallet",
    instructions: "JazzCash Account: 0300-7654321 | Title: Thrift Shoe Wear | Attach transaction ID at checkout.",
    isEnabled: true,
  },
  {
    method: "sadapay",
    label: "SadaPay / NayaPay",
    instructions: "SadaPay: 0300-1122334 | Please send screenshot to support@thriftshoewear.com.",
    isEnabled: false,
  },
  {
    method: "card",
    label: "Credit / Debit Card",
    instructions: "Pay securely online with Visa or Mastercard.",
    isEnabled: false,
  },
]

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "twitter", label: "Twitter / X" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "linkedin", label: "LinkedIn" },
]

const SUPPORTED_CURRENCIES = [
  { value: "PKR", label: "PKR (Pakistani Rupee)" },
  { value: "USD", label: "USD (US Dollar)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "GBP", label: "GBP (British Pound)" },
  { value: "AED", label: "AED (UAE Dirham)" },
  { value: "SAR", label: "SAR (Saudi Riyal)" },
]

const SUPPORTED_TIMEZONES = [
  { value: "Asia/Karachi", label: "Asia/Karachi (GMT+5)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4)" },
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "Europe/London", label: "Europe/London (GMT+1)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
]

const initialFormState = {
  // General & Identity
  siteName: "Thrift Shoe Wear",
  tagline: "Curated thrift shoes, bags and jewelry",
  logoUrl: "",
  logoAltText: "",
  darkLogoUrl: "",
  darkLogoAltText: "",
  faviconUrl: "",
  faviconAltText: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  contactAddress: "",

  // Store & Regional
  currency: "PKR",
  timezone: "Asia/Karachi",
  lowStockThreshold: 2,
  allowGuestCheckout: false,

  // Shipping
  freeShippingThreshold: 5000,
  defaultShippingFee: 250,
  returnPolicy: "",

  // Payment Methods
  paymentMethods: DEFAULT_PAYMENT_METHODS,

  // Social Links
  socialLinks: [],

  // Announcements
  announcementEnabled: false,
  announcementMessage: "",
  announcementUrl: "",

  // Maintenance
  maintenanceEnabled: false,
  maintenanceMessage: "",

  // SEO
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  ogImageUrl: "",
  ogImageAltText: "",
}

function mapSettingsToForm(settings) {
  if (!settings) return initialFormState

  const paymentMethods =
    settings.paymentMethods && settings.paymentMethods.length > 0
      ? settings.paymentMethods.map((pm) => ({
          _id: pm._id,
          method: pm.method,
          label: pm.label || "",
          instructions: pm.instructions || "",
          isEnabled: Boolean(pm.isEnabled),
        }))
      : DEFAULT_PAYMENT_METHODS

  const socialLinks = Array.isArray(settings.socialLinks)
    ? settings.socialLinks.map((sl) => ({
        _id: sl._id,
        platform: sl.platform || "instagram",
        url: sl.url || "",
        isActive: sl.isActive !== false,
      }))
    : []

  return {
    siteName: settings.siteName || "",
    tagline: settings.tagline || "",
    logoUrl: settings.logo?.url || "",
    logoAltText: settings.logo?.altText || "",
    darkLogoUrl: settings.darkLogo?.url || "",
    darkLogoAltText: settings.darkLogo?.altText || "",
    faviconUrl: settings.favicon?.url || "",
    faviconAltText: settings.favicon?.altText || "",
    contactEmail: settings.contact?.email || "",
    contactPhone: settings.contact?.phone || "",
    contactWhatsapp: settings.contact?.whatsapp || "",
    contactAddress: settings.contact?.address || "",
    currency: settings.store?.currency || "PKR",
    timezone: settings.store?.timezone || "Asia/Karachi",
    lowStockThreshold: settings.store?.lowStockThreshold ?? 2,
    allowGuestCheckout: Boolean(settings.store?.allowGuestCheckout),
    freeShippingThreshold: settings.shipping?.freeShippingThreshold ?? 0,
    defaultShippingFee: settings.shipping?.defaultShippingFee ?? 0,
    returnPolicy: settings.shipping?.returnPolicy || "",
    paymentMethods,
    socialLinks,
    announcementEnabled: Boolean(settings.announcement?.isEnabled),
    announcementMessage: settings.announcement?.message || "",
    announcementUrl: settings.announcement?.url || "",
    maintenanceEnabled: Boolean(settings.maintenanceMode?.isEnabled),
    maintenanceMessage: settings.maintenanceMode?.message || "",
    metaTitle: settings.seo?.metaTitle || "",
    metaDescription: settings.seo?.metaDescription || "",
    keywords: Array.isArray(settings.seo?.keywords)
      ? settings.seo.keywords.join(", ")
      : "",
    ogImageUrl: settings.seo?.ogImage?.url || "",
    ogImageAltText: settings.seo?.ogImage?.altText || "",
  }
}

function splitKeywords(val) {
  return String(val || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
}

function buildPayload(form) {
  return {
    siteName: form.siteName.trim(),
    tagline: form.tagline.trim(),
    logo: {
      url: form.logoUrl.trim() || null,
      altText: form.logoAltText.trim() || null,
    },
    darkLogo: {
      url: form.darkLogoUrl.trim() || null,
      altText: form.darkLogoAltText.trim() || null,
    },
    favicon: {
      url: form.faviconUrl.trim() || null,
      altText: form.faviconAltText.trim() || null,
    },
    contact: {
      email: form.contactEmail.trim() || null,
      phone: form.contactPhone.trim() || null,
      whatsapp: form.contactWhatsapp.trim() || null,
      address: form.contactAddress.trim() || null,
    },
    store: {
      currency: form.currency,
      timezone: form.timezone,
      lowStockThreshold: Math.max(0, Number(form.lowStockThreshold || 0)),
      allowGuestCheckout: Boolean(form.allowGuestCheckout),
    },
    shipping: {
      freeShippingThreshold: Math.max(0, Number(form.freeShippingThreshold || 0)),
      defaultShippingFee: Math.max(0, Number(form.defaultShippingFee || 0)),
      returnPolicy: form.returnPolicy.trim() || null,
    },
    paymentMethods: form.paymentMethods.map((pm) => ({
      method: pm.method,
      label: pm.label.trim(),
      instructions: pm.instructions?.trim() || null,
      isEnabled: Boolean(pm.isEnabled),
    })),
    socialLinks: form.socialLinks
      .filter((sl) => sl.url.trim().length > 0)
      .map((sl) => ({
        platform: sl.platform,
        url: sl.url.trim(),
        isActive: Boolean(sl.isActive),
      })),
    announcement: {
      isEnabled: Boolean(form.announcementEnabled),
      message: form.announcementMessage.trim() || null,
      url: form.announcementUrl.trim() || null,
    },
    maintenanceMode: {
      isEnabled: Boolean(form.maintenanceEnabled),
      message: form.maintenanceMessage.trim() || null,
    },
    seo: {
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      keywords: splitKeywords(form.keywords),
      ogImage: {
        url: form.ogImageUrl.trim() || null,
        altText: form.ogImageAltText.trim() || null,
      },
    },
  }
}

export default function SettingsPage() {
  const dispatch = useDispatch()
  const { data: settingsData, status } = useSelector(
    (state) => state.admin.settings
  )
  const [form, setForm] = React.useState(initialFormState)
  const [originalForm, setOriginalForm] = React.useState(initialFormState)
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")

  // Load settings on mount
  React.useEffect(() => {
    dispatch(fetchSettings())
  }, [dispatch])

  // Sync state when backend data arrives
  React.useEffect(() => {
    if (settingsData) {
      const mapped = mapSettingsToForm(settingsData)
      setForm(mapped)
      setOriginalForm(mapped)
    }
  }, [settingsData])

  const hasUnsavedChanges = React.useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm)
  }, [form, originalForm])

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setForm(originalForm)
    toast.info("Unsaved modifications reverted to server state")
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSaving(true)

    try {
      const payload = buildPayload(form)
      const res = await dispatch(updateSettings(payload)).unwrap()
      setOriginalForm(form)
      toast.success(res?.message || "Store settings updated successfully!")
    } catch (err) {
      toast.error(err.message || "Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Payment Methods Handlers
  const handleTogglePaymentMethod = (index, isEnabled) => {
    setForm((prev) => {
      const updated = [...prev.paymentMethods]
      updated[index] = { ...updated[index], isEnabled }
      return { ...prev, paymentMethods: updated }
    })
  }

  const handleUpdatePaymentMethod = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.paymentMethods]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, paymentMethods: updated }
    })
  }

  // Social Links Handlers
  const handleAddSocialLink = () => {
    setForm((prev) => ({
      ...prev,
      socialLinks: [
        ...prev.socialLinks,
        {
          _id: `temp_${Date.now()}`,
          platform: "instagram",
          url: "",
          isActive: true,
        },
      ],
    }))
  }

  const handleRemoveSocialLink = (index) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }

  const handleUpdateSocialLink = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.socialLinks]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, socialLinks: updated }
    })
  }

  if (status === "loading" && !settingsData) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading store settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            {hasUnsavedChanges && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="size-3" />
                Unsaved changes
              </Badge>
            )}
            {form.maintenanceEnabled && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <ShieldAlert className="size-3" />
                Maintenance Mode Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Configure global store parameters, payment gateways, fulfillment policies, and SEO metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="mr-1.5 size-4" />
              Discard
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 md:grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="size-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2">
            <Store className="size-4" />
            <span>Store</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="size-4" />
            <span>Shipping</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="size-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="size-4" />
            <span>Social</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="size-4" />
            <span>Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="col-span-2 md:col-span-6 gap-2">
            <Globe className="size-4" />
            <span>SEO & Social Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* TAB 1: BRANDING & GENERAL IDENTITY */}
        {/* ============================================================== */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Identity & Logos</CardTitle>
              <CardDescription>
                Manage your store name, tagline, and brand visual assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Store Name</Label>
                  <Input
                    id="siteName"
                    value={form.siteName}
                    onChange={(e) => handleInputChange("siteName", e.target.value)}
                    placeholder="e.g. Thrift Shoe Wear"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline / Slogan</Label>
                  <Input
                    id="tagline"
                    value={form.tagline}
                    onChange={(e) => handleInputChange("tagline", e.target.value)}
                    placeholder="e.g. Curated thrift shoes, bags and jewelry"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-3">
                {/* Logo Light */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Light Mode Logo</Label>
                    <Badge variant="outline">Default</Badge>
                  </div>
                  <ImageUpload
                    value={form.logoUrl}
                    onChange={(url) => handleInputChange("logoUrl", url)}
                    folder="site"
                    aspectRatio="contain"
                    helperText="Horizontal vector or high-res PNG"
                  />
                  <Input
                    value={form.logoAltText}
                    onChange={(e) => handleInputChange("logoAltText", e.target.value)}
                    placeholder="Alt text (e.g. Brand logo)"
                  />
                </div>

                {/* Logo Dark */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Dark Mode Logo</Label>
                    <Badge variant="outline">Dark theme</Badge>
                  </div>
                  <ImageUpload
                    value={form.darkLogoUrl}
                    onChange={(url) => handleInputChange("darkLogoUrl", url)}
                    folder="site"
                    aspectRatio="contain"
                    helperText="Light-colored logo for dark backgrounds"
                  />
                  <Input
                    value={form.darkLogoAltText}
                    onChange={(e) => handleInputChange("darkLogoAltText", e.target.value)}
                    placeholder="Alt text (e.g. Dark brand logo)"
                  />
                </div>

                {/* Favicon */}
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Browser Favicon</Label>
                    <Badge variant="outline">32x32 px</Badge>
                  </div>
                  <ImageUpload
                    value={form.faviconUrl}
                    onChange={(url) => handleInputChange("faviconUrl", url)}
                    folder="site"
                    aspectRatio="square"
                    helperText="Square 32x32 or 64x64 icon"
                  />
                  <Input
                    value={form.faviconAltText}
                    onChange={(e) => handleInputChange("faviconAltText", e.target.value)}
                    placeholder="Alt text (e.g. Store Icon)"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Customer Support & Contact Info</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Support Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                      placeholder="info@thriftshoewear.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Support Phone</Label>
                    <Input
                      id="contactPhone"
                      value={form.contactPhone}
                      onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                      placeholder="+92 300 1234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactWhatsapp">WhatsApp Order Helpline</Label>
                    <Input
                      id="contactWhatsapp"
                      value={form.contactWhatsapp}
                      onChange={(e) => handleInputChange("contactWhatsapp", e.target.value)}
                      placeholder="+92 300 7654321"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="contactAddress">Physical Warehouse & Return Address</Label>
                    <Textarea
                      id="contactAddress"
                      rows={2}
                      value={form.contactAddress}
                      onChange={(e) => handleInputChange("contactAddress", e.target.value)}
                      placeholder="Shop #12, Vintage Arcade, Clifton Block 5, Karachi, Pakistan"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: STORE & REGIONAL PREFERENCES */}
        {/* ============================================================== */}
        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional & Inventory Preferences</CardTitle>
              <CardDescription>
                Define your operational currency, timezone, inventory thresholds, and customer authentication rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Store Display Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(val) => handleInputChange("currency", val)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((cur) => (
                        <SelectItem key={cur.value} value={cur.value}>
                          {cur.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All product prices, orders, and payment totals are calculated in this currency.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Store Timezone</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(val) => handleInputChange("timezone", val)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used for order timestamps, analytics reporting, and scheduled flash drops.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={(e) => handleInputChange("lowStockThreshold", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variants with quantity at or below this value will display a "Low Stock" warning badge.
                  </p>
                </div>

                <div className="flex flex-col justify-between rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allowGuestCheckout" className="font-semibold">
                        Allow Guest Checkout
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permit customers to place orders without creating an account.
                      </p>
                    </div>
                    <Switch
                      id="allowGuestCheckout"
                      checked={form.allowGuestCheckout}
                      onCheckedChange={(checked) =>
                        handleInputChange("allowGuestCheckout", checked)
                      }
                    />
                  </div>
                  <Badge variant={form.allowGuestCheckout ? "success" : "muted"} className="w-fit">
                    {form.allowGuestCheckout ? "Guest Checkout Enabled" : "Registration Required"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: SHIPPING & POLICIES */}
        {/* ============================================================== */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping & Delivery Rates</CardTitle>
              <CardDescription>
                Configure nationwide standard shipping fees, free shipping incentives, and return policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultShippingFee">Standard Flat Shipping Fee ({form.currency})</Label>
                  <Input
                    id="defaultShippingFee"
                    type="number"
                    min={0}
                    value={form.defaultShippingFee}
                    onChange={(e) => handleInputChange("defaultShippingFee", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default delivery charge applied to orders nationwide across Pakistan.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeShippingThreshold">Free Shipping Minimum Subtotal ({form.currency})</Label>
                  <Input
                    id="freeShippingThreshold"
                    type="number"
                    min={0}
                    value={form.freeShippingThreshold}
                    onChange={(e) => handleInputChange("freeShippingThreshold", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Orders with total equal to or exceeding this amount receive free shipping. Enter 0 to disable.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="returnPolicy">Return, Exchange & Refund Policy</Label>
                  <Textarea
                    id="returnPolicy"
                    rows={6}
                    value={form.returnPolicy}
                    onChange={(e) => handleInputChange("returnPolicy", e.target.value)}
                    placeholder="Enter store return policy details (e.g. Thrift condition disclosures, 7-day parcel inspection window, exchange criteria)..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed to buyers during checkout and linked across product condition grading badges.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 4: PAYMENT METHODS CONFIGURATION */}
        {/* ============================================================== */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateways & Customer Instructions</CardTitle>
              <CardDescription>
                Enable or disable payment options and provide exact bank account / wallet instructions for manual verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.paymentMethods.map((pm, index) => (
                <div
                  key={pm.method || index}
                  className="rounded-lg border p-4 space-y-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CreditCard className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{pm.label || pm.method}</span>
                          <Badge variant="outline" className="uppercase text-[10px]">
                            {pm.method}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pm.isEnabled ? "Active at checkout" : "Disabled"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`payment-toggle-${index}`} className="text-xs">
                        {pm.isEnabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`payment-toggle-${index}`}
                        checked={pm.isEnabled}
                        onCheckedChange={(checked) =>
                          handleTogglePaymentMethod(index, checked)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Display Title at Checkout</Label>
                      <Input
                        value={pm.label}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(index, "label", e.target.value)
                        }
                        placeholder="e.g. Cash on Delivery"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Customer Deposit / Verification Instructions</Label>
                      <Input
                        value={pm.instructions || ""}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(index, "instructions", e.target.value)
                        }
                        placeholder="e.g. Account Title, Bank IBAN, WhatsApp verification instructions"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 5: SOCIAL LINKS */}
        {/* ============================================================== */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Social Media Channels</CardTitle>
                <CardDescription>
                  Connect your store's Instagram, TikTok, Facebook, and WhatsApp channels for footer and header links.
                </CardDescription>
              </div>
              <Button type="button" size="sm" onClick={handleAddSocialLink}>
                <Plus className="mr-1.5 size-4" /> Add Social Channel
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.socialLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                  <Share2 className="size-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">No social links configured yet.</p>
                  <p className="text-xs mb-3">Add links to your Instagram catalog and WhatsApp business line.</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddSocialLink}>
                    <Plus className="mr-1 size-3" /> Add Link
                  </Button>
                </div>
              ) : (
                form.socialLinks.map((sl, index) => (
                  <div
                    key={sl._id || index}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="w-full sm:w-48">
                      <Select
                        value={sl.platform}
                        onValueChange={(val) =>
                          handleUpdateSocialLink(index, "platform", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Input
                        value={sl.url}
                        onChange={(e) =>
                          handleUpdateSocialLink(index, "url", e.target.value)
                        }
                        placeholder="https://instagram.com/thriftshoewear"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor={`social-toggle-${index}`} className="text-xs">
                          Active
                        </Label>
                        <Switch
                          id={`social-toggle-${index}`}
                          checked={sl.isActive}
                          onCheckedChange={(checked) =>
                            handleUpdateSocialLink(index, "isActive", checked)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveSocialLink(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 6: ANNOUNCEMENTS & MAINTENANCE */}
        {/* ============================================================== */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Top Header Announcement Ticker */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Storefront Announcement</CardTitle>
                <CardDescription>
                  Display a dynamic promotion or alert ticker banner across the top of the customer storefront.
                </CardDescription>
              </div>
              <Switch
                checked={form.announcementEnabled}
                onCheckedChange={(checked) =>
                  handleInputChange("announcementEnabled", checked)
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="announcementMessage">Announcement Text</Label>
                  <span className="text-xs text-muted-foreground">
                    {form.announcementMessage.length} / 180 characters
                  </span>
                </div>
                <Input
                  id="announcementMessage"
                  maxLength={180}
                  value={form.announcementMessage}
                  onChange={(e) =>
                    handleInputChange("announcementMessage", e.target.value)
                  }
                  placeholder="e.g. Free delivery across Karachi on all sneaker drops above PKR 5,000!"
                  disabled={!form.announcementEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcementUrl">Optional Call-to-Action Link</Label>
                <Input
                  id="announcementUrl"
                  value={form.announcementUrl}
                  onChange={(e) =>
                    handleInputChange("announcementUrl", e.target.value)
                  }
                  placeholder="/shop or /collections/vintage-sneakers"
                  disabled={!form.announcementEnabled}
                />
              </div>

              {form.announcementEnabled && form.announcementMessage && (
                <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                  <Megaphone className="size-4 shrink-0" />
                  <span>Preview: {form.announcementMessage}</span>
                  {form.announcementUrl && (
                    <ExternalLink className="size-3 ml-auto opacity-70" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Maintenance Mode */}
          <Card className={form.maintenanceEnabled ? "border-destructive/60 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={form.maintenanceEnabled ? "text-destructive" : ""}>
                    Maintenance Mode
                  </CardTitle>
                  {form.maintenanceEnabled && (
                    <Badge variant="destructive">Live Lockout Active</Badge>
                  )}
                </div>
                <CardDescription>
                  When enabled, storefront visitors are redirected to a maintenance notice screen. Admin dashboard remains accessible.
                </CardDescription>
              </div>
              <Switch
                checked={form.maintenanceEnabled}
                onCheckedChange={(checked) =>
                  handleInputChange("maintenanceEnabled", checked)
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Public Maintenance Outage Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  rows={3}
                  value={form.maintenanceMessage}
                  onChange={(e) =>
                    handleInputChange("maintenanceMessage", e.target.value)
                  }
                  placeholder="We are currently upgrading our thrift inventory servers. We will be back online shortly!"
                  disabled={!form.maintenanceEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 7: SEO & SOCIAL PREVIEW */}
        {/* ============================================================== */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization (SEO)</CardTitle>
              <CardDescription>
                Customize dynamic search engine metadata, Open Graph previews, and social crawler tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle">Default Meta Title</Label>
                    <span className="text-xs text-muted-foreground">
                      {form.metaTitle.length} / 70 characters
                    </span>
                  </div>
                  <Input
                    id="metaTitle"
                    maxLength={70}
                    value={form.metaTitle}
                    onChange={(e) => handleInputChange("metaTitle", e.target.value)}
                    placeholder="Thrift Shoe Wear | Vintage Shoes & Curated Bags"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="keywords">Keywords (Comma-separated)</Label>
                    <span className="text-xs text-muted-foreground">
                      {splitKeywords(form.keywords).length} tags
                    </span>
                  </div>
                  <Input
                    id="keywords"
                    value={form.keywords}
                    onChange={(e) => handleInputChange("keywords", e.target.value)}
                    placeholder="thrift, vintage shoes, sneakers, pre-loved bags, pakistan"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metaDescription">Default Meta Description</Label>
                    <span className="text-xs text-muted-foreground">
                      {form.metaDescription.length} / 160 characters
                    </span>
                  </div>
                  <Textarea
                    id="metaDescription"
                    rows={2}
                    maxLength={160}
                    value={form.metaDescription}
                    onChange={(e) =>
                      handleInputChange("metaDescription", e.target.value)
                    }
                    placeholder="Shop authentic pre-loved sneakers, vintage leather shoes, bags and jewelry with nationwide cash on delivery in Pakistan."
                  />
                </div>

                <div className="space-y-2">
                  <ImageUpload
                    value={form.ogImageUrl}
                    onChange={(url) => handleInputChange("ogImageUrl", url)}
                    folder="site"
                    label="Open Graph (Social Share) Image"
                    aspectRatio="video"
                    helperText="1200x630 px for optimal Twitter & Facebook preview cards (stored on R2)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ogImageAltText">Open Graph Image Alt Text</Label>
                  <Input
                    id="ogImageAltText"
                    value={form.ogImageAltText}
                    onChange={(e) => handleInputChange("ogImageAltText", e.target.value)}
                    placeholder="Thrift Shoe Wear Social Card"
                  />
                </div>
              </div>

              <Separator />

              {/* Live Google & Social Preview Card */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Eye className="size-4 text-primary" /> Live Search & Social Snippet Preview
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Google Snippet Simulation */}
                  <div className="rounded-lg border bg-card p-4 space-y-1">
                    <span className="text-xs text-muted-foreground">Google Search Result Preview</span>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      https://thriftshoewear.vercel.app
                    </div>
                    <div className="text-base font-semibold text-blue-600 hover:underline dark:text-blue-400 truncate">
                      {form.metaTitle || form.siteName || "Thrift Shoe Wear"}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {form.metaDescription || "Curated thrift shoes, bags and jewelry with cash on delivery nationwide."}
                    </p>
                  </div>

                  {/* Social Card Simulation */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex h-28 items-center justify-center bg-muted/40 border-b">
                      {form.ogImageUrl ? (
                        <img
                          src={form.ogImageUrl}
                          alt="Social share preview"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="size-4" /> No Open Graph Image Set
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        thriftshoewear.vercel.app
                      </span>
                      <h5 className="text-xs font-semibold truncate">
                        {form.metaTitle || form.siteName || "Thrift Shoe Wear"}
                      </h5>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {form.metaDescription || "Curated thrift footwear & accessories."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
