import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { msMY } from "@clerk/localizations";
import TarikSegar from "@/components/TarikSegar";
import BarBawahPortal from "@/components/BarBawahPortal";
import DaftarSW from "@/components/DaftarSW";
import { pengguna } from "@/lib/akses";
import { boleh } from "@/lib/peranan";
import { aset } from "@/lib/laluan";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portal Kakitangan SKTD", template: "%s · Portal SKTD" },
  description: "Portal kakitangan SK Taman Desaminium.",
  // Portal dalaman — jangan diindeks langsung.
  robots: { index: false, follow: false },
  icons: { apple: [{ url: "/portal/apple-touch-icon.png", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Portal SKTD", statusBarStyle: "black-translucent" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Keputusan "boleh nampak tab Urus" dibuat di PELAYAN. Menghantar peranan
  // ke pelayar dan memutuskan di sana bermakna peranan itu berada dalam
  // payload RSC — dan sesiapa boleh mengubahnya dalam DevTools.
  const saya = await pengguna();
  const bolehAdmin =
    boleh(saya?.peranan ?? null, "terbit_kandungan") ||
    boleh(saya?.peranan ?? null, "urus_akses");

  return (
    // localization ms-MY supaya skrin log masuk Clerk dalam Bahasa Melayu,
    // selaras dengan peraturan projek: BM sepenuhnya, tiada teks Inggeris.
    <ClerkProvider localization={msMY}>
      <html lang="ms">
        <body className="bg-slate-50 text-slate-800">
          {/* Portal juga boleh dipasang sebagai app, jadi ia kehilangan
              tarik-untuk-segarkan pelayar dengan cara yang sama. */}
          <TarikSegar />
          {children}
          <BarBawahPortal bolehAdmin={bolehAdmin} />
          <DaftarSW />
        </body>
      </html>
    </ClerkProvider>
  );
}
