/**
 * Ujian logik penghuraian jadual. Jalankan:
 *   node --experimental-strip-types scripts/uji-huraian.mts
 *
 * Tiada Supabase, tiada Clerk, tiada fail sebenar — hanya logik tulen.
 */
import { padanSubjek, binaDraf, binaDrafDariGrid, namaGuruDariSel } from "../src/lib/jadual-huraian.ts";

let lulus = 0, gagal = 0;
const semak = (nama: string, dapat: unknown, jangka: unknown) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(jangka);
  console.log(`${ok ? "  OK  " : " GAGAL"} ${nama}${ok ? "" : ` → dapat ${JSON.stringify(dapat)}, jangka ${JSON.stringify(jangka)}`}`);
  ok ? lulus++ : gagal++;
};

console.log("— padanan subjek —");
semak("Bahasa Melayu", padanSubjek("Bahasa Melayu"), "BM");
semak("B. Melayu", padanSubjek("B. Melayu"), "BM");
semak("MATEMATIK", padanSubjek("MATEMATIK"), "MM");
semak("Pend. Islam", padanSubjek("Pendidikan Islam"), "PAI");
semak("PJPK", padanSubjek("PJPK"), "PJPK");
semak("teks kosong", padanSubjek("   "), null);
semak("bukan subjek", padanSubjek("Bilik 4A"), null);
// Padanan TERPANJANG mesti menang: "bahasa melayu" mengalahkan "bm"
semak("panjang menang", padanSubjek("BM - Bahasa Melayu"), "BM");
semak("Sains", padanSubjek("SAINS"), "SAINS");

console.log("\n— bina draf dari teks jadual —");
const teks = `
JADUAL WAKTU KELAS 4 NILAM  SESI PAGI
ISNIN    Bahasa Melayu | Bahasa Melayu | Matematik | Sains | Pendidikan Islam
SELASA   Matematik | Bahasa Inggeris | Bahasa Melayu | Pendidikan Islam | Sains
RABU     Perhimpunan | Bahasa Melayu | Bahasa Inggeris | Matematik | Sains
KHAMIS   Bahasa Inggeris | Matematik | Pendidikan Islam | Bahasa Melayu | Muzik
JUMAAT   Pendidikan Islam | Bahasa Melayu | Matematik | Bahasa Inggeris | Sains
`;
const { draf, dikenal, jumlah } = binaDraf(teks, "pagi");
console.log(`  dikenal: ${dikenal} / ${jumlah}`);
semak("5 hari dijumpai", Object.keys(draf.hari).sort(), ["isnin", "jumaat", "khamis", "rabu", "selasa"]);
semak("Isnin slot pertama", Object.values(draf.hari.isnin ?? {})[0], { subjek: "BM" });
semak("Rabu bermula Perhimpunan", Object.values(draf.hari.rabu ?? {})[0], { subjek: "PERHIMPUNAN" });
semak("Khamis ada PMZ", Object.values(draf.hari.khamis ?? {}).some((s) => s.subjek === "PMZ"), true);
semak("dikenal = 25", dikenal, 25);

console.log("\n— teks tanpa hari —");
const kosong = binaDraf("Tiada apa-apa di sini", "pagi");
semak("tiada hari → tiada slot", Object.keys(kosong.draf.hari).length, 0);

console.log("\n— nama guru dalam sel —");
semak("gelaran PN.", namaGuruDariSel("BAHASA MELAYU\nPN. SITI BINTI OMAR", "BM"), "PN. SITI BINTI OMAR");
semak("gelaran EN dalam kurungan", namaGuruDariSel("MATEMATIK (EN AHMAD BIN ALI)", "MM"), "EN AHMAD BIN ALI");
semak("USTAZ", namaGuruDariSel("PAI / USTAZ HAMZAH", "PAI"), "USTAZ HAMZAH");
semak("tiada nama", namaGuruDariSel("BAHASA MELAYU", "BM"), null);
semak("bilik bukan nama", namaGuruDariSel("SAINS BILIK 4A", "SAINS"), null);
semak("nama tanpa gelaran", namaGuruDariSel("SAINS - Rosnah Abdullah", "SAINS"), "Rosnah Abdullah");

console.log("\n— draf dari GRID (hari melintang) —");
const kepala = ["WAKTU", "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"];
const gridMelintang = [[
  kepala,
  ["7:30", "BAHASA MELAYU PN. SITI", "MATEMATIK EN. AHMAD", "PERHIMPUNAN", "BAHASA INGGERIS CIK LIM", "PENDIDIKAN ISLAM USTAZ HAMZAH"],
  ["8:00", "BAHASA MELAYU PN. SITI", "BAHASA INGGERIS CIK LIM", "BAHASA MELAYU PN. SITI", "MATEMATIK EN. AHMAD", "BAHASA MELAYU PN. SITI"],
  ["9:30", "REHAT", "REHAT", "REHAT", "REHAT", "REHAT"],
  ["10:00", "SAINS", "SAINS", "SAINS", "SAINS", "SAINS"],
]];
const g = binaDrafDariGrid(gridMelintang, "pagi");
semak("grid dibaca", g !== null, true);
semak("Isnin slot 1 = BM", Object.values(g!.draf.hari.isnin ?? {})[0], { subjek: "BM" });
semak("Rabu slot 1 = Perhimpunan", Object.values(g!.draf.hari.rabu ?? {})[0], { subjek: "PERHIMPUNAN" });
// Baris REHAT tidak boleh menggunakan slot — kalau ia guna, SAINS akan jatuh
// pada waktu keempat dan bukan ketiga.
semak("REHAT tidak makan slot", Object.keys(g!.draf.hari.isnin ?? {}).length, 3);
semak("guru BM dikesan", g!.draf.guruSubjek?.BM, "PN. SITI");
semak("guru PAI dikesan", g!.draf.guruSubjek?.PAI, "USTAZ HAMZAH");
semak("SAINS tiada guru", g!.draf.guruSubjek?.SAINS, undefined);

console.log("\n— draf dari GRID (hari MENEGAK) —");
const gridMenegak = [[
  ["HARI", "W1", "W2"],
  ["ISNIN", "BAHASA MELAYU PN. SITI", "MATEMATIK"],
  ["SELASA", "SAINS", "BAHASA INGGERIS"],
  ["RABU", "PENDIDIKAN ISLAM", "BAHASA MELAYU"],
]];
const gv = binaDrafDariGrid(gridMenegak, "pagi");
semak("orientasi menegak dibaca", gv !== null, true);
semak("Isnin slot 1 = BM (menegak)", Object.values(gv!.draf.hari.isnin ?? {})[0], { subjek: "BM" });

console.log("\n— grid tanpa hari —");
semak("tiada hari → null", binaDrafDariGrid([[["a", "b"], ["c", "d"]]], "pagi"), null);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
