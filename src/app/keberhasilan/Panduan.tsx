import { PERINGKAT, tarikhTutup } from "@/data/keberhasilan";
import { KAD, tarikh } from "./alat";

const BAHAGIAN = [
  ["a", "Kata kerja", "memastikan, mencapai, menghasilkan, meningkatkan, mengurangkan, menyelesaikan."],
  ["b", "Penyata ukuran", "kuantiti, kualiti, kos atau masa. Contoh: 28 daripada 35 orang murid, 85%."],
  ["c", "Tujuan sasaran", "hasil kerja yang mahu dicapai. Contoh: mencapai TP3 bagi Matematik."],
  ["d", "Peringkat sasaran", "contohnya dalam PBD akhir tahun, di peringkat daerah."],
] as const;

export default function Panduan({ tahun }: { tahun: number }) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className={`${KAD} min-w-0 p-4 md:col-span-2`}>
        <h3 className="mb-2 text-lg font-bold text-navy-800">Siapa buat apa</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="border-b border-garis p-2">Peringkat</th><th className="border-b border-garis p-2">PYD</th><th className="border-b border-garis p-2">PP1</th><th className="border-b border-garis p-2">PP2</th><th className="border-b border-garis p-2">Tutup</th>
            </tr></thead>
            <tbody>
              {PERINGKAT.map((p, i) => (
                <tr key={p.k} className="align-top">
                  <td className="border-b border-garis p-2 font-bold">{p.t}</td><td className="border-b border-garis p-2">{p.pyd}</td>
                  <td className="border-b border-garis p-2">{p.pp}</td><td className="border-b border-garis p-2">Perakui selepas PP1 mengesahkan.</td>
                  <td className="whitespace-nowrap border-b border-garis p-2 font-mono">{tarikh(tarikhTutup(tahun, i))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 max-w-prose text-sm">Peringkat seterusnya dibuka sebaik sahaja PP1 mengesahkan peringkat sebelumnya. Ulasan boleh ditulis oleh PYD, PP1 dan PP2 pada bila-bila masa, dan setiap tindakan direkod dalam Aktiviti.</p>
      </div>
      <div className={`${KAD} min-w-0 p-4`}>
        <h3 className="mb-1.5 text-lg font-bold text-navy-800">Empat komponen sasaran</h3>
        <p className="text-sm">Setiap sasaran mesti ada <b>a</b>, <b>b</b> dan <b>c</b>. <b>d</b> ditulis jika sesuai.</p>
        <div className="mt-2 grid gap-2">
          {BAHAGIAN.map(([h, t, u]) => (
            <div key={h} className="grid grid-cols-[26px_1fr] gap-2 text-sm">
              <b className="grid size-6 place-items-center rounded-md bg-[#f6edd6] font-mono text-emas-gelap">{h}</b>
              <span><strong>{t}</strong>: {u}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${KAD} min-w-0 p-4`}>
        <h3 className="mb-1.5 text-lg font-bold text-navy-800">Pengiraan markah</h3>
        <p className="text-sm">Markah = pencapaian ÷ sasaran × 100, maksimum 100. Taip <b>15/20</b> dan ia ditukar kepada 75.</p>
        <p className="mt-1.5 text-sm">Purata = jumlah markah ÷ bilangan sasaran yang dinilai. Sasaran GUGUR tidak dikira dalam penilaian akhir.</p>
        <table className="mt-2 w-full border-collapse font-mono text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="border-b border-garis p-1.5">Purata</th><th className="border-b border-garis p-1.5">Skor</th></tr></thead>
          <tbody>{[["0 – 20", 1], ["21 – 40", 2], ["41 – 60", 3], ["61 – 80", 4], ["81 – 100", 5]].map(([a, s]) => (
            <tr key={s}><td className="border-b border-garis p-1.5">{a}</td><td className="border-b border-garis p-1.5">{s}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className={`${KAD} min-w-0 p-4 md:col-span-2`}>
        <h3 className="mb-1.5 text-lg font-bold text-navy-800">Kesilapan yang perlu dielak</h3>
        <ul className="ml-5 list-disc text-sm leading-relaxed">
          <li>Tiada penyataan boleh diukur. <i>“Memastikan kehadiran murid ke sekolah.”</i></li>
          <li>Kerja rutin berbentuk proses. <i>“Memeriksa buku latihan murid.”</i></li>
          <li>Bukan hasil kerja utama. <i>“Menghias kelas.”</i></li>
        </ul>
        <p className="mt-2 text-sm">Setiap PYD perlu sekurang-kurangnya 5 sasaran aktif. Tulis <code className="rounded bg-slate-100 px-1">**teks**</code> untuk menebalkan perkataan.</p>
      </div>
    </div>
  );
}
