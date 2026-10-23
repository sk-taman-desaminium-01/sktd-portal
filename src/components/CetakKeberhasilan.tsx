import { Fragment } from "react";
import { aset } from "@/lib/laluan";
import { kira, segmenTebal, type Borang, type Kiraan, type KodPeringkat } from "@/data/keberhasilan";

/** "2026-07-15T…" → "15.07.2026" */
function tarikh(v: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v || "";
}

const KOD: KodPeringkat[] = ["penetapan", "p1", "semakan", "akhir"];

/**
 * Helaian rasmi KPM "Borang Keberhasilan" (A4 landscape, hitam atas putih
 * dalam tema cerah dan gelap). Gaya diskop dengan id supaya `mulaCetak()`
 * yang menyalin elemen ini ke halaman pratonton membawa gayanya sekali.
 */
export default function CetakKeberhasilan({
  borang, id = "keberhasilan-cetak", sembunyiKp = false,
}: {
  borang: Borang;
  id?: string;
  sembunyiKp?: boolean;
}) {
  const p = borang.pyd;
  const r1 = kira(1, borang);
  const r2 = kira(2, borang);
  const sel = (r: Kiraan, k: "bil" | "jumlah" | "purata" | "skor") => {
    if (!r.bil) return "";
    const v = r[k];
    if (v == null) return "";
    return k === "purata" ? v.toFixed(2) : String(v);
  };
  let no = 0;

  const jumlah = (label: string, k: "bil" | "jumlah" | "purata" | "skor") => (
    <tr className="kb-jum">
      <td colSpan={4} className="kb-nb kb-kn"><b>{label}</b></td>
      <td className="kb-cy kb-c">{sel(r1, k)}</td>
      <td colSpan={2} className="kb-blk" />
      <td className="kb-cy kb-c">{sel(r2, k)}</td>
      <td className="kb-blk" />
    </tr>
  );

  const tandatangan = (label: string, kunci: "sah1" | "sah2" | "hantar") => (
    <tr className="kb-sig">
      <td colSpan={2} className="kb-c"><b>{label}</b></td>
      {KOD.map((k) => {
        const v = borang.peringkat[k][kunci];
        return (
          <td key={k} colSpan={k === "semakan" ? 2 : 1} className="kb-c">{v ? `✓ ${tarikh(v)}` : ""}</td>
        );
      })}
      <td colSpan={2} />
    </tr>
  );

  return (
    <div id={id} data-cetak-kertas="landscape" className="kb-kertas">
      <style>{`
        #${id} { background: #fff; color: #000; width: 1080px; box-sizing: border-box; padding: 26px 28px; font: 11px/1.35 Arial, Helvetica, sans-serif; color-scheme: light; }
        #${id} .kb-kepala { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        #${id} .kb-tajuk { font-weight: 700; font-size: 13px; line-height: 1.5; }
        #${id} .kb-lg { text-align: center; font-weight: 700; font-size: 10px; width: 180px; }
        #${id} .kb-logo { display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 4px; }
        #${id} .kb-lg img { display: block; width: auto; height: 52px; object-fit: contain; }
        #${id} table { border-collapse: collapse; width: 100%; table-layout: fixed; background: #fff; color: #000; }
        #${id} td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; overflow-wrap: anywhere; background: #fff; color: #000; }
        #${id} tr { break-inside: avoid; page-break-inside: avoid; }
        #${id} .kb-cy { background: #ccffff; font-weight: 700; }
        #${id} .kb-c { text-align: center; vertical-align: middle; }
        #${id} .kb-kn { text-align: right; }
        #${id} td.kb-nb { border: 0; }
        #${id} td.kb-gap { height: 10px; }
        #${id} td.kb-blk { background: #000; }
        #${id} .kb-sig td { height: 34px; font-size: 10px; }
        #${id} .kb-gugur { text-decoration: line-through; }
      `}</style>

      <div className="kb-kepala">
        <div className="kb-tajuk">
          <div>PENILAIAN BERSEPADU PEGAWAI PERKHIDMATAN PENDIDIKAN</div>
          <div>BORANG KEBERHASILAN</div>
          <div>TAHUN <u>{borang.tahun}</u></div>
        </div>
        <div className="kb-lg">
          {/* Lencana sekolah pada SETIAP dokumen cetak (keputusan 10 Okt 2026),
              di sebelah logo KPM templat rasmi. */}
          <div className="kb-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aset("/logo-kpm.png")} alt="Kementerian Pendidikan Malaysia" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" />
          </div>
          KEMENTERIAN PENDIDIKAN MALAYSIA
        </div>
      </div>

      <table>
        <colgroup>
          <col style={{ width: "15%" }} /><col style={{ width: "3%" }} /><col style={{ width: "23%" }} />
          <col style={{ width: "15%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7.5%" }} />
          <col style={{ width: "15%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7.5%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="kb-cy">NAMA PYD</td><td colSpan={3} className="kb-c">{p.nama}</td>
            <td colSpan={2} className="kb-cy">GRED</td><td colSpan={3} className="kb-c">{p.gred}</td>
          </tr>
          <tr>
            <td className="kb-cy">NO.K.P.</td><td colSpan={3} className="kb-c">{sembunyiKp ? "—" : p.kp}</td>
            <td colSpan={2} rowSpan={2} className="kb-cy">TEMPAT BERTUGAS</td>
            <td colSpan={3} rowSpan={2} className="kb-c">{p.tempat}</td>
          </tr>
          <tr><td className="kb-cy">JAWATAN</td><td colSpan={3} className="kb-c">{p.jawatan}</td></tr>
          <tr><td colSpan={9} className="kb-nb kb-gap" /></tr>
          <tr>
            <td className="kb-cy kb-c">BIDANG TUGAS/ FUNGSI/ AKAUNTABILITI</td>
            <td className="kb-cy kb-c">BIL</td>
            <td className="kb-cy kb-c">SASARAN KEBERHASILAN</td>
            <td className="kb-cy kb-c">PENCAPAIAN SEMASA PENILAIAN PERTAMA</td>
            <td className="kb-cy kb-c">MARKAH</td>
            <td className="kb-cy kb-c">STATUS SASARAN</td>
            <td className="kb-cy kb-c">PENCAPAIAN SEMASA PENILAIAN AKHIR</td>
            <td className="kb-cy kb-c">MARKAH</td>
            <td className="kb-cy kb-c">CATATAN</td>
          </tr>
          {borang.bidang.map((x) => (
            <Fragment key={x.id}>
              {x.sasaran.map((s, i) => {
                no++;
                return (
                  <tr key={s.id}>
                    {i === 0 && <td rowSpan={x.sasaran.length} className="kb-c"><b>{x.nama}</b></td>}
                    <td className="kb-c">{no}</td>
                    <td className={s.status === "GUGUR" ? "kb-gugur" : undefined}>
                      {segmenTebal(s.teks).map((g, j) => (g.tebal ? <b key={j}>{g.teks}</b> : <Fragment key={j}>{g.teks}</Fragment>))}
                    </td>
                    <td>{s.p1}</td>
                    <td className="kb-c">{s.m1}</td>
                    <td className="kb-c">{s.status}</td>
                    <td>{s.p2}</td>
                    <td className="kb-c">{s.m2}</td>
                    <td>{s.catatan}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
          {jumlah("BILANGAN SASARAN YANG DINILAI", "bil")}
          {jumlah("JUMLAH MARKAH", "jumlah")}
          {jumlah("PURATA PENCAPAIAN", "purata")}
          {jumlah("SKOR", "skor")}
          <tr><td colSpan={9} className="kb-nb kb-gap" /></tr>
          <tr>
            <td colSpan={7} className="kb-cy kb-c">TANDATANGAN DAN TARIKH</td>
            <td colSpan={2} rowSpan={2} className="kb-cy kb-c">CATATAN</td>
          </tr>
          <tr>
            <td colSpan={2} className="kb-cy" />
            <td className="kb-cy kb-c">PENETAPAN SASARAN</td>
            <td className="kb-cy kb-c">PENILAIAN PERTAMA</td>
            <td colSpan={2} className="kb-cy kb-c">SEMAKAN SASARAN</td>
            <td className="kb-cy kb-c">PENILAIAN AKHIR</td>
          </tr>
          {tandatangan("PP1", "sah1")}
          {tandatangan("PP2", "sah2")}
          {tandatangan("PYD", "hantar")}
        </tbody>
      </table>
    </div>
  );
}
