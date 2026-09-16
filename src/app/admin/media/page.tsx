import Link from "next/link";
import { senaraiMedia } from "@/lib/media";
import PanelMedia from "./PanelMedia";

export const metadata = { title: "Pustaka Media" };

export default async function MediaPage() {
  const media = await senaraiMedia();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Pustaka Media</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Gambar dan PDF untuk laman sekolah. {media.length} fail.
      </p>

      <PanelMedia awal={media} />

      <div className="mt-8 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        <p>
          <b>Fail di sini AWAM.</b> Sesiapa yang tahu URLnya boleh membukanya
          tanpa log masuk — itu memang tujuannya, kerana laman sekolah perlu
          memaparkannya.
        </p>
        <p className="mt-2">
          Maka: gambar yang menunjukkan <b>murid</b> memerlukan Surat Akuan Ibu
          Bapa (SS KPM Bil. 9/2024, sah 1 tahun, disimpan sekolah). Catatkan
          rujukan kebenaran semasa memuat naik supaya sekolah tidak perlu meneka
          kemudian. <b>Tiada nama penuh murid</b> pada kapsyen awam.
        </p>
      </div>
    </main>
  );
}
