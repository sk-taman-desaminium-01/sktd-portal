/**
 * Ujian penghurai Buku Pengurusan.
 *   node --experimental-strip-types --no-warnings scripts/uji-pengurusan.mts
 *
 * Data ujian meniru BENTUK edisi sebenar 2025 (disahkan dengan pdfplumber):
 * muka jawatankuasa ialah senarai "PERANAN : NAMA" dengan baris sambungan,
 * muka senarai guru ialah jadual berlajur.
 */
import { tajukMuka, huraiSenarai, huraiJadual, kesanSeksyen } from "../src/lib/pengurusan-huraian.ts";
import { kesanJenis } from "../src/data/seksyen-pengurusan.ts";

let lulus = 0, gagal = 0;
const semak = (nama: string, dapat: unknown, jangka: unknown) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(jangka);
  console.log(`${ok ? "  OK  " : " GAGAL"} ${nama}${ok ? "" : ` → ${JSON.stringify(dapat)} vs ${JSON.stringify(jangka)}`}`);
  ok ? lulus++ : gagal++;
};

console.log("— tajuk muka —");
semak("langkau nombor muka", tajukMuka(["38", "TAKWIM PERSEKOLAHAN TAHUN 2025"]), "TAKWIM PERSEKOLAHAN TAHUN 2025");
semak("langkau baris kosong", tajukMuka(["", "  ", "UNIT KURIKULUM"]), "UNIT KURIKULUM");
semak("muka tanpa tajuk", tajukMuka(["7", ""]), "");

console.log("\n— kesan jenis seksyen (ikut kata kunci, BUKAN muka surat) —");
semak("senarai nama guru", kesanJenis("SENARAI NAMA GURU TAHUN 2025")?.kod, "guru");
semak("unit hal ehwal murid", kesanJenis("UNIT HAL EHWAL MURID")?.kod, "jawatankuasa");
semak("takwim", kesanJenis("TAKWIM PERSEKOLAHAN TAHUN 2025")?.kod, "takwim");
semak("guru kelas", kesanJenis("SENARAI GURU KELAS 2025")?.kod, "gurukelas");
semak("mesyuarat", kesanJenis("TAKWIM MESYUARAT PENGURUSAN")?.kod, "mesyuarat");
semak("tajuk tidak dikenali", kesanJenis("IKRAR INTEGRITI PERKHIDMATAN AWAM"), null);

console.log("\n— enjin senarai: PERANAN : NAMA —");
/* Bentuk SEBENAR dari m.89 edisi 2025: penyelaras diikuti baris sambungan
   yang hanya ada ": NAMA" — mereka ahli bagi peranan yang sama. */
const senarai = huraiSenarai([
  "UNIT HAL EHWAL MURID",
  "1. DISIPLIN",
  "PENYELARAS : NOOR HANISAH BINTI OTHMAN",
  ": MOHD NASSER BIN SAPARI",
  ": SITI AMINAH BINTI ALI",
  "SETIAUSAHA : ADHLINA NADHRAH BINTI YUZAIDI",
]);
semak("bilangan baris", senarai.length, 4);
semak("baris pertama", senarai[0], ["PENYELARAS", "NOOR HANISAH BINTI OTHMAN"]);
semak("sambungan warisi peranan", senarai[1], ["PENYELARAS", "MOHD NASSER BIN SAPARI"]);
semak("sambungan kedua", senarai[2], ["PENYELARAS", "SITI AMINAH BINTI ALI"]);
semak("peranan baharu", senarai[3], ["SETIAUSAHA", "ADHLINA NADHRAH BINTI YUZAIDI"]);

console.log("\n— enjin jadual dari koordinat —");
/* Bentuk SEBENAR m.47: BIL | NAMA | KOD | OPSYEN */
const sel = (str: string, x: number, y: number, w = 40) => ({ str, x, y, w });
const jad = huraiJadual([
  sel("BIL", 50, 700, 20), sel("NAMA", 120, 700), sel("KOD", 400, 700), sel("OPSYEN", 500, 700),
  sel("1", 50, 670, 10), sel("SHABARIAH BINTI ISMAIL", 120, 670), sel("PGB", 400, 670), sel("PENDIDIKAN ISLAM", 500, 670),
  sel("2", 50, 640, 10), sel("ROSLE BIN MOHAMAD", 120, 640), sel("GPK1", 400, 640), sel("PENGAJIAN MELAYU", 500, 640),
]);
semak("lajur dikesan", jad.lajur, ["BIL", "NAMA", "KOD", "OPSYEN"]);
semak("bilangan baris data", jad.baris.length, 2);
semak("baris pertama", jad.baris[0], ["1", "SHABARIAH BINTI ISMAIL", "PGB", "PENDIDIKAN ISLAM"]);

console.log("\n— bahagi dokumen kepada seksyen —");
const dok = [
  { muka: 1, baris: ["1"] },
  { muka: 2, baris: ["SIDANG REDAKSI"] },
  { muka: 3, baris: ["UNIT PENGURUSAN & PENTADBIRAN", "PENGERUSI : SHABARIAH BINTI ISMAIL", ": ROSLE BIN MOHAMAD"] },
  { muka: 4, baris: ["SAMBUNGAN", "SETIAUSAHA : AZMAHANIM BINTI AYUB"] },
  { muka: 5, baris: ["TAKWIM PERSEKOLAHAN TAHUN 2025"], item: [
      sel("MINGGU", 50, 700, 30), sel("TARIKH", 150, 700), sel("AKTIVITI", 300, 700),
      sel("7", 50, 670, 10), sel("1-Apr-25", 150, 670), sel("CUTI HARI RAYA", 300, 670),
  ] },
];
const seksyen = kesanSeksyen(dok);
semak("bilangan seksyen", seksyen.length, 2);
semak("seksyen 1 jenis", seksyen[0].kod, "jawatankuasa");
semak("seksyen 1 meliputi 2 muka", [seksyen[0].mukaMula, seksyen[0].mukaAkhir], [3, 4]);
semak("seksyen 1 ambil sambungan", seksyen[0].baris.length, 3);
semak("seksyen 2 jenis", seksyen[1].kod, "takwim");
semak("seksyen 2 lajur", seksyen[1].lajur, ["MINGGU", "TARIKH", "AKTIVITI"]);
semak("muka hadapan diabaikan", seksyen.every((s) => s.mukaMula >= 3), true);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
