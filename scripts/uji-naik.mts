/**
 * Ujian naik tahun — SESI PERCUBAAN tanpa pangkalan data.
 *
 * Pengguna meminta percubaan sebelum 1 Januari 2027. Ini percubaannya:
 * seluruh keputusan naik tahun dijalankan atas sekolah rekaan yang berbentuk
 * sama seperti SKTD — enam tahun, kelas bernama sifat, murid Tahun 6 yang
 * tamat — dan disemak baris demi baris.
 */
import { rancangNaik, gerakKelas, type Pendaftaran } from "../src/data/naik-tahun.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

/* Sekolah percubaan: 6 tahun × 2 kelas × 3 murid. */
const KELAS = ["DEDIKASI", "USAHA"];
const sekolah: Pendaftaran[] = [];
for (let tahun = 1; tahun <= 6; tahun++) {
  for (const kelas of KELAS) {
    for (let n = 1; n <= 3; n++) {
      sekolah.push({ murid_id: `m-${tahun}${kelas[0]}${n}`, tahun, kelas, aliran: "" });
    }
  }
}
uji("sekolah percubaan 36 murid", sekolah.length === 36);

const r = rancangNaik(sekolah, 2026, 2027);

sama("30 naik, 6 tamat", [r.naik.length, r.tamat.length], [30, 6]);
uji("tiada yang ditolak", r.ditolak.length === 0);
uji("Tahun 6 tidak dinaikkan", !r.naik.some((x) => x.dari === 6));
uji("tiada murid menjadi Tahun 7", !r.naik.some((x) => x.ke > 6));
sama("taburan selepas naik ialah Tahun 2–6, 6 orang setiap satu",
  r.taburan, [2, 3, 4, 5, 6].map((tahun) => ({ tahun, bil: 6 })));
uji("Tahun 1 kosong dan dikatakan",
  r.taburan.every((t) => t.tahun !== 1) &&
  r.amaran.some((a) => a.includes("Tahun 1 kekal kosong")));
uji("kelas kekal namanya", r.naik.every((x) => KELAS.includes(x.kelas)));
sama("10 pergerakan kelas (5 tahun × 2 kelas)", gerakKelas(r).length, 10);
uji("setiap pergerakan 3 murid", gerakKelas(r).every((g) => g.bil === 3));

/* Tekan dua kali: kali kedua mesti tidak melakukan apa-apa. */
const kedua = rancangNaik(sekolah, 2026, 2027, r.naik.map((x) => x.murid_id));
sama("larian kedua tidak menaikkan sesiapa", kedua.naik.length, 0);
uji("larian kedua mengatakan mereka dilangkau",
  kedua.sudahAda.length === 30 &&
  kedua.amaran.some((a) => a.includes("DILANGKAU")));
uji("Tahun 6 tetap dikira tamat pada larian kedua", kedua.tamat.length === 6);

/* Data rosak: setiap satu ditolak dengan sebab, bukan menggagalkan larian. */
const rosak = rancangNaik([
  { murid_id: "a", tahun: 3, kelas: "DEDIKASI", aliran: "" },
  { murid_id: "b", tahun: 3, kelas: "", aliran: "" },
  { murid_id: "c", tahun: 0, kelas: "DEDIKASI", aliran: "" },
  { murid_id: "d", tahun: 7, kelas: "DEDIKASI", aliran: "" },
  { murid_id: "a", tahun: 4, kelas: "USAHA", aliran: "" },
], 2026, 2027);
sama("hanya satu murid sah dinaikkan", rosak.naik.length, 1);
sama("empat baris ditolak", rosak.ditolak.length, 4);
uji("tiada kelas dilaporkan", rosak.ditolak.some((x) => x.sebab.includes("Tiada kelas")));
uji("tahun luar julat dilaporkan", rosak.ditolak.filter((x) => x.sebab.includes("bukan 1–6")).length === 2);
uji("pendua dilaporkan", rosak.ditolak.some((x) => x.sebab.includes("lebih sekali")));
uji("murid sah tetap diproses walaupun ada baris rosak",
  rosak.naik[0]?.murid_id === "a" && rosak.naik[0]?.ke === 4);

/* Sesi songsang dan sesi melangkau. */
uji("sesi songsang diberi amaran",
  rancangNaik(sekolah, 2027, 2026).amaran.some((a) => a.includes("mesti lebih lewat")));
uji("melangkau sesi diberi amaran",
  rancangNaik(sekolah, 2026, 2028).amaran.some((a) => a.includes("Melangkau")));
uji("melangkau sesi tetap naik SATU tahun sahaja",
  rancangNaik(sekolah, 2026, 2028).naik.every((x) => x.ke === x.dari + 1));

/* Sekolah kosong. */
const kosong = rancangNaik([], 2026, 2027);
uji("sekolah kosong tidak menghempas",
  kosong.naik.length === 0 && kosong.amaran.some((a) => a.includes("Tiada murid")));

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
