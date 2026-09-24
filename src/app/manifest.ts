import type { MetadataRoute } from "next";
import { AWALAN, aset } from "@/lib/laluan";

/** Portal boleh dipasang ke telefon guru — ikon sama dengan laman sekolah. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Kakitangan SKTD",
    short_name: "Portal SKTD",
    description: "Portal kakitangan SK Taman Desaminium",
    // Tanpa `id`, menukar start_url kemudian dianggap app BERBEZA dan
    // pengguna mendapat ikon kedua di skrin utama.
    id: `${AWALAN}/`,
    start_url: `${AWALAN}/`,
    scope: `${AWALAN}/`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    categories: ["education", "productivity"],
    shortcuts: [
      { name: "eRPM Panitia", short_name: "eRPM", url: `${AWALAN}/erpm` },
      { name: "Urus Laman", short_name: "Urus", url: `${AWALAN}/admin` },
    ],
    /* TIADA KUNCI ORIENTASI.
       `orientation: "portrait"` pernah ditetapkan di sini. Ia memaksa app
       kekal menegak walaupun peranti diputar — dan itu menyakitkan tepat di
       tempat landskap paling membantu: grid jadual waktu, dan laman KPM
       berreka-bentuk desktop yang dibuka dari hab. Guru memutar telefon,
       tiada apa berlaku, dan kandungan kekal terpotong.
       "any" mengembalikan keputusan itu kepada pengguna. */
    orientation: "any",
    background_color: "#0b2545",
    theme_color: "#0b2545",
    lang: "ms",
    icons: [
      { src: aset("/ikon-192.png"), sizes: "192x192", type: "image/png" },
      { src: aset("/ikon-512.png"), sizes: "512x512", type: "image/png" },
      { src: aset("/ikon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
