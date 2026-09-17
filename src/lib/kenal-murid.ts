/**
 * Mengenal NAMA dan NO. KP daripada senarai yang ditampal begitu sahaja.
 *
 * MASALAH YANG INI SELESAIKAN: import CSV menuntut pentadbir menyusun lajur
 * dengan betul sebelum apa-apa boleh dimasukkan. Senarai murid sebenar tidak
 * datang begitu — ia datang dari WhatsApp, dari Word, dari salinan skrin
 * eOperasi, dan setiap satu menulis nama dan No. KP dengan cara berbeza:
 *
 *     AHMAD BIN ALI 060101101234
 *     2. NUR AISYAH BINTI OMAR, 070202-10-5678
 *     051212105566  MUHAMMAD DANIAL BIN ZAKARIA
 *     SITI SARAH BINTI HASSAN  .  080303 10 7788
 *
 * Kelas TIDAK ditaip langsung — ia dipilih dari dropdown, kerana ia sudah
 * ada dalam sistem dan menaipnya semula hanya mencipta peluang salah eja.
 *
 * JANTINA DIKESAN DARI No. KP. Digit TERAKHIR: ganjil lelaki, genap
 * (termasuk sifar) perempuan. Ini peraturan JPN yang tetap sejak No. KP
 * 12 digit diperkenalkan, dan ia menjimatkan satu lajur yang selalu
 * tertinggal.
 *
 * TARIKH LAHIR turut boleh dikira dari enam digit pertama — disimpan
 * sebagai maklumat semakan, bukan ditulis ke pangkalan data, kerana
 * `pbd_murid` tidak menyimpannya.
 */

export interface MuridDikenal {
  nama: string;
  no_kp: string | null;
  jantina: "L" | "P" | null;
  /** `YYYY-MM-DD` dari enam digit pertama No. KP. Untuk semakan sahaja. */
  lahir: string | null;
  /** Baris asal, supaya pentadbir boleh melihat apa yang ditafsir. */
  asal: string;
  amaran: string[];
}

/**
 * No. KP Malaysia: 12 digit, ditulis dengan atau tanpa sempang.
 *
 * Corak ini SENGAJA menerima pemisah apa pun antara ketiga-tiga kumpulan —
 * sempang, ruang, titik, garis miring. Senarai sebenar mengandungi
 * kesemuanya, kadang dalam fail yang sama.
 */
const RE_KP = /\b(\d{6})\s*[-–—. /]?\s*(\d{2})\s*[-–—. /]?\s*(\d{4})\b/;

/** Nombor senarai di hadapan baris: "1.", "12)", "3 -". */
const RE_NOMBOR_SENARAI = /^\s*\d{1,3}\s*[.):\-–]\s*/;

/** Bulan hari dalam enam digit pertama No. KP. */
function tarikhDariKp(kp: string): string | null {
  const yy = Number(kp.slice(0, 2));
  const mm = Number(kp.slice(2, 4));
  const dd = Number(kp.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  // Murid sekolah rendah lahir selepas 2000. Tahun dua digit yang besar
  // (contoh 95) bermakna 1995 — mungkin guru, bukan murid, dan itu
  // dilaporkan sebagai amaran di tempat lain.
  const kini = new Date().getFullYear() % 100;
  const abad = yy <= kini ? 2000 : 1900;
  return `${abad + yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Jantina dari digit TERAKHIR No. KP: ganjil lelaki, genap perempuan.
 *
 * Sifar dikira genap, dan itu betul — ia digit yang sah dan ia perempuan.
 */
export function jantinaDariKp(kp: string): "L" | "P" | null {
  if (!/^\d{12}$/.test(kp)) return null;
  return Number(kp[11]) % 2 === 1 ? "L" : "P";
}

/** Bersihkan nama: buang nombor senarai, koma berlebihan, ruang berganda. */
function bersihNama(mentah: string): string {
  return mentah
    .replace(RE_NOMBOR_SENARAI, "")
    .replace(/[,;.]+\s*$/, "")
    .replace(/^\s*[,;.]+/, "")
    .replace(/\s*[-–—]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Baca satu baris.
 *
 * No. KP dicari DAHULU, dan apa yang tinggal ialah nama. Cara ini tidak
 * peduli sama ada No. KP berada di hadapan, di belakang, atau di tengah —
 * dan ia tidak perlu meneka pemisah antara kedua-duanya, yang berbeza pada
 * hampir setiap senarai.
 */
export function bacaBarisMurid(baris: string): MuridDikenal | null {
  const asal = baris.replace(/\s+/g, " ").trim();
  if (asal === "") return null;

  const amaran: string[] = [];
  const m = RE_KP.exec(asal);

  let no_kp: string | null = null;
  let sisa = asal;

  if (m) {
    no_kp = `${m[1]}${m[2]}${m[3]}`;
    sisa = (asal.slice(0, m.index) + " " + asal.slice(m.index + m[0].length)).trim();
  } else {
    // Mungkin No. KP ditulis sebagai 12 digit bersambung tanpa sempadan
    // perkataan yang jelas — contohnya melekat pada nombor senarai.
    const panjang = /\d{12}/.exec(asal);
    if (panjang) {
      no_kp = panjang[0];
      sisa = (asal.slice(0, panjang.index) + " " + asal.slice(panjang.index + 12)).trim();
    }
  }

  const nama = bersihNama(sisa);
  if (nama.length < 3) return null;

  // Nama yang masih mengandungi digit bermakna ada nombor yang bukan No. KP —
  // nombor senarai yang melekat, atau No. KP yang tidak lengkap.
  if (/\d/.test(nama)) amaran.push("Nama masih mengandungi nombor — semak baris ini.");
  if (!no_kp) amaran.push("Tiada No. KP dikesan.");

  const lahir = no_kp ? tarikhDariKp(no_kp) : null;
  if (no_kp && !lahir) amaran.push("Enam digit pertama No. KP bukan tarikh yang sah.");

  const tahunLahir = lahir ? Number(lahir.slice(0, 4)) : null;
  const kini = new Date().getFullYear();
  if (tahunLahir && (kini - tahunLahir < 5 || kini - tahunLahir > 15)) {
    amaran.push(`Umur ${kini - tahunLahir} tahun — bukan julat murid sekolah rendah.`);
  }

  return {
    nama: nama.toUpperCase(),
    no_kp,
    jantina: no_kp ? jantinaDariKp(no_kp) : null,
    lahir,
    asal,
    amaran,
  };
}

/**
 * Satu baris yang membawa LEBIH daripada satu No. KP ialah beberapa murid
 * yang tercantum — itu berlaku bila senarai disalin dari WhatsApp, di mana
 * baris baharu hilang.
 *
 * Dipecah SELEPAS setiap No. KP, kerana nama sentiasa berada sebelum atau
 * selepas No. KPnya sendiri dan tidak pernah merentasi dua.
 */
function pecahBanyakKp(baris: string): string[] {
  const global = new RegExp(RE_KP.source, "g");
  const padan = [...baris.matchAll(global)];
  if (padan.length <= 1) return [baris];

  const keping: string[] = [];
  let mula = 0;
  for (const m of padan) {
    const hujung = (m.index ?? 0) + m[0].length;
    keping.push(baris.slice(mula, hujung));
    mula = hujung;
  }
  const baki = baris.slice(mula).trim();
  if (baki !== "") keping.push(baki);
  return keping;
}

export interface HasilKenal {
  murid: MuridDikenal[];
  /** Baris yang langsung tidak boleh ditafsir. */
  ditolak: string[];
  /** No. KP yang muncul lebih daripada sekali dalam tampalan yang sama. */
  berulang: string[];
}

/**
 * Baca satu tampalan penuh.
 *
 * Baris dipisah oleh baris baharu DAN oleh titik bertindih koma apabila
 * seluruh senarai ditampal sebagai satu perenggan — itu berlaku bila
 * seseorang menyalin dari WhatsApp.
 */
export function bacaSenaraiMurid(teks: string): HasilKenal {
  const kasar = teks
    .split(/\r?\n/)
    .flatMap(pecahBanyakKp)
    .map((b) => b.trim())
    .filter((b) => b !== "");

  const murid: MuridDikenal[] = [];
  const ditolak: string[] = [];
  for (const b of kasar) {
    // Baris kepala yang tersalin bersama senarai.
    if (/^(bil|no|nama|kp|ic|kad pengenalan|jantina|kelas)\b/i.test(b) && b.length < 40) {
      continue;
    }
    const hasil = bacaBarisMurid(b);
    if (hasil) murid.push(hasil);
    else ditolak.push(b);
  }

  const kira = new Map<string, number>();
  for (const x of murid) if (x.no_kp) kira.set(x.no_kp, (kira.get(x.no_kp) ?? 0) + 1);
  const berulang = [...kira.entries()].filter(([, n]) => n > 1).map(([k]) => k);

  return { murid, ditolak, berulang };
}
