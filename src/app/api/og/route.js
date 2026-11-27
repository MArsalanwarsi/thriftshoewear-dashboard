import { ImageResponse } from "next/og"
import { SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seoConfig"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#141416",
          color: "#FAF8F5",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#E66A2C",
          }}
        >
          <span>THRIFTSHOEWEAR</span>
          <span style={{ color: "#78756E" }}>•</span>
          <span>OPERATIONS PORTAL</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: "58px", fontWeight: 800, lineHeight: 1.1 }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: "26px", color: "#D4CFC7", maxWidth: "900px", lineHeight: 1.4 }}>
            {DEFAULT_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #2D2D32",
            paddingTop: "24px",
            fontSize: "20px",
            color: "#A39E95",
          }}
        >
          <span>Next.js 16 App Router • PWA Offline-Ready • Super Admin Governance</span>
          <span style={{ color: "#FAF8F5", fontWeight: 600 }}>thriftshoewear.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
