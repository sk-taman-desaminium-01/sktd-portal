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

/** "2026-09-09" → "09.09.2026" — format tarikh surat sekolah. */
function tarikhSurat(tarikh: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tarikh);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : tarikh;
}

const RUJUK = /^dengan hormatnya,? perkara di atas (adalah )?dirujuk\.?$/i;

/** Buang nombor yang ditaip pengguna ("1.", "2)") — nombor dijana seragam. */
function tanpaNombor(p: string) {
  return p.replace(/^\(?\d{1,2}[.)]\s*/, "");
}

/**
 * Surat rasmi sekolah mengikut struktur Surat Kebenaran Padang Hoki:
 * kepala surat lapang, rujukan di kanan, isi berindent, dan ruang kosong
 * untuk tandatangan hidup Guru Besar. Ia dikongsi oleh Borang Sekolah dan
 * Urusan Pejabat.
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
  // Surat sekolah SENTIASA dibuka dengan ayat rujukan tanpa nombor — itulah
  // perenggan 1 — jadi perenggan isi bermula dengan 2., 3., 4. (format
  // surat rasmi kerajaan; ditetapkan pengguna 22 Sep 2026).
  const perenggan = isi.perenggan.filter((p) => !RUJUK.test(p)).map(tanpaNombor);
  const padat = data.isi.replace(/\s+/g, " ").trim().length > 700 || isi.perenggan.length > 5;
  return (
    <div id="surat-cetak" data-cetak-kertas="portrait" className="hidden text-black print:block">
      <style>{`
        #surat-cetak .surat-dokumen { background: #fff; color: #000; font-family: "Times New Roman", Times, serif; font-size: 11.5pt; line-height: 1.3; }
        #surat-cetak .surat-kepala { display: grid; grid-template-columns: 30mm minmax(0, 1fr) 43mm; column-gap: 3.5mm; align-items: start; border-bottom: 1px solid #000; padding: 0 0 3.5mm; font-family: Arial, Helvetica, sans-serif; }
        #surat-cetak .surat-logo-jata { width: 29mm; height: 23mm; object-fit: contain; object-position: left top; }
        #surat-cetak .surat-logo-kumpulan { display: flex; justify-content: flex-end; align-items: flex-start; gap: 1.5mm; min-height: 20mm; }
        #surat-cetak .surat-logo-sktd { width: 16mm; height: 19mm; object-fit: contain; object-position: center top; }
        #surat-cetak .surat-logo-ts25 { width: 22mm; height: 19mm; object-fit: contain; object-position: center top; }
        #surat-cetak .surat-kepala-kpm { margin: 0; font-size: 11.5pt; font-weight: 700; line-height: 1.1; }
        #surat-cetak .surat-kepala-nama { margin: 0.4mm 0 0; font-size: 11.5pt; font-weight: 700; line-height: 1.1; }
        #surat-cetak .surat-kepala-alamat { margin: 0.6mm 0 0; white-space: pre-line; font-size: 11pt; line-height: 1.2; }
        #surat-cetak .surat-hubungi { margin: 1mm 0 0; text-align: left; font-size: 8.5pt; line-height: 1.2; white-space: nowrap; }
        #surat-cetak .surat-rujukan { display: flex; justify-content: flex-end; margin: 4mm 10mm 0; font-size: 11pt; line-height: 1.25; }
        #surat-cetak .surat-rujukan p { min-width: 57mm; margin: 0; }
        #surat-cetak .surat-kandungan { padding: 0 11mm; }
        #surat-cetak .surat-alamat { margin: 13mm 0 0; white-space: pre-line; }
        #surat-cetak .surat-sapaan { margin: 12mm 0 0; }
        #surat-cetak .surat-tajuk { margin: 7mm 0 0; font-weight: 700; text-transform: uppercase; }
        #surat-cetak .surat-isi { margin: 5mm 0 0; text-align: justify; }
        #surat-cetak .surat-isi p { margin: 0 0 3.5mm; }
        #surat-cetak .surat-isi ol { margin: 0; padding: 0; list-style: none; counter-reset: p 1; }
        #surat-cetak .surat-isi li { position: relative; margin: 0 0 3.5mm; padding-left: 7mm; counter-increment: p; }
        #surat-cetak .surat-isi li::before { content: counter(p) "."; position: absolute; left: 0; }
        #surat-cetak .surat-penutup { margin: 7mm 0 0; }
        #surat-cetak .surat-cogan { margin: 12mm 0 0; font-weight: 700; line-height: 1.75; }
        #surat-cetak .surat-tandatangan { margin: 5mm 0 0; }
        #surat-cetak .surat-ruang-tandatangan { height: 19mm; }
        #surat-cetak .surat-penandatangan { margin: 0; line-height: 1.32; }
        #surat-cetak .surat-dokumen.surat-padat { font-size: 10.5pt; line-height: 1.22; }
        #surat-cetak .surat-padat .surat-isi li { margin-bottom: 2.2mm; }
        #surat-cetak .surat-padat .surat-alamat { margin-top: 8mm; }
        #surat-cetak .surat-padat .surat-sapaan { margin-top: 7mm; }
        #surat-cetak .surat-padat .surat-tajuk { margin-top: 5mm; }
        #surat-cetak .surat-padat .surat-isi { margin-top: 3.5mm; }
        #surat-cetak .surat-padat .surat-isi p { margin-bottom: 2.2mm; }
        #surat-cetak .surat-padat .surat-penutup { margin-top: 4mm; }
        #surat-cetak .surat-padat .surat-cogan { margin-top: 7mm; line-height: 1.5; }
        #surat-cetak .surat-padat .surat-tandatangan { margin-top: 3mm; }
        #surat-cetak .surat-padat .surat-ruang-tandatangan { height: 15mm; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          #surat-cetak, #surat-cetak * { visibility: visible; }
          #surat-cetak { position: absolute; inset: 0; min-height: 262mm; width: 100%; background: #fff; }
          @page { size: A4 portrait; margin: 18mm 19mm 17mm; }
        }
      `}</style>

      <article className={`surat-dokumen${padat ? " surat-padat" : ""}`}>
        <header className="surat-kepala">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-jata-negara.png")} alt="Jata Negara Malaysia" className="surat-logo-jata" />
          <div>
            <p className="surat-kepala-kpm">KEMENTERIAN PENDIDIKAN MALAYSIA</p>
            <h1 className="surat-kepala-nama">{kepala.nama.toUpperCase()}</h1>
            <p className="surat-kepala-alamat">{kepala.alamat}</p>
          </div>
          <div>
            <div className="surat-logo-kumpulan">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" className="surat-logo-sktd" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aset("/logo-ts25.png")} alt="Program Transformasi Sekolah 2025" className="surat-logo-ts25" />
            </div>
            <p className="surat-hubungi">Tel : {kepala.telefon}<br />E-mel : {kepala.emel}</p>
          </div>
        </header>

        <div className="surat-rujukan">
          <p>{surat.rujukan_kami && <>Ruj Kami : {surat.rujukan_kami}<br /></>}Tarikh : {tarikhSurat(data.tarikh)}</p>
        </div>

        <div className="surat-kandungan">
          <p className="surat-alamat">{data.alamat}</p>
          <p className="surat-sapaan">Tuan/Puan,</p>
          <p className="surat-tajuk">{surat.tajuk}</p>

          <div className="surat-isi">
            <p>Dengan hormatnya perkara di atas adalah dirujuk.</p>
            <ol>{perenggan.map((p, indeks) => <li key={indeks}>{p}</li>)}</ol>
          </div>
          {isi.dipendekkan && <p className="m-0 text-[8pt] italic">Isi melebihi ruang satu halaman dan dipendekkan pada penghujung ayat.</p>}

          <p className="surat-penutup">Sekian.</p>
          <p className="surat-cogan">“MALAYSIA MADANI”</p>
          <p className="surat-cogan" style={{ marginTop: "3.5mm" }}>“BERKHIDMAT UNTUK NEGARA”</p>
          <div className="surat-tandatangan">
            <p className="m-0">Saya yang menjalankan amanah</p>
            <div className="surat-ruang-tandatangan" aria-label="Ruang tandatangan hidup Guru Besar" />
            <p className="surat-penandatangan">({data.wakilGbNama.toUpperCase()})<br />{data.wakilGbJawatan}<br />{kepala.nama}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
