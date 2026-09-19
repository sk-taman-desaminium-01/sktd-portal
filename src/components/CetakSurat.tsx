import { aset } from "@/lib/laluan";
import type { BarisSurat, DataSuratRasmi } from "@/lib/surat";

export type KepalaSurat = { nama: string; kod: string; alamat: string; telefon: string; faks: string; emel: string };

/**
 * Susun atur cetak surat rasmi — dikongsi antara `/borang` (pemohon
 * mencetak salinannya) dan `/pejabat` (kerani mencetak selepas rujukan
 * kami diisi). SATU susun atur, bukan disalin dua kali.
 */
export default function CetakSurat({
  surat, data, kepala,
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
      <header className="flex items-center gap-5 border-b-2 border-black pb-3 text-[10pt]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan Malaysia" className="h-20 w-28 object-contain" />
        <div><p className="font-bold">KEMENTERIAN PENDIDIKAN MALAYSIA</p><h1 className="font-bold uppercase">{kepala.nama}</h1>
        <p className="whitespace-pre-line">{kepala.alamat}</p><p>Tel: {kepala.telefon} · {kepala.emel}</p></div>
      </header>

      <div className="mt-4 flex justify-between text-[11pt]">
        <span>{surat.rujukan_kami ? `Rujukan Kami: ${surat.rujukan_kami}` : ""}</span>
        <span>{new Date(data.tarikh).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      <p className="mt-4 whitespace-pre-line text-[11pt]">{data.alamat}</p>

      <p className="mt-4 text-[11pt]">Tuan/Puan,</p>
      <p className="mt-4 text-[11pt]"><b>{surat.tajuk.toUpperCase()}</b></p>

      <p className="mt-3 whitespace-pre-line text-justify text-[11pt] leading-relaxed">{data.isi}</p>

      <p className="mt-6 text-[11pt]">Sekian, terima kasih.</p>
      <p className="text-[11pt]">&quot;MALAYSIA MADANI&quot;</p>
      <p className="text-[11pt]">&quot;BERKHIDMAT UNTUK NEGARA&quot;</p>

      <div className="mt-10 text-[11pt]">
        <p>Saya yang menjalankan amanah,</p>
        {surat.tandatangan_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={surat.tandatangan_url} alt="" className="mt-2 h-16 object-contain" />
        ) : <div className="mt-10" />}
        <p className="mt-1 font-bold">({data.wakilGbNama})</p>
        <p>{data.wakilGbJawatan}</p>
        <p>{kepala.nama}</p>
      </div>


    </div>
  );
}
