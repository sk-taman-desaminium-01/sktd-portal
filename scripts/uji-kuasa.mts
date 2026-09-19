/**
 * Kontrak kuasa pengurusan.
 *
 * Kegagalan dahulu: senarai keupayaan Admin dan Pentadbir disalin berasingan,
 * lalu modul baru tertinggal daripada salah satu peranan. Ujian ini mengunci
 * dasar bahawa kedua-duanya mendapat semua kuasa operasi, manakala kuasa
 * mengurus akaun admin kekal khusus Admin Mutlak.
 */
import { boleh, type Keupayaan, type PerananBerkesan } from "../src/lib/peranan.ts";

const SEMUA: Keupayaan[] = [
  "urus_akses", "terbit_kandungan", "lihat_data_murid", "lihat_diagnostik",
  "urus_portal", "urus_admin", "urus_guru_kelas", "urus_pengurusan",
  "urus_bilik", "urus_pejabat", "urus_disiplin",
];

const gagal: string[] = [];
function jangka(peranan: PerananBerkesan, kuasa: Keupayaan, mahu: boolean) {
  if (boleh(peranan, kuasa) !== mahu) gagal.push(`${peranan}: ${kuasa} sepatutnya ${mahu ? "dibenarkan" : "ditolak"}`);
}

for (const kuasa of SEMUA) {
  jangka("admin_mutlak", kuasa, true);
  jangka("admin", kuasa, kuasa !== "urus_admin");
  jangka("pentadbir", kuasa, kuasa !== "urus_admin");
}

if (gagal.length) {
  console.error(gagal.join("\n"));
  process.exit(1);
}
console.log("Kontrak kuasa: 33 semakan lulus.");
