/**
 * Ujian padanan nama antara Buku Pengurusan dan akaun KPM.
 *
 * Setiap kes di bawah ialah bentuk yang BENAR-BENAR muncul, bukan rekaan:
 * awalan "KPM-Guru" dari akaun Google KPM, catatan "(AKP)" dalam buku, nama
 * yang disingkatkan dalam satu sumber tetapi penuh dalam sumber lain.
 */
import { namaBersih, kunciNama, bandingNama, cariPadanan } from "../src/lib/nama.ts";

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

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
