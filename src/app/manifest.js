export default function manifest() {
  return {
    name: "Thrift Shoe Wear Admin Portal",
    short_name: "TSW Admin",
    description: "Offline-ready operations, catalog, order, audit log, and feature governance portal for Thrift Shoe Wear.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e66a2c",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  }
}
