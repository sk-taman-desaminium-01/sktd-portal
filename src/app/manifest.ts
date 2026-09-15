import type { MetadataRoute } from "next";

/** Portal boleh dipasang ke telefon guru — ikon sama dengan laman sekolah. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Kakitangan SKTD",
    short_name: "Portal SKTD",
    description: "Portal kakitangan SK Taman Desaminium",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b2545",
    theme_color: "#0b2545",
    lang: "ms",
    icons: [
      { src: "/ikon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
