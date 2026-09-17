/**
 * Ujian pengecaman nama dan No. KP daripada senarai yang ditampal.
 *
 * Setiap bentuk di bawah ialah cara senarai murid BENAR-BENAR sampai:
 * disalin dari WhatsApp, dari Word, dari skrin eOperasi — dan tiada dua
 * daripadanya menulis No. KP dengan cara yang sama.
 */
import { pilihBacaan } from "../src/data/pilih-bacaan.ts";
import { bacaBarisMurid, bacaSenaraiMurid, jantinaDariKp } from "../src/lib/kenal-murid.ts";

let lulus = 0;
const gagal: string[] = [];
const semak = (n: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(b)) { lulus++; console.log("  OK  ", n); }
  else { gagal.push(n); console.log(" GAGAL", n, "→", JSON.stringify(a), "vs", JSON.stringify(b)); }
};

console.log("— jantina dari digit terakhir —");
semak("ganjil = lelaki", jantinaDariKp("060101101233"), "L");
semak("genap = perempuan", jantinaDariKp("060101101234"), "P");
semak("sifar = perempuan", jantinaDariKp("060101101230"), "P");
semak("bukan 12 digit = tiada", jantinaDariKp("06010110123"), null);

console.log("\n— bentuk baris yang berbeza —");
const bentuk: [string, string, string][] = [
  ["nama dahulu, KP tanpa sempang", "AHMAD BIN ALI 060101101233", "AHMAD BIN ALI"],
  ["KP bersempang", "NUR AISYAH BINTI OMAR 070202-10-5678", "NUR AISYAH BINTI OMAR"],
  ["KP dahulu", "051212105566 MUHAMMAD DANIAL BIN ZAKARIA", "MUHAMMAD DANIAL BIN ZAKARIA"],
  ["dipisah koma", "SITI SARAH BINTI HASSAN, 080303-10-7788", "SITI SARAH BINTI HASSAN"],
  ["bernombor", "12. NURUL HUDA BINTI OMAR 090404107799", "NURUL HUDA BINTI OMAR"],
  ["pemisah ruang", "LEE WEI MING 100505 10 8811", "LEE WEI MING"],
  ["pemisah titik", "RAJESH A/L KUMAR 110606.10.9922", "RAJESH A/L KUMAR"],
];
for (const [label, baris, jangka] of bentuk) {
  semak(label, bacaBarisMurid(baris)?.nama, jangka);
}
semak("sempang dibuang dari No. KP",
  bacaBarisMurid("NUR AISYAH BINTI OMAR 070202-10-5678")?.no_kp, "070202105678");
semak("jantina dikesan", bacaBarisMurid("NUR AISYAH BINTI OMAR 070202-10-5678")?.jantina, "P");
semak("tarikh lahir dikira", bacaBarisMurid("NUR AISYAH BINTI OMAR 070202-10-5678")?.lahir, "2007-02-02");

console.log("\n— senarai penuh —");
const hasil = bacaSenaraiMurid(`
Bil Nama No KP
1. AHMAD BIN ALI 060101101233
2. NUR AISYAH BINTI OMAR, 070202-10-5678
3. MUHAMMAD DANIAL BIN ZAKARIA 051212105566

SITI SARAH BINTI HASSAN  .  080303 10 7788
`);
semak("empat murid dibaca", hasil.murid.length, 4);
semak("baris kepala dilangkau", hasil.murid.some((m) => m.nama.startsWith("BIL")), false);
semak("tiada baris ditolak", hasil.ditolak.length, 0);
semak("semua ada No. KP", hasil.murid.every((m) => m.no_kp !== null), true);

console.log("\n— kes bermasalah —");
semak("No. KP berulang dikesan",
  bacaSenaraiMurid("A BIN B 060101101233\nC BIN D 060101101233").berulang.length, 1);
semak("tiada No. KP diberi amaran",
  bacaBarisMurid("AHMAD BIN ALI")?.amaran.some((a) => a.includes("Tiada No. KP")), true);
semak("umur luar julat diberi amaran",
  bacaBarisMurid("CIKGU AHMAD 850101101233")?.amaran.some((a) => a.includes("julat murid")), true);
/* Dua murid tercantum dalam satu baris — berlaku bila disalin dari WhatsApp. */
const cantum = bacaSenaraiMurid("AHMAD BIN ALI 060101101233 NUR AISYAH BINTI OMAR 070202105678");
semak("baris bercantum dipecah", cantum.murid.length, 2);


/* ------------------------------------------------- memilih bacaan terbaik */

/**
 * Fail iDMe jarang lurus. Dalam projek eGPI dahulu kami berkali-kali
 * tersalah baca fail itu, dan puncanya sentiasa sama: kod meneka satu
 * orientasi, teruskan dengannya, dan hasilnya sampah yang kelihatan seperti
 * data. Ujian di sini menjaga penyelesaiannya — BERHENTI meneka, ukur.
 */
const BETUL = [
  "1 AHMAD BIN ALI 060101101233",
  "2 NUR AISYAH BINTI OMAR 070202105678",
  "3 MUHAMMAD DANIAL BIN ZAKARIA 051212105566",
].join("\n");

/* Bacaan yang salah orientasi: nama dan No. KP berakhir dalam lajur
   berlainan, jadi tiada baris membawa kedua-duanya. */
const SALAH = [
  "1 2 3",
  "AHMAD BIN ALI NUR AISYAH BINTI OMAR MUHAMMAD DANIAL BIN ZAKARIA",
].join("\n");

const pilih = pilihBacaan([
  { cara: "lajur menegak", teks: SALAH },
  { cara: "sel mengikut baris", teks: BETUL },
]);
semak("bacaan yang menghasilkan No. KP dipilih", pilih?.cara, "sel mengikut baris");
semak("skornya tiga", pilih?.skor, 3);
semak("kedua-dua calon dilaporkan", pilih?.semua.length, 2);
semak("calon yang salah berskor sifar",
  pilih?.semua.find((c) => c.cara === "lajur menegak")?.skor, 0);

semak("teks kosong diabaikan",
  pilihBacaan([{ cara: "kosong", teks: "   " }, { cara: "betul", teks: BETUL }])?.cara, "betul");
semak("tiada calon langsung memulangkan null", pilihBacaan([]), null);
semak("semua calon kosong memulangkan null",
  pilihBacaan([{ cara: "a", teks: "" }, { cara: "b", teks: "  " }]), null);

/* Seri dipecahkan oleh urutan — calon pertama menang, dan urutan calon
   disusun dari yang paling biasa kepada yang paling jarang. */
semak("seri dimenangi calon pertama",
  pilihBacaan([{ cara: "pertama", teks: BETUL }, { cara: "kedua", teks: BETUL }])?.cara, "pertama");

/* Skor mengira No. KP SAH, bukan bilangan baris. Bacaan salah orientasi
   menghasilkan banyak baris teks — ia cuma tidak menghasilkan No. KP. */
const banyakBaris = Array.from({ length: 40 }, (_, i) => `BARIS SAMPAH NOMBOR ${i}`).join("\n");
semak("banyak baris tanpa No. KP tidak menang",
  pilihBacaan([{ cara: "sampah", teks: banyakBaris }, { cara: "betul", teks: BETUL }])?.cara, "betul");

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length === 0 ? 0 : 1);