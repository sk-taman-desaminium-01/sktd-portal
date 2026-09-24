/**
 * Bentuk data Jadual Waktu — dikongsi portal (menyunting) dan laman awam
 * (memapar). Fail ini sengaja TIDAK mengimport apa-apa dari pelayan supaya
 * kedua-dua belah boleh menggunakannya.
 *
 * DI MANA IA DISIMPAN: satu baris dalam `web_halaman`, slug `jadual-waktu`,
 * dengan seluruh jadual sebagai JSON dalam lajur `kandungan` — corak yang
 * sama seperti Barisan Pentadbir. Tiada jadual pangkalan data baharu, jadi
 * tiada migrasi yang perlu dijalankan sebelum ciri ini boleh digunakan.
 *
 * Saiznya kecil: 19 kelas x 5 hari x ~10 waktu menghasilkan JSON kira-kira
 * 60 KB. Jadual sekolah berubah beberapa kali setahun, bukan setiap minit,
 * jadi satu baris yang disunting seorang pada satu masa sudah memadai.
 */

export const HARI = ["isnin", "selasa", "rabu", "khamis", "jumaat"] as const;
export type Hari = (typeof HARI)[number];

export const NAMA_HARI: Record<Hari, string> = {
  isnin: "Isnin",
  selasa: "Selasa",
  rabu: "Rabu",
  khamis: "Khamis",
  jumaat: "Jumaat",
};

export const SESI = ["pagi", "petang"] as const;
export type Sesi = (typeof SESI)[number];

export const NAMA_SESI: Record<Sesi, string> = {
  pagi: "Sesi Pagi",
  petang: "Sesi Petang",
};

/** Satu waktu dalam sehari. `rehat` menandakan ia bukan waktu PdP. */
/** Satu waktu dalam sehari. `rehat` menandakan ia bukan waktu PdP. */
export interface Waktu {
  id: string;
  mula: string;   // "07:30"
  tamat: string;  // "08:00"
  rehat?: boolean;
  /** Label untuk waktu bukan PdP: "Rehat", "Perhimpunan". */
  label?: string;
}

export interface Slot {
  subjek: string;
  /** Tindihan untuk slot ini sahaja; biasanya kosong. Lihat `guruSubjek`. */
  guru?: string;
}

/**
 * Satu SET WAKTU — senarai waktu lengkap untuk sekumpulan tahun.
 *
 * KENAPA SET DAN BUKAN SATU SENARAI PER SESI: rehat sekolah ini berperingkat.
 * Tahun 1 berehat pada 3:30, kumpulan lain pada waktu berbeza — dan kerana
 * rehat MENGANJAKKAN semua waktu selepasnya, senarai waktu setiap kumpulan
 * benar-benar berlainan, bukan sekadar satu blok yang ditanda berbeza.
 *
 * Satu set boleh dikongsi beberapa tahun; pemetaannya dalam `tahunSet`.
 */
export interface SetWaktu {
  id: string;
  nama: string;
  sesi: Sesi;
  senarai: Waktu[];
}

export interface KelasJadual {
  /** hari → id waktu → slot. Slot yang tiada bermakna waktu kosong. */
  hari: Partial<Record<Hari, Record<string, Slot>>>;
  /**
   * kod subjek → nama guru yang mengajarnya DALAM KELAS INI.
   *
   * Dipetakan per subjek dan bukan per slot kerana dalam sekolah rendah
   * subjek yang sama dalam satu kelas diajar guru yang sama sepanjang
   * minggu. Itu 13 isian dan bukan 55, dan ia menghapuskan seluruh kelas
   * pepijat "nama berbeza pada slot yang sepatutnya sama".
   *
   * Kalau satu slot benar-benar berbeza, `Slot.guru` menindihnya.
   */
  guruSubjek?: Record<string, string>;
}

export interface Jadual {
  set: SetWaktu[];
  /** tahun 1–6 → id set. Ia yang menentukan sesi DAN waktu rehat kelas itu. */
  tahunSet: Record<number, string>;
  kelas: Record<string, KelasJadual>;
  /** ISO. Dipapar kepada ibu bapa supaya mereka tahu ia terkini. */
  dikemaskini?: string;
}

/**
 * Waktu SEBENAR sekolah, diambil terus dari dua jadual rasmi yang diberi
 * pihak sekolah (jadual guru sesi pagi, dan jadual kelas 2 MAJU sesi petang).
 * Ini BUKAN tekaan.
 *
 * Perhatikan blok yang tidak sekata: pagi blok 6 hanya 20 minit
 * (10:10–10:30), dan rehat petang 15:30–15:50 juga 20 minit. Jadi jangan
 * jana waktu secara berkira — salin apa yang sekolah gunakan.
 */
const BLOK_PAGI: [string, string][] = [
  ["07:40", "08:10"], ["08:10", "08:40"], ["08:40", "09:10"], ["09:10", "09:40"],
  ["09:40", "10:10"], ["10:10", "10:30"], ["10:30", "11:00"], ["11:00", "11:30"],
  ["11:30", "12:00"], ["12:00", "12:30"], ["12:30", "13:00"],
];

/**
 * Sesi petang — DIBETULKAN 24 Sep 2026 daripada jadual rasmi sekolah
 * ("JW KELAS PETANG 31.7.2026.pdf", 30 kelas, semuanya satu struktur).
 *
 * Yang salah sebelum ini: blok 20 minit diletakkan pada waktu 6 (15:30–15:50)
 * dan waktu 7 dijadikan 30 minit. Jadual sebenar sekolah ialah sebaliknya —
 * waktu 6 penuh 30 minit (03:30–04:00) dan waktu 7 yang pendek, 20 minit
 * (04:00–04:20). Salah letak itu menganjakkan setiap waktu selepasnya, dan
 * itulah sebab jadual petang menunjukkan petak kosong.
 *
 * PDF menulis waktu dalam format 12 jam tanpa AM/PM ("01:00 - 01:30"); di
 * sini ia 24 jam.
 */
const BLOK_PETANG: [string, string][] = [
  ["13:00", "13:30"], ["13:30", "14:00"], ["14:00", "14:30"], ["14:30", "15:00"],
  ["15:00", "15:30"], ["15:30", "16:00"], ["16:00", "16:20"], ["16:20", "16:50"],
  ["16:50", "17:20"], ["17:20", "17:50"],
];

/** Bina senarai waktu daripada blok, dengan satu blok ditanda rehat. */
function bina(awalan: string, blok: [string, string][], rehatKe: number): Waktu[] {
  return blok.map(([mula, tamat], i) => ({
    id: `${awalan}${i + 1}`,
    mula,
    tamat,
    ...(i + 1 === rehatKe ? { rehat: true, label: "Rehat" } : {}),
  }));
}

/**
 * Set waktu permulaan, dari jadual rasmi sekolah.
 *
 * REHAT BERPERINGKAT: jadual pagi sekolah melabelkan waktu 5, 6 dan 7 sebagai
 * "5/R4", "6/R5", "7/R6" — iaitu rehat Tahun 4 pada waktu 5, Tahun 5 pada
 * waktu 6, dan Tahun 6 pada waktu 7. Blok waktunya SAMA; yang berbeza hanya
 * blok mana yang menjadi rehat.
 *
 * SESI PETANG JUGA BERPERINGKAT — diperbetulkan 24 Sep 2026. Nota lama di
 * sini berkata petang "berkongsi satu rehat pada waktu 6", kerana ia ditulis
 * daripada SATU helaian kelas (2 MAJU). Jadual penuh 30 kelas menunjukkan
 * corak yang sama seperti pagi: kepala jadual melabelkan "5/R1", "6/R2",
 * "7/R3", dan lajur yang kosong setiap hari ialah:
 *   · Tahun 1 → waktu 5 (03:00–03:30)   — disahkan pada 1 DEDIKASI
 *   · Tahun 2 → waktu 6 (03:30–04:00)   — disahkan pada 2 DEDIKASI
 *   · Tahun 3 → waktu 7 (04:00–04:20)   — disahkan pada 3 DEDIKASI
 * Disahkan dengan melihat muka surat PDF itu sendiri, bukan daripada teksnya.
 *
 * Id waktu kekal `t1`..`t10` dalam ketiga-tiga set, jadi jadual yang sudah
 * tersimpan tidak hilang apabila kelas berpindah antara set — yang berubah
 * hanya waktu mana yang dikira rehat.
 *
 * ⚠️ Pemetaan tahun → set masih perlu disahkan pentadbir; sekolah boleh
 * menukar susunan tahun antara sesi bila-bila masa.
 */
export const SET_LALAI: SetWaktu[] = [
  { id: "petang-r1", nama: "Sesi Petang — rehat waktu 5 (R1)", sesi: "petang",
    senarai: bina("t", BLOK_PETANG, 5) },
  { id: "petang-r2", nama: "Sesi Petang — rehat waktu 6 (R2)", sesi: "petang",
    senarai: bina("t", BLOK_PETANG, 6) },
  { id: "petang-r3", nama: "Sesi Petang — rehat waktu 7 (R3)", sesi: "petang",
    senarai: bina("t", BLOK_PETANG, 7) },
  { id: "pagi-r4", nama: "Sesi Pagi — rehat waktu 5 (R4)", sesi: "pagi",
    senarai: bina("p", BLOK_PAGI, 5) },
  { id: "pagi-r5", nama: "Sesi Pagi — rehat waktu 6 (R5)", sesi: "pagi",
    senarai: bina("p", BLOK_PAGI, 6) },
  { id: "pagi-r6", nama: "Sesi Pagi — rehat waktu 7 (R6)", sesi: "pagi",
    senarai: bina("p", BLOK_PAGI, 7) },
];

/** Tetapan permulaan tahun → set. MESTI disahkan pentadbir. */
export const TAHUN_SET_LALAI: Record<number, string> = {
  1: "petang-r1",
  2: "petang-r2",
  3: "petang-r3",
  4: "pagi-r4",
  5: "pagi-r5",
  6: "pagi-r6",
  // 0 = Pendidikan Khas (PPKI). Tetapan permulaan sahaja — sahkan dengan
  // penyelaras PPKI, sama seperti tahun lain. PPKI tiada dalam jadual petang
  // 31.7.2026, jadi waktu rehatnya masih belum disahkan.
  0: "petang-r2",
};

export const JADUAL_KOSONG: Jadual = {
  set: SET_LALAI,
  tahunSet: TAHUN_SET_LALAI,
  kelas: {},
};

/** Tahun daripada label kelas "4 NILAM" → 4. Null jika bentuknya tidak dikenali.
 *  Kelas Pendidikan Khas ("PPKI SUNFLOWER") memulangkan 0 — bukan `null` —
 *  supaya ia tetap mendapat satu set waktu (lihat `TAHUN_SET_LALAI[0]`)
 *  dan bukan digugurkan senyap daripada Jadual Waktu. */
export function tahunKelas(label: string): number | null {
  if (/^PPKI\s+/i.test(label.trim())) return 0;
  const m = /^([1-6])\s+/.exec(label.trim());
  return m ? Number(m[1]) : null;
}

/** Set waktu yang dipakai kelas ini. Null jika tidak dapat ditentukan. */
export function setUntukKelas(jadual: Jadual, label: string): SetWaktu | null {
  const tahun = tahunKelas(label);
  if (tahun === null) return null;
  const id = jadual.tahunSet?.[tahun];
  return jadual.set.find((s) => s.id === id) ?? jadual.set[0] ?? null;
}

/**
 * BETULKAN SET PETANG YANG TERSIMPAN DENGAN WAKTU SALAH.
 *
 * Set petang asal ditulis daripada SATU helaian kelas dan membawa dua
 * kesilapan: blok 20 minit diletakkan pada waktu 6 (15:30–15:50) sedangkan
 * sekolah meletakkannya pada waktu 7, dan sesi petang dianggap berkongsi satu
 * waktu rehat sedangkan ia berperingkat seperti sesi pagi. Kesannya setiap
 * waktu selepas rehat teranjak, dan jadual petang memaparkan petak kosong.
 *
 * Jadual yang sudah tersimpan membawa salinan set itu, jadi membetulkan
 * SET_LALAI sahaja tidak cukup — ia mesti dibetulkan semasa dibaca.
 *
 * Pembetulan ini SENGAJA sempit:
 *  · ia hanya menyentuh set yang blok waktunya SAMA PERSIS dengan corak salah
 *    itu (15:30–15:50 diikuti 15:50–16:20). Set yang pentadbir sunting sendiri
 *    tidak dikenali oleh corak itu dan tidak disentuh.
 *  · id waktu (`t1`..`t10`) tidak berubah, jadi TIADA slot jadual yang hilang.
 *    Yang berubah hanya jam yang dipapar dan waktu mana dikira rehat.
 *  · pemetaan tahun hanya dialih apabila ia masih menunjuk kepada id lama
 *    `petang` — iaitu nilai permulaan, bukan pilihan pentadbir.
 */
function betulkanPetang(j: Jadual): Jadual {
  const salah = (w: Waktu[]) =>
    w.length === BLOK_PETANG.length &&
    w[5]?.mula === "15:30" && w[5]?.tamat === "15:50" &&
    w[6]?.mula === "15:50" && w[6]?.tamat === "16:20";

  const adaSalah = j.set.some((s) => s.sesi === "petang" && salah(s.senarai));
  if (!adaSalah) return j;

  const set = j.set.map((s) => {
    if (s.sesi !== "petang" || !salah(s.senarai)) return s;
    // Kekalkan waktu mana yang ditanda rehat dalam set itu; hanya jamnya
    // yang dibetulkan.
    const rehatKe = s.senarai.findIndex((w) => w.rehat) + 1;
    return { ...s, senarai: bina("t", BLOK_PETANG, rehatKe || 6) };
  });

  // Set petang berperingkat yang belum wujud ditambah, supaya pentadbir boleh
  // memilihnya tanpa membinanya sendiri.
  for (const lalai of SET_LALAI) {
    if (lalai.sesi === "petang" && !set.some((s) => s.id === lalai.id)) set.push(lalai);
  }

  const tahunSet = { ...j.tahunSet };
  for (const [tahun, id] of Object.entries(tahunSet)) {
    if (id === "petang") tahunSet[Number(tahun)] = TAHUN_SET_LALAI[Number(tahun)] ?? "petang-r2";
  }

  return { ...j, set, tahunSet };
}

/**
 * Terima jadual dalam bentuk LAMA (satu senarai waktu per sesi) dan
 * tukarkannya kepada set. Dikekalkan supaya data yang sudah tersimpan tidak
 * hilang apabila bentuknya berubah — peraturan keras #2, dalam bentuk lain.
 */
export function naikTarafJadual(data: unknown): Jadual {
  const d = data as Partial<Jadual> & {
    waktu?: Record<string, Waktu[]>;
    kelas?: Record<string, KelasJadual & { sesi?: Sesi }>;
  };
  if (!d || typeof d !== "object") return JADUAL_KOSONG;

  if (Array.isArray(d.set) && d.set.length > 0) {
    return betulkanPetang({
      set: d.set,
      tahunSet: d.tahunSet ?? TAHUN_SET_LALAI,
      kelas: d.kelas ?? {},
      dikemaskini: d.dikemaskini,
    });
  }

  // Bentuk lama: waktu.pagi / waktu.petang, dan setiap kelas menyimpan sesinya.
  if (d.waktu?.pagi || d.waktu?.petang) {
    const set: SetWaktu[] = [];
    if (d.waktu.pagi?.length) {
      set.push({ id: "pagi", nama: "Sesi Pagi", sesi: "pagi", senarai: d.waktu.pagi });
    }
    if (d.waktu.petang?.length) {
      set.push({ id: "petang", nama: "Sesi Petang", sesi: "petang", senarai: d.waktu.petang });
    }
    const tahunSet: Record<number, string> = {};
    for (let t = 1; t <= 6; t++) {
      // Cari sesi yang paling kerap digunakan kelas tahun itu.
      const kelasTahun = Object.entries(d.kelas ?? {}).filter(([k]) => tahunKelas(k) === t);
      const petang = kelasTahun.filter(([, v]) => v.sesi === "petang").length;
      const pilih = petang > kelasTahun.length / 2 ? "petang" : "pagi";
      tahunSet[t] = set.find((x) => x.id === pilih)?.id ?? set[0]?.id ?? "pagi";
    }
    const kelas: Record<string, KelasJadual> = {};
    for (const [k, v] of Object.entries(d.kelas ?? {})) kelas[k] = { hari: v.hari, guruSubjek: v.guruSubjek };
    // Bentuk lama juga boleh membawa waktu petang yang salah itu.
    return betulkanPetang({ set: set.length ? set : SET_LALAI, tahunSet, kelas, dikemaskini: d.dikemaskini });
  }

  return JADUAL_KOSONG;
}

/** Jam 24 → paparan mesra: "7:30 pg", "1:00 ptg". */
export function jamPapar(hhmm: string): string {
  const [j, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(j) || Number.isNaN(m)) return hhmm;
  const petang = j >= 12;
  const jam12 = j % 12 === 0 ? 12 : j % 12;
  return `${jam12}:${String(m).padStart(2, "0")} ${petang ? "ptg" : "pg"}`;
}
