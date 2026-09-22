"use client";

import { PENYAKIT, type AkuanAktiviti, type AktivitiBorang } from "@/data/borang-aktiviti";
import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";
import { mulaCetak } from "./cetak-mudah-alih";

type Program = Pick<AktivitiBorang, "nama" | "tarikh" | "masa" | "tempat" | "anjuran">;

const BULAN = ["JANUARI", "FEBRUARI", "MAC", "APRIL", "MEI", "JUN", "JULAI", "OGOS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DISEMBER"];

/** "2026-05-24" → "24 MEI 2026", seperti yang ditaip pada borang asal. */
export function tarikhBorang(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return (iso ?? "").toUpperCase();
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}

/** "2026-09-22T03:10:00Z" → "22.09.2026" (tarikh Malaysia), gaya surat sekolah. */
function tarikhTandatangan(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const [h, b, y] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(t).split("/");
  return `${h}.${b}.${y}`;
}

/** Pilihan "A / B*" — yang tidak berkenaan dipotong, seperti diisi dengan pen. */
function Potong({ ya, a, b }: { ya: boolean; a: string; b: string }) {
  return <>{ya ? a : <s>{a}</s>} / {ya ? <s>{b}</s> : b}</>;
}

/**
 * SURAT AKUAN KEBENARAN WARIS MENYERTAI + BORANG PERAKUAN KESIHATAN.
 *
 * Tiruan SEBIJIK borang sekolah `rujukan-borang/SURAT KEBENARAN WARIS.pdf`:
 * satu helaian A4 landskap, dua muka bersebelahan. Susunan baris, ayat,
 * ejaan (termasuk "mengidap", "Insuran", "Hemophillia") dan logo MSSS
 * dikekalkan seperti dokumen asal — jangan "betulkan" teksnya, kerana
 * borang ini disemak bersama salinan kertas oleh urus setia kejohanan.
 *
 * Yang dipotong ("ADA / TIDAK ADA*", "membenarkan / tidak membenarkan*")
 * dicoret mengikut jawapan penjaga, sama seperti borang yang diisi dengan pen.
 */
export default function CetakAkuan({
  aktiviti: a, data: d, tarikh,
}: { aktiviti: Program; data: AkuanAktiviti; tarikh?: string | null }) {
  const adaPenyakit = d.penyakit.some((p) => p.ada);
  const nyatakan = d.penyakit
    .map((p, i) => (p.ada ? `${PENYAKIT[i]}${p.catatan ? ` (${p.catatan})` : ""}` : ""))
    .filter(Boolean).join("; ");
  const tt = tarikhTandatangan(tarikh);
  const namaPenjaga = d.penjagaNama.toUpperCase();

  return <>
    <button type="button" onClick={() => mulaCetak("akuan-cetak", `Surat Akuan Waris - ${d.muridNama}`)}
      className="my-4 min-h-11 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white print:hidden">
      Cetak / Simpan PDF
    </button>

    <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white print:overflow-visible print:border-0">
    <div id="akuan-cetak" data-cetak-kertas="landscape">
      <style>{`
        #akuan-cetak { box-sizing: border-box; width: 277mm; min-height: 190mm; margin: 0 auto; background: #fff; color: #000;
          display: grid; grid-template-columns: 1fr 1fr; column-gap: 9mm; padding: 2mm 0; font-family: Arial, Helvetica, sans-serif; font-size: 7.3pt; line-height: 1.25; }
        #akuan-cetak * { box-sizing: border-box; }
        #akuan-cetak p { margin: 0; }
        #akuan-cetak .u { display: inline-block; border-bottom: .6pt solid #000; min-height: 1.25em; padding: 0 1mm; vertical-align: bottom; overflow-wrap: anywhere; }
        #akuan-cetak .baris { display: flex; align-items: flex-end; gap: 1.2mm; margin-top: 2mm; }
        #akuan-cetak .baris .u { flex: 1; min-width: 0; }
        #akuan-cetak .baris .tetap { flex: none; }
        /* ---------- muka kiri: Surat Akuan Kebenaran Waris ---------- */
        #akuan-cetak .kepala { display: grid; grid-template-columns: 17mm 1fr 34mm 14mm; align-items: center; column-gap: 2mm; }
        #akuan-cetak .kepala img { width: 100%; height: 15mm; object-fit: contain; }
        #akuan-cetak .kepala .sek { font-size: 7.4pt; line-height: 1.35; }
        #akuan-cetak .kepala .sek b { font-size: 7.8pt; }
        #akuan-cetak .kepala .hub { font-size: 6.6pt; line-height: 1.35; align-self: end; }
        #akuan-cetak .tajuk-w { margin-top: 1mm; text-align: center; font-weight: 700; font-size: 8.2pt; }
        #akuan-cetak .garis-tajuk { width: 62%; margin: .6mm auto 0; border-bottom: .6pt solid #000; height: 3.2mm; }
        #akuan-cetak .anak { margin-left: 11mm; }
        #akuan-cetak .prog { display: grid; grid-template-columns: 30mm 3mm 1fr; row-gap: .6mm; margin: 1.2mm 0 0 16mm; width: 100mm; }
        #akuan-cetak .prog .u { display: block; font-size: 7.4pt; }
        #akuan-cetak .no { display: grid; grid-template-columns: 11mm 1fr; margin-top: 2mm; text-align: justify; }
        #akuan-cetak .kecil { font-size: 5.6pt; }
        #akuan-cetak .ttd { display: grid; grid-template-columns: 1fr 42mm; align-items: end; margin-top: 2.5mm; }
        #akuan-cetak .ttd-ruang { position: relative; width: 44mm; height: 7mm; }
        #akuan-cetak .ttd-ruang img { position: absolute; left: 2mm; bottom: -1.2mm; height: 11mm; max-width: 40mm; object-fit: contain; }
        #akuan-cetak .saksi-tajuk { margin-top: 2.6mm; font-weight: 700; text-decoration: underline; }
        #akuan-cetak .cop { display: flex; justify-content: space-between; align-items: flex-end; }
        /* ---------- muka kanan: Borang Perakuan Kesihatan ---------- */
        #akuan-cetak .kanan { font-family: Calibri, Carlito, "Segoe UI", Arial, sans-serif; font-size: 7.9pt; }
        #akuan-cetak .kepala-k { display: flex; justify-content: flex-end; align-items: flex-start; gap: 5mm; padding-right: 13mm; }
        #akuan-cetak .jata-k { text-align: center; font-family: Arial, sans-serif; font-size: 4.9pt; line-height: 1.2; }
        #akuan-cetak .jata-k img { display: block; margin: 0 auto; height: 12mm; }
        #akuan-cetak .msss { height: 12.5mm; margin-top: 1mm; }
        #akuan-cetak .tajuk-k { margin-top: 2.6mm; text-align: center; font-weight: 700; font-size: 8.2pt; line-height: 1.35; }
        #akuan-cetak .blok { display: grid; grid-template-columns: 8mm 45mm 1fr; margin-top: 3.4mm; font-weight: 700; }
        #akuan-cetak .sub { display: grid; grid-template-columns: 13mm 6mm 40mm 3mm 1fr; margin-top: .7mm; }
        #akuan-cetak .jadual { width: 100%; border-collapse: collapse; margin-top: 3.2mm; font-size: 7.6pt; }
        #akuan-cetak .jadual th, #akuan-cetak .jadual td { border: .8pt solid #000; height: 5.1mm; padding: 0 1.4mm; }
        #akuan-cetak .jadual th { font-weight: 700; text-align: center; }
        #akuan-cetak .jadual .c { text-align: center; }
        #akuan-cetak .ttd-k { display: grid; grid-template-columns: 19mm 3mm 1fr; align-items: end; margin-top: 4.4mm; }
        #akuan-cetak .titik { border-bottom: .9pt dotted #000; min-height: 1.3em; padding: 0 1mm; }
        @media print { #akuan-cetak { width: 100%; } }
      `}</style>

      {/* ======================= MUKA KIRI ======================= */}
      <section>
        <header className="kepala">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-jata-negara.png")} alt="Jata Negara" />
          <div className="sek">
            <b>{SEKOLAH.namaPenuh.toUpperCase()}</b><br />
            LESTARI PERDANA, 43300 SERI KEMBANGAN<br />
            SELANGOR DARUL EHSAN.
          </div>
          <div className="hub">
            Tel : {SEKOLAH.hubungi.telefon}<br />
            Kod Sekolah : BBA 8284<br />
            E-mel: {SEKOLAH.hubungi.emel.replace(/^[^@]+/, (n) => n.toUpperCase())}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" />
        </header>
        <p className="tajuk-w">SURAT AKUAN KEBENARAN WARIS MENYERTAI</p>
        <div className="garis-tajuk" />

        <p className="baris"><span className="tetap">Saya</span><span className="u">{namaPenjaga}</span>
          <span className="tetap">No. Kad Pengenalan</span><span className="u" style={{ flex: "0 0 30mm" }}>{d.penjagaKp}</span></p>
        <p className="baris"><span className="tetap">alamat</span><span className="u">{d.alamat.toUpperCase()}</span></p>
        <p className="baris"><span className="tetap">No. Telefon</span><span className="u" style={{ flex: "0 0 36mm" }}>{d.telefon}</span>
          <span className="tetap">adalah waris kepada murid seperti di bawah:-</span></p>
        <p className="baris anak"><span className="tetap">Nama Murid :</span><span className="u" style={{ flex: "0 0 86mm" }}>{d.muridNama.toUpperCase()}</span></p>
        <p className="baris anak"><span className="tetap">Kelas :</span><span className="u" style={{ flex: "0 0 26mm" }}>{d.kelas.toUpperCase()}</span>
          <span className="tetap" style={{ marginLeft: "8mm" }}>No. Kad Pengenalan/ Surat Beranak:</span><span className="u">{d.muridKp}</span></p>

        <p style={{ marginTop: "3.4mm" }}>Saya dengan ini memberi kebenaran bertulis kepada anak / jagaan untuk menyertai :-</p>
        <div className="prog">
          <span>Nama Program</span><span>:</span><span className="u">{a.nama.toUpperCase()}</span>
          <span>Tarikh Program</span><span>:</span><span className="u">{tarikhBorang(a.tarikh)}</span>
          <span>Masa</span><span>:</span><span className="u">{a.masa.toUpperCase()}</span>
          <span>Tempat</span><span>:</span><span className="u">{a.tempat.toUpperCase()}</span>
          <span>Anjuran</span><span>:</span><span className="u">{a.anjuran.toUpperCase()}</span>
        </div>

        <p className="no"><span>2.</span><span>Saya difahamkan bahawa soal keselamatan dan disiplin sentiasa diberi perhatian sewajarnya oleh Guru / Pegawai / Urusetia yang telah diamanahkan. Sekiranya kesihatan anak / jagaan saya terganggu dalam masa latihan/ perkhemahan atau perjalanan / semasa program, maka saya dengan sepenuh hati membenarkan Guru / Pegawai / Urusetia menguruskan bagi pihak saya untuk mendapatkan rawatan perubatan.</span></p>
        <p className="no"><span>3.</span><span>Saya dengan ini mengaku bahawa murid di atas <Potong ya={adaPenyakit} a="ADA" b="TIDAK ADA" />* mengidap penyakit kronik/berjangkit.</span></p>
        <p className="baris" style={{ marginTop: "1.6mm" }}><span className="tetap">Nyatakan ( jika ada ) :</span><span className="u">{nyatakan}</span><span className="tetap kecil">( * potong yang berkenaan )</span></p>
        <p className="no"><span>4.</span><span>Saya dengan ini mengakui bahawa murid ADA&nbsp; Perlindungan Insuran Takaful.</span></p>

        <div className="ttd">
          <div>
            <div className="ttd-ruang">
              {d.tandatangan && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.tandatangan} alt="Tandatangan ibu bapa/penjaga" />
              )}
            </div>
            <p>……………………………………..</p>
            <p>Tandatangan Ibu bapa / Penjaga</p>
            <p>( {namaPenjaga} )</p>
          </div>
          <p className="baris" style={{ marginTop: 0, alignSelf: "center" }}><span className="tetap">Tarikh :</span><span className="u">{tt}</span></p>
        </div>

        <p className="saksi-tajuk">PENGAKUAN SAKSI</p>
        <p>Saya dengan ini memperakukan bahawa sepanjang pengetahuan saya, segala keterangan di atas adalah benar .</p>
        <p className="baris" style={{ width: "72mm", marginTop: "1.6mm" }}><span className="tetap">Tandatangan Saksi :</span><span className="u" /></p>
        <p className="baris" style={{ width: "72mm", marginTop: "1.6mm" }}><span className="tetap">Nama :</span><span className="u" /></p>
        <p className="baris" style={{ width: "72mm", marginTop: "1.6mm" }}><span className="tetap">No. Kad Pengenalan :</span><span className="u" /></p>

        <p style={{ marginTop: "3mm" }}>Disahkan oleh</p>
        <p style={{ marginTop: "5mm" }}>……………………………………..</p>
        <p>Guru&nbsp; Besar</p>
        <p className="cop"><span>SK Taman Desaminium</span><span style={{ marginRight: "10mm" }}>cop rasmi sekolah</span></p>
      </section>

      {/* ======================= MUKA KANAN ======================= */}
      <section className="kanan">
        <header className="kepala-k">
          <div className="jata-k">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aset("/logo-jata-negara.png")} alt="Jata Negara" />
            KEMENTERIAN PENDIDIKAN<br />JABATAN PENDIDIKAN NEGERI SELANGOR
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aset("/logo-msss.png")} alt="MSS Selangor" className="msss" />
        </header>
        <p className="tajuk-k">BORANG PERAKUAN KESIHATAN<br />UNTUK MENYERTAI SUKAN DAN AKTIVITI KECERGASAN</p>

        <div className="blok"><span>A.</span><span>NAMA SEKOLAH</span><span>: SK TAMAN DESAMINIUM</span></div>
        <div className="blok"><span>B.</span><span>MAKLUMAT PROGRAM :</span><span /></div>
        <div className="sub"><span /><span>1.</span><span>NAMA PROGRAM</span><span>:</span><span>{a.nama.toUpperCase()}</span></div>
        <div className="sub"><span /><span>2.</span><span>TARIKH</span><span>:</span><span>{tarikhBorang(a.tarikh)}</span></div>
        <div className="sub"><span /><span>3.</span><span>TEMPAT</span><span>:</span><span>{a.tempat.toUpperCase()}</span></div>
        <div className="blok" style={{ gridTemplateColumns: "1fr" }}><span>C. MAKLUMAT MURID :</span></div>
        <div className="sub" style={{ marginTop: "2mm" }}><span /><span>1.</span><span>NAMA PENUH MURID</span><span>:</span><span>{d.muridNama.toUpperCase()}</span></div>
        <div className="sub"><span /><span>2.</span><span>TAHUN / TINGKATAN</span><span>:</span><span>{d.kelas.toUpperCase()}</span></div>
        <div className="sub"><span /><span>3.</span><span>NO. S. BERANAK / NO. KP</span><span>:</span><span>{d.muridKp}</span></div>
        <div className="blok" style={{ gridTemplateColumns: "1fr", marginTop: "4.4mm" }}><span>D. PENGAKUAN KESIHATAN MURID</span></div>
        <p style={{ marginTop: "3mm" }}>Adakah anak anda sekarang ini menghidap masalah berikut?</p>

        <table className="jadual">
          <thead><tr><th style={{ width: "7%" }} /><th style={{ width: "44%" }}>JENIS PENYAKIT</th><th style={{ width: "11%" }}>YA</th><th style={{ width: "11%" }}>TIDAK</th><th>CATATAN</th></tr></thead>
          <tbody>
            {PENYAKIT.map((x, i) => (
              <tr key={x}>
                <td className="c">{String.fromCharCode(65 + i)}</td>
                <td>{x}</td>
                <td className="c">{d.penyakit[i]?.ada ? "✓" : ""}</td>
                <td className="c">{d.penyakit[i] && !d.penyakit[i].ada ? "✓" : ""}</td>
                <td>{d.penyakit[i]?.catatan ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: "1.2mm", fontWeight: 700 }}>Saya mengaku bahawa semua maklumat di atas adalah benar mengikut pengetahuan saya.</p>
        <p style={{ marginTop: "3mm" }}>Dengan ini, saya <Potong ya={d.bersetuju} a="membenarkan" b="tidak membenarkan" />* anak jagaan saya menyertai program di atas.</p>

        <div className="ttd-k">
          <span>Tandatangan</span><span>:</span>
          <span className="titik" style={{ position: "relative", width: "45mm", height: "7mm" }}>
            {d.tandatangan && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.tandatangan} alt="" style={{ position: "absolute", left: "2mm", bottom: "-1mm", height: "9mm", maxWidth: "40mm", objectFit: "contain" }} />
            )}
          </span>
        </div>
        <div className="ttd-k" style={{ gridTemplateColumns: "19mm 3mm 62mm 1fr", marginTop: "3.4mm" }}>
          <span>Nama Penjaga</span><span>:</span><span className="titik">{namaPenjaga}</span>
          <span style={{ display: "flex", justifyContent: "flex-end", gap: "1mm" }}>Tarikh : <span className="titik" style={{ minWidth: "22mm" }}>{tt}</span></span>
        </div>
        <p style={{ marginTop: "3.4mm", fontWeight: 700 }}>*Potong yang mana tidak berkenaan</p>
      </section>
    </div>
    </div>
  </>;
}
