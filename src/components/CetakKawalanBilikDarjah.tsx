"use client";

import type { Waktu } from "@/data/jadual-jenis";

/**
 * BORANG KAWALAN BILIK DARJAH — tiruan borang kertas sekolah.
 *
 * Disalin daripada borang sebenar yang pengguna hantar (gambar, 25 Sep 2026).
 * Susunan, tajuk, bilangan baris dan perkataan dikekalkan SEPERTI TERCETAK —
 * guru dan pentadbir sudah kenal borang ini, dan borang yang "hampir sama"
 * memaksa mereka membacanya semula setiap kali.
 *
 * TIGA BAHAGIAN, mengikut borang asal:
 *  1. Kepala — tahun/kelas, hari, tarikh, guru kelas, kiraan murid
 *  2. Jadual 11 baris waktu: Bil · Masa · Mata Pelajaran · Nama Guru ·
 *     T/T Guru · Bil Murid · Catatan
 *  3. Senarai murid tidak hadir (20 baris, dua lajur) dan catatan salah laku
 *     (5 baris)
 *
 * APA YANG DIISI SISTEM, APA YANG DIISI TANGAN
 * Waktu, mata pelajaran dan nama guru datang daripada jadual waktu kelas itu
 * — itu yang sistem memang tahu. Tandatangan, nama murid tidak hadir dan
 * salah laku dibiarkan KOSONG bergaris, kerana borang ini ditandatangani di
 * dalam kelas. Mencetak nama murid yang sistem tidak simpan hanya akan
 * mencipta rekod palsu.
 */

export interface BarisWaktuBorang {
  masa: string;
  subjek: string;
  guru: string;
  bilMurid: string;
  catatan: string;
}

export default function CetakKawalanBilikDarjah({
  id = "kawalan-borang",
  kelas, hari, tarikh, guruKelas, lelaki, perempuan, tidakHadir, jumlah, baris,
}: {
  id?: string;
  kelas: string;
  hari: string;
  tarikh: string;
  guruKelas: string;
  lelaki: string;
  perempuan: string;
  tidakHadir: string;
  jumlah: string;
  baris: BarisWaktuBorang[];
}) {
  return (
    <div id={id} data-cetak-kertas="portrait" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #${id}, #${id} * { visibility: visible; }
          #${id} { position: absolute; inset: 0; width: 100%; }
          @page { size: A4 portrait; margin: 12mm; }
        }
        #${id} { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9pt; }
        #${id} .tajuk { text-align: center; font-weight: 700; font-size: 11pt; margin-bottom: 4mm; }
        /* Medan kepala: label, titik bertitik untuk diisi tangan. */
        #${id} .kepala { font-size: 9pt; line-height: 2.1; }
        #${id} .isi {
          display: inline-block; min-width: 26mm; border-bottom: .8pt solid #000;
          padding: 0 1.5mm; text-align: center; font-weight: 700;
        }
        #${id} .isi.lebar { min-width: 62mm; }
        #${id} .isi.sempit { min-width: 14mm; }
        /* table-layout fixed WAJIB: tanpanya lajur Nama Guru mengembang
           mengikut nama terpanjang dan menolak lajur Catatan keluar dari
           halaman — diukur pada render pertama, "Catatan" terpotong. */
        #${id} table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 3mm; }
        /* th JUGA, bukan td sahaja: tanpanya tajuk "Catatan" terpotong
           dalam selnya — diukur pada render kedua. */
        #${id} th, #${id} td { overflow-wrap: anywhere; }
        /* box-sizing border-box WAJIB dengan table-layout fixed: tanpanya
           padding dan sempadan DITAMBAH di atas lebar peratus, jadi tujuh
           lajur menambah kira-kira 21mm dan menolak lajur terakhir keluar
           halaman. Diukur pada dua render sebelum ini. */
        #${id} th, #${id} td {
          box-sizing: border-box;
          border: .8pt solid #000; padding: 0 1.2mm; font-size: 8pt;
        }
        #${id} th { text-align: center; font-weight: 700; height: 7mm; }
        /* Tinggi baris disamakan dengan borang kertas supaya ada ruang menulis. */
        #${id} td { height: 6.6mm; }
        #${id} .c { text-align: center; }
        #${id} .sub { margin-top: 4mm; font-size: 9pt; font-weight: 400; }
        #${id} .dua { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
        #${id} .ttd { margin-top: 6mm; font-size: 9pt; }
        #${id} .garis-ttd {
          border-bottom: .8pt dotted #000; width: 62mm; height: 9mm;
        }
      `}</style>

      <p className="tajuk">BORANG KAWALAN BILIK DARJAH</p>

      <div className="kepala">
        <div>
          TAHUN : <span className="isi">{kelas}</span>
          <span style={{ marginLeft: "10mm" }}>HARI : <span className="isi">{hari}</span></span>
          <span style={{ marginLeft: "10mm" }}>TARIKH : <span className="isi">{tarikh}</span></span>
        </div>
        <div>NAMA GURU KELAS: <span className="isi lebar">{guruKelas}</span></div>
        <div>
          BILANGAN MURID HADIR : <span style={{ marginLeft: "4mm" }}>LELAKI</span>
          {" : "}<span className="isi sempit">{lelaki}</span> ORANG
          <span style={{ marginLeft: "10mm" }}>
            BIL TIDAK HADIR : <span className="isi sempit">{tidakHadir}</span>
          </span>
        </div>
        <div>
          <span style={{ marginLeft: "34mm" }}>PEREMPUAN</span>
          {" : "}<span className="isi sempit">{perempuan}</span> ORANG
          <span style={{ marginLeft: "10mm" }}>
            JUMLAH MURID : <span className="isi sempit">{jumlah}</span>
          </span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "7%" }}>Bil</th>
            <th style={{ width: "14%" }}>Masa</th>
            <th style={{ width: "15%" }}>Mata Pelajaran</th>
            <th style={{ width: "26%" }}>Nama Guru</th>
            <th style={{ width: "13%" }}>T/T Guru</th>
            <th style={{ width: "9%" }}>Bil Murid</th>
            <th style={{ width: "16%" }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => (
            <tr key={i}>
              <td className="c">{i + 1}</td>
              <td className="c">{b.masa}</td>
              <td className="c">{b.subjek}</td>
              <td>{b.guru}</td>
              <td />
              <td className="c">{b.bilMurid}</td>
              <td>{b.catatan}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="sub">Senarai Nama Murid Tidak Hadir :</p>
      <div className="dua">
        {[0, 1].map((lajur) => (
          <table key={lajur}>
            <thead>
              <tr>
                <th style={{ width: "10mm" }}>Bil</th>
                <th>Nama Murid</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => (
                <tr key={i}>
                  <td className="c">{lajur * 10 + i + 1}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>

      <p className="sub">Catatan Salah Laku Murid :</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: "10mm" }}>Bil</th>
            <th>Nama Murid</th>
            <th style={{ width: "46mm" }}>Salah Laku</th>
            <th style={{ width: "40mm" }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i}>
              <td className="c">{i + 1}</td>
              <td /><td /><td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ttd">
        <p>Disemak oleh :</p>
        <div className="garis-ttd" />
        <p>Guru Kelas</p>
      </div>
    </div>
  );
}

/** Baris borang daripada set waktu kelas + rekod hari itu. */
export function barisDariWaktu(
  senaraiWaktu: Waktu[],
  rekod: { subjek: string; masa_masuk: string | null; guru_nama: string; relief: boolean; guru_relief_untuk: string | null; bil_hadir: number | null; bil_murid: number | null }[],
): BarisWaktuBorang[] {
  return senaraiWaktu.map((w) => {
    // Rekod dipadankan mengikut waktu MULA. Guru menaip masa masuk sebenar,
    // jadi padanan tepat sahaja — meneka slot terdekat akan meletakkan
    // subjek pada waktu yang salah.
    const r = rekod.find((x) => (x.masa_masuk ?? "").slice(0, 5) === w.mula);
    /* Jam 12 SEPERTI BORANG KERTAS: waktu terakhir ditulis "12.30-1.00",
       bukan "12.30-13.00". Borang yang menulis jam 24 memaksa guru
       menterjemahnya setiap kali. */
    const jam = (t: string) => {
      const [j, m] = t.split(":").map(Number);
      return `${j > 12 ? j - 12 : j}.${String(m).padStart(2, "0")}`;
    };
    return {
      masa: `${jam(w.mula)}-${jam(w.tamat)}`,
      subjek: w.rehat ? (w.label ?? "Rehat") : (r?.subjek ?? ""),
      guru: r?.guru_nama ?? "",
      bilMurid: r?.bil_murid ? `${r.bil_hadir ?? 0}/${r.bil_murid}` : "",
      catatan: r?.relief ? `Relief ${r.guru_relief_untuk ?? ""}`.trim() : "",
    };
  });
}
