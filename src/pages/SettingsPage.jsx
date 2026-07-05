import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Loader2, Save } from "lucide-react"
import { fetchSettings, updateSettings } from "../store/adminSlice"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Switch } from "../components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Textarea } from "../components/ui/textarea"

const defaultForm = {
  siteName: "",
  tagline: "",
  logoUrl: "",
  darkLogoUrl: "",
  faviconUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  contactAddress: "",
  currency: "PKR",
  timezone: "Asia/Karachi",
  lowStockThreshold: 2,
  allowGuestCheckout: false,
  announcementEnabled: false,
  announcementMessage: "",
  announcementUrl: "",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  freeShippingThreshold: 0,
  defaultShippingFee: 0,
  returnPolicy: "",
  maintenanceEnabled: false,
  maintenanceMessage: "",
}

function mapSettingsToForm(settings) {
  if (!settings) return defaultForm

  return {
    siteName: settings.siteName || "",
    tagline: settings.tagline || "",
    logoUrl: settings.logo?.url || "",
    darkLogoUrl: settings.darkLogo?.url || "",
    faviconUrl: settings.favicon?.url || "",
    contactEmail: settings.contact?.email || "",
    contactPhone: settings.contact?.phone || "",
    contactWhatsapp: settings.contact?.whatsapp || "",
    contactAddress: settings.contact?.address || "",
    currency: settings.store?.currency || "PKR",
    timezone: settings.store?.timezone || "Asia/Karachi",
    lowStockThreshold: settings.store?.lowStockThreshold ?? 2,
    allowGuestCheckout: Boolean(settings.store?.allowGuestCheckout),
    announcementEnabled: Boolean(settings.announcement?.isEnabled),
    announcementMessage: settings.announcement?.message || "",
    announcementUrl: settings.announcement?.url || "",
    metaTitle: settings.seo?.metaTitle || "",
    metaDescription: settings.seo?.metaDescription || "",
    keywords: settings.seo?.keywords?.join(", ") || "",
    freeShippingThreshold: settings.shipping?.freeShippingThreshold ?? 0,
    defaultShippingFee: settings.shipping?.defaultShippingFee ?? 0,
    returnPolicy: settings.shipping?.returnPolicy || "",
    maintenanceEnabled: Boolean(settings.maintenanceMode?.isEnabled),
    maintenanceMessage: settings.maintenanceMode?.message || "",
  }
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildPayload(form) {
  return {
    siteName: form.siteName,
    tagline: form.tagline,
    logo: { url: form.logoUrl || null },
    darkLogo: { url: form.darkLogoUrl || null },
    favicon: { url: form.faviconUrl || null },
    contact: {
      email: form.contactEmail || null,
      phone: form.contactPhone || null,
      whatsapp: form.contactWhatsapp || null,
      address: form.contactAddress || null,
    },
    announcement: {
      isEnabled: form.announcementEnabled,
      message: form.announcementMessage || null,
      url: form.announcementUrl || null,
    },
    store: {
      currency: form.currency || "PKR",
      timezone: form.timezone || "Asia/Karachi",
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      allowGuestCheckout: form.allowGuestCheckout,
    },
    seo: {
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      keywords: splitCsv(form.keywords),
    },
    shipping: {
      freeShippingThreshold: Number(form.freeShippingThreshold || 0),
      defaultShippingFee: Number(form.defaultShippingFee || 0),
      returnPolicy: form.returnPolicy || null,
    },
    maintenanceMode: {
      isEnabled: form.maintenanceEnabled,
      message: form.maintenanceMessage || null,
    },
  }
}

function TextField({ form, setForm, name, label, type = "text" }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        value={form[name] ?? ""}
        min={type === "number" ? 0 : undefined}
        onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
      />
    </div>
  )
}

function TextAreaField({ form, setForm, name, label }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        value={form[name] ?? ""}
        onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
      />
    </div>
  )
}

function ToggleField({ form, setForm, name, label }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <Label htmlFor={name}>{label}</Label>
      <Switch
        id={name}
        checked={Boolean(form[name])}
        onCheckedChange={(checked) => setForm((current) => ({ ...current, [name]: checked }))}
      />
    </div>
  )
}

export default function SettingsPage() {
  const dispatch = useDispatch()
  const { data, status, error } = useSelector((state) => state.admin.settings)
  const mutation = useSelector((state) => state.admin.mutation)
  const [form, setForm] = useState(defaultForm)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    dispatch(fetchSettings())
  }, [dispatch])

  useEffect(() => {
    if (data) setForm(mapSettingsToForm(data))
  }, [data])

  const submit = async (event) => {
    event.preventDefault()
    setLocalError(null)
    try {
      await dispatch(updateSettings(buildPayload(form))).unwrap()
    } catch (err) {
      setLocalError(err.message)
    }
  }

  if (status === "loading" && !data) {
    return (
      <div className="flex h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading settings
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {(error || localError || mutation.error) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError || mutation.error || error}
        </div>
      )}
      {mutation.status === "succeeded" && mutation.message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {mutation.message}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Site settings</CardTitle>
            <CardDescription>Updates are saved through the backend `/site/settings` endpoint.</CardDescription>
          </div>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save settings
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="identity">
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="store">Store</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>

            <TabsContent value="identity">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField form={form} setForm={setForm} name="siteName" label="Site name" />
                <TextField form={form} setForm={setForm} name="tagline" label="Tagline" />
                <TextField form={form} setForm={setForm} name="logoUrl" label="Logo URL" />
                <TextField form={form} setForm={setForm} name="darkLogoUrl" label="Dark logo URL" />
                <TextField form={form} setForm={setForm} name="faviconUrl" label="Favicon URL" />
                <TextField form={form} setForm={setForm} name="contactEmail" label="Contact email" type="email" />
                <TextField form={form} setForm={setForm} name="contactPhone" label="Contact phone" />
                <TextField form={form} setForm={setForm} name="contactWhatsapp" label="WhatsApp" />
                <TextAreaField form={form} setForm={setForm} name="contactAddress" label="Address" />
              </div>
            </TabsContent>

            <TabsContent value="store">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField form={form} setForm={setForm} name="currency" label="Currency" />
                <TextField form={form} setForm={setForm} name="timezone" label="Timezone" />
                <TextField form={form} setForm={setForm} name="lowStockThreshold" label="Low stock threshold" type="number" />
                <ToggleField form={form} setForm={setForm} name="allowGuestCheckout" label="Allow guest checkout" />
                <ToggleField form={form} setForm={setForm} name="announcementEnabled" label="Announcement enabled" />
                <TextField form={form} setForm={setForm} name="announcementUrl" label="Announcement URL" />
                <TextAreaField form={form} setForm={setForm} name="announcementMessage" label="Announcement message" />
                <ToggleField form={form} setForm={setForm} name="maintenanceEnabled" label="Maintenance mode" />
                <TextAreaField form={form} setForm={setForm} name="maintenanceMessage" label="Maintenance message" />
              </div>
            </TabsContent>

            <TabsContent value="seo">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField form={form} setForm={setForm} name="metaTitle" label="Meta title" />
                <TextField form={form} setForm={setForm} name="keywords" label="Keywords" />
                <TextAreaField form={form} setForm={setForm} name="metaDescription" label="Meta description" />
              </div>
            </TabsContent>

            <TabsContent value="shipping">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField form={form} setForm={setForm} name="freeShippingThreshold" label="Free shipping threshold" type="number" />
                <TextField form={form} setForm={setForm} name="defaultShippingFee" label="Default shipping fee" type="number" />
                <TextAreaField form={form} setForm={setForm} name="returnPolicy" label="Return policy" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </form>
  )
}
