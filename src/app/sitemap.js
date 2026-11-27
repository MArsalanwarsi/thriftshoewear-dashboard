import { SITE_URL } from "@/lib/seoConfig"

export default function sitemap() {
  const lastModified = new Date("2026-11-27T00:00:00.000Z")
  const routes = ["/", "/login", "/register", "/forgot-password"]

  return routes.map((route) => ({
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: route === "/" ? "daily" : "monthly",
    priority: route === "/" ? 1.0 : 0.7,
  }))
}
