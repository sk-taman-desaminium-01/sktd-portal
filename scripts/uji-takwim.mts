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

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length === 0 ? 0 : 1);
