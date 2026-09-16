/**
 * Ujian penghurai Buku Pengurusan.
 *   node --experimental-strip-types --no-warnings scripts/uji-pengurusan.mts
 *
 * Data ujian meniru BENTUK edisi sebenar 2025 (disahkan dengan pdfplumber):
 * muka jawatankuasa ialah senarai "PERANAN : NAMA" dengan baris sambungan,
 * muka senarai guru ialah jadual berlajur.
 */
import { tajukMuka, huraiSenarai, huraiSenaraiDariSel, huraiJadual, kesanSeksyen, huraiTugas, kelihatanTugas } from "../src/lib/pengurusan-huraian.ts";
import { buangKurunganGanda } from "../src/lib/muka-teks.ts";
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
// Lajur pertama ialah SUB-JAWATANKUASA. Tanpanya, 263 baris jawatankuasa
// dalam buku sebenar menjadi senarai rata "PENGERUSI / SETIAUSAHA / AJK"
// yang berulang tanpa sesiapa tahu jawatankuasa MANA.
semak("baris pertama", senarai[0], ["DISIPLIN", "PENYELARAS", "NOOR HANISAH BINTI OTHMAN"]);
semak("sambungan warisi peranan", senarai[1], ["DISIPLIN", "PENYELARAS", "MOHD NASSER BIN SAPARI"]);
semak("sambungan kedua", senarai[2], ["DISIPLIN", "PENYELARAS", "SITI AMINAH BINTI ALI"]);
semak("peranan baharu", senarai[3], ["DISIPLIN", "SETIAUSAHA", "ADHLINA NADHRAH BINTI YUZAIDI"]);

// Jawatankuasa BAHARU mesti memutuskan warisan peranan — kalau tidak, baris
// sambungan pertama jawatankuasa baharu mewarisi "AJK" dari yang sebelumnya.
const duaJK = huraiSenarai([
  "1. KEWANGAN", "AJK : A BINTI B", ": C BINTI D",
  "2. LADAP", ": E BINTI F", "PENYELARAS : G BINTI H",
]);
semak("kumpulan kedua dikesan", duaJK.map((b) => b[0]), ["KEWANGAN", "KEWANGAN", "LADAP"]);
semak("peranan tidak merentas jawatankuasa", duaJK[2], ["LADAP", "PENYELARAS", "G BINTI H"]);

// Koma bertitik menggantikan titik bertindih — berlaku pada m.55 buku sebenar.
semak("koma bertitik diterima",
  huraiSenarai(["1. SPSK", "AJK : A BINTI B", "; SEMUA KETUA PANITIA"]).length, 2);

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



console.log("\n— enjin bidang tugas —");
/* Bentuk SEBENAR m.115 edisi 2025. Bulet ialah U+F0A7 (glif Wingdings dalam
   Kawasan Guna Persendirian Unicode) yang `kemas()` normalkan kepada "•".
   Sebelum ini ia disangka teks, dan seluruh muka dilaporkan "tidak boleh
   dibaca" sedangkan ia dibaca sempurna — cuma tiada nama di dalamnya. */
const selTugas = [
  ["GURU PENASIHAT KO AKADEMIK/ JURULATIH PASUKAN KHAS SEKOLAH"],
  ["\u2022", "Membentuk jawatankuasa dalam pasukan."],
  ["\u2022", "Merancang meningkatkan pengetahuan, kemahiran dan minat pelajar dalam"],
  ["permainan ataupertandingan."],
  ["\u2022", "Berusaha mendapatkan khidmat nasihat dari mereka yang pakar."],
  ["KETUA RUMAH SUKAN"],
  ["\u2022", "Memastikan adanya senarai nama ahli Rumah Sukan yang lengkap."],
];
const tugas = huraiTugas(selTugas);
semak("bilangan tugas", tugas.length, 4);
semak("peranan pertama", tugas[0][0], "GURU PENASIHAT KO AKADEMIK/ JURULATIH PASUKAN KHAS SEKOLAH");
semak("bulet dibuang dari teks", tugas[0][1], "Membentuk jawatankuasa dalam pasukan.");
semak("ayat melimpah dicantum", tugas[1][1],
  "Merancang meningkatkan pengetahuan, kemahiran dan minat pelajar dalam permainan ataupertandingan.");
semak("peranan bertukar pada tajuk baharu", tugas[3][0], "KETUA RUMAH SUKAN");

semak("muka tugas dikesan", kelihatanTugas([{ muka: 1, baris: [], sel: selTugas }]), true);
/* Muka senarai nama TIDAK boleh disangka bidang tugas, walaupun ia
   mengandungi beberapa baris berbulet. */
semak("muka senarai nama tidak disangka tugas",
  kelihatanTugas([{ muka: 1, baris: [], sel: [
    ["PENGERUSI : A BINTI B"], ["SETIAUSAHA : C BINTI D"], ["AJK : E BINTI F"],
    ["\u2022", "nota kecil"], [": G BINTI H"], [": I BINTI J"], [": K BINTI L"],
  ] }]), false);

console.log("\n— pepijat dilaporkan pengguna (edisi 2026) —");

/* 1. DUA PASANGAN DALAM SATU NILAI. Muka bergaya carta menyusun dua pasangan
      bersebelahan; bila pemecahan sel gagal menangkapnya, kedua-duanya
      mendarat dalam satu nilai dan seorang ketua panitia hilang. */
const dua = huraiSenarai([
  "BAHASA MELAYU : RAFIDAH BINTI MOHD NOR SEJARAH : MOHAN A/L BATUMALAI",
]);
semak("dua pasangan dipecah", dua.length, 2);
semak("pasangan pertama", dua[0], ["", "BAHASA MELAYU", "RAFIDAH BINTI MOHD NOR"]);
semak("pasangan kedua", dua[1], ["", "SEJARAH", "MOHAN A/L BATUMALAI"]);

/* Jawatan berbilang perkataan: sandaran ini mengambil jawatan PALING PENDEK
   yang masih meninggalkan nama penuh. Pada muka sebenar, pemecahan SEL
   menangkap "PEND JASMANI & KESIHATAN" dengan tepat — fungsi ini hanya
   dipanggil bila pemecahan itu gagal, dan ketika itu berhati-hati lebih
   baik daripada tepat: satu perkataan tersalah letak boleh dibetulkan
   admin; nama yang ditelan hilang terus. */
const panjang = huraiSenarai([
  "BAHASA INGGERIS : NORAZLINA BINTI PAIMIN PEND JASMANI & KESIHATAN : MUHIRI BINTI GHAZALI",
]);
semak("kedua-dua orang dikekalkan", panjang.length, 2);
semak("orang kedua betul", panjang[1][2], "MUHIRI BINTI GHAZALI");

/* Nama biasa TIDAK boleh dipecah. */
semak("nama biasa kekal utuh",
  huraiSenarai(["AJK : NOR HASFARADZI BIN HASHIM AMER HAMZAH"]).length, 1);

/* 2. SERPIHAN YATIM. pdf.js memecahkan huruf terakhir menjadi selnya sendiri,
      dan huruf itu hilang senyap — "PANITIA" menjadi "PANITI". */
const serpih = huraiSenaraiDariSel([["AJK", ": SEMUA KETUA PANITI", "A"]]);
semak("huruf terakhir tidak hilang", serpih[0][2], "SEMUA KETUA PANITIA");

/* 3. KURUNGAN BERGANDA dari tajuk dua lapis. */
semak("kurungan berganda diruntuhkan",
  buangKurunganGanda("PELAPORAN PEN SEK RENDAH (PPSR)))"),
  "PELAPORAN PEN SEK RENDAH (PPSR)");
semak("kurungan tunggal tidak diusik",
  buangKurunganGanda("SISTEM (SPSK)"), "SISTEM (SPSK)");

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
