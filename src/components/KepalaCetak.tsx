import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";

/**
 * KEPALA BORANG SEKOLAH — Jata Negara · nama & alamat sekolah · hubungi · LENCANA.
 *
 * SATU kepala untuk SETIAP dokumen cetak sekolah (laporan, slip PBD/UASA,
 * Laporan Lembaga Disiplin, carta organisasi, Borang Kawalan Bilik Darjah).
 * Ditulis selepas teguran pengguna (10 Okt 2026): slip ePBD dicetak TANPA
 * lencana sekolah, sedangkan slip lama dan borang lain semuanya membawanya.
 * Puncanya: setiap dokumen menulis kepala sendiri, dan dua daripadanya
 * hanya menulis nama sekolah sebagai teks.
 *
 * DIKECUALIKAN dengan sengaja (pengguna): Kebenaran Gambar (format lampiran
 * KPM, `CetakMedia`) dan muka Perakuan Kesihatan dalam `CetakAkuan` — muka
 * Surat Akuan di sebelahnya sudah membawa lencana, pada helaian yang sama.
 * Surat rasmi (`CetakSurat`) ada kepala suratnya sendiri, juga berlencana.
 *
 * Gaya SEBARIS (bukan kelas): dokumen cetak disalin sebagai HTML ke halaman
 * pratonton, dan gaya sebaris ikut bersamanya tanpa bergantung pada CSS
 * dokumen induk. Grid, bukan flex, supaya lebar logo tidak berubah mengikut
 * panjang alamat.
 */
export default function KepalaCetak() {
  const logo = { width: "100%", height: "auto" } as const;
  return (
    <header
      className="kepala-cetak"
      style={{
        display: "grid", gridTemplateColumns: "16mm 1fr auto 16mm", alignItems: "center", gap: "3mm",
        borderBottom: "1.2pt solid #000", paddingBottom: "2.5mm",
        fontFamily: "Arial, Helvetica, sans-serif", color: "#000", textAlign: "left",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={aset("/logo-jata-negara.png")} alt="Jata Negara" style={logo} />
      <div style={{ textAlign: "center", fontSize: "9pt", lineHeight: 1.35 }}>
        <b style={{ fontSize: "11pt" }}>{SEKOLAH.namaPenuh.toUpperCase()}</b><br />
        LESTARI PERDANA, 43300 SERI KEMBANGAN<br />
        SELANGOR DARUL EHSAN
      </div>
      <div style={{ textAlign: "right", fontSize: "7.5pt", lineHeight: 1.35 }}>
        Tel : {SEKOLAH.hubungi.telefon}<br />
        Kod Sekolah : BBA 8284<br />
        {SEKOLAH.hubungi.emel}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={aset("/logo-sktd.png")} alt="Lencana SK Taman Desaminium" style={logo} />
    </header>
  );
}
