import type { MetadataRoute } from "next";

/** Portal boleh dipasang ke telefon guru — ikon sama dengan laman sekolah. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Kakitangan SKTD",
    short_name: "Portal SKTD",
    description: "Portal kakitangan SK Taman Desaminium",
    // Tanpa `id`, menukar start_url kemudian dianggap app BERBEZA dan
    // pengguna mendapat ikon kedua di skrin utama.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    categories: ["education", "productivity"],
    shortcuts: [
      { name: "eRPM Panitia", short_name: "eRPM", url: "/erpm" },
      { name: "Urus Laman Web", short_name: "Urus", url: "/admin" },
    ],
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
