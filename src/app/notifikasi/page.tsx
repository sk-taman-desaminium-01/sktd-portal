import Link from "next/link";
import { pengguna } from "@/lib/akses";
import PanelNotifikasi from "./PanelNotifikasi";

export const metadata = { title: "Notifikasi" };

export default async function Notifikasi() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const hariIni = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Notifikasi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Apa yang berlaku dan memerlukan perhatian anda.
      </p>

      <PanelNotifikasi hariIni={hariIni} />
    </main>
  );
}
