import type { AcaraTakwim } from "@/lib/takwim";

/**
 * DRAF PENGUMUMAN daripada takwim.
 *
 * MASALAH YANG INI SELESAIKAN. Takwim 2026 mengandungi 346 acara. Sebahagian
 * kecil daripadanya ialah perkara yang ibu bapa perlu tahu — cuti, peperiksaan,
 * mesyuarat agung, hari sukan. Selebihnya ialah kerja dalaman sekolah:
 * mesyuarat panitia, pencerapan, LADAP, post-mortem. Menyiarkan semuanya
 * bermakna ibu bapa berhenti membaca pengumuman langsung.
 *
 * Maka setiap acara ditapis, dan yang lulus diberi AYAT yang sudah siap.
 *
 * ── DUA PERKARA YANG SENGAJA TIDAK DIBUAT ───────────────────────────────
 *
 * 1. TIADA APA DITERBITKAN AUTOMATIK. Setiap cadangan ialah DRAF. Pengumuman
 *    kepada ibu bapa keluar atas nama sekolah, dan sistem yang menghantarnya
 *    tanpa seorang manusia membacanya akan, pada suatu hari, memberitahu
 *    seluruh sekolah tentang mesyuarat yang dibatalkan.
 *
 * 2. PENAPIS ADALAH SYOR, BUKAN KEPUTUSAN. Setiap acara membawa sebab mengapa
 *    ia disyorkan atau tidak, dan admin boleh menghidupkan mana-mana satu.
 *    Sekolah tahu konteks yang takwim tidak tulis.
 */

export type Kategori =
  | "cuti"
  | "peperiksaan"
  | "ibubapa"
  | "majlis"
  | "sukan"
  | "pendaftaran"
  | "dalaman";

export type Masa = "berlalu" | "semasa" | "akan";

export interface DrafUmum {
  /** Kunci stabil — acara yang sama menghasilkan kunci yang sama setiap kali. */
  kunci: string;
  acara: AcaraTakwim;
  kategori: Kategori;
  masa: Masa;
  /** Disyorkan untuk ibu bapa? Syor sahaja — admin yang memutuskan. */
  disyorkan: boolean;
  /** Kenapa ia disyorkan atau tidak. Dipapar, bukan disembunyikan. */
  sebab: string;
  tajuk: string;
  /** Ayat siap, dari templat yang berputar. */
  ayat: string;
}

/* --------------------------------------------------------------- penapis */

/**
 * Corak dalaman — kerja sekolah yang ibu bapa tidak perlu tahu.
 *
 * Disemak DAHULU, kerana "MESYUARAT PANITIA BAHASA MELAYU" mengandungi
 * perkataan yang juga muncul dalam acara ibu bapa.
 */
const DALAMAN: [RegExp, string][] = [
  [/\bMESYUARAT\s+(PANITIA|KURIKULUM|HEM|KOKURIKULUM|PENGURUSAN|GURU|JK|BIL)\b/i, "Mesyuarat dalaman guru"],
  [/\b(LADAP|LDP|PENCERAPAN|POST[- ]?MORTEM|POSTMORTEM|TAKLIMAT GURU|KURSUS|BENGKEL GURU)\b/i, "Latihan atau penilaian guru"],
  [/\b(AUDIT|SPSK|VERIFIKASI|PEMANTAUAN|PELAPORAN DALAMAN)\b/i, "Proses dalaman sekolah"],
  [/\bMESYUARAT\b(?!.*\b(PIBG|IBU BAPA|PENJAGA|AGUNG)\b)/i, "Mesyuarat — bukan untuk ibu bapa"],
];

/**
 * Kategori yang boleh diumumkan, dengan corak pengenalannya.
 *
 * Urutan penting: yang lebih khusus dahulu. "MESYUARAT AGUNG PIBG" mesti
 * menjadi `ibubapa`, bukan tertangkap oleh corak mesyuarat dalaman.
 */
const KATEGORI: [RegExp, Kategori, string][] = [
  [/\b(PIBG|IBU BAPA|PENJAGA|AGUNG|HARI TERBUKA|PERJUMPAAN IBU)\b/i, "ibubapa", "Ibu bapa hadir sendiri"],
  [/\b(CUTI|PERAYAAN|HARI RAYA|DEEPAVALI|THAIPUSAM|TAHUN BARU|WESAK|KRISMAS|HARI KEBANGSAAN|MAULIDUR)\b/i, "cuti", "Ibu bapa perlu merancang penjagaan anak"],
  [/\b(PEPERIKSAAN|UJIAN|UASA|PKSR|PENTAKSIRAN|SARINGAN|LINUS|PBD|SLIP|KEPUTUSAN)\b/i, "peperiksaan", "Ibu bapa menunggu keputusan anak"],
  [/\b(SUKAN|MERENTAS DESA|OLAHRAGA|KEJOHANAN|RUMAH SUKAN)\b/i, "sukan", "Ibu bapa biasanya hadir menyaksikan"],
  [/\b(PENDAFTARAN|ORIENTASI|TRANSISI|HARI PERTAMA|SESI PERSEKOLAHAN BERMULA|MURID BAHARU)\b/i, "pendaftaran", "Melibatkan kehadiran murid pada tarikh tertentu"],
  [/\b(MAJLIS|ANUGERAH|SAMBUTAN|GRADUASI|PERSARAAN|HARI GURU|PERHIMPUNAN BESAR|JAMUAN)\b/i, "majlis", "Majlis sekolah yang terbuka"],
];

export const NAMA_KATEGORI: Record<Kategori, string> = {
  cuti: "Cuti & perayaan",
  peperiksaan: "Peperiksaan & keputusan",
  ibubapa: "Melibatkan ibu bapa",
  majlis: "Majlis sekolah",
  sukan: "Sukan",
  pendaftaran: "Pendaftaran & sesi",
  dalaman: "Dalaman sekolah",
};

function kategorikan(program: string): { kategori: Kategori; sebab: string } {
  for (const [corak, sebab] of DALAMAN) {
    if (corak.test(program)) return { kategori: "dalaman", sebab };
  }
  for (const [corak, kategori, sebab] of KATEGORI) {
    if (corak.test(program)) return { kategori, sebab };
  }
  return { kategori: "dalaman", sebab: "Tiada isyarat bahawa ia melibatkan ibu bapa" };
}

/* --------------------------------------------------------------- templat */

/**
 * LIMA ayat bagi setiap kategori, DIPUTARKAN.
 *
 * Pengguna meminta ini dengan tepat: lima ayat sahaja yang berputar, supaya
 * tiada siapa perlu mengarang perkataan setiap kali. Lima cukup untuk
 * pengumuman sepanjang tahun tidak berbunyi seperti mesin, dan cukup sedikit
 * untuk setiap satunya benar-benar dibaca sebelum digunakan.
 *
 * `{program}` `{tarikh}` `{hari}` diganti; tiada yang lain.
 */
export const TEMPLAT: Record<Kategori, string[]> = {
  cuti: [
    "Sekolah bercuti sempena {program} pada {hari}, {tarikh}. Sesi persekolahan bersambung seperti biasa selepas itu.",
    "Makluman kepada ibu bapa dan penjaga: {program} jatuh pada {hari}, {tarikh}. Tiada sesi persekolahan pada hari tersebut.",
    "{program} disambut pada {hari}, {tarikh}. Pihak sekolah mengucapkan selamat menyambutnya bersama keluarga.",
    "Ambil perhatian bahawa {tarikh} ({hari}) ialah {program}. Ibu bapa dinasihatkan merancang penjagaan anak lebih awal.",
    "Cuti {program} pada {hari}, {tarikh}. Murid diingatkan menyiapkan tugasan sebelum kembali ke sekolah.",
  ],
  peperiksaan: [
    "{program} akan berlangsung pada {hari}, {tarikh}. Murid diingatkan hadir awal dan membawa kelengkapan sendiri.",
    "Makluman: {program} pada {tarikh} ({hari}). Kerjasama ibu bapa memastikan anak cukup rehat amat dihargai.",
    "Ibu bapa dimaklumkan bahawa {program} dijadualkan pada {hari}, {tarikh}.",
    "{program} pada {tarikh}. Sebarang pertanyaan boleh diajukan kepada guru kelas masing-masing.",
    "Murid akan menjalani {program} bermula {hari}, {tarikh}. Jadual penuh boleh dirujuk di kelas.",
  ],
  ibubapa: [
    "Ibu bapa dan penjaga dijemput hadir ke {program} pada {hari}, {tarikh}. Kehadiran tuan/puan amat dihargai.",
    "{program} akan diadakan pada {tarikh} ({hari}). Pihak sekolah mengalu-alukan kehadiran semua ibu bapa.",
    "Jemputan kepada ibu bapa: {program}, {hari} {tarikh}. Butiran lanjut akan dimaklumkan melalui guru kelas.",
    "Pihak sekolah menjemput ibu bapa dan penjaga ke {program} pada {tarikh}. Sila hadir tepat pada masanya.",
    "{program} pada {hari}, {tarikh}. Kehadiran ibu bapa penting untuk kesinambungan pendidikan anak-anak.",
  ],
  majlis: [
    "{program} akan diadakan pada {hari}, {tarikh}. Semua warga sekolah dijemput hadir.",
    "Makluman: {program} pada {tarikh} ({hari}).",
    "Sekolah akan mengadakan {program} pada {hari}, {tarikh}. Maklumat lanjut menyusul.",
    "{program} — {hari}, {tarikh}. Murid dikehendaki berpakaian kemas dan hadir seperti biasa.",
    "Ambil perhatian: {program} berlangsung pada {tarikh}.",
  ],
  sukan: [
    "{program} akan berlangsung pada {hari}, {tarikh}. Ibu bapa dijemput hadir memberi sokongan.",
    "Makluman: {program} pada {tarikh} ({hari}). Murid diingatkan membawa air minuman yang mencukupi.",
    "{program} pada {hari}, {tarikh}. Murid dinasihatkan memakai pakaian sukan rumah masing-masing.",
    "Sekolah akan mengadakan {program} pada {tarikh}. Kehadiran ibu bapa amat dialu-alukan.",
    "{program} — {hari}, {tarikh}. Sebarang perubahan cuaca akan dimaklumkan lebih awal.",
  ],
  pendaftaran: [
    "{program} pada {hari}, {tarikh}. Ibu bapa diminta hadir bersama anak pada waktu yang ditetapkan.",
    "Makluman penting: {program} bermula {tarikh} ({hari}).",
    "{program} akan diadakan pada {hari}, {tarikh}. Sila bawa dokumen yang diperlukan.",
    "Ambil perhatian bahawa {program} jatuh pada {tarikh}. Kerjasama ibu bapa amat dihargai.",
    "{program} — {hari}, {tarikh}. Guru kelas akan menghubungi ibu bapa untuk butiran lanjut.",
  ],
  dalaman: [
    "{program} pada {hari}, {tarikh}.",
    "Makluman: {program}, {tarikh}.",
    "{program} dijadualkan pada {hari}, {tarikh}.",
    "Ambil perhatian: {program} pada {tarikh}.",
    "{program} — {hari}, {tarikh}.",
  ],
};

const BULAN_PENUH = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

/** `2026-03-15` → `15 Mac 2026`. Teks asal dikekalkan bila tarikh tidak difahami. */
export function tarikhPanjang(iso: string | null, ganti: string): string {
  if (!iso) return ganti;
  const [t, b, h] = iso.split("-").map(Number);
  if (!t || !b || !h) return ganti;
  return `${h} ${BULAN_PENUH[b - 1]} ${t}`;
}

/**
 * Akronim yang mesti kekal huruf besar.
 *
 * "UASA" menjadi "Uasa" tanpa ini, dan pengumuman yang mengeja nama
 * peperiksaan secara salah ialah perkara pertama yang seorang ibu bapa
 * perasan.
 */
const AKRONIM = new Set([
  "UASA", "PBD", "PIBG", "KPM", "JPN", "PPD", "PKSR", "LADAP", "LDP",
  "SPSK", "PSS", "PRS", "TP", "SK", "SKTD", "UPSR", "KSSR", "PAK21",
  "HEM", "MSSD", "MSSS", "STEM", "NILAM", "RIMUP", "BM", "BI", "PI",
]);

function kemasProgram(p: string): string {
  const t = p.replace(/\s+/g, " ").trim();
  // Buku menulis dalam huruf besar sepenuhnya. Huruf besar penuh dalam
  // pengumuman kepada ibu bapa berbunyi seperti jeritan.
  if (t === t.toUpperCase()) {
    return t
      .split(/(\s+)/)
      .map((w) => {
        const telanjang = w.replace(/[^A-Za-z0-9]/g, "");
        if (AKRONIM.has(telanjang)) return w;
        return w.toLowerCase().replace(/(^|[(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
      })
      .join("");
  }
  return t;
}

/* ------------------------------------------------------------------ masa */

export function bandingMasa(iso: string | null, hariIni: string): Masa {
  if (!iso) return "akan";
  if (iso < hariIni) return "berlalu";
  if (iso === hariIni) return "semasa";
  return "akan";
}

/* --------------------------------------------------------------- penjana */

/**
 * Jana draf bagi satu senarai acara.
 *
 * `hariIni` diberi, tidak dibaca dari jam sistem — supaya hasilnya boleh
 * diuji, dan supaya pelayan dan pelayar tidak pernah berselisih tentang
 * tarikh (satu di UTC, satu di Malaysia, dan acara semalam menjadi acara
 * hari ini).
 */
export function janaDraf(acara: AcaraTakwim[], hariIni: string): DrafUmum[] {
  // Kiraan per kategori supaya putaran templat berlaku DALAM kategori.
  // Putaran global bermakna semua pengumuman cuti tahun itu menggunakan
  // ayat yang sama, kerana ia tersebar rata sepanjang senarai.
  const kira: Record<string, number> = {};

  return acara
    .filter((a) => a.program.trim().length >= 4)
    .map((a) => {
      const { kategori, sebab } = kategorikan(a.program);
      const n = (kira[kategori] = (kira[kategori] ?? 0) + 1) - 1;
      const templat = TEMPLAT[kategori];
      const program = kemasProgram(a.program);
      const tarikh = tarikhPanjang(a.tarikh, a.tarikhTeks);
      const hari = a.hari ? a.hari.charAt(0) + a.hari.slice(1).toLowerCase() : "";

      const ayat = templat[n % templat.length]
        .replaceAll("{program}", program)
        .replaceAll("{tarikh}", tarikh)
        .replaceAll("{hari}", hari)
        // Hari yang tidak diketahui meninggalkan " ()" atau ", ." di tengah ayat.
        .replace(/\s*\(\s*\)/g, "")
        .replace(/\s+,/g, ",")
        .replace(/,\s*\./g, ".")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Templat membekalkan perkataan yang kadang sudah ada dalam nama acara:
      // "Cuti {program}" + "Cuti Sempena Deepavali" = "Cuti Cuti Sempena".
      // Baris takwim sendiri juga kadang mengulang ("UASA UASA & Tarikh
      // Akhir"). Perkataan bersebelahan yang sama digabungkan.
      const rapi = ayat.replace(/\b(\p{L}[\p{L}.]*)(\s+\1)+\b/giu, "$1");

      const masa = bandingMasa(a.tarikh, hariIni);

      // Baris takwim yang SANGAT panjang biasanya dua acara yang bercantum
      // semasa dicetak — "PENGHANTARAN BUKU KAWALAN KELAS & LAPORAN
      // KEJOHANAN MERENTAS DESA" ialah dua perkara, bukan satu. Ayat yang
      // dijana daripadanya berbunyi salah, jadi ia tidak disyorkan sehingga
      // seseorang memisahkannya.
      const bercantum = a.program.trim().length > 70;

      let disyorkan = kategori !== "dalaman";
      let mengapa = sebab;
      if (disyorkan && bercantum) {
        disyorkan = false;
        mengapa = "Teks acara terlalu panjang — mungkin dua acara bercantum. Semak dan pisahkan dahulu.";
      } else if (disyorkan && masa === "berlalu") {
        disyorkan = false;
        mengapa = "Tarikh sudah berlalu — mengumumkannya sekarang mengelirukan.";
      }

      return {
        kunci: `${a.tarikh ?? a.tarikhTeks}|${a.program}`,
        acara: a,
        kategori,
        masa,
        disyorkan,
        sebab: mengapa,
        tajuk: program,
        ayat: rapi,
      };
    });
}

export interface KumpulanMasa {
  masa: Masa;
  label: string;
  nota: string;
  draf: DrafUmum[];
}

/**
 * Kumpulkan mengikut masa, dengan perkataan yang memberitahu apa nak buat.
 *
 * "Berlalu / Semasa / Akan datang" ialah label yang betul tetapi kosong.
 * Notanya yang memberitahu admin kenapa kumpulan itu wujud.
 */
export function ikutMasa(draf: DrafUmum[], hariIni: string): KumpulanMasa[] {
  const susun = (m: Masa) =>
    draf
      .filter((d) => d.masa === m)
      .sort((a, b) =>
        m === "berlalu"
          ? (b.acara.tarikh ?? "").localeCompare(a.acara.tarikh ?? "")
          : (a.acara.tarikh ?? "").localeCompare(b.acara.tarikh ?? ""),
      );

  const kumpulan: KumpulanMasa[] = [
    {
      masa: "semasa",
      label: "Hari ini",
      nota: `Berlangsung hari ini, ${tarikhPanjang(hariIni, hariIni)}.`,
      draf: susun("semasa"),
    },
    {
      masa: "akan",
      label: "Akan datang",
      nota: "Belum berlaku. Ini yang patut diumumkan kepada ibu bapa.",
      draf: susun("akan"),
    },
    {
      masa: "berlalu",
      label: "Telah berlalu",
      nota: "Sudah selesai. Disimpan sebagai rekod — biasanya tidak perlu diumumkan.",
      draf: susun("berlalu"),
    },
  ];
  return kumpulan.filter((k) => k.draf.length > 0);
}
