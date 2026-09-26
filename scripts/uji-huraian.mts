/**
 * Ujian logik penghuraian jadual. Jalankan:
 *   node --experimental-strip-types scripts/uji-huraian.mts
 *
 * Tiada Supabase, tiada Clerk, tiada fail sebenar — hanya logik tulen.
 */
import { padanSubjek, binaDraf, binaDrafDariGrid, binaDrafDariKedudukan, namaGuruDariSel, padanHari } from "../src/lib/jadual-huraian.ts";
import { SET_LALAI, TAHUN_SET_LALAI, naikTarafJadual, setUntukKelas } from "../src/data/jadual-jenis.ts";
import { KOD_SUBJEK, namaSubjek } from "../src/data/subjek.ts";
import { kadIkutBahagian } from "../src/data/bahagian.ts";
import { semuaKelasDalam, kesanKelas } from "../src/data/kesan-kelas.ts";
import { kodSlot, huraiKodSlot, namaSlot } from "../src/data/slot-jadual.ts";
import { pasanganGuruKelas } from "../src/data/guru-kelas-buku.ts";

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
// Set petang untuk ujian koordinat ini: rehat waktu 6, sama seperti id
// "petang" yang lama. Id itu kini `petang-r2` kerana sesi petang mempunyai
// tiga set berperingkat (lihat blok SESI PETANG di bawah).
const petang = SET_LALAI.find((s) => s.id === "petang-r2")!.senarai;
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

console.log("\n— senarai subjek: SATU sumber —");
/* Ujian ini wujud kerana senarai subjek pernah berpecah kepada empat
   salinan. TASMIK ditambah kepada penghurai sahaja, jadi sistem MEMBACA
   TASMIK dengan betul tetapi dropdown tiada pilihan itu — pentadbir melihat
   sel kosong pada hari Rabu, tanpa sebarang ralat. Kalau seseorang menambah
   kod kepada penghurai dan terlupa senarai subjek, ujian ini gagal. */
const kodPenghurai = ["BM","BI","MM","SAINS","SEJ","PAI","PM","RBT","PJPK","PSV","PMZ","AR","BC",
                      "TASMIK","PERHIMPUNAN","PSS","KOKO","PAK21"];
for (const kod of kodPenghurai) {
  semak(`${kod} ada dalam senarai subjek`, KOD_SUBJEK.includes(kod), true);
}
semak("TASMIK ada nama paparan", namaSubjek("TASMIK"), "Tasmik");
semak("kod tak dikenali dipulangkan apa adanya", namaSubjek("XYZ"), "XYZ");
// Setiap kod yang padanSubjek() boleh pulangkan mesti boleh dipapar.
for (const contoh of ["TASMIK","PER","MT","SN","PJ","BA","P.ISLAM (Q)"]) {
  const kod = padanSubjek(contoh);
  semak(`padanan "${contoh}" boleh dipapar`, kod === null || KOD_SUBJEK.includes(kod), true);
}

console.log("\n— kad hab ditapis ikut kuasa —");
const kadUntuk = (p: Parameters<typeof kadIkutBahagian>[0]) =>
  kadIkutBahagian(p).flatMap((b) => b.kad.map((k) => k.id));

const guru = kadUntuk("guru");
const pentadbir = kadUntuk("pentadbir");
const mutlak = kadUntuk("admin_mutlak");

// Inilah yang pengguna minta: guru biasa TIDAK nampak kad pentadbiran.
semak("guru TIDAK nampak Urus Laman Web", guru.includes("urusweb"), false);
// Disiplin & Sahsiah kini nampak untuk SEMUA guru (permintaan F.3, 18 Sep
// 2026): guru biasa boleh MEREKOD salah laku, cuma tidak boleh MEMBACA
// rekod murid lain — sekatan itu dikuatkuasakan DALAM halaman, bukan pada
// penglihatan kad.
semak("guru NAMPAK Disiplin (untuk rekod sahaja)", guru.includes("disiplin"), true);
semak("pentadbir NAMPAK Urus Laman Web", pentadbir.includes("urusweb"), true);
semak("pentadbir NAMPAK Disiplin", pentadbir.includes("disiplin"), true);
semak("admin mutlak nampak semua pentadbir punya",
      pentadbir.every((k) => mutlak.includes(k)), true);
// Kad biasa mesti kekal untuk semua orang.
//
// SATU kad ePBD, bukan dua (17 Sep 2026). Hab menjadi serabut dengan dua
// kad yang namanya hampir sama; pembahagian Guru/Slip berlaku SATU skrin ke
// dalam. Kad itu mesti kelihatan kepada guru biasa — halaman di dalamnya
// yang menapis kelas dan subjek mana mereka boleh sentuh.
semak("guru nampak ePBD", guru.includes("pbd"), true);
semak("tiada kad ePBD kedua", guru.filter((k) => k.startsWith("pbd")).length, 1);
// Kad lama yang menunjuk ke epbd.sktd.edu.my — app yang tidak pernah dibina.
semak("kad ePBD lama sudah tiada", guru.includes("epbd"), false);
semak("guru nampak Jadual Waktu", guru.includes("jadual"), true);
semak("tiada peranan → tiada kad pentadbiran", kadUntuk(null).includes("urusweb"), false);

/* ------------------------------------------------------------------ *
 * SATU PDF, SEMUA KELAS
 *
 * Pentadbir sekolah menerima SATU fail dengan setiap kelas di dalamnya, bukan
 * 57 fail. Pada fail itu `kesanKelas` menjumpai 57 nama, memulangkan null
 * kerana kabur, dan pentadbir membaca "Kelas tidak dapat dikesan" untuk fail
 * yang sebenarnya mengandungi segala-galanya.
 *
 * `semuaKelasDalam` membolehkan pembacaan setiap MUKA berasingan. Ujian ini
 * mengunci dua sifat: ia menemui semua kelas bila ada banyak, DAN `kesanKelas`
 * yang lama kekal memulangkan null bila kabur — kerana perlindungan itulah
 * yang menghalang jadual satu kelas ditulis ke dalam kelas lain.
 * ------------------------------------------------------------------ */
semak("satu kelas pada satu muka", semuaKelasDalam("JADUAL WAKTU 1 AMANAH 2026").length, 1);
semak("kelas itu dikenal betul", semuaKelasDalam("JADUAL WAKTU 1 AMANAH 2026")[0], "1 AMANAH");
semak("muka tanpa kelas → kosong", semuaKelasDalam("SEKOLAH KEBANGSAAN TAMAN DESAMINIUM").length, 0);
semak("jadual induk → semua kelas dijumpai",
  semuaKelasDalam("1 AMANAH 2 DEDIKASI 3 EFEKTIF").length, 3);
semak("kelas PPKI dikesan", semuaKelasDalam("JADUAL PPKI SUNFLOWER")[0], "PPKI SUNFLOWER");
semak("teks kosong tidak melontar", semuaKelasDalam("").length, 0);
// Perlindungan asal MESTI kekal: kabur bermakna berhenti, bukan meneka.
semak("kesanKelas kekal null bila kabur", kesanKelas("1 AMANAH 2 DEDIKASI", "x.pdf"), null);
semak("kesanKelas kekal berfungsi bila satu", kesanKelas("1 AMANAH", "x.pdf"), "1 AMANAH");

/* ------------------------------------------------------------------ *
 * SESI PETANG — waktu sebenar sekolah, disahkan 24 Sep 2026
 *
 * Daripada "JW KELAS PETANG 31.7.2026.pdf" (30 kelas). Dua kesilapan lama
 * dikunci di sini supaya ia tidak kembali:
 *   1. blok 20 minit ialah waktu 7 (04:00–04:20), BUKAN waktu 6
 *   2. rehat petang BERPERINGKAT seperti pagi: Tahun 1 waktu 5, Tahun 2
 *      waktu 6, Tahun 3 waktu 7 — disahkan dengan melihat muka surat PDF
 *
 * Kesan kesilapan itu boleh diukur: dengan set lama, kelas Tahun 1 dibaca
 * 39/45 slot; dengan set betul, 44/45 — dan baki satu itu memang kosong
 * dalam cetakan (Jumaat waktu 1).
 * ------------------------------------------------------------------ */
const setPetang = (id: string) => SET_LALAI.find((s) => s.id === id)!;
semak("tiga set petang wujud", SET_LALAI.filter((s) => s.sesi === "petang").length, 3);
semak("waktu 6 penuh 30 minit", `${setPetang("petang-r2").senarai[5].mula}-${setPetang("petang-r2").senarai[5].tamat}`, "15:30-16:00");
semak("waktu 7 pendek 20 minit", `${setPetang("petang-r2").senarai[6].mula}-${setPetang("petang-r2").senarai[6].tamat}`, "16:00-16:20");
semak("Tahun 1 rehat waktu 5", setPetang("petang-r1").senarai.findIndex((w) => w.rehat) + 1, 5);
semak("Tahun 2 rehat waktu 6", setPetang("petang-r2").senarai.findIndex((w) => w.rehat) + 1, 6);
semak("Tahun 3 rehat waktu 7", setPetang("petang-r3").senarai.findIndex((w) => w.rehat) + 1, 7);
semak("id waktu kekal sama merentas set", setPetang("petang-r1").senarai.map((w) => w.id).join(","), setPetang("petang-r3").senarai.map((w) => w.id).join(","));
semak("Tahun 1 → petang-r1", TAHUN_SET_LALAI[1], "petang-r1");
semak("Tahun 3 → petang-r3", TAHUN_SET_LALAI[3], "petang-r3");

// Pembetulan jadual TERSIMPAN yang membawa set lama yang salah.
const lamaSalah = {
  set: [{
    id: "petang", nama: "Sesi Petang — rehat waktu 6 (3:30)", sesi: "petang",
    senarai: [["13:00","13:30"],["13:30","14:00"],["14:00","14:30"],["14:30","15:00"],
      ["15:00","15:30"],["15:30","15:50"],["15:50","16:20"],["16:20","16:50"],
      ["16:50","17:20"],["17:20","17:50"]].map(([mula, tamat], i) => ({
        id: `t${i + 1}`, mula, tamat, ...(i === 5 ? { rehat: true, label: "Rehat" } : {}),
      })),
  }],
  tahunSet: { 1: "petang", 2: "petang", 3: "petang" },
  kelas: { "1 DEDIKASI": { hari: { isnin: { t1: { subjek: "BM" } } } } },
};
const dibetul = naikTarafJadual(lamaSalah);
semak("set tersimpan yang salah dibetulkan", dibetul.set[0].senarai[6].tamat, "16:20");
semak("waktu 6 tersimpan jadi 30 minit", dibetul.set[0].senarai[5].tamat, "16:00");
semak("set berperingkat ditambah", dibetul.set.length >= 3, true);
semak("Tahun 1 dialih ke petang-r1", dibetul.tahunSet[1], "petang-r1");
semak("Tahun 3 dialih ke petang-r3", dibetul.tahunSet[3], "petang-r3");
// PERATURAN #2: slot yang sudah tersimpan TIDAK BOLEH hilang.
semak("slot tersimpan kekal", dibetul.kelas["1 DEDIKASI"].hari.isnin!.t1.subjek, "BM");
semak("kelas Tahun 1 dapat set rehat waktu 5",
  setUntukKelas(dibetul, "1 DEDIKASI")!.senarai.findIndex((w) => w.rehat) + 1, 5);
// Jadual yang pentadbir sunting sendiri TIDAK disentuh.
const disunting = naikTarafJadual({
  set: [{ id: "petang", nama: "Ubah suai", sesi: "petang",
    senarai: [{ id: "t1", mula: "13:15", tamat: "13:45" }] }],
  tahunSet: { 1: "petang" }, kelas: {},
});
semak("set yang disunting pentadbir tidak disentuh", disunting.set[0].senarai[0].mula, "13:15");

/* ------------------------------------------------------------------ *
 * SEL MERENTANG TIGA WAKTU
 *
 * Koordinat SEBENAR daripada 1 INOVATIF (muka 6, JW KELAS PETANG 31.7.2026):
 * pusat lajur 130, 204, 278, … berjarak 73.6. "BM" merentang waktu 2–4 dan
 * pusat teksnya 278 — iaitu pusat lajur 3 TEPAT, sama persis dengan rupa sel
 * tunggal. Peraturan pusat-sahaja meninggalkan waktu 2 dan 4 kosong: kelas
 * itu dibaca 42/45 sedangkan cetakannya penuh.
 *
 * aSc merapatkan nama guru ke tepi KANAN sel, jadi tepi itu boleh diukur dan
 * pusat dicerminkan untuk mendapat tepi kiri. Ujian ini mengunci kedua-dua
 * arah: sel tiga waktu mesti dikembangkan, DAN waktu yang memang lapang
 * mesti kekal kosong.
 * ------------------------------------------------------------------ */
const P3 = [130, 204, 278, 351, 425, 498, 572, 646, 719, 793];
const masa3 = ["01:00 - 01:30","01:30 - 02:00","02:00 - 02:30","02:30 - 03:00","03:00 - 03:30",
               "03:30 - 04:00","04:00 - 04:20","04:20 - 04:50","04:50 - 05:20","05:20 - 05:50"];
const item3 = [
  ...P3.map((c, i) => ({ str: masa3[i], x: c - 27, y: 500, w: 54 })),
  { str: "Mo", x: 40, y: 430, w: 14 },
  { str: "PER", x: 116, y: 435, w: 29 },        // tunggal, waktu 1
  { str: "MARDIAH", x: 125, y: 415, w: 39 },    // tepi kanan 164 = tepi sel 1
  { str: "BM", x: 265, y: 435, w: 26 },         // TIGA waktu: 2-4, pusat 278
  { str: "AISYAH", x: 347, y: 415, w: 30 },     // tepi kanan 377 = tepi sel 4
  { str: "BI", x: 527, y: 435, w: 17 },         // dua waktu: 6-7
  { str: "MARDIAH", x: 564, y: 415, w: 38 },
  { str: "Tu", x: 40, y: 330, w: 14 },
  { str: "SN", x: 636, y: 335, w: 20 },         // tunggal, waktu 8
  { str: "HASMAWATI", x: 629, y: 315, w: 50 },
  { str: "We", x: 40, y: 230, w: 14 },
  { str: "MT", x: 267, y: 235, w: 22 },
  { str: "AIN", x: 347, y: 215, w: 20 },
];
const r1 = SET_LALAI.find((s) => s.id === "petang-r1")!.senarai;
const h3 = binaDrafDariKedudukan([item3], r1)!;
const pdp3 = r1.filter((w) => !w.rehat);
const isn = h3.draf.hari.isnin ?? {};
semak("sel tiga waktu: waktu 1 = PER", isn[pdp3[0].id]?.subjek, "PERHIMPUNAN");
semak("sel tiga waktu: waktu 2 = BM", isn[pdp3[1].id]?.subjek, "BM");
semak("sel tiga waktu: waktu 3 = BM", isn[pdp3[2].id]?.subjek, "BM");
semak("sel tiga waktu: waktu 4 = BM", isn[pdp3[3].id]?.subjek, "BM");
// Waktu 5 ialah rehat bagi petang-r1, jadi PdP ke-5 ialah lajur 6.
semak("sel dua waktu masih betul (lajur 6)", isn[pdp3[4].id]?.subjek, "BI");
semak("sel dua waktu masih betul (lajur 7)", isn[pdp3[5].id]?.subjek, "BI");
semak("waktu lapang kekal kosong (lajur 9)", isn[pdp3[7].id], undefined);
const sel3 = h3.draf.hari.selasa ?? {};
semak("sel tunggal tidak melebar", sel3[pdp3[6].id]?.subjek, "SAINS");
semak("jiran sel tunggal kekal kosong", sel3[pdp3[5].id], undefined);

/* ------------------------------------------------------------------ *
 * PENDIDIKAN ISLAM / MORAL — DUA SUBJEK, SATU WAKTU
 *
 * Kedua-duanya berjalan SERENTAK: murid Islam ke kelas PI, murid bukan Islam
 * ke kelas Moral, guru berlainan. Jadual mencetaknya sebagai satu petak
 * dibahagi dua tingkat. Koordinat di bawah diambil dari 1 EFEKTIF (muka 2).
 *
 * Dua kesilapan dikunci di sini:
 *   1. tanpa pengasingan tingkat, MORAL hilang terus dan nama gurunya
 *      bercantum ke dalam nama guru PI — terbaca "SAFFA' MORAL KALAIVANI"
 *   2. label kumpulan ("QURAN") bukan nama guru; hurufnya dalam kurungan
 *      ("P.ISLAM (Q)") pula BERMAKNA dan mesti dikekalkan
 * ------------------------------------------------------------------ */
const itemPM = [
  ...P3.map((c, i) => ({ str: masa3[i], x: c - 27, y: 500, w: 54 })),
  { str: "Mo", x: 40, y: 430, w: 14 },
  { str: "QURAN", x: 560, y: 476, w: 32 },        // label kumpulan, bukan guru
  { str: "P.ISLAM (Q)", x: 489, y: 457, w: 92 },
  { str: "SAFFA' / NATRAH", x: 520, y: 444, w: 82 },
  { str: "MORAL-Q", x: 551, y: 430, w: 46 },
  { str: "MORAL", x: 493, y: 411, w: 60 },
  { str: "KALAIVANI", x: 546, y: 398, w: 56 },
  { str: "Tu", x: 40, y: 330, w: 14 },
  { str: "BM", x: 267, y: 335, w: 22 },
  { str: "AISYAH", x: 330, y: 315, w: 30 },
  { str: "We", x: 40, y: 230, w: 14 },
  { str: "MT", x: 267, y: 235, w: 22 },
  { str: "AIN", x: 347, y: 215, w: 20 },
];
const hPM = binaDrafDariKedudukan([itemPM], r1)!;
const isnPM = hPM.draf.hari.isnin ?? {};
// Petak itu berpusat antara lajur 6 dan 7, jadi ia dua waktu.
const slotPM = isnPM[pdp3[4].id];
semak("PI dan Moral dalam SATU slot", slotPM?.subjek, "PAI");
semak("Moral disimpan sebagai subjek seiring", slotPM?.seiring, "PM");
semak("varian dalam kurungan dikekalkan", slotPM?.varian, "Q");
semak("guru PI bersih daripada label kumpulan", hPM.draf.guruSubjek?.PAI, "SAFFA' / NATRAH");
semak("guru Moral direkod berasingan", hPM.draf.guruSubjek?.PM, "KALAIVANI");
semak("slot seiring dikira SEKALI, bukan dua", slotPM !== undefined && isnPM[pdp3[5].id]?.seiring, "PM");

// Kod slot: satu nilai untuk satu <select>, bolak-balik tanpa kehilangan.
semak("kod slot membawa varian dan pasangan", kodSlot({ subjek: "PAI", varian: "Q", seiring: "PM" }), "PAI:Q+PM");
semak("kod slot dihurai semula", JSON.stringify(huraiKodSlot("PAI:Q+PM")), JSON.stringify({ subjek: "PAI", varian: "Q", seiring: "PM" }));
semak("kod biasa tidak terjejas", kodSlot({ subjek: "BM" }), "BM");
semak("nama dipapar penuh", namaSlot({ subjek: "PAI", varian: "Q", seiring: "PM" }), "Pendidikan Islam (Quran) / Pendidikan Moral");

/* ------------------------------------------------------------------ *
 * GURU KELAS DARIPADA BUKU PENGURUSAN
 *
 * Bentuk SEBENAR, disalin daripada buku sekolah (m.73–75):
 *   TAHUN 1                              ← tahun pada baris tajuk
 *   BIL | KELAS | GURU KELAS | GURU PEMBANTU / PPM
 *    1  | DEDIKASI | SUHAILA … | MOHD NASSER …
 *
 * Dua pusingan tekaan memulangkan SIFAR kerana kelas ditulis TANPA tahun.
 * Penghurai PDF kadang mencantumkan sel, jadi kedua-dua bentuk diuji.
 * ------------------------------------------------------------------ */
const barisBuku = [
  ["SENARAI GURU KELAS SK TAMAN DESAMINIUM TAHUN 2026"],
  ["PRASEKOLAH"],
  ["BIL", "KELAS", "GURU KELAS", "GURU PEMBANTU / PPM"],
  ["1", "DESA IMPIAN", "SUHAIZALMI BINTI SALLEH", "NUR AFIZA BINTI ABD AZIZ"],
  ["TAHUN 1"],
  ["PENYELARAS : NOR HASFARADZI BIN HASHIM"],
  ["BIL", "KELAS", "GURU KELAS", "GURU PEMBANTU / PPM"],
  ["1", "DEDIKASI", "SUHAILA BINTI SUHAIMI", "MOHD NASSER BIN SAPARI"],
  ["2", "SUNFLOWER", "NOR ASHIKIN BINTI HARUN", "NURUL NADIA BINTI MOHD HATTA"],
  ["TAHUN 2"],
  // Sel BERCANTUM — bentuk kedua yang sama sahnya.
  ["BIL KELAS", "GURU KELAS", "GURU PEMBANTU / PPM"],
  ["1 EFEKTIF", "FARIZAH BEGUM BINTI MOHD YUSOFF", "ISFAN FAZLI BIN ABDUL AZIZ"],
];
const pasangan = pasanganGuruKelas(barisBuku);
semak("kelas tanpa tahun dapat tahun dari tajuk",
  pasangan.find((p) => p.kelas === "1 DEDIKASI")?.guru, "SUHAILA BINTI SUHAIMI");
semak("sel bercantum turut dibaca",
  pasangan.find((p) => p.kelas === "2 EFEKTIF")?.guru, "FARIZAH BEGUM BINTI MOHD YUSOFF");
semak("PPKI dikenali walau ditulis tanpa awalan",
  pasangan.find((p) => p.kelas === "PPKI SUNFLOWER")?.guru, "NOR ASHIKIN BINTI HARUN");
semak("prasekolah tidak masuk senarai kelas rendah",
  pasangan.some((p) => /DESA/.test(p.kelas)), false);
// Guru PEMBANTU tidak boleh terpilih — ia memberi kuasa menyunting kelas.
semak("guru pembantu TIDAK diambil",
  pasangan.some((p) => /NASSER|ISFAN|NURUL NADIA/.test(p.guru)), false);
semak("baris tajuk bukan pasangan", pasangan.length, 3);

console.log(`\n${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
