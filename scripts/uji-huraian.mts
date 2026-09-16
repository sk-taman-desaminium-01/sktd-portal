/**
 * Ujian logik penghuraian jadual. Jalankan:
 *   node --experimental-strip-types scripts/uji-huraian.mts
 *
 * Tiada Supabase, tiada Clerk, tiada fail sebenar — hanya logik tulen.
 */
import { padanSubjek, binaDraf, binaDrafDariGrid, binaDrafDariKedudukan, namaGuruDariSel, padanHari } from "../src/lib/jadual-huraian.ts";
import { SET_LALAI } from "../src/data/jadual-jenis.ts";

/** Waktu sebenar sekolah — sesi pagi, rehat pada waktu 5 (R4). */
const WAKTU = SET_LALAI.find((s) => s.id === "pagi-r4")!.senarai;

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
const { draf, dikenal, jumlah } = binaDraf(teks, WAKTU);
console.log(`  dikenal: ${dikenal} / ${jumlah}`);
semak("5 hari dijumpai", Object.keys(draf.hari).sort(), ["isnin", "jumaat", "khamis", "rabu", "selasa"]);
semak("Isnin slot pertama", Object.values(draf.hari.isnin ?? {})[0], { subjek: "BM" });
semak("Rabu bermula Perhimpunan", Object.values(draf.hari.rabu ?? {})[0], { subjek: "PERHIMPUNAN" });
semak("Khamis ada PMZ", Object.values(draf.hari.khamis ?? {}).some((s) => s.subjek === "PMZ"), true);
semak("dikenal = 25", dikenal, 25);

console.log("\n— teks tanpa hari —");
const kosong = binaDraf("Tiada apa-apa di sini", WAKTU);
semak("tiada hari → tiada slot", Object.keys(kosong.draf.hari).length, 0);

console.log("\n— nama guru dalam sel —");
semak("gelaran PN.", namaGuruDariSel("BAHASA MELAYU\nPN. SITI BINTI OMAR", "BM"), "PN. SITI BINTI OMAR");
semak("gelaran EN dalam kurungan", namaGuruDariSel("MATEMATIK (EN AHMAD BIN ALI)", "MM"), "EN AHMAD BIN ALI");
semak("USTAZ", namaGuruDariSel("PAI / USTAZ HAMZAH", "PAI"), "USTAZ HAMZAH");
semak("tiada nama", namaGuruDariSel("BAHASA MELAYU", "BM"), null);
semak("bilik bukan nama", namaGuruDariSel("SAINS BILIK 4A", "SAINS"), null);
semak("nama tanpa gelaran", namaGuruDariSel("SAINS - Rosnah Abdullah", "SAINS"), "Rosnah Abdullah");

semak("nama satu perkataan", namaGuruDariSel("BM\nWAN", "BM"), "WAN");
semak("kod kelas bukan nama", namaGuruDariSel("PER\n6 INT", "PERHIMPUNAN"), null);
semak("kod bilik pendek", namaGuruDariSel("SN M2", "SAINS"), null);
semak("kod sekolah MT", padanSubjek("MT"), "MM");
semak("kod sekolah SN", padanSubjek("SN"), "SAINS");
semak("kod sekolah PJ", padanSubjek("PJ"), "PJPK");
semak("kod sekolah BA", padanSubjek("BA"), "AR");
semak("P.ISLAM (Q)", padanSubjek("P.ISLAM (Q)"), "PAI");
semak("TASMIK", padanSubjek("TASMIK"), "TASMIK");

console.log("\n— draf dari GRID (hari melintang) —");
const kepala = ["WAKTU", "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"];
const gridMelintang = [[
  kepala,
  ["7:30", "BAHASA MELAYU PN. SITI", "MATEMATIK EN. AHMAD", "PERHIMPUNAN", "BAHASA INGGERIS CIK LIM", "PENDIDIKAN ISLAM USTAZ HAMZAH"],
  ["8:00", "BAHASA MELAYU PN. SITI", "BAHASA INGGERIS CIK LIM", "BAHASA MELAYU PN. SITI", "MATEMATIK EN. AHMAD", "BAHASA MELAYU PN. SITI"],
  ["9:30", "REHAT", "REHAT", "REHAT", "REHAT", "REHAT"],
  ["10:00", "SAINS", "SAINS", "SAINS", "SAINS", "SAINS"],
]];
const g = binaDrafDariGrid(gridMelintang, WAKTU);
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
const gv = binaDrafDariGrid(gridMenegak, WAKTU);
semak("orientasi menegak dibaca", gv !== null, true);
semak("Isnin slot 1 = BM (menegak)", Object.values(gv!.draf.hari.isnin ?? {})[0], { subjek: "BM" });

console.log("\n— grid tanpa hari —");
semak("tiada hari → null", binaDrafDariGrid([[["a", "b"], ["c", "d"]]], WAKTU), null);

console.log("\n— hari dwibahasa & bentuk pendek —");
semak("ISNIN", padanHari("ISNIN"), "isnin");
semak("Mo", padanHari("Mo"), "isnin");
semak("Monday", padanHari("Monday"), "isnin");
semak("Tu", padanHari("Tu"), "selasa");
semak("Fr", padanHari("Fr"), "jumaat");
semak("bukan hari", padanHari("Matematik"), null);

console.log("\n— koordinat PDF: sel tunggal vs BERGABUNG —");
/* Geometri disalin dari jadual aSc SEBENAR sekolah (2 MAJU):
   lajur masa pada x = 104, 177, 251, ... dengan lebar label 54, jadi pusat
   lajur = x + 27 dan jarak antara pusat = 73.7.
     · sel tunggal   → pusat teks TEPAT pada pusat lajur
     · sel bergabung → pusat teks TEPAT pada titik tengah dua pusat lajur   */
const LAJUR = [104, 177, 251, 325, 398, 472, 546, 619, 693, 766];
const masa = ["01:00 - 01:30","01:30 - 02:00","02:00 - 02:30","02:30 - 03:00","03:00 - 03:30",
              "03:30 - 03:50","03:50 - 04:20","04:20 - 04:50","04:50 - 05:20","05:20 - 05:50"];
const pusat = (i: number) => LAJUR[i] + 27;
const item: { str: string; x: number; y: number; w: number }[] = [
  ...LAJUR.map((x, i) => ({ str: masa[i], x, y: 500, w: 54 })),
  { str: "Mo", x: 40, y: 430, w: 14 },
  // Tunggal pada waktu 1
  { str: "PER", x: pusat(0) - 15, y: 435, w: 30 },
  // BERGABUNG waktu 2–3: dipusatkan antara dua lajur
  { str: "BM", x: (pusat(1) + pusat(2)) / 2 - 13, y: 435, w: 26 },
  { str: "WAN", x: (pusat(1) + pusat(2)) / 2 - 16, y: 415, w: 32 },
  { str: "Tu", x: 40, y: 330, w: 14 },
  { str: "SN", x: pusat(0) - 11, y: 335, w: 22 },
  // Hari ketiga: penghurai menuntut sekurang-kurangnya tiga label hari
  // sebelum ia yakin ini memang jadual, bukan halaman lain yang kebetulan
  // mengandungi perkataan hari.
  { str: "We", x: 40, y: 230, w: 14 },
  { str: "MT", x: pusat(1) - 11, y: 235, w: 22 },
];
const petang = SET_LALAI.find((s) => s.id === "petang")!.senarai;
const k = binaDrafDariKedudukan([item], petang);
semak("koordinat dibaca", k !== null, true);
const isnin = k!.draf.hari.isnin ?? {};
const pdp = petang.filter((w) => !w.rehat);
semak("waktu 1 = PER", isnin[pdp[0].id]?.subjek, "PERHIMPUNAN");
semak("waktu 2 = BM (gabung)", isnin[pdp[1].id]?.subjek, "BM");
semak("waktu 3 = BM (gabung)", isnin[pdp[2].id]?.subjek, "BM");
semak("waktu 4 kosong", isnin[pdp[3].id], undefined);
semak("guru BM dari sel gabung", k!.draf.guruSubjek?.BM, "WAN");
semak("Selasa waktu 1 = SAINS", (k!.draf.hari.selasa ?? {})[pdp[0].id]?.subjek, "SAINS");

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
