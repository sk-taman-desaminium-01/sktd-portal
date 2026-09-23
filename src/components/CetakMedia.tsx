import type { BarisSurat, DataSuratGambar } from "@/lib/surat";
import type { KepalaSurat } from "./CetakSurat";
import { aset } from "@/lib/laluan";

/**
 * SURAT AKUAN IBU BAPA/PENJAGA — kebenaran rakaman gambar/video/audio murid.
 *
 * Tiruan SEBIJIK lampiran Surat Siaran KPM Bil. 9/2024
 * (`rujukan-borang/SURAT KEBENARAN MEDIA SOSIAL KPM.pdf`): dua muka A4
 * potret, label di kiri dan garisan isian di kanan, ayat (a)–(c) dan Nota
 * seperti asal, nombor muka "4" dan "5" dikekalkan kerana borang ini ialah
 * lampiran bernombor dalam surat siaran itu.
 */
/** Pecah teks kepada `n` garis mengikut perkataan; baki masuk ke garis terakhir. */
function pecahBaris(teks: string, n: number, had: number): string[] {
  const kata = teks.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const keluar: string[] = [];
  let semasa = "";
  for (const k of kata) {
    if (keluar.length < n - 1 && semasa && (semasa + " " + k).length > had) { keluar.push(semasa); semasa = k; }
    else semasa = semasa ? `${semasa} ${k}` : k;
  }
  keluar.push(semasa);
  while (keluar.length < n) keluar.push("");
  return keluar;
}

export default function CetakMedia({ surat, data: d, kepala }: { surat: BarisSurat; data: DataSuratGambar; kepala: KepalaSurat }) {
  const tahun = surat.dicipta.slice(0, 4);
  const tarikh = (() => {
    const t = new Date(surat.dicipta);
    if (Number.isNaN(t.getTime())) return "";
    const [h, b, y] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "2-digit", year: "numeric" }).format(t).split("/");
    return `${h}.${b}.${y}`;
  })();
  // Dua garis seperti borang asal: nama + kawasan, kemudian poskod + negeri.
  const [kawasan = "", ...bakiAlamat] = kepala.alamat.split("\n").map((x) => x.trim().replace(/,$/, ""));
  const alamatSekolah = [`SK TAMAN DESAMINIUM, ${kawasan},`, bakiAlamat.join(", ")];
  const setuju = d.bersetuju;
  const bersetuju = (setuju ? <>Bersetuju</> : <><s>Bersetuju</s> <b>Tidak bersetuju</b></>);

  // Medan berbilang baris (alamat) dipecah mengikut perkataan ke atas garis
  // berasingan — seperti tulisan tangan pada borang asal — dan bermula pada
  // baris PERTAMA sebaris dengan label. Nilai yang terlalu panjang untuk
  // satu garis dikecilkan sedikit, bukan dibalut ke bawah garis.
  const baris = ({ label, nilai, garis = 1, susun }: { label: React.ReactNode; nilai?: string; garis?: number; susun?: string[] }) => {
    const garisan = susun ?? pecahBaris(nilai ?? "", garis, 33);
    return (
      <div className={`m-baris${garis > 1 ? " m-atas" : ""}`}>
        <span>{label}</span>
        <span>{garisan.map((b, i) => (
          <span key={i} className="m-garis" style={b.length > 32 ? { fontSize: `${Math.max(7, (11.5 * 32) / b.length).toFixed(1)}pt` } : undefined}>{b || " "}</span>
        ))}</span>
      </div>
    );
  };

  return <div id="surat-cetak" data-cetak-kertas="portrait" className="hidden bg-white text-black print:block">
    <style>{`
      #surat-cetak { color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 11.5pt; line-height: 1.35; }
      #surat-cetak p { margin: 0; }
      #surat-cetak .media-muka { position: relative; min-height: 258mm; padding: 0 3mm 12mm; break-after: page; page-break-after: always; }
      #surat-cetak .media-muka:last-child { break-after: auto; page-break-after: auto; }
      #surat-cetak .m-logo { display: block; margin: 16mm auto 0; height: 22mm; }
      #surat-cetak .m-tajuk { margin-top: 7mm; text-align: center; font-weight: 700; line-height: 1.3; }
      #surat-cetak .m-rule { margin: 4mm 1mm 0; border-bottom: 1.6pt solid #000; }
      #surat-cetak .m-baris { display: grid; grid-template-columns: 47% minmax(0, 1fr); align-items: end; margin-top: 1.4mm; padding: 0 3mm; }
      #surat-cetak .m-baris.m-atas { align-items: start; }
      #surat-cetak .m-baris.m-atas > span:first-child { line-height: 7.5mm; }
      #surat-cetak .m-garis { display: block; height: 7.5mm; line-height: 9.4mm; padding: 0 1mm; white-space: nowrap; overflow: hidden; border-bottom: .8pt solid #000; }
      #surat-cetak .m-no { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; }
      #surat-cetak .m-senarai { display: grid; grid-template-columns: 10mm 1fr; margin-top: 5mm; text-align: justify; }
      #surat-cetak .m-senarai > span:first-child { font-size: 12.5pt; }
      #surat-cetak .m-nota { display: grid; grid-template-columns: 6mm 1fr; font-weight: 700; }
      #surat-cetak .m-ttd { display: grid; grid-template-columns: 1fr 72mm; align-items: end; row-gap: 3mm; margin: 0 4mm 0 2mm; }
      #surat-cetak .m-ttd-img { position: relative; }
      /* multiply: tandatangan LAMA yang tersimpan dengan latar putih tidak
         lagi menutup garisan borang. Yang baharu sudah lut sinar. */
      #surat-cetak .m-ttd-img img { position: absolute; left: 6mm; bottom: -1mm; height: 13mm; max-width: 60mm; object-fit: contain; mix-blend-mode: multiply; }
      @media print { @page { size: A4 portrait; margin: 18mm 19mm 17mm; } }
    `}</style>

    {/* ================= MUKA 4 ================= */}
    <section className="media-muka">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan" className="m-logo" />
      <p className="m-tajuk">
        SURAT AKUAN IBU BAPA/PENJAGA<br />
        UNTUK KEBENARAN RAKAMAN GAMBAR/VIDEO/AUDIO MURID SERTA<br />
        MEMUAT NAIK KE LAMAN MEDIA SOSIAL BAGI PROGRAM ANJURAN<br />
        INSTITUSI PENDIDIKAN BAWAH KEMENTERIAN PENDIDIKAN MALAYSIA<br />
        BAGI TAHUN: {tahun}
      </p>
      <div className="m-rule" />

      <div style={{ marginTop: "8mm" }}>
        {baris({ label: "Saya (Nama):", nilai: d.penjagaNama?.toUpperCase() })}
        {baris({ label: "No. Kad Pengenalan:", nilai: d.penjagaKp })}
        {baris({ label: "Beralamat:", nilai: d.alamat?.toUpperCase(), garis: 3 })}
        {baris({ label: "No. telefon:", nilai: d.telefon })}
      </div>

      <p style={{ marginTop: "9mm" }}>mengaku ialah ibu/bapa/penjaga kepada murid bernama seperti di bawah:<br />(sila pilih mana yang berkenaan)</p>

      <div style={{ marginTop: "5mm" }}>
        {baris({ label: "Nama murid:", nilai: d.muridNama?.toUpperCase() })}
        {baris({ label: <>Tingkatan/Darjah/Lain-<br />lain(sila nyatakan):</>, nilai: d.muridKelas?.toUpperCase() })}
        {baris({ label: <>No. Kad Pengenalan/<br />MyKid:</>, nilai: d.muridKp })}
        {baris({ label: <>Alamat Institusi<br />Pendidikan:</>, susun: alamatSekolah, garis: 2 })}
      </div>
      <p className="m-no">4</p>
    </section>

    {/* ================= MUKA 5 ================= */}
    <section className="media-muka">
      <p style={{ paddingTop: "22mm" }}>Saya dengan ini;</p>
      <div className="m-senarai"><span>(a)</span><span>{bersetuju} membenarkan pihak institusi pendidikan bawah KPM untuk mengambil rakaman gambar/video/audio anak/kanak-kanak jagaan saya bagi setiap program/majlis/aktiviti yang dilaksanakan sepanjang tahun ini; dan</span></div>
      <div className="m-senarai"><span>(b)</span><span>{bersetuju} membenarkan institusi pendidikan bawah KPM memuat naik rakaman gambar/video/audio anak/kanak-kanak jagaan saya di mana-mana platform seliaan institusi pendidikan bawah KPM.</span></div>
      <div className="m-senarai"><span>(c)</span><span>Mengesahkan butiran yang diberikan adalah BENAR dan FAHAM dengan perkara yang dinyatakan pada bahagian (a) dan (b).</span></div>

      <p style={{ marginTop: "4mm" }}>Nota:</p>
      <div className="m-nota"><span>1.</span><span>KPM – Kementerian Pendidikan Malaysia</span></div>
      <div className="m-nota"><span>2.</span><span>Institusi pendidikan bawah KPM termasuk bahagian KPM, jabatan pendidikan negeri dan pejabat pendidikan daerah.</span></div>

      <div className="m-ttd" style={{ marginTop: "13mm" }}>
        <span>Tandatangan Ibu bapa/Penjaga:</span>
        <span className="m-ttd-img"><span className="m-garis">{" "}</span>
          {surat.tandatangan_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={surat.tandatangan_url} alt="Tandatangan ibu bapa/penjaga" />
          )}
        </span>
        <span>Nama Penuh (Huruf Besar):</span><span className="m-garis">{d.penjagaNama?.toUpperCase() || " "}</span>
        <span>Tarikh:</span><span className="m-garis">{tarikh || " "}</span>
      </div>

      <p style={{ marginTop: "13mm", fontWeight: 700 }}>DISAHKAN OLEH GURU KELAS</p>
      <p style={{ marginTop: "5mm", textAlign: "justify" }}>Saya dengan ini memperakui bahawa ibu bapa/penjaga murid seperti yang dinyatakan telah menandatangani borang ini bagi tujuan di atas.</p>

      <div className="m-ttd" style={{ marginTop: "8mm" }}>
        <span>Tandatangan:</span><span className="m-garis">{" "}</span>
        <span>Nama Penuh (Huruf Besar):</span><span className="m-garis">{d.guruKelasNama?.toUpperCase() || " "}</span>
        <span>Tarikh:</span><span className="m-garis">{" "}</span>
        <span>Cap Rasmi Sekolah:</span><span className="m-garis">{" "}</span>
      </div>
      <p className="m-no">5</p>
    </section>
  </div>;
}
