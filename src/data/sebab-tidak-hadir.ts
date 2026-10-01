/**
 * Senarai Kategori + Sebab Tidak Hadir — SALINAN TEPAT daripada iSPEL
 * (dropdown `generateKatSelect()`/`generateSebabSelect()`, direkodkan terus
 * dari HTML halaman Kehadiran Harian sebenar, 1 Okt 2026).
 *
 * KENAPA PERLU SALINAN TEPAT, BUKAN TAIP BEBAS
 * Guru kelas dahulu menaip Kategori/Sebab bebas dalam Portal. Extension
 * "Kehadiran IDME" padankan teks itu dengan pilihan SEBENAR iSPEL melalui
 * carian kandungan (`bestOption`/`cariSelect` dalam content.js) — kalau
 * ejaan guru tidak cukup hampir dengan mana-mana pilihan iSPEL, automasi
 * gagal senyap. Dropdown di sini memaksa nilai yang dihantar SENTIASA
 * salah satu label SEBENAR iSPEL — tiada lagi tekaan.
 *
 * STRUKTUR SEBENAR iSPEL: Kategori (kod 1 huruf) → beberapa Sebab. Guru
 * pilih Kategori dahulu, Sebab ditapis ikut Kategori itu sahaja — sama
 * seperti borang iSPEL sendiri.
 *
 * ⚠️ Kod (B/K/L/dll) TIDAK disimpan/dihantar — hanya LABEL (teks), kerana
 * `markRow()` dalam extension padankan ikut TEKS pilihan dropdown iSPEL,
 * bukan kod dalaman.
 */

export interface SebabTidakHadir {
  kategori: string;
  sebab: string[];
}

export const SEBAB_TIDAK_HADIR: SebabTidakHadir[] = [
  {
    kategori: "MASALAH KESIHATAN",
    sebab: [
      "MAKLUMAN IBU BAPA PENJAGA", "KECEDERAAN/PATAH TULANG",
      "SURAT CUTI SAKIT HOSPITAL/KLINIK", "IMUNISASI RENDAH", "DEMAM",
      "TANTRUM (MBK)", "TEMUJANJI HOSPITAL/KLINIK",
      "MENJALANI TERAPI/RAWATAN/KUARANTIN",
      "TIDAK MELEPASI SARINGAN KESIHATAN (MBK)",
      "MENDAPATKAN RAWATAN TRADISIONAL", "KEMURUNGAN", "BATUK KOKOL", "BEGUK",
      "CACAR AIR", "CHIKUNGUNYA", "COVID 19 BERGEJALA",
      "COVID 19 DENGAN KEBENARAN IBUBAPA", "COVID 19 DIKUARANTIN",
      "COVID 19 PENGGILIRAN", "DENGGI", "SWINE FLU (H1N1)", "HEPATITIS",
      "HAND, FOOT AND MOUTH DISEASE (HFMD)", "INFLUENZA",
      "JAPANESE ENCEPHALITIS (JE)", "LEPTOSPIROSIS (PENYAKIT KENCING TIKUS)",
      "KUDIS BUTA", "MALARIA", "MERS COV", "SAKIT MATA", "SARS", "TAUN",
      "TIBI", "SAKIT MISTIK", "SAKIT MENTAL", "TEKANAN EMOSI",
    ],
  },
  {
    kategori: "BENCANA ALAM",
    sebab: [
      "JEREBU", "KEMALANGAN", "BANJIR", "GEMPA BUMI",
      "HUJAN LEBAT/RIBUT TAUFAN", "PENCEMARAN UDARA", "KEMARAU",
      "CUACA PANAS EL NINO", "PENCEMARAN SISA KIMIA", "PENCEMARAN ALAM",
      "TANAH RUNTUH",
    ],
  },
  {
    kategori: "ANCAMAN KESELAMATAN",
    sebab: [
      "BINATANG LIAR/BUAS/BERBISA", "DICULIK", "GANGGUAN MISTIK/MAKHLUK HALUS",
      "GANGGUAN KUMPULAN KONGSI GELAP", "KEBAKARAN", "PENGGANAS/LANUN",
      "RUSUHAN DI LUAR KAWASAN SEKOLAH", "UGUTAN DARIPADA PIHAK LUAR",
      "MANGSA BULI", "MANGSA SEKSUAL", "TIDAK DAPAT DIKESAN/HILANG",
    ],
  },
  {
    kategori: "MASALAH KELUARGA",
    sebab: [
      "BEKERJA", "BERPINDAH RANDAH", "PEREBUTAN HAK PENJAGAAN ANAK",
      "MENGIKUT KELUARGA BERCUTI/BERKURSUS",
      "MENJAGA/MENGURUSKAN AHLI KELUARGA", "MENJAGA AHLI KELUARGA YANG SAKIT",
      "KEMATIAN AHLI KELUARGA TERDEKAT", "KEMISKINAN/KESEMPITAN HIDUP",
      "MASALAH PENGANGKUTAN", "MENZIARAHI KELUARGA SAKIT", "BALIK KAMPUNG",
      "BERPINDAH KE LUAR NEGARA", "KRISIS KELUARGA", "LARI DARI RUMAH",
    ],
  },
  {
    kategori: "MASALAH PERIBADI",
    sebab: ["TEKANAN PERASAAN/TRAUMA", "KESAKITAN AKIBAT HAID/PERMULAAN HAID"],
  },
  {
    kategori: "KEBENARAN PENGETUA/GURU BESAR",
    sebab: [
      "HAJI/UMRAH/KEGIATAN AGAMA", "PEPERIKSAAN/UJIAN SELAIN KPM",
      "PERTANDINGAN/AKTIVITI SELAIN KPM", "PROSES PERPINDAHAN SEKOLAH",
      "TERLIBAT KES JENAYAH", "TERLIBAT KES TRAFIK",
      "URUSAN RASMI AGENSI KERAJAAN", "LATIHAN/UJIAN LESEN MEMANDU",
      "TAHANAN PIHAK BERKUASA", "TERLIBAT PROSIDING MAHKAMAH",
      "PERLINDUNGAN JABATAN KEBAJIKAN MASYARAKAT", "CUTI SEMESTER",
      "MENJALANI LATIHAN INDUSTRI",
    ],
  },
  {
    kategori: "PONTENG",
    sebab: [
      "BANGUN LEWAT", "MALAS KE SEKOLAH", "KETAGIHAN GAJET",
      "TIDAK MENYIAPKAN KERJA SEKOLAH", "MALAS KE AKTIVITI KOKURIKULUM",
    ],
  },
  { kategori: "AKTIVITI LUAR SEKOLAH", sebab: ["WAKIL SEKOLAH"] },
  { kategori: "DIGANTUNG SEKOLAH", sebab: ["DIGANTUNG SEKOLAH"] },
  { kategori: "PDPR", sebab: ["PEMBELAJARAN DI RUMAH"] },
  { kategori: "PENGGILIRAN PEPERIKSAAN", sebab: ["URUSAN PEPERIKSAAN"] },
  { kategori: "SEKOLAH DALAM HOSPITAL", sebab: ["SEKOLAH DALAM HOSPITAL"] },
];

export const SENARAI_KATEGORI = SEBAB_TIDAK_HADIR.map((k) => k.kategori);

export function sebabUntukKategori(kategori: string): string[] {
  return SEBAB_TIDAK_HADIR.find((k) => k.kategori === kategori)?.sebab ?? [];
}
