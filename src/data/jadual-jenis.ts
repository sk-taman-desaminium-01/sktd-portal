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
  /** Nama guru — pilihan, dan TIDAK dipapar di laman awam. */
  guru?: string;
}

export interface KelasJadual {
  sesi: Sesi;
  /** hari → id waktu → slot. Slot yang tiada bermakna waktu kosong. */
  hari: Partial<Record<Hari, Record<string, Slot>>>;
}

export interface Jadual {
  /** Set waktu berasingan untuk setiap sesi — sekolah ini ada dua sesi. */
  waktu: Record<Sesi, Waktu[]>;
  kelas: Record<string, KelasJadual>;
  /** ISO. Dipapar kepada ibu bapa supaya mereka tahu ia terkini. */
  dikemaskini?: string;
}

/**
 * Waktu permulaan yang boleh disunting admin.
 *
 * ⚠️ INI BUKAN WAKTU RASMI SEKOLAH — ia corak biasa sekolah rendah yang
 * diletakkan supaya skrin tidak kosong pada hari pertama. Admin MESTI
 * membetulkannya kepada waktu sebenar sebelum jadual diterbitkan; skrin
 * menyatakan perkara itu.
 */
export const WAKTU_LALAI: Record<Sesi, Waktu[]> = {
  pagi: [
    { id: "p1", mula: "07:30", tamat: "08:00" },
    { id: "p2", mula: "08:00", tamat: "08:30" },
    { id: "p3", mula: "08:30", tamat: "09:00" },
    { id: "p4", mula: "09:00", tamat: "09:30" },
    { id: "pr", mula: "09:30", tamat: "10:00", rehat: true, label: "Rehat" },
    { id: "p5", mula: "10:00", tamat: "10:30" },
    { id: "p6", mula: "10:30", tamat: "11:00" },
    { id: "p7", mula: "11:00", tamat: "11:30" },
    { id: "p8", mula: "11:30", tamat: "12:00" },
    { id: "p9", mula: "12:00", tamat: "12:30" },
    { id: "p10", mula: "12:30", tamat: "13:00" },
  ],
  petang: [
    { id: "t1", mula: "13:00", tamat: "13:30" },
    { id: "t2", mula: "13:30", tamat: "14:00" },
    { id: "t3", mula: "14:00", tamat: "14:30" },
    { id: "t4", mula: "14:30", tamat: "15:00" },
    { id: "tr", mula: "15:00", tamat: "15:30", rehat: true, label: "Rehat" },
    { id: "t5", mula: "15:30", tamat: "16:00" },
    { id: "t6", mula: "16:00", tamat: "16:30" },
    { id: "t7", mula: "16:30", tamat: "17:00" },
    { id: "t8", mula: "17:00", tamat: "17:30" },
    { id: "t9", mula: "17:30", tamat: "18:00" },
    { id: "t10", mula: "18:00", tamat: "18:30" },
  ],
};

export const JADUAL_KOSONG: Jadual = { waktu: WAKTU_LALAI, kelas: {} };

/** Jam 24 → paparan mesra: "7:30 pg", "1:00 ptg". */
export function jamPapar(hhmm: string): string {
  const [j, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(j) || Number.isNaN(m)) return hhmm;
  const petang = j >= 12;
  const jam12 = j % 12 === 0 ? 12 : j % 12;
  return `${jam12}:${String(m).padStart(2, "0")} ${petang ? "ptg" : "pg"}`;
}
