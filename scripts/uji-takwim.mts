/**
 * Ujian penormalan takwim.
 *
 * Bentuk data di sini disalin dari muka SEBENAR Buku Pengurusan — termasuk
 * nombor minggu yang hanya ditulis sekali setiap minggu, dan tarikh yang
 * bercantum dengan nama hari dalam satu sel.
 */
import { pisahTarikhHari, leraiTakwim, ikutBulan } from "../src/lib/takwim.ts";

let lulus = 0;
const gagal: string[] = [];
const semak = (n: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) === JSON.stringify(b)) { lulus++; console.log("  OK  ", n); }
  else { gagal.push(n); console.log(" GAGAL", n, "→", JSON.stringify(a), "vs", JSON.stringify(b)); }
};

console.log("— pisah tarikh dan hari —");
semak("bentuk buku 1-Jan-25 RABU", pisahTarikhHari("1-Jan-25 RABU"),
  { tarikh: "2025-01-01", tarikhTeks: "1-Jan-25", hari: "RABU" });
semak("hari di hadapan", pisahTarikhHari("AHAD 9-Feb-25"),
  { tarikh: "2025-02-09", tarikhTeks: "9-Feb-25", hari: "AHAD" });
semak("tahun dua digit menjadi 2000-an", pisahTarikhHari("5-Mac-26 ISNIN").tarikh, "2026-03-05");
semak("bulan Melayu OGOS", pisahTarikhHari("1-Ogo-25 JUMAAT").tarikh, "2025-08-01");
semak("sel kosong", pisahTarikhHari(""), { tarikh: null, tarikhTeks: "", hari: "" });
semak("tarikh tidak difahami dikekalkan sebagai teks",
  pisahTarikhHari("MINGGU CUTI").tarikhTeks, "MINGGU CUTI");

console.log("\n— lerai baris takwim —");
const lajur = ["MINGGU", "TARIKH HARI", "PENGURUSAN PENTADBIRAN", "PENGURUSAN KURIKULUM", "PENGURUSAN HAL EHWAL MURID"];
const baris = [
  ["PERTAMA", "1-Jan-25 RABU", "CUTI TAHUN BARU", "", ""],
  ["", "9-Jan-25 KHAMIS", "MESYUARAT KEWANGAN BIL. 1", "", ""],
  ["KEDUA", "13-Jan-25 ISNIN", "", "MESYUARAT JADUAL WAKTU BIL. 1", "GOTONG-ROYONG PERDANA"],
];
const acara = leraiTakwim(lajur, baris);

semak("bilangan acara", acara.length, 4);
semak("minggu diwarisi menurun", acara[1].minggu, "PERTAMA");
semak("tarikh disusun menaik", acara.map((a) => a.tarikh),
  ["2025-01-01", "2025-01-09", "2025-01-13", "2025-01-13"]);
semak("hari diasingkan", acara[0].hari, "RABU");
semak("nama unit dibersihkan", acara[2].unit, "Kurikulum");
semak("satu baris boleh beri dua acara",
  acara.filter((a) => a.tarikh === "2025-01-13").map((a) => a.unit),
  ["Kurikulum", "Hal Ehwal Murid"]);

// Sel tarikh TIDAK boleh muncul semula sebagai program — itu yang
// menjadikan paparan lama kelihatan berselerak.
semak("tarikh tidak menjadi program",
  acara.some((a) => a.program.includes("Jan-25")), false);

console.log("\n— kumpul ikut bulan —");
const bulan = ikutBulan(acara);
semak("satu bulan", bulan.length, 1);
semak("nama bulan", bulan[0].bulan, "Januari 2025");

console.log("\n— sel bergabung merentas banyak tarikh —");
/* Program bertempoh dicetak dalam SATU sel yang menduduki beberapa baris
   tarikh. Memecahkannya pada setiap tarikh menghasilkan dua serpihan yang
   kedua-duanya tidak bermakna — dilaporkan pengguna pada edisi 2026. */
const bergabung = leraiTakwim(
  ["MINGGU", "TARIKH", "HARI", "PENGURUSAN KURIKULUM"],
  [
    ["KEDUA", "12-Jan-26", "ISNIN", "FORMATIF 1 (12.1.2026 -"],
    ["", "13-Jan-26", "SELASA", "30.3.2026) & MESYUARAT"],
    ["", "14-Jan-26", "RABU", "PANITIA BIL 1"],
    // Sel KOSONG menamatkan blok bergabung — itulah cara buku memisahkan
    // program bertempoh daripada program seterusnya.
    ["", "15-Jan-26", "KHAMIS", ""],
    ["KETIGA", "19-Jan-26", "ISNIN", "GOTONG-ROYONG"],
  ],
);
semak("sel bergabung kekal satu acara", bergabung.length, 2);
semak("teks penuh disambung", bergabung[0].program,
  "FORMATIF 1 (12.1.2026 - 30.3.2026) & MESYUARAT PANITIA BIL 1");
semak("acara berasingan tidak tercantum", bergabung[1].program, "GOTONG-ROYONG");


console.log("\n— serpihan yang bercantum semula —");

/* Bentuk SEBENAR dari buku 2026, muka September. Blok teks DUA baris
   mengapit baris tarikh: satu di atas, satu di bawah. Blok SATU baris duduk
   tepat pada baris tarikh. Mengelirukan kedua-duanya ialah puncanya
   "KHAS BIL 3" muncul pada hari Khamis sebagai acara tanpa makna. */
const sep = leraiTakwim([], [
  ["", "", "", "MESYUARAT PENDEKATAN"],
  ["", "14-Sep-26", "ISNIN", ""],
  ["", "", "", "BERTEMA BIL 3"],
  ["", "15-Sep-26", "SELASA", ""],
  ["3", "16-Sep-26", "RABU", "CUTI SEMPENA HARI MALAYSIA"],
  ["", "", "", "MESYUARAT PEMULIHAN"],
  ["", "17-Sep-26", "KHAMIS", ""],
  ["", "", "", "KHAS BIL 3"],
]);

semak("dua baris yang mengapit tarikh menjadi satu acara",
  sep.find((a) => a.tarikh === "2026-09-14")?.program,
  "MESYUARAT PENDEKATAN BERTEMA BIL 3");
semak("teks pada baris tarikh berdiri sendiri",
  sep.find((a) => a.tarikh === "2026-09-16")?.program,
  "CUTI SEMPENA HARI MALAYSIA");
semak("serpihan tidak terlepas ke hari yang salah",
  sep.find((a) => a.tarikh === "2026-09-17")?.program,
  "MESYUARAT PEMULIHAN KHAS BIL 3");
semak("tiga acara, bukan empat", sep.length, 3);
semak("tiada acara bermula dengan KHAS",
  sep.some((a) => /^KHAS\b/.test(a.program)), false);

/* Nombor muka surat. Buku mencetaknya di kaki setiap muka dan grid
   menangkapnya seperti sel biasa — pengguna melihat "144" dan "149" sebagai
   acara, dan bertanya dengan betul "benda apa ni". */
const noMuka = leraiTakwim([], [
  ["", "10-Apr-26", "JUMAAT", "LATIHAN SUKAN"],
  ["", "", "", "143"],
  ["", "13-Apr-26", "ISNIN", "PERHIMPUNAN"],
  ["", "14-Apr-26", "SELASA", "GOTONG-ROYONG"],
  ["", "15-Apr-26", "RABU", ""],
]);
semak("nombor muka surat tidak menjadi acara", noMuka.length, 3);
semak("tiada acara bernama nombor sahaja",
  noMuka.some((a) => /^\d+$/.test(a.program)), false);

/* Nombor yang MENYAMBUNG sesuatu dikekalkan — "BIL" menuntut nombornya. */
const bilNombor = leraiTakwim([], [
  ["", "", "", "MESYUARAT KURIKULUM BIL"],
  ["", "5-Mei-26", "SELASA", ""],
  ["", "", "", "2"],
  ["", "6-Mei-26", "RABU", ""],
  ["", "7-Mei-26", "KHAMIS", ""],
]);
semak("nombor selepas BIL dikekalkan",
  bilNombor[0]?.program, "MESYUARAT KURIKULUM BIL 2");

/* Kurungan tutup tanpa pembuka ialah ekor baris sebelumnya. */
const kurung = leraiTakwim([], [
  ["", "", "", "CUTI PENGGAL 1 (28.3.2026 -"],
  ["", "29-Mac-26", "AHAD", ""],
  ["", "", "", "03.4.2026)"],
  ["", "30-Mac-26", "ISNIN", ""],
  ["", "31-Mac-26", "SELASA", ""],
]);
semak("ekor berkurungan disambung semula",
  kurung[0]?.program, "CUTI PENGGAL 1 (28.3.2026 - 03.4.2026)");

/* Sel bergabung TIDAK kekal bergabung selama-lamanya: acara yang berulang
   pada hari berturut-turut mesti kekal berasingan. */
const ulang = leraiTakwim([], [
  ["", "", "", "PERJUMPAAN SUKAN &"],
  ["", "8-Apr-26", "RABU", "PERMAINAN (5) & LATIHAN"],
  ["", "", "", "SUKAN)"],
  ["", "9-Apr-26", "KHAMIS", "LATIHAN SUKAN"],
  ["", "10-Apr-26", "JUMAAT", "LATIHAN SUKAN"],
]);
semak("acara berulang tidak ditelan sel bergabung", ulang.length, 3);
semak("9 April kekal sendiri",
  ulang.find((a) => a.tarikh === "2026-04-09")?.program, "LATIHAN SUKAN");

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length === 0 ? 0 : 1);
