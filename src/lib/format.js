export const formatCurrency = (value, currency = "PKR") =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const formatDate = (value) => {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value))
}

export const humanize = (value) => {
  if (value === undefined || value === null || value === "") return "Not set"
  return String(value).replaceAll("_", " ")
}

export const readPath = (item, path) =>
  String(path)
    .split(".")
    .reduce((value, key) => value?.[key], item)

export const shortId = (value) => (value ? String(value).slice(-6).toUpperCase() : "NA")

export const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

export const toDateInput = (value) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}
