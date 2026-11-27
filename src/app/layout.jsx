import { Urbanist } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-urbanist",
})

export const metadata = {
  title: {
    default: "Thrift Shoe Wear Admin",
    template: "%s | Thrift Shoe Wear Admin",
  },
  description: "Internal operations, catalog, order, audit log, and feature governance portal for Thrift Shoe Wear.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={urbanist.variable} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
