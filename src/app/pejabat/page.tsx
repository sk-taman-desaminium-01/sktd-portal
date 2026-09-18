import Link from "next/link";
import { senaraiSuratPejabat, kepalaSurat } from "@/lib/surat";
import PanelPejabat from "./PanelPejabat";

export const metadata = { title: "Urusan Pejabat" };

/**
 * Peti masuk Urusan Pejabat (permintaan B, B.3) — surat rasmi yang dihantar
 * dari Borang Sekolah, menunggu nombor rujukan kami.
 *
 * Halaman ini sendiri dipagar oleh `pastikanBoleh("urus_pejabat")` di dalam
 * `senaraiSuratPejabat()` — kerani, pentadbir, admin & admin mutlak sahaja
 * (permintaan B.4: kuasa kerani turut dimiliki pentadbir/admin).
 */
export default async function Pejabat() {
  let belumSedia = false;
  let senarai: Awaited<ReturnType<typeof senaraiSuratPejabat>>["senarai"] = [];
  let tiadaKebenaran = false;
  try {
    const r = await senaraiSuratPejabat();
    belumSedia = r.belumSedia;
    senarai = r.senarai;
  } catch {
    tiadaKebenaran = true;
  }

  if (tiadaKebenaran) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <p className="mt-2 text-sm text-slate-500">Hanya kerani, pentadbir & admin boleh membuka Urusan Pejabat.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const menunggu = senarai.filter((s) => s.status === "baharu").length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Urusan Pejabat</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {menunggu} surat menunggu nombor rujukan kami · {senarai.length} jumlah keseluruhan.
      </p>

      {belumSedia ? (
        <div className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">Jalankan SQL Borang Sekolah (lihat laporan pemasangan) sekali sahaja.</p>
        </div>
      ) : (
        <PanelPejabat senarai={senarai} kepala={await kepalaSurat()} />
      )}
    </main>
  );
}
