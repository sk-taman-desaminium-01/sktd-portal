// Sambungan .ts dinyatakan supaya fail ini boleh dijalankan terus oleh Node
// semasa ujian; Next mengendalikannya sama sahaja.
import { PANITIA } from "./panitia.ts";

/**
 * SATU senarai subjek untuk seluruh sistem.
 *
 * KENAPA FAIL INI WUJUD: senarai ini pernah berpecah kepada EMPAT salinan —
 * penghurai jadual, dropdown penyunting, paparan ibu bapa, dan senarai
 * panitia. TASMIK ditambah kepada penghurai sahaja, jadi sistem MEMBACA
 * TASMIK dari PDF dengan betul tetapi dropdown tiada pilihan itu, dan
 * pentadbir melihat sel kosong pada hari Rabu. Pembacaan betul, paparan
 * salah, dan tiada ralat di mana-mana.
 *
 * Menambah subjek baharu sekarang bermakna menambahnya DI SINI sahaja.
 * `scripts/uji-huraian.mts` menguji bahawa setiap kod yang penghurai tahu
 * memang wujud dalam senarai ini — jadi perpecahan yang sama tidak boleh
 * berlaku tanpa ujian gagal.
 */
export interface Subjek {
  kod: string;
  nama: string;
  /** Subjek akademik berpanitia, berbanding aktiviti dalam jadual. */
  panitia: boolean;
}

export const SUBJEK: Subjek[] = [
  ...PANITIA.map((p) => ({ kod: p.kod, nama: p.nama, panitia: true })),

  // Aktiviti yang muncul dalam jadual waktu tetapi bukan panitia.
  // TASMIK diambil dari jadual rasmi sekolah — ia bacaan al-Quran
  // berkumpulan, dan ia muncul beberapa kali seminggu dalam jadual sebenar.
  { kod: "TASMIK", nama: "Tasmik", panitia: false },
  { kod: "PERHIMPUNAN", nama: "Perhimpunan", panitia: false },
  { kod: "PSS", nama: "Pusat Sumber", panitia: false },
  { kod: "KOKO", nama: "Kokurikulum", panitia: false },
  { kod: "PAK21", nama: "Aktiviti PAK21", panitia: false },
];

export const KOD_SUBJEK: string[] = SUBJEK.map((s) => s.kod);

/** kod → nama penuh untuk paparan. Kod yang tidak dikenali dipulangkan apa adanya. */
export function namaSubjek(kod: string): string {
  return SUBJEK.find((s) => s.kod === kod)?.nama ?? kod;
}
