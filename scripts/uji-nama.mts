/**
 * Ujian padanan nama antara Buku Pengurusan dan akaun KPM.
 *
 * Setiap kes di bawah ialah bentuk yang BENAR-BENAR muncul, bukan rekaan:
 * awalan "KPM-Guru" dari akaun Google KPM, catatan "(AKP)" dalam buku, nama
 * yang disingkatkan dalam satu sumber tetapi penuh dalam sumber lain.
 */
import { namaBersih, kunciNama, bandingNama, cariPadanan } from "../src/lib/nama.ts";
import { kenakanPindaan, kenakanPindaanBanyak, kesanPewaris, type Pindaan } from "../src/data/pindaan.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

/* ------------------------------------------------------------- pembersihan */

sama("KPM-Guru di hadapan dibuang",
  namaBersih("KPM-Guru Ahmad Rafli Noor Bin Shahardin"), "Ahmad Rafli Noor Bin Shahardin");
sama("KPM Guru berjarak dibuang",
  namaBersih("KPM Guru Siti Aminah"), "Siti Aminah");
sama("KPMGuru tanpa pemisah dibuang",
  namaBersih("KPMGuru Siti Aminah"), "Siti Aminah");
sama("KPM-Guru di hujung dibuang",
  namaBersih("Siti Aminah KPM-Guru"), "Siti Aminah");
sama("gelaran Cikgu dibuang", namaBersih("Cikgu Aiman Haziq"), "Aiman Haziq");
sama("gelaran Ustaz dibuang", namaBersih("Ustaz Syaiful Izhan"), "Syaiful Izhan");
sama("nama biasa tidak diusik",
  namaBersih("SHABARIAH BINTI ISMAIL"), "SHABARIAH BINTI ISMAIL");

// "Tuan" ialah gelaran hormat DAN sebahagian nama sebenar. Hanya yang di
// hadapan boleh dibuang, dan nama keluarga mesti kekal.
uji("Tuan sebagai nama keluarga kekal",
  namaBersih("TUAN ROHADI BIN TUAN KECHIK").includes("TUAN KECHIK"),
  namaBersih("TUAN ROHADI BIN TUAN KECHIK"));

sama("catatan jawatan dalam kurungan dibuang dari kunci",
  kunciNama("IRNAWATI BINTI JOHAR (AKP)"), "IRNAWATI BINTI JOHAR");

/* ---------------------------------------------------------------- padanan */

uji("akaun KPM padan dengan buku",
  bandingNama("KPM-Guru Ahmad Rafli Noor Bin Shahardin",
              "AHMAD RAFLI NOOR BIN SHAHARDIN").cadang);

uji("singkatan A.H padan dengan nama penuh",
  bandingNama("NOR HASFARADZI BIN HASHIM A.H",
              "NOR HASFARADZI BIN HASHIM AMER HAMZAH").cadang);

uji("nama berbeza TIDAK padan",
  !bandingNama("SITI AMINAH BINTI ALI", "NURUL HUDA BINTI OMAR").cadang);

// Yang paling bahaya: dua nama yang berkongsi komponen biasa Melayu.
uji("MOHD sahaja tidak cukup untuk padan",
  !bandingNama("MOHD ALI", "MOHD BAKAR").cadang,
  String(bandingNama("MOHD ALI", "MOHD BAKAR").skor));

uji("NUR sahaja tidak cukup untuk padan",
  !bandingNama("NUR AISYAH", "NUR FATIMAH").cadang);

/* ------------------------------------------------------------ cari calon */

const buku = [
  { nama: "SHABARIAH BINTI ISMAIL" },
  { nama: "ROSLE BIN MOHAMAD" },
  { nama: "AIMAN HAZIQ BIN HAMZAH" },
];
sama("calon betul dijumpai",
  cariPadanan("KPM-Guru Aiman Haziq Bin Hamzah", buku, (x) => x.nama)?.item.nama,
  "AIMAN HAZIQ BIN HAMZAH");
sama("tiada calon bila tiada yang padan",
  cariPadanan("KPM-Guru Zulkifli Bin Osman", buku, (x) => x.nama), null);

// SERI mesti menolak, bukan memilih. Nama berulang dalam satu sekolah
// bukan mustahil, dan memilih senyap ialah cara seorang guru mewarisi
// jawatan orang lain.
const kembar = [{ nama: "AHMAD BIN ALI", id: 1 }, { nama: "AHMAD BIN ALI", id: 2 }];
sama("nama berulang menolak padanan",
  cariPadanan("Ahmad Bin Ali", kembar, (x) => x.nama), null);

/* ---------------------------------------------- nama vs ayat pelan strategik */

/* Carta organisasi pernah memapar ayat Pelan Strategik sebagai "orang".
   Setiap contoh di bawah diambil terus dari skrin yang pengguna laporkan. */
const { kelihatanNama } = await import("../src/data/carta.ts");

for (const nama of [
  "SHABARIAH BINTI ISMAIL",
  "MOHAN A/L BATUMALAI",
  "OOI KEM YON",
  "NURUL ATIKAH IZZATI BINTI MOHD ZULKIFLI",
]) uji(`nama sebenar diterima: ${nama}`, kelihatanNama(nama));

for (const bukan of [
  "Menyusun perancangan LADAP secara sistematik",
  "Hanya 10% murid merekodkan AINS menggunakan peranti sendiri di rumah.",
  "MATLAMAT STRATEGIK",
  "PELAN TINDAKAN",
  "2027 2028 2029",
  "Memastikan 30% murid Tahun 6 mendapat sekurang-kurangnya 5 bintang",
  "Murid selalu terlupa email moe dan password peribadi",
]) uji(`ayat ditolak: ${bukan.slice(0, 34)}`, !kelihatanNama(bukan));

/* ------------------------------------------------------------------ pindaan */

/**
 * Pembetulan kekal. Ujian yang paling penting di sini ialah yang TIDAK
 * berlaku: Bilik i-Shabariah mesti kekal bernama begitu selepas Guru Besar
 * yang menamakannya bersara.
 */
const P = (x: Partial<Pindaan>): Pindaan => ({
  id: x.id ?? "p1", jenis: x.jenis ?? "ganti_nama", dari: x.dari ?? "",
  kepada: x.kepada ?? null, sebab: null, aktif: x.aktif ?? true,
  oleh: null, dicipta: "",
});

const gantiGb = [P({ dari: "SHABARIAH BINTI ISMAIL", kepada: "AZIZAH BINTI OTHMAN" })];

sama("Guru Besar lama digantikan dalam sel nama",
  kenakanPindaan(["", "PENGERUSI", "SHABARIAH BINTI ISMAIL"], gantiGb).sel,
  ["", "PENGERUSI", "AZIZAH BINTI OTHMAN"]);

uji("nama khas Bilik i-Shabariah TIDAK tersentuh",
  kenakanPindaan(["BILIK i-SHABARIAH", "PENYELARAS", "NORA BINTI REMALI"], gantiGb).kena.length === 0);

uji("frasa yang mengandungi nama tidak tersentuh",
  kenakanPindaan(["MAJLIS PERSARAAN (PN SHABARIAH BINTI ISMAIL)"], gantiGb).kena.length === 0);

uji("ejaan berbeza tetap dipadan melalui kunciNama",
  kenakanPindaan(["PENGERUSI", "PN. SHABARIAH BT ISMAIL"], gantiGb).sel[1] === "AZIZAH BINTI OTHMAN");

const buang = [P({ jenis: "buang_nama", dari: "SHABARIAH BINTI ISMAIL" })];
uji("orang yang sudah tiada menggugurkan barisnya",
  kenakanPindaan(["", "PENGERUSI", "SHABARIAH BINTI ISMAIL"], buang).gugur);
uji("buangan tidak menggugurkan baris orang lain",
  !kenakanPindaan(["", "AJK", "MARIA BINTI KAMARUDDIN"], buang).gugur);

const betulTeks = [P({ jenis: "ganti_teks", dari: "PROGRAM TRANSIS &ORIENTASI", kepada: "PROGRAM TRANSISI & ORIENTASI" })];
sama("jawatan tersalah eja dibetulkan walau tanda baca berbeza",
  kenakanPindaan(["", "PROGRAM TRANSIS & ORIENTASI", "ADHLINA NADHRAH BINTI YUZAINI"], betulTeks).sel,
  ["", "PROGRAM TRANSISI & ORIENTASI", "ADHLINA NADHRAH BINTI YUZAINI"]);

uji("pindaan yang dimatikan tidak berkuat kuasa",
  kenakanPindaan(["PENGERUSI", "SHABARIAH BINTI ISMAIL"],
    [P({ dari: "SHABARIAH BINTI ISMAIL", kepada: "AZIZAH BINTI OTHMAN", aktif: false })],
  ).kena.length === 0);

const banyak = kenakanPindaanBanyak([
  ["", "PENGERUSI", "SHABARIAH BINTI ISMAIL"],
  ["BILIK i-SHABARIAH", "PENYELARAS", "NORA BINTI REMALI"],
  ["", "AJK", "MARIA BINTI KAMARUDDIN"],
], gantiGb);
sama("kiraan pukal betul", [banyak.baris.length, banyak.diubah, banyak.digugur], [3, 1, 0]);

/* ---------------------------------------------------------- pewarisan */

/**
 * Pertukaran pentadbir dikenakan sendiri selepas nama ditukar di kad
 * Pentadbir — tiada butang. Ujian di sini menjaga dua pagar: ejaan yang
 * dikemaskan bukan pertukaran orang, dan jawatan baharu bukan pertukaran.
 */
const BARISAN = [
  { jawatan: "Guru Besar", nama: "SHABARIAH BINTI ISMAIL" },
  { jawatan: "Penolong Kanan Pentadbiran", nama: "ROSLE BIN MOHAMAD" },
  { jawatan: "Penolong Kanan Kokurikulum", nama: "KHIRYANI BINTI HAMDI" },
];

const tukarGb = kesanPewaris(BARISAN, [
  { jawatan: "Guru Besar", nama: "SAUDAH BINTI OSMAN" },
  ...BARISAN.slice(1),
]);
sama("satu pertukaran dikesan", tukarGb.length, 1);
sama("pertukaran Guru Besar",
  tukarGb[0], { jawatan: "Guru Besar", lama: "SHABARIAH BINTI ISMAIL", baharu: "SAUDAH BINTI OSMAN" });

uji("tiada perubahan menghasilkan tiada pindaan",
  kesanPewaris(BARISAN, BARISAN).length === 0);

// Ejaan yang dikemaskan ialah orang yang SAMA. kunciNama() menyeragamkan
// penanda nasab, jadi BT dan BINTI tidak mencipta pertukaran palsu.
uji("PN. ... BT ... dikemaskan BUKAN pertukaran",
  kesanPewaris(BARISAN, [
    { jawatan: "Guru Besar", nama: "PN. SHABARIAH BT ISMAIL" },
    ...BARISAN.slice(1),
  ]).length === 0);
uji("huruf kecil bukan pertukaran",
  kesanPewaris(BARISAN, [
    { jawatan: "Guru Besar", nama: "Shabariah binti Ismail" },
    ...BARISAN.slice(1),
  ]).length === 0);

uji("jawatan BAHARU bukan pertukaran",
  kesanPewaris(BARISAN, [
    ...BARISAN,
    { jawatan: "Penolong Kanan Petang", nama: "NAZRULLAH BIN MOHD NOOR" },
  ]).length === 0);

uji("nama kosong tidak mencipta pindaan",
  kesanPewaris(BARISAN, [
    { jawatan: "Guru Besar", nama: "" },
    ...BARISAN.slice(1),
  ]).length === 0);

sama("dua pertukaran serentak dikesan",
  kesanPewaris(BARISAN, [
    { jawatan: "Guru Besar", nama: "SAUDAH BINTI OSMAN" },
    { jawatan: "Penolong Kanan Pentadbiran", nama: "AMINAH BINTI YUSOF" },
    BARISAN[2],
  ]).length, 2);

uji("jawatan dipadan tanpa mengira huruf besar/kecil dan ruang",
  kesanPewaris(BARISAN, [
    { jawatan: "  guru besar  ", nama: "SAUDAH BINTI OSMAN" },
    ...BARISAN.slice(1),
  ]).length === 1);

// Pertukaran itu, dikenakan pada baris sebenar buku.
const pewarisan = kenakanPindaanBanyak([
  ["", "PENGERUSI", "SHABARIAH BINTI ISMAIL"],
  ["BILIK i-SHABARIAH", "PENYELARAS", "NORA BINTI REMALI"],
  ["", "AJK", "ROSLE BIN MOHAMAD"],
], tukarGb.map((w, i) => P({ id: `w${i}`, dari: w.lama, kepada: w.baharu })));
sama("hanya baris Guru Besar bertukar",
  pewarisan.baris, [
    ["", "PENGERUSI", "SAUDAH BINTI OSMAN"],
    ["BILIK i-SHABARIAH", "PENYELARAS", "NORA BINTI REMALI"],
    ["", "AJK", "ROSLE BIN MOHAMAD"],
  ]);


/* ============================== PADANAN EJAAN BUKU ====================== */
/*
 * Buku Pengurusan menulis orang yang SAMA dengan ejaan berbeza antara
 * senarai nama guru dan senarai jawatankuasa. Empat kes di bawah bukan
 * andaian — ia dibaca dari edisi 2026 sekolah ini, dan keempat-empatnya
 * menyebabkan guru yang ADA tugas jatuh ke dalam "Guru & Kakitangan Lain".
 */
sama("koma atas dibuang, bukan ditukar ruang",
  kunciNama("NOOR MASLIZA BINTI MAT SO'OD"), "NOOR MASLIZA BINTI MAT SOOD");
sama("koma atas lengkung juga",
  kunciNama("NOOR MASLIZA BINTI MAT SO\u2019OD"), "NOOR MASLIZA BINTI MAT SOOD");
uji("SO'OD padan dengan SOOD",
  bandingNama("NOOR MASLIZA BINTI MAT SO'OD", "NOOR MASLIZA BINTI MAT SOOD").skor === 100);
uji("HJ di tengah nama tidak menghalang padanan",
  bandingNama("NOOR RUWAIDA BINTI HJ MOHD ARIFIN", "NOOR RUWAIDA BINTI MOHD ARIFIN").cadang);
uji("satu perkataan tersalah eja masih dicadangkan",
  bandingNama("SHARIFAH NUR-AIN BINTI AID ALI", "SHARIFAH NUR-AIN BINTI SAID ALI").cadang);
uji("nama pendek dalam nama panjang dicadangkan",
  bandingNama("NOR HASFARADZI BIN HASHIM", "NOR HASFARADZI BIN HASHIM AMER HAMZAH").cadang);
// PAGARNYA MESTI KEKAL. Dua nama berbeza yang berkongsi "MOHD" sahaja tidak
// boleh menjadi orang yang sama.
uji("nama berbeza tidak dicadangkan",
  !bandingNama("MOHD ALI BIN OSMAN", "MOHD ZAKI BIN IBRAHIM").cadang);
uji("seri ditolak sebagai tidak pasti",
  cariPadanan("AHMAD BIN ALI", [{ n: "AHMAD BIN ALI" }, { n: "AHMAD BIN ALI" }], (x) => x.n) === null);

/* ============================== BUANG BARIS ============================= */
/*
 * Baris sampah (ayat pelan strategik yang terbaca sebagai orang, kepala
 * jadual yang menyelit) DICETAK SEMULA dalam edisi tahun depan. Memadamnya
 * di web membetulkan edisi ini sahaja; pindaan `buang_baris` menjadikannya
 * tidak berulang.
 */
const buangBaris = [P({
  jenis: "buang_baris",
  dari: "MATLAMAT STRATEGIK PELAN TINDAKAN KPI",
  kepada: null,
})];
uji("baris yang sepadan digugurkan",
  kenakanPindaan(["MATLAMAT STRATEGIK", "PELAN TINDAKAN", "KPI"], buangBaris).gugur);
// PEMECAHAN SEL BOLEH BERBEZA antara edisi; yang dibandingkan ialah baris
// yang digabung dan dinormalkan, bukan sel demi sel.
uji("pemecahan sel berbeza tetap dikenali",
  kenakanPindaan(["MATLAMAT STRATEGIK PELAN TINDAKAN", "KPI"], buangBaris).gugur);
// BARIS LAIN TIDAK BOLEH TERSENTUH. Padanan ialah SELURUH baris — bukan
// subrentetan, bukan satu sel.
uji("baris lain yang berkongsi satu sel kekal",
  !kenakanPindaan(["MATLAMAT STRATEGIK", "PENGERUSI", "AHMAD BIN ALI"], buangBaris).gugur);
uji("baris kosong tidak digugurkan",
  !kenakanPindaan(["", "", ""], buangBaris).gugur);
sama("kiraan digugur dilaporkan",
  kenakanPindaanBanyak(
    [["MATLAMAT STRATEGIK", "PELAN TINDAKAN", "KPI"], ["AJK", "AHMAD BIN ALI"]],
    buangBaris,
  ).digugur,
  1);
// GANTIAN DIKENAKAN DAHULU, kemudian buangan: baris yang dibuang kerana ia
// sampah tidak boleh terselamat hanya kerana satu nama di dalamnya bertukar.
const gantiDanBuang = [
  P({ id: "g", jenis: "ganti_nama", dari: "SHABARIAH BINTI ISMAIL", kepada: "AZIZAH BINTI OTHMAN" }),
  P({ id: "b", jenis: "buang_baris", dari: "PENGERUSI AZIZAH BINTI OTHMAN", kepada: null }),
];
uji("buangan dinilai selepas gantian",
  kenakanPindaan(["PENGERUSI", "SHABARIAH BINTI ISMAIL"], gantiDanBuang).gugur);

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
