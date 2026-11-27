export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://thriftshoewear-dashboard.vercel.app"

export const SITE_NAME = "Thrift Shoe Wear Admin"
export const DEFAULT_TITLE = "Thrift Shoe Wear Operations & Inventory Portal"
export const DEFAULT_DESCRIPTION =
  "High-speed catalog management, 1-of-1 thrift shoe order fulfillment, financial settlement analytics, Super Admin audit logs, and feature governance portal."

export const CORE_KEYWORDS = [
  "thriftshoewear dashboard",
  "thrift sneaker inventory management",
  "1-of-1 thrift ecommerce admin",
  "order fulfillment and payment verification",
  "super admin audit logs and feature controls",
  "Pakistan thrift store operations",
]

export const BRAND_ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: DEFAULT_DESCRIPTION,
  provider: {
    "@type": "Organization",
    name: "Thrift Shoe Wear",
    url: "https://thriftshoewear.com",
    sameAs: [
      "https://github.com/MArsalanwarsi",
      "https://thriftshoewear.com",
    ],
  },
}
