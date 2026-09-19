import { aset } from "@/lib/laluan";
import type { BarisSurat, DataSuratRasmi } from "@/lib/surat";

export type KepalaSurat = { nama: string; kod: string; alamat: string; telefon: string; faks: string; emel: string };

const HAD_ISI_SATU_MUKA = 1_200;
const HAD_PERENGGAN = 8;

/**
 * Surat rasmi ialah SATU halaman. Selain had aksara, baris kosong dan ruang
 * berganda dinormalkan kerana seribu aksara yang berupa baris baharu masih
 * boleh menjadi puluhan halaman ketika dicetak.
 */
function isiSatuMukaSurat(isi: string) {
  const perenggan = isi
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((baris) => baris.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, HAD_PERENGGAN);
  const bersih = perenggan.join("\n\n");
  if (bersih.length <= HAD_ISI_SATU_MUKA) return { perenggan, dipendekkan: false };
  const potong = bersih.slice(0, HAD_ISI_SATU_MUKA);
  const akhir = potong.lastIndexOf(" ");
  return {
    perenggan: [`${potong.slice(0, akhir > 0 ? akhir : potong.length)}…`],
    dipendekkan: true,
  };
}

function tarikhBahasaMelayu(tarikh: string) {
  const nilai = new Date(`${tarikh}T12:00:00`);
  return Number.isNaN(nilai.getTime())
    ? tarikh
    : nilai.toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Surat rasmi sekolah mengikut struktur Surat Kebenaran Padang Hoki:
 * kepala surat lapang, rujukan di kanan, isi berindent, dan tandatangan
 * pada bahagian bawah. Ia dikongsi oleh Borang Sekolah dan Urusan Pejabat.
 */
export default function CetakSurat({
  surat, data, kepala,
}: {
  surat: BarisSurat;
  data: DataSuratRasmi;
  kepala: KepalaSurat;
  sayaNama?: string;
}) {
  const isi = isiSatuMukaSurat(data.isi);
  return (
    <div id="surat-cetak" data-cetak-kertas="portrait" className="hidden text-black print:block">
      <style>{`
        #surat-cetak .surat-dokumen { background: #fff; color: #000; font-family: "Times New Roman", Times, serif; font-size: 10.5pt; line-height: 1.32; }
        #surat-cetak .surat-kepala { display: grid; grid-template-columns: 27mm minmax(0, 1fr) 28mm; column-gap: 4mm; align-items: start; border-bottom: 1.5px solid #000; padding: 0 0 3.5mm; font-family: Arial, Helvetica, sans-serif; }
        #surat-cetak .surat-logo-kpm { width: 25mm; height: 25mm; object-fit: contain; object-position: left top; }
        #surat-cetak .surat-logo-sktd { width: 23mm; height: 25mm; object-fit: contain; object-position: right top; }
        #surat-cetak .surat-kepala-nama { margin: 1mm 0 0; font-size: 13pt; font-weight: 700; line-height: 1.12; }
        #surat-cetak .surat-kepala-alamat { margin: 1mm 0 0; white-space: pre-line; font-size: 10.5pt; line-height: 1.18; }
        #surat-cetak .surat-hubungi { margin: 1.5mm 0 0; text-align: right; font-size: 9.5pt; line-height: 1.2; }
        #surat-cetak .surat-rujukan { display: flex; justify-content: flex-end; margin: 4mm 10mm 0; font-size: 11pt; line-height: 1.25; }
        #surat-cetak .surat-rujukan p { min-width: 57mm; margin: 0; }
        #surat-cetak .surat-kandungan { padding: 0 11mm; }
        #surat-cetak .surat-alamat { margin: 13mm 0 0; white-space: pre-line; }
        #surat-cetak .surat-sapaan { margin: 12mm 0 0; }
        #surat-cetak .surat-tajuk { margin: 7mm 0 0; font-weight: 700; text-transform: uppercase; }
        #surat-cetak .surat-isi { margin: 5mm 0 0; text-align: justify; }
        #surat-cetak .surat-isi p { margin: 0 0 3.5mm; }
        #surat-cetak .surat-penutup { margin: 7mm 0 0; }
        #surat-cetak .surat-cogan { margin: 12mm 0 0; font-weight: 700; line-height: 1.75; }
        #surat-cetak .surat-tandatangan { margin: 5mm 0 0; }
        #surat-cetak .surat-tandatangan img { display: block; width: 35mm; height: 16mm; margin: 1mm 0 -1mm; object-fit: contain; object-position: left bottom; }
        #surat-cetak .surat-ruang-tandatangan { height: 17mm; }
        #surat-cetak .surat-penandatangan { margin: 0; line-height: 1.32; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          #surat-cetak, #surat-cetak * { visibility: visible; }
          #surat-cetak { position: absolute; inset: 0; min-height: 262mm; width: 100%; background: #fff; }
          @page { size: A4 portrait; margin: 18mm 19mm 17mm; }
        }
      `}</style>

      <article className="surat-dokumen">
        <header className="surat-kepala">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan Malaysia" className="surat-logo-kpm" />
          <div>
            <p className="m-0 text-[11pt] font-bold">KEMENTERIAN PENDIDIKAN MALAYSIA</p>
            <h1 className="surat-kepala-nama">{kepala.nama.toUpperCase()}</h1>
            <p className="surat-kepala-alamat">{kepala.alamat}</p>
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" className="surat-logo-sktd" />
            <p className="surat-hubungi">Tel : {kepala.telefon}<br />E-mel : {kepala.emel}</p>
          </div>
        </header>

        <div className="surat-rujukan">
          <p>{surat.rujukan_kami && <>Ruj Kami : {surat.rujukan_kami}<br /></>}Tarikh : {tarikhBahasaMelayu(data.tarikh)}</p>
        </div>

        <div className="surat-kandungan">
          <p className="surat-alamat">{data.alamat}</p>
          <p className="surat-sapaan">Tuan/Puan,</p>
          <p className="surat-tajuk">{surat.tajuk}</p>

          <div className="surat-isi">
            {isi.perenggan.map((perenggan, indeks) => <p key={indeks}>{perenggan}</p>)}
          </div>
          {isi.dipendekkan && <p className="m-0 text-[8pt] italic">Isi melebihi ruang satu halaman dan dipendekkan pada penghujung ayat.</p>}

          <p className="surat-penutup">Sekian, terima kasih.</p>
          <p className="surat-cogan">“MALAYSIA MADANI”<br />“BERKHIDMAT UNTUK NEGARA”</p>
          <div className="surat-tandatangan">
            <p className="m-0">Saya yang menjalankan amanah</p>
            {surat.tandatangan_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={surat.tandatangan_url} alt="Tandatangan" />
            ) : <div className="surat-ruang-tandatangan" />}
            <p className="surat-penandatangan"><b>({data.wakilGbNama.toUpperCase()})</b><br />{data.wakilGbJawatan}<br />{kepala.nama}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
