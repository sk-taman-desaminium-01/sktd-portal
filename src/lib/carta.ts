/**
 * Membina carta organisasi sekolah daripada seksyen Buku Pengurusan.
 *
 * ⚠️ CARTA TIDAK DIBACA DARI MUKA CARTA. Muka "CARTA ORGANISASI" dalam buku
 * sebenar ialah GAMBAR — 33 daripada 174 muka edisi 2025 begitu, dan carta
 * induk m.46 membawa dua serpihan teks sahaja. Tiada penghurai boleh membaca
 * teks yang tidak wujud.
 *
 * Maka carta dibina semula daripada senarai yang MEMANG teks: senarai nama
 * guru dengan kod jawatan eOperasi, dan senarai jawatankuasa setiap unit.
 * Dua sumber bebas dalam buku yang sama, dan kedua-duanya memberi susunan
 * yang serupa — itu yang menjadikan hasilnya boleh dipercayai.
 *
 * Import relatif dengan .ts supaya modul ini boleh diuji terus dengan Node.
 */

import {
  ARA_JAWATAN, ara, arasKod, kekananan, rujukanKumpulan,
  type NodCarta,
} from "../data/carta.ts";
import { kunciNama, namaBersih } from "./nama.ts";

export interface SeksyenCarta {
  kod: string;
  tajuk: string;
  /** `tugas` = senarai bidang tugas; tiada nama, jadi ia bukan unit carta. */
  bentuk?: string;
  lajur: string[];
  baris: { id?: string; sel: string[] }[];
}

export interface Warga {
  nama: string;
  kod: string | null;
  opsyen: string | null;
}

/* ------------------------------------------------------------ senarai guru */

/**
 * Kod yang kita kenali. Senarai ini DITAMBAH oleh penunjuk yang dibaca dari
 * buku, supaya kod yang tidak pernah kita lihat pun dikenali pada edisi
 * berikutnya — "GPRA" dan "BCSK" muncul dalam buku 2025 dan tiada dalam
 * sebarang senarai yang saya tulis sebelum membacanya.
 */
function coraknKod(tambahan: string[] = []): RegExp {
  const semua = [...new Set([...ARA_JAWATAN.map((a) => a.kod), ...tambahan])]
    .sort((a, b) => b.length - a.length);
  return new RegExp(`^(${semua.join("|")})$`, "i");
}
let RE_KOD = coraknKod();

/** Perkataan kepala jadual yang kadang terlepas ke dalam baris data. */
const KEPALA = /^(BIL|NAMA|KOD|JAWATAN|OPSYEN|GURU|KELAS|PPM|NO)$/i;

/**
 * Baris PENUNJUK KOD kelihatan seperti baris guru — kod diikuti teks huruf
 * besar — tetapi ia definisi, bukan orang. Tanpa penapis ini, "PK1 PENOLONG
 * KANAN" menjadi seorang guru bernama "PENOLONG KANAN".
 */
function barisPenunjuk(teks: string): boolean {
  const t = teks.trim().toUpperCase();
  if (/^PENUNJUK\s+KOD/.test(t)) return true;
  return /^[A-Z]{2,6}\d?\s+(PENGETUA|PENOLONG|GURU|ANGGOTA|PEMBANTU)\b/.test(t);
}

/**
 * Baca satu baris senarai guru dengan mencari lajur MENGIKUT KANDUNGAN,
 * baris demi baris — bukan menetapkan satu indeks lajur untuk seluruh seksyen.
 *
 * Senarai guru edisi 2025 merentangi lapan muka, dan kedudukan lajurnya
 * TIDAK sama pada setiap muka: pada sesetengah muka nombor dan kod bercantum
 * menjadi satu sel. Dengan indeks tetap, muka-muka itu menghasilkan nama
 * seperti "BCSK — 91 NURUL SUHADAH" dan "GPM GURU PEMULIHAN" — tiga guru
 * sebenar bertukar menjadi sampah.
 *
 * Mencari per baris tidak peduli lajur beranjak: kod ialah sel yang BERUPA
 * kod, dan nama ialah sel yang membawa penanda nasab.
 */
function bacaBarisWarga(sel: string[]): Warga | null {
  const bersih = sel.map((c) => (c ?? "").trim());

  if (bersih.some(barisPenunjuk)) return null;
  // Tajuk seksyen dalam senarai ("SENARAI NAMA ANGGOTA KUMPULAN PELAKSANA")
  // membawa perkataan yang kelihatan seperti nama. Ia bukan.
  if (bersih.some((c) => /^(SENARAI|JADUAL|CARTA|PENUNJUK|BILANGAN)\b/i.test(c.trim()))) return null;

  let kod: string | null = null;
  let iKod = -1;
  let potong: [number, number] | null = null;
  for (let i = 0; i < bersih.length && !kod; i++) {
    // Kod boleh berada di mana-mana dalam sel, bukan hanya di hujungnya:
    // apabila tiga lajur bercantum, hasilnya "MUHAMMAD SUKRI BIN TUAN SOH
    // GAB PENGAJIAN MELAYU" — dan mencari di hujung sahaja terlepas enam
    // guru dalam buku sebenar.
    const perkataan = bersih[i].toUpperCase().split(/\s+/);
    for (let k = 0; k < perkataan.length; k++) {
      if (!RE_KOD.test(perkataan[k])) continue;
      // Kod pada permulaan sel yang panjang lebih mungkin sebahagian nama
      // jabatan; kod selepas nama ialah kod sebenar.
      kod = perkataan[k];
      iKod = i;
      potong = [k, perkataan.length];
      break;
    }
  }

  // Bila kod bercantum dengan nama, ambil bahagian SEBELUM kod sebagai nama.
  if (potong && iKod >= 0 && bersih[iKod].split(/\s+/).length > 2) {
    const perkataan = bersih[iKod].split(/\s+/);
    const depan = perkataan.slice(0, potong[0]).join(" ").trim();
    const belakang = perkataan.slice(potong[0] + 1).join(" ").trim();
    if (depan.length >= 4) {
      const nama = namaBersih(depan.replace(/^\d{1,3}[.)\s]+/, ""));
      if (nama.length >= 4) return { nama, kod, opsyen: belakang || null };
    }
  }

  let nama = "";
  for (let i = 0; i < bersih.length; i++) {
    if (i === iKod) continue;
    const c = bersih[i];
    if (!/\b(BIN|BINTI|A\/L|A\/P)\b/i.test(c)) continue;
    // Buang nombor "BIL" yang melekat di hadapan nama.
    const t = c.replace(/^\d{1,3}[.)\s]+/, "").trim();
    if (t.length > nama.length) nama = t;
  }
  // Nama tanpa penanda nasab (nama Cina, India tanpa a/l) — ambil sel
  // terpanjang yang bukan kod dan bukan kepala jadual.
  if (!nama) {
    for (let i = 0; i < bersih.length; i++) {
      if (i === iKod) continue;
      const t = bersih[i].replace(/^\d{1,3}[.)\s]+/, "").trim();
      if (KEPALA.test(t)) continue;
      if (/^\d+$/.test(t)) continue;
      if (t.split(/\s+/).length >= 2 && t.length > nama.length) nama = t;
    }
  }
  nama = namaBersih(nama);
  if (nama.length < 4 || KEPALA.test(nama)) return null;

  const opsyen = bersih.find((c, i) =>
    i !== iKod && c.length > 4 && c !== nama && !KEPALA.test(c) && !/\d{2,}/.test(c)) ?? null;
  return { nama, kod, opsyen: opsyen || null };
}

/** Senarai warga sekolah dengan kod jawatannya. */
export function bacaWarga(seksyen: SeksyenCarta[]): Warga[] {
  const s = seksyen.find((x) => x.kod === "guru");
  if (!s || s.baris.length === 0) return [];

  const keluar: Warga[] = [];
  const dilihat = new Set<string>();
  for (const b of s.baris) {
    const w = bacaBarisWarga(b.sel);
    if (!w) continue;
    const kunci = kunciNama(w.nama);
    if (!kunci || dilihat.has(kunci)) continue;
    dilihat.add(kunci);
    keluar.push(w);
  }
  return keluar;
}

/* ---------------------------------------------------------------- pembina */

let kiraan = 0;
const idBaharu = (awalan: string) => `${awalan}-${++kiraan}`;

function nod(x: Partial<NodCarta> & { label: string }): NodCarta {
  return {
    id: x.id ?? idBaharu(x.jenis === "unit" ? "u" : "o"),
    label: x.label,
    jawatan: x.jawatan ?? "",
    kod: x.kod,
    jenis: x.jenis ?? "orang",
    anak: x.anak ?? [],
    barisId: x.barisId,
    rujukan: x.rujukan,
  };
}

/** Unit mana milik Penolong Kanan yang mana, dari TAJUK seksyen. */
export function indukUnit(tajuk: string, kodSeksyen: string): string {
  const t = tajuk.toUpperCase();
  if (/HAL EHWAL MURID|\bHEM\b/.test(t)) return "PK2";
  if (/KOKURIKULUM/.test(t)) return "PK3";
  if (/PENDIDIKAN KHAS/.test(t)) return "PKPK";
  if (/KURIKULUM|PANITIA/.test(t)) return "PK1";
  if (/PENGURUSAN|PENTADBIRAN/.test(t)) return "PGB";
  if (kodSeksyen === "kokurikulum") return "PK3";
  if (kodSeksyen === "panitia" || kodSeksyen === "gurukelas") return "PK1";
  return "PGB";
}

/**
 * Bina carta lengkap.
 *
 * Pegawai unit (PENGERUSI, NAIB PENGERUSI) SENGAJA tidak dijadikan nod di
 * bawah unit: mereka sudah berada di puncak carta sebagai Guru Besar dan
 * Penolong Kanan. Buku menyenaraikan mereka semula dalam setiap unit kerana
 * itu betul dari segi tadbir urus, tetapi menyalinnya ke dalam carta
 * menghasilkan Guru Besar yang muncul sembilan kali.
 */
export function binaCarta(
  seksyen: SeksyenCarta[],
  namaSekolah: string,
  penunjuk: Record<string, string> = {},
): { punca: NodCarta; warga: Warga[]; tidakDitempatkan: Warga[] } {
  kiraan = 0;
  // Kod dari penunjuk buku diterima walaupun kita tidak pernah melihatnya.
  RE_KOD = coraknKod(Object.keys(penunjuk));
  /** Nama jawatan: penunjuk buku dahulu, senarai kita sebagai sandaran. */
  const namaKod = (k: string) => penunjuk[k.toUpperCase()] ?? ara(k)?.nama ?? k;
  const warga = bacaWarga(seksyen);
  const ikutKod = new Map<string, Warga[]>();
  for (const w of warga) {
    if (!w.kod) continue;
    const ada = ikutKod.get(w.kod);
    if (ada) ada.push(w); else ikutKod.set(w.kod, [w]);
  }

  const sudah = new Set<string>();
  const pakai = (w: Warga) => { sudah.add(kunciNama(w.nama)); return w; };

  const gb = ikutKod.get("PGB")?.[0];
  const punca = nod({
    label: gb ? namaBersih(gb.nama) : namaSekolah,
    jawatan: namaKod("PGB"),
    kod: "PGB",
    jenis: gb ? "orang" : "unit",
  });
  if (gb) pakai(gb);

  // Penolong Kanan, mengikut urutan carta sekolah sendiri.
  const pk = new Map<string, NodCarta>();
  const kodAras1 = [...new Set([
    ...ARA_JAWATAN.filter((x) => x.aras === 1).map((x) => x.kod),
    ...Object.keys(penunjuk).filter((k) => arasKod(k) === 1),
  ])];
  for (const kod of kodAras1) {
    const orang = ikutKod.get(kod)?.[0];
    if (!orang) continue;
    const n = nod({ label: namaBersih(orang.nama), jawatan: namaKod(kod), kod });
    pakai(orang);
    pk.set(kod, n);
    punca.anak.push(n);
  }

  /** Tempat letak unit; jatuh ke Guru Besar bila Penolong Kanan itu tiada. */
  const induk = (kod: string) => pk.get(kod) ?? punca;

  // Unit dan jawatankuasanya.
  for (const s of seksyen) {
    if (s.kod === "guru" || s.kod === "takwim" || s.kod === "mesyuarat") continue;
    // Seksyen bidang tugas menerangkan APA yang sesuatu jawatan buat, bukan
    // SIAPA memegangnya. Memasukkannya ke carta menghasilkan unit yang setiap
    // "orang" di dalamnya sebenarnya satu ayat tugasan.
    if (s.bentuk === "tugas") continue;
    if (s.baris.length === 0) continue;

    const nodUnit = nod({ label: s.tajuk, jenis: "unit" });
    const kumpulan = new Map<string, NodCarta>();

    for (const b of s.baris) {
      const [grup, jawatan, nama] = ambilTiga(b.sel);
      if (!nama) continue;

      // Pegawai unit yang SUDAH di puncak carta tidak disalin ke bawah.
      if (!grup && /^(PENGERUSI|NAIB PENGERUSI)/i.test(jawatan)) continue;

      const sasaran = grup
        ? kumpulan.get(grup) ??
          (() => {
            const k = nod({ label: grup, jenis: "unit" });
            kumpulan.set(grup, k);
            nodUnit.anak.push(k);
            return k;
          })()
        : nodUnit;

      const rujuk = rujukanKumpulan(nama);
      const w = rujuk ? null : warga.find((x) => kunciNama(x.nama) === kunciNama(nama));
      if (w) pakai(w);

      sasaran.anak.push(nod({
        label: namaBersih(nama),
        jawatan,
        kod: w?.kod ?? undefined,
        barisId: b.id,
        rujukan: rujuk,
      }));
    }

    if (nodUnit.anak.length === 0) continue;
    for (const k of kumpulan.values()) k.anak.sort(ikutKekananan);
    nodUnit.anak.sort(ikutKekananan);
    induk(indukUnit(s.tajuk, s.kod)).anak.push(nodUnit);
  }

  // Sesiapa yang tidak muncul dalam mana-mana jawatankuasa tetap warga
  // sekolah. Meninggalkan mereka dari carta bermakna carta itu tidak lengkap,
  // dan guru akan perasan namanya tiada sebelum sesiapa perasan sebabnya.
  const baki = warga.filter((w) => !sudah.has(kunciNama(w.nama)));
  if (baki.length > 0) {
    const lain = nod({ label: "Guru & Kakitangan Lain", jenis: "unit" });
    for (const w of baki) {
      lain.anak.push(nod({
        label: namaBersih(w.nama),
        jawatan: w.kod ? namaKod(w.kod) : w.opsyen ?? "",
        kod: w.kod ?? undefined,
      }));
    }
    punca.anak.push(lain);
  }

  return { punca, warga, tidakDitempatkan: baki };
}

function ambilTiga(sel: string[]): [string, string, string] {
  if (sel.length >= 3) return [sel[0]?.trim() ?? "", sel[1]?.trim() ?? "", sel[2]?.trim() ?? ""];
  if (sel.length === 2) return ["", sel[0]?.trim() ?? "", sel[1]?.trim() ?? ""];
  return ["", "", sel[0]?.trim() ?? ""];
}

function ikutKekananan(a: NodCarta, b: NodCarta): number {
  if (a.jenis !== b.jenis) return a.jenis === "unit" ? 1 : -1;
  return kekananan(a.jawatan) - kekananan(b.jawatan);
}

/**
 * Bilangan orang BERLAINAN dalam carta.
 *
 * Bukan bilangan nod: seorang guru boleh menganggotai lapan jawatankuasa,
 * dan mengira setiap keahlian sebagai seorang memberi "1,353 orang" untuk
 * sekolah yang ada 137. Nombor itu akan dipercayai kerana ia dipapar dengan
 * yakin, dan ia salah.
 */
export function kiraOrang(n: NodCarta): number {
  const set = new Set<string>();
  const jalan = (x: NodCarta) => {
    if (x.jenis === "orang" && !x.rujukan) set.add(kunciNama(x.label));
    x.anak.forEach(jalan);
  };
  jalan(n);
  return set.size;
}

/** Bilangan keahlian — satu orang boleh menyumbang banyak. */
export function kiraPenempatan(n: NodCarta): number {
  return (n.jenis === "orang" && !n.rujukan ? 1 : 0) +
    n.anak.reduce((a, x) => a + kiraPenempatan(x), 0);
}
