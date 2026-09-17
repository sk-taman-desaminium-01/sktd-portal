import Link from "next/link";
import { papanBilik } from "@/lib/tindakan-bilik";
import { papanInventori } from "@/lib/tindakan-inventori";
import { baki } from "@/data/inventori";
import PanelBilik from "./PanelBilik";
import PanelInventori from "../inventori/PanelInventori";

export const metadata = { title: "Tempahan Bilik Khas" };

export default async function Bilik() {
  // Tempahan dan inventori dibaca BERSAMA, bukan berturutan — dua
  // perjalanan berasingan ke pangkalan data untuk satu skrin ialah tepat
  // corak yang membuatkan kad lain terasa lambat.
  const [papan, inventori] = await Promise.all([papanBilik(), papanInventori()]);

  if (!papan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Tempahan Bilik Khas</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Setiap guru boleh menempah. Anda boleh membatalkan tempahan sendiri;
        pentadbir boleh membatalkan mana-mana tempahan.
      </p>

      {papan.belumSedia ? (
        <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Modul ini belum dipasang.</p>
          <p className="mt-1.5">
            Jadual pangkalan datanya belum dicipta. Admin perlu menjalankan{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 text-xs">
              supabase/pindaan-bilik.sql
            </code>{" "}
            sekali sahaja; selepas itu skrin ini terus berfungsi dan lapan bilik
            permulaan sudah ada di dalamnya.
          </p>
          <p className="mt-1.5 text-xs">
            Tiada apa yang rosak — tiada data hilang, dan tiada tempahan
            terjejas.
          </p>
        </div>
      ) : (
        <>
          <PanelBilik
            papan={papan}
            barangIct={
              inventori && !inventori.belumSedia
                ? inventori.barang
                    .filter((b) => b.aktif)
                    .map((b) => ({ id: b.id, nama: b.nama, baki: baki(b) }))
                : []
            }
          />

          {/* INVENTORI DIGABUNGKAN KE SINI, bukan kad berasingan.
              Keputusan pengguna: "Inventori ICT letak dalam tempahan bilik
              khas, sebab ia sekali… kalau buat kad baru, ia semak dan
              serabut je." Tempahan bilik dan peralatan yang perlu disediakan
              ialah satu kerja, bukan dua. */}
          {inventori && !inventori.belumSedia && (
            <div className="mt-10 border-t border-garis pt-8">
              <h2 className="text-lg font-bold text-navy-800">Peralatan ICT</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Permohonan peralatan, dan rekod barang yang unit ICT selenggara.
              </p>
              <PanelInventori papan={inventori} />
            </div>
          )}
        </>
      )}
    </main>
  );
}
