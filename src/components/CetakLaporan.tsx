"use client";

import { SEKOLAH } from "@/data/sekolah";
import { aset } from "@/lib/laluan";

/**
 * BORANG LAPORAN RASMI — satu susun atur untuk semua modul.
 *
 * KENAPA SATU KOMPONEN
 * Setiap modul yang merekod data akhirnya perlu menyerahkan sesuatu kepada
 * unit atau jawatankuasa: senarai pinjaman aset kepada penyelia unit,
 * kehadiran RMT kepada Guru RMT, penggunaan bilik kepada PK Pentadbiran.
 * Menulis kepala surat sekolah lima kali bermakna lima tempat untuk tersilap
 * nombor telefon, dan lima tempat untuk dikemas kini bila sekolah berpindah.
 *
 * BENTUKNYA mengikut slip dan borang yang sudah digunakan sekolah: jata
 * negara di kiri, lencana sekolah di kanan, nama dan alamat rasmi di tengah,
 * tajuk bergaris, jadual berbingkai, dan ruang tandatangan di bawah.
 *
 * CETAK, BUKAN SKRIN. Komponen ini tersembunyi sehingga `mulaCetak()`
 * dipanggil (lihat cetak-mudah-alih.ts), yang berfungsi sama di telefon,
 * iPhone dan laptop tanpa popup atau blob.
 */

export interface LajurLaporan {
  /** Tajuk lajur seperti yang dicetak. */
  tajuk: string;
  /** Lebar tetap (mm) — biar kosong untuk lajur yang boleh mengembang. */
  lebar?: string;
  /** Teks di tengah: sesuai untuk tarikh, bilangan, status. */
  tengah?: boolean;
}

export interface RuangTandatangan {
  /** "Disediakan oleh", "Disahkan oleh", "Diterima oleh". */
  label: string;
  /** Nama dan jawatan dicetak di bawah garis, kalau diketahui. */
  nama?: string;
  jawatan?: string;
}

export default function CetakLaporan({
  id, tajuk, subtajuk, maklumat, lajur, baris, nota, tandatangan, kertas = "portrait",
}: {
  /** Id unsur — hantar yang SAMA kepada `mulaCetak(id, tajuk)`. */
  id: string;
  tajuk: string;
  subtajuk?: string;
  /** Pasangan label–nilai di atas jadual: "Unit : ICT", "Bulan : Sep 2026". */
  maklumat?: { label: string; nilai: string }[];
  lajur: LajurLaporan[];
  baris: (string | number)[][];
  nota?: string;
  tandatangan?: RuangTandatangan[];
  kertas?: "portrait" | "landscape";
}) {
  const dicetak = new Intl.DateTimeFormat("ms-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date());

  return (
    <div id={id} data-cetak-kertas={kertas} className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #${id}, #${id} * { visibility: visible; }
          #${id} { position: absolute; inset: 0; width: 100%; }
          @page { size: A4 ${kertas}; margin: 14mm; }
        }
        #${id} { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9.5pt; }
        /* Kepala surat: jata — nama sekolah — hubungi — lencana.
           Grid, bukan flex, supaya lebar logo tidak berubah mengikut panjang
           alamat; alamat sekolah berubah, saiz jata tidak. */
        #${id} .kepala {
          display: grid; grid-template-columns: 16mm 1fr auto 16mm;
          align-items: center; gap: 3mm;
          border-bottom: 1.2pt solid #000; padding-bottom: 2.5mm;
        }
        #${id} .kepala img { width: 100%; height: auto; }
        #${id} .sek { text-align: center; font-size: 9pt; line-height: 1.35; }
        #${id} .sek b { font-size: 11pt; }
        #${id} .hub { text-align: right; font-size: 7.5pt; line-height: 1.35; }
        #${id} .tajuk { text-align: center; font-weight: 700; text-transform: uppercase;
          font-size: 11.5pt; margin-top: 5mm; }
        #${id} .subtajuk { text-align: center; font-size: 9pt; margin-top: 1mm; }
        #${id} .maklumat { display: grid; grid-template-columns: auto 4mm 1fr; gap: 0 1mm;
          margin-top: 4mm; font-size: 9pt; }
        #${id} table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 8.5pt; }
        #${id} th, #${id} td { border: .8pt solid #000; padding: 1.4mm 1.8mm; vertical-align: top; }
        #${id} th { background: #eee; font-weight: 700; text-align: center; }
        #${id} .c { text-align: center; }
        /* Baris jadual TIDAK dipotong separuh antara muka surat. */
        #${id} tr { break-inside: avoid; }
        #${id} thead { display: table-header-group; }
        #${id} .nota { margin-top: 4mm; font-size: 8.5pt; }
        #${id} .ttd { display: grid; gap: 10mm; margin-top: 14mm; break-inside: avoid; }
        #${id} .ttd-satu { font-size: 8.5pt; }
        #${id} .garis { border-bottom: .9pt dotted #000; height: 12mm; }
        #${id} .kaki { margin-top: 8mm; font-size: 7pt; color: #444; text-align: right; }
      `}</style>

      <header className="kepala">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aset("/logo-jata-negara.png")} alt="" />
        <div className="sek">
          <b>{SEKOLAH.namaPenuh.toUpperCase()}</b><br />
          LESTARI PERDANA, 43300 SERI KEMBANGAN<br />
          SELANGOR DARUL EHSAN
        </div>
        <div className="hub">
          Tel : {SEKOLAH.hubungi.telefon}<br />
          Kod Sekolah : BBA 8284<br />
          {SEKOLAH.hubungi.emel}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={aset("/logo-sktd.png")} alt="" />
      </header>

      <p className="tajuk">{tajuk}</p>
      {subtajuk && <p className="subtajuk">{subtajuk}</p>}

      {maklumat && maklumat.length > 0 && (
        <div className="maklumat">
          {maklumat.map((m) => (
            <div key={m.label} style={{ display: "contents" }}>
              <span>{m.label}</span><span>:</span><span><b>{m.nilai}</b></span>
            </div>
          ))}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={{ width: "10mm" }}>Bil</th>
            {lajur.map((l) => (
              <th key={l.tajuk} style={l.lebar ? { width: l.lebar } : undefined}>{l.tajuk}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 ? (
            <tr>
              <td className="c" colSpan={lajur.length + 1} style={{ height: "14mm" }}>
                Tiada rekod bagi tempoh ini.
              </td>
            </tr>
          ) : (
            baris.map((b, i) => (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                {lajur.map((l, j) => (
                  <td key={l.tajuk} className={l.tengah ? "c" : undefined}>{b[j] ?? ""}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {nota && <p className="nota">{nota}</p>}

      {tandatangan && tandatangan.length > 0 && (
        <div
          className="ttd"
          style={{ gridTemplateColumns: `repeat(${Math.min(tandatangan.length, 3)}, 1fr)` }}
        >
          {tandatangan.map((t) => (
            <div key={t.label} className="ttd-satu">
              <div className="garis" />
              <div style={{ marginTop: "1.5mm" }}>{t.label}</div>
              {t.nama && <div><b>{t.nama.toUpperCase()}</b></div>}
              {t.jawatan && <div>{t.jawatan}</div>}
            </div>
          ))}
        </div>
      )}

      <p className="kaki">Dijana {dicetak} · {SEKOLAH.namaPenuh}</p>
    </div>
  );
}
