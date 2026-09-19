/**
 * Ujian carta organisasi — bacaan senarai warga dan penempatan tugas.
 *
 * Data ujian meniru BENTUK edisi sebenar 2026 (disahkan dengan menjalankan
 * saluran penuh ke atas PDF sekolah). Dua bentuk baris yang mesti kedua-duanya
 * berfungsi:
 *
 *   ["7", "ABDUL MUIZZ BIN MOHD RAMZI", "GAB", "MATEMATIK"]
 *   ["1", "BAIDURIAH BINTI BAHROM KPT (KETUA PEMBANTU TADBIR)"]
 *
 * Bentuk kedua ialah senarai AKP, dan sebelum ini ia menghasilkan "jawatan"
 * yang mengandungi nama, kod dan kurungan sekali — itu yang pengguna
 * laporkan pada 17 Sep 2026.
 */
import { bacaWarga, binaCarta, padanWarga, type SeksyenCarta } from "../src/lib/carta.ts";
import { arasKod, ara, kelihatanNama, bacaPenunjukKod, type NodCarta } from "../src/data/carta.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

const S = (x: Partial<SeksyenCarta> & { kod: string }): SeksyenCarta => ({
  kod: x.kod, tajuk: x.tajuk ?? "TAJUK", bentuk: x.bentuk,
  lajur: x.lajur ?? [], baris: x.baris ?? [],
});

/* ------------------------------------------------ senarai nama guru */

const guru = S({
  kod: "guru",
  tajuk: "SENARAI NAMA GURU TAHUN 2026",
  baris: [
    { id: "g0", sel: ["BIL", "NAMA", "KOD", "OPSYEN"] },
    { id: "g1", sel: ["1", "SHABARIAH BINTI ISMAIL", "PGB", "PENDIDIKAN ISLAM"] },
    { id: "g2", sel: ["2", "ROSLE BIN MOHAMAD", "PK1", "TEKNOLOGI KEJURUTERAAN"] },
    { id: "g3", sel: ["3", "AHMAD RAFLI NOOR BIN SHAHARDIN", "PK2", "BAHASA MELAYU"] },
    { id: "g4", sel: ["7", "ABDUL MUIZZ BIN MOHD RAMZI", "GAB", "MATEMATIK"] },
    { id: "g5", sel: ["8", "NOOR MASLIZA BINTI MAT SOOD", "GAB", "PENGAJIAN BAHASA ARAB"] },
    { id: "g6", sel: ["9", "NOR HASFARADZI BIN HASHIM", "GAB", "SEJARAH"] },
    { id: "g7", sel: ["10", "SHARIFAH NUR-AIN BINTI AID ALI", "GAB", "BAHASA ARAB"] },
    { id: "g8", sel: ["11", "NOOR RUWAIDA BINTI HJ MOHD ARIFIN", "GAG", "PENDIDIKAN ISLAM"] },
    { id: "g9", sel: ["", "SENARAI NAMA ANGGOTA KUMPULAN PELAKSANA (AKP)", "", ""] },
    { id: "g10", sel: ["1", "BAIDURIAH BINTI BAHROM KPT (KETUA PEMBANTU TADBIR)", "", ""] },
    { id: "g11", sel: ["4", "OTHMAN BIN NASIR PKA (OPERASI)", "", ""] },
    { id: "g12", sel: ["7", "IRNAWATI BINTI JOHAR PPM (INTEGRASI)", "", ""] },
    // Muka penunjuk kod kelihatan seperti baris guru — kod diikuti teks
    // huruf besar — tetapi ia definisi, bukan orang.
    { id: "g13", sel: ["GAB GURU AKADEMIK BIASA", "", "", ""] },
    // Baris kosong dalam senarai AKP: jawatan yang memang kosong dalam buku.
    { id: "g14", sel: ["5", "", "", ""] },
  ],
});

const warga = bacaWarga([guru]);
sama("bilangan warga dibaca", warga.length, 11);
uji("baris kepala jadual ditolak", !warga.some((w) => w.nama === "NAMA"));
uji("baris penunjuk kod ditolak", !warga.some((w) => w.nama.includes("AKADEMIK BIASA")));
uji("tajuk seksyen AKP ditolak", !warga.some((w) => w.nama.includes("ANGGOTA KUMPULAN")));
uji("baris kosong dilangkau", !warga.some((w) => w.nama === ""));

/* ---- KOD MELEKAT PADA NAMA (senarai AKP) ---- */
const kpt = warga.find((w) => w.nama.startsWith("BAIDURIAH"));
sama("nama AKP bersih dari kod", kpt?.nama, "BAIDURIAH BINTI BAHROM");
sama("kod AKP diambil", kpt?.kod, "KPT");
sama("kurungan menjadi opsyen", kpt?.opsyen, "KETUA PEMBANTU TADBIR");
sama("PKA dibaca", warga.find((w) => w.nama.startsWith("OTHMAN"))?.kod, "PKA");
sama("PPM dibaca", warga.find((w) => w.nama.startsWith("IRNAWATI"))?.kod, "PPM");

/* ---- barisId dibawa, supaya nod boleh disunting ---- */
uji("setiap warga membawa barisId", warga.every((w) => !!w.barisId));
sama("barisId betul", warga.find((w) => w.nama.startsWith("BAIDURIAH"))?.barisId, "g10");

/* ---- aras kod ---- */
sama("PGB puncak", arasKod("PGB"), 0);
sama("PK1 aras 1", arasKod("PK1"), 1);
sama("kod PK baharu tetap aras 1", arasKod("PK5"), 1);
sama("AKP aras 5", arasKod("PPM"), 5);
sama("KPT ada nama penuh", ara("KPT")?.nama, "Ketua Pembantu Tadbir");
uji("PKA ditanda perlu disahkan", ara("PKA")?.sahkan === true);

/* ------------------------------------------- padanan ejaan buku */

/*
 * Buku menulis orang yang SAMA dengan ejaan berbeza antara senarai guru dan
 * senarai jawatankuasa. Tanpa padanan longgar, keempat-empat guru di bawah
 * jatuh ke dalam "Guru & Kakitangan Lain" seolah-olah mereka tiada tugas —
 * sedangkan seorang Ketua Panitia Sejarah dan seorang Ketua Panitia Bahasa
 * Elektif.
 */
sama("koma atas: SO'OD → SOOD",
  padanWarga("NOOR MASLIZA BINTI MAT SO'OD", warga)?.nama, "NOOR MASLIZA BINTI MAT SOOD");
sama("nama panjang dalam jawatankuasa",
  padanWarga("NOR HASFARADZI BIN HASHIM AMER HAMZAH", warga)?.nama, "NOR HASFARADZI BIN HASHIM");
sama("satu perkataan tersalah eja",
  padanWarga("SHARIFAH NUR-AIN BINTI SAID ALI", warga)?.nama, "SHARIFAH NUR-AIN BINTI AID ALI");
sama("HJ hilang dari jawatankuasa",
  padanWarga("NOOR RUWAIDA BINTI MOHD ARIFIN", warga)?.nama,
  "NOOR RUWAIDA BINTI HJ MOHD ARIFIN");
uji("orang luar tidak dipadankan", padanWarga("ZULKIFLI BIN OMAR", warga) === undefined);

/* ----------------------------------------------------- bina carta */

const panitia = S({
  kod: "panitia",
  tajuk: "UNIT KURIKULUM",
  baris: [
    { id: "p1", sel: ["SEJARAH", "KETUA PANITIA", "NOR HASFARADZI BIN HASHIM AMER HAMZAH"] },
    { id: "p2", sel: ["BAHASA ELEKTIF", "KETUA PANITIA", "NOOR MASLIZA BINTI MAT SO'OD"] },
    { id: "p3", sel: ["BAHASA ELEKTIF", "AJK", "SHARIFAH NUR-AIN BINTI SAID ALI"] },
    { id: "p4", sel: ["", "PENGERUSI", "SHABARIAH BINTI ISMAIL"] },
    // Ayat pelan strategik bukan orang.
    { id: "p5", sel: ["", "MATLAMAT", "Menyusun perancangan LADAP secara sistematik"] },
  ],
});

const { punca, tidakDitempatkan } = binaCarta([guru, panitia], "SK Taman Desaminium", {
  GAB: "GURU AKADEMIK BIASA", GAG: "GURU PENDIDIKAN ISLAM SEKOLAH RENDAH",
});

const semuaNod = (n: NodCarta): NodCarta[] => [n, ...n.anak.flatMap(semuaNod)];
const nod = semuaNod(punca);

sama("puncak ialah Guru Besar", punca.label, "SHABARIAH BINTI ISMAIL");
uji("Pengerusi tidak disalin ke bawah unit",
  nod.filter((n) => n.label === "SHABARIAH BINTI ISMAIL").length === 1);
uji("ayat pelan strategik tidak menjadi orang",
  !nod.some((n) => n.label.startsWith("Menyusun")));

/* ---- guru yang ADA tugas tidak jatuh ke "Lain" ---- */
const lain = punca.anak.find((a) => a.label.includes("Lain"));
const namaLain = (lain?.anak ?? []).map((a) => a.label);
uji("Ketua Panitia Sejarah tidak dalam Lain",
  !namaLain.includes("NOR HASFARADZI BIN HASHIM"), namaLain.join(", "));
uji("Ketua Panitia Bahasa Elektif tidak dalam Lain",
  !namaLain.includes("NOOR MASLIZA BINTI MAT SOOD"));
uji("AJK tidak dalam Lain", !namaLain.includes("SHARIFAH NUR-AIN BINTI AID ALI"));
uji("guru tanpa tugas MEMANG dalam Lain", namaLain.includes("ABDUL MUIZZ BIN MOHD RAMZI"));
uji("AKP tanpa jawatankuasa dalam Lain", namaLain.includes("BAIDURIAH BINTI BAHROM"));

/* ---- nod dalam "Lain" boleh disunting: ia mesti membawa barisId ---- */
uji("setiap nod Lain membawa barisId",
  (lain?.anak ?? []).every((a) => !!a.barisId), JSON.stringify(namaLain));
uji("nod Lain ditanda datang dari senarai guru",
  (lain?.anak ?? []).every((a) => a.sumber === "guru"));
sama("jawatan AKP ialah nama kodnya, bukan seluruh sel",
  lain?.anak.find((a) => a.label === "BAIDURIAH BINTI BAHROM")?.jawatan,
  "Ketua Pembantu Tadbir");

/* ---- nod jawatankuasa ---- */
const ketuaSejarah = nod.find((n) => n.jawatan === "KETUA PANITIA" && n.label.includes("HASFARADZI"));
sama("nama dipapar mengikut senarai guru", ketuaSejarah?.label, "NOR HASFARADZI BIN HASHIM");
sama("ejaan buku dikekalkan sebagai nota",
  ketuaSejarah?.ejaanBuku, "NOR HASFARADZI BIN HASHIM AMER HAMZAH");
sama("nod jawatankuasa membawa barisId", ketuaSejarah?.barisId, "p1");
sama("nod jawatankuasa ditanda sumbernya", ketuaSejarah?.sumber, "jawatankuasa");
uji("kod eOperasi diwarisi dari senarai guru", ketuaSejarah?.kod === "GAB");

sama("tiada guru berbakat tugas tertinggal",
  tidakDitempatkan.map((w) => w.nama).sort(),
  // Penolong Kanan SUDAH berada di puncak carta, jadi mereka bukan
  // "tidak ditempatkan" walaupun mereka tiada dalam jawatankuasa yang dibaca.
  [
    "ABDUL MUIZZ BIN MOHD RAMZI",
    "BAIDURIAH BINTI BAHROM",
    "IRNAWATI BINTI JOHAR",
    "NOOR RUWAIDA BINTI HJ MOHD ARIFIN",
    "OTHMAN BIN NASIR",
  ].sort());

/* ---------------------------------------------- penunjuk kod buku */

const penunjuk = bacaPenunjukKod([
  "PENUNJUK KOD PEJAWATAN :",
  "PGB PENGETUA / GURU BESAR",
  "GAG GURU PENDIDIKAN ISLAM SEKOLAH RENDAH",
  "53",
  "",
  "Ayat penuh yang menamatkan senarai.",
  "GAB GURU AKADEMIK BIASA",
]);
sama("kod dibaca dari buku", penunjuk.PGB, "PENGETUA / GURU BESAR");
sama("GAG bukan tekaan pihak ketiga", penunjuk.GAG, "GURU PENDIDIKAN ISLAM SEKOLAH RENDAH");
uji("ayat penuh menamatkan senarai", penunjuk.GAB === undefined);

/* -------------------------------------------------- penapis nama */

uji("nama biasa diterima", kelihatanNama("AHMAD RAFLI NOOR BIN SHAHARDIN"));
uji("ayat KPI ditolak", !kelihatanNama("Hanya 10% murid merekodkan AINS"));
uji("tajuk ditolak", !kelihatanNama("MATLAMAT STRATEGIK"));
uji("opsyen ditolak", !kelihatanNama("PENDIDIKAN AWAL KANAK-KANAK"));
uji("nama dengan perkataan tersenarai tetap diterima kerana nasab",
  kelihatanNama("NUR SAINS BINTI ALI"));

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
