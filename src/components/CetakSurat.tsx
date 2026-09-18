import type { BarisSurat, DataSuratRasmi } from "@/lib/surat";

export type KepalaSurat = { nama: string; kod: string; alamat: string; telefon: string; faks: string; emel: string };

/**
 * Susun atur cetak surat rasmi — dikongsi antara `/borang` (pemohon
 * mencetak salinannya) dan `/pejabat` (kerani mencetak selepas rujukan
 * kami diisi). SATU susun atur, bukan disalin dua kali.
 */
export default function CetakSurat({
  surat, data, kepala, sayaNama,
}: {
  surat: BarisSurat;
  data: DataSuratRasmi;
  kepala: KepalaSurat;
  sayaNama?: string;
}) {
  return (
    <div id="surat-cetak" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #surat-cetak, #surat-cetak * { visibility: visible; }
          #surat-cetak { position: absolute; inset: 0; width: 100%; }
          @page { size: A4 portrait; margin: 20mm; }
        }
      `}</style>
      <header className="border-b-2 border-black pb-2 text-center text-[11pt]">
        <h1 className="font-bold uppercase">{kepala.nama}</h1>
        <p>{kepala.alamat.split("\n").join(", ")}</p>
        <p>Tel: {kepala.telefon} · Faks: {kepala.faks} · {kepala.emel} · Kod Sekolah: {kepala.kod}</p>
      </header>

      <div className="mt-4 flex justify-between text-[11pt]">
        <span>{surat.rujukan_kami ? `Rujukan Kami: ${surat.rujukan_kami}` : ""}</span>
        <span>{new Date(data.tarikh).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      <p className="mt-4 whitespace-pre-line text-[11pt]">{data.alamat}</p>

      <p className="mt-4 text-[11pt]"><b>{surat.tajuk.toUpperCase()}</b></p>

      <p className="mt-3 whitespace-pre-line text-justify text-[11pt] leading-relaxed">{data.isi}</p>

      <p className="mt-6 text-[11pt]">Sekian, terima kasih.</p>
      <p className="text-[11pt]">&quot;BERKHIDMAT UNTUK NEGARA&quot;</p>

      <div className="mt-10 text-[11pt]">
        <p>Yang menjalankan tugas,</p>
        {surat.tandatangan_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={surat.tandatangan_url} alt="" className="mt-2 h-16 object-contain" />
        ) : <div className="mt-10" />}
        <p className="mt-1 font-bold">({data.wakilGbNama})</p>
        <p>{data.wakilGbJawatan}</p>
        <p>{kepala.nama}</p>
      </div>

      {sayaNama && <p className="mt-8 text-[9pt] text-slate-500">Dihantar oleh: {sayaNama}</p>}
    </div>
  );
}
