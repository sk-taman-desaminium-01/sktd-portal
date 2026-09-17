/**
 * Ujian penjanaan draf pengumuman dari takwim.
 *
 * Yang paling penting di sini bukan ayat yang dijana — ia yang TIDAK dijana.
 * Takwim 2026 ada 346 acara dan majoritinya kerja dalaman sekolah. Sistem
 * yang mencadangkan semuanya kepada ibu bapa bermakna tiada siapa membaca
 * pengumuman lagi.
 */
import {
  janaDraf, ikutMasa, bandingMasa, tarikhPanjang, TEMPLAT, NAMA_KATEGORI,
  type Kategori,
} from "../src/data/umum-takwim.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

const HARI_INI = "2026-06-15";
const acara = (program: string, tarikh: string | null, hari = "ISNIN") => ({
  minggu: "", tarikh, tarikhTeks: tarikh ?? "?", hari, program, unit: "",
});
const satu = (program: string, tarikh: string | null = "2026-08-01", hari = "SABTU") =>
  janaDraf([acara(program, tarikh, hari)], HARI_INI)[0];

/* --------------------------------------------------------------- templat */

for (const [kod, senarai] of Object.entries(TEMPLAT)) {
  uji(`${kod}: tepat 5 ayat`, senarai.length === 5, `ada ${senarai.length}`);
  uji(`${kod}: setiap ayat ada {program}`, senarai.every((a) => a.includes("{program}")));
  uji(`${kod}: setiap ayat ada {tarikh}`, senarai.every((a) => a.includes("{tarikh}")));
  uji(`${kod}: ayat tidak berulang`, new Set(senarai).size === 5);
  uji(`${kod}: ada nama kategori`, NAMA_KATEGORI[kod as Kategori] !== undefined);
}

/* Putaran: lima acara kategori sama menghasilkan lima ayat berlainan. */
const lima = janaDraf(
  ["CUTI SEMPENA HARI RAYA", "CUTI TAHUN BARU CINA", "CUTI DEEPAVALI",
   "CUTI THAIPUSAM", "CUTI WESAK", "CUTI KRISMAS"].map((p, i) =>
    acara(p, `2026-08-0${i + 1}`)),
  HARI_INI,
);
uji("lima ayat berputar sebelum berulang",
  new Set(lima.slice(0, 5).map((d) => d.ayat.replace(/Cuti \S+( \S+)?/g, ""))).size === 5);
uji("ayat keenam kembali ke templat pertama",
  lima[5].ayat.startsWith("Sekolah bercuti sempena"));

/* Putaran berlaku DALAM kategori, bukan merentas senarai. */
const campur = janaDraf([
  acara("CUTI DEEPAVALI", "2026-08-01"),
  acara("UASA", "2026-08-02"),
  acara("CUTI WESAK", "2026-08-03"),
], HARI_INI);
uji("kategori berlainan tidak mengganggu putaran satu sama lain",
  campur[0].ayat !== campur[2].ayat && campur[0].kategori === campur[2].kategori);

/* ------------------------------------------------------------- penapisan */

const dalaman = [
  "MESYUARAT PANITIA BAHASA MELAYU BIL 2",
  "MESYUARAT KURIKULUM BIL 1",
  "LADAP SIRI 3",
  "PENCERAPAN PdPc",
  "POST-MORTEM UASA",
  "AUDIT SPSK",
  "TAKLIMAT GURU",
];
for (const p of dalaman) {
  const d = satu(p);
  uji(`ditapis: ${p.slice(0, 28)}`, d.kategori === "dalaman" && !d.disyorkan);
}

const untukIbuBapa: [string, Kategori][] = [
  ["MESYUARAT AGUNG PIBG", "ibubapa"],
  ["HARI TERBUKA SEKOLAH", "ibubapa"],
  ["CUTI SEMPENA DEEPAVALI", "cuti"],
  ["UASA", "peperiksaan"],
  ["KEJOHANAN MERENTAS DESA", "sukan"],
  ["MAJLIS ANUGERAH", "majlis"],
  ["PENDAFTARAN MURID TAHUN 1", "pendaftaran"],
];
for (const [p, k] of untukIbuBapa) {
  const d = satu(p);
  uji(`disyorkan: ${p.slice(0, 28)}`, d.kategori === k && d.disyorkan,
    `kategori ${d.kategori}, disyorkan ${d.disyorkan}`);
}

uji("mesyuarat PIBG BUKAN mesyuarat dalaman",
  satu("MESYUARAT AGUNG PIBG KALI KE-12").kategori === "ibubapa");

/* --------------------------------------------------------------- ayat */

uji("huruf besar penuh ditukar kepada huruf biasa",
  satu("MAJLIS ANUGERAH").ayat.includes("Majlis Anugerah"));
uji("akronim kekal huruf besar", satu("UASA").ayat.includes("UASA"));
uji("akronim PIBG kekal", satu("MESYUARAT AGUNG PIBG").ayat.includes("PIBG"));
uji("tiada ruang berganda", !satu("CUTI DEEPAVALI").ayat.includes("  "));
uji("perkataan berulang digabung",
  !/\bCuti Cuti\b/.test(satu("CUTI SEMPENA DEEPAVALI").ayat));
uji("tiada pemegang tempat tertinggal",
  !/\{(program|tarikh|hari)\}/.test(satu("CUTI DEEPAVALI").ayat));
uji("tarikh ditulis penuh dalam Bahasa Melayu",
  satu("CUTI DEEPAVALI", "2026-11-08").ayat.includes("8 November 2026"));
uji("hari tanpa nama tidak meninggalkan kurungan kosong",
  !janaDraf([acara("CUTI DEEPAVALI", "2026-11-08", "")], HARI_INI)[0].ayat.includes("()"));

sama("tarikhPanjang", tarikhPanjang("2026-03-05", "?"), "5 Mac 2026");
sama("tarikh tidak difahami memakai teks asal", tarikhPanjang(null, "AWAL MAC"), "AWAL MAC");

/* ----------------------------------------------------------------- masa */

sama("semalam berlalu", bandingMasa("2026-06-14", HARI_INI), "berlalu");
sama("hari ini semasa", bandingMasa("2026-06-15", HARI_INI), "semasa");
sama("esok akan datang", bandingMasa("2026-06-16", HARI_INI), "akan");
sama("tiada tarikh dianggap akan datang", bandingMasa(null, HARI_INI), "akan");

uji("acara yang sudah berlalu TIDAK disyorkan",
  !satu("CUTI DEEPAVALI", "2026-01-01").disyorkan);
uji("sebabnya dinyatakan",
  satu("CUTI DEEPAVALI", "2026-01-01").sebab.includes("sudah berlalu"));

const kumpulan = ikutMasa(janaDraf([
  acara("CUTI DEEPAVALI", "2026-01-01"),
  acara("UASA", "2026-06-15"),
  acara("MAJLIS ANUGERAH", "2026-12-01"),
], HARI_INI), HARI_INI);
sama("tiga kumpulan, tertib: hari ini, akan datang, berlalu",
  kumpulan.map((k) => k.masa), ["semasa", "akan", "berlalu"]);
uji("kumpulan kosong tidak dipapar",
  ikutMasa(janaDraf([acara("UASA", "2026-12-01")], HARI_INI), HARI_INI).length === 1);
uji("akan datang disusun menaik",
  ikutMasa(janaDraf([
    acara("MAJLIS ANUGERAH", "2026-12-01"),
    acara("SUKAN TAHUNAN", "2026-07-01"),
  ], HARI_INI), HARI_INI)[0].draf[0].acara.tarikh === "2026-07-01");
uji("berlalu disusun menurun — yang terbaharu dahulu",
  ikutMasa(janaDraf([
    acara("MAJLIS ANUGERAH", "2026-01-01"),
    acara("SUKAN TAHUNAN", "2026-05-01"),
  ], HARI_INI), HARI_INI)[0].draf[0].acara.tarikh === "2026-05-01");

/* ------------------------------------------------------- acara bercantum */

const panjang = satu(
  "PENGHANTARAN BUKU KAWALAN KELAS & LAPORAN KEJOHANAN MERENTAS DESA KEHADIRAN iDMe",
);
uji("acara bercantum tidak disyorkan", !panjang.disyorkan);
uji("sebab acara bercantum dinyatakan", panjang.sebab.includes("bercantum"));

/* ------------------------------------------------------------- kestabilan */

uji("kunci stabil antara larian",
  satu("CUTI DEEPAVALI").kunci === satu("CUTI DEEPAVALI").kunci);
uji("program terlalu pendek diabaikan",
  janaDraf([acara("-", "2026-08-01"), acara("", "2026-08-02")], HARI_INI).length === 0);

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
