"use client";

import type { Waktu } from "@/data/jadual-jenis";
import KepalaCetak from "./KepalaCetak";

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
 * TIADA RUANG TANDATANGAN DI BAWAH. Borang asal ada "Disemak oleh / Guru
 * Kelas", tetapi tandatangan sebenar dibuat dalam BUKU FIZIKAL (keputusan
 * pengguna, 26 Sep 2026). Mencetak ruang yang tidak pernah diisi hanya
 * memanjangkan borang dan menimbulkan soalan kenapa ia kosong.
 * Lajur "T/T Guru" dalam jadual DIKEKALKAN — itu sebahagian jadual waktu,
 * ditandatangani guru semasa masuk kelas.
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
          /* 15mm sekeliling: margin A4 yang selesa untuk borang yang
             difailkan dan dilubang. Diukur selepas ditetapkan — kandungan
             berakhir pada ~78% tinggi halaman, jadi ada ruang lebih. */
          @page { size: A4 portrait; margin: 15mm; }
        }
        /* max-width melindungi daripada limpahan mendatar walau apa pun
           kandungan sel — tiada apa boleh terpotong di tepi kanan. */
        #${id} { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9pt; max-width: 100%; }
        #${id} table { max-width: 100%; }
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
        /* NAMA HURUF BESAR. Dibuat dengan CSS dan bukan .toUpperCase() dalam
           data, supaya nama yang tersimpan kekal seperti dieja pemiliknya —
           yang berubah hanya cara ia DICETAK. */
        #${id} .nama { text-transform: uppercase; }
        #${id} .sub { margin-top: 4mm; font-size: 9pt; font-weight: 400; }
        #${id} .dua { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
      `}</style>

      <KepalaCetak />
      <p className="tajuk" style={{ marginTop: "4mm" }}>BORANG KAWALAN BILIK DARJAH</p>

      <div className="kepala">
        <div>
          TAHUN : <span className="isi">{kelas}</span>
          <span style={{ marginLeft: "10mm" }}>HARI : <span className="isi">{hari}</span></span>
          <span style={{ marginLeft: "10mm" }}>TARIKH : <span className="isi">{tarikh}</span></span>
        </div>
        <div>NAMA GURU KELAS: <span className="isi lebar nama">{guruKelas}</span></div>
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
              <td className="c nama">{b.subjek}</td>
              <td className="nama">{b.guru}</td>
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

    </div>
  );
}

type RekodBaris = {
  subjek: string; masa_masuk: string | null; guru_nama: string; relief: boolean;
  guru_relief_untuk: string | null; bil_hadir: number | null; bil_murid: number | null;
  dicipta?: string;
};

/**
 * Baris borang daripada set waktu kelas + rekod hari itu.
 *
 * DUA LARIAN padanan — bukan satu:
 *  1. Tepat ikut `masa_masuk` (guru taip masa masuk sebenar).
 *  2. Rekod yang TIADA masa_masuk (medan PILIHAN, selalu tertinggal kosong)
 *     diisi ke slot KOSONG yang berbaki, ikut urutan dicipta. Tanpa larian
 *     kedua ini, rekod sedemikian tidak pernah sepadan `masa_masuk` mana-mana
 *     slot (rentetan kosong "" tidak sama dengan sebarang "07:30" dsb.) dan
 *     HILANG senyap daripada jadual walaupun wujud dalam pangkalan data —
 *     laporan pengguna 3 Okt 2026: "saya dah buat 2 rekod kehadiran, tapi
 *     ia hanya keluar 1 sahaja."
 */
export function barisDariWaktu(
  senaraiWaktu: Waktu[],
  rekod: RekodBaris[],
): BarisWaktuBorang[] {
  const dipakai = new Set<RekodBaris>();
  const slotRekod = new Map<string, RekodBaris>();

  for (const w of senaraiWaktu) {
    if (w.rehat) continue;
    const r = rekod.find((x) => !dipakai.has(x) && x.masa_masuk && x.masa_masuk.slice(0, 5) === w.mula);
    if (r) { slotRekod.set(w.id, r); dipakai.add(r); }
  }

  const berbaki = rekod.filter((x) => !dipakai.has(x))
    .sort((a, b) => (a.dicipta ?? "").localeCompare(b.dicipta ?? ""));
  for (const w of senaraiWaktu) {
    if (w.rehat || slotRekod.has(w.id)) continue;
    const r = berbaki.shift();
    if (r) slotRekod.set(w.id, r);
  }

  return senaraiWaktu.map((w) => {
    const r = slotRekod.get(w.id);
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
