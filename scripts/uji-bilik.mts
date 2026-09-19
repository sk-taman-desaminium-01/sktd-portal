/**
 * Ujian Tempahan Bilik Khas.
 *
 * Pertindihan ialah SATU-SATUNYA peraturan dalam modul ini. Sistem tempahan
 * yang membenarkan dua tempahan bertindih hanya memindahkan pergaduhan dari
 * papan kenyataan ke skrin.
 */
import {
  bertindih, semakTempahan, keMinit, keJam, labelTarikh, ikutHari, susunTempahan,
  type Tempahan,
} from "../src/data/bilik.ts";
import { penerimaBersih, masaLalu } from "../src/data/notifikasi.ts";
import {
  hariTarikh, terpakaiPada, tetapBerlanggar, sebabTetap, tempahanTerjejas,
  type Tetap,
} from "../src/data/bilik-tetap.ts";
import {
  sesiGrid, isninMinggu, tambahHari, tarikhMinggu, hujungMinggu, tarikhCuti,
  perluKelulusan, statusBilik, selGrid, gabungJulat, kunciSel, huraiKunci,
  tempahanAktif, labelLajur,
} from "../src/data/grid-bilik.ts";
import { JADUAL_KOSONG } from "../src/data/jadual-jenis.ts";
import type { Bilik } from "../src/data/bilik.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

const T = (mula: string, tamat: string, x: Partial<Tempahan> = {}): Tempahan => ({
  id: x.id ?? "t1", bilik_id: x.bilik_id ?? "b1", tarikh: x.tarikh ?? "2026-10-01",
  mula, tamat, tujuan: "Mesyuarat", oleh: "a@x", nama: "Cikgu A",
  dibatalkan: x.dibatalkan ?? false, dicipta: "",
  ...(x.status ? { status: x.status } : {}),
});

/* ------------------------------------------------------------- masa */

sama("keMinit", keMinit("09:30"), 570);
sama("keMinit tengah malam", keMinit("00:00"), 0);
uji("jam luar julat ditolak", keMinit("25:00") === null);
uji("minit luar julat ditolak", keMinit("09:61") === null);
uji("bentuk salah ditolak", keMinit("9.30") === null && keMinit("") === null);
sama("keJam", keJam(570), "09:30");
sama("keJam pusingan penuh", keJam(0), "00:00");

/* -------------------------------------------------------- pertindihan */

uji("bertindih penuh", bertindih({mula:"09:00",tamat:"10:00"}, {mula:"09:00",tamat:"10:00"}));
uji("bertindih sebahagian di hadapan", bertindih({mula:"08:30",tamat:"09:30"}, {mula:"09:00",tamat:"10:00"}));
uji("bertindih sebahagian di belakang", bertindih({mula:"09:30",tamat:"10:30"}, {mula:"09:00",tamat:"10:00"}));
uji("satu dalam satu lagi", bertindih({mula:"09:15",tamat:"09:45"}, {mula:"09:00",tamat:"10:00"}));
uji("membaluti sepenuhnya", bertindih({mula:"08:00",tamat:"11:00"}, {mula:"09:00",tamat:"10:00"}));

// Sempadan BUKAN pertindihan — 09:00–10:00 dan 10:00–11:00 hidup bersama.
// Ini keseluruhan peraturan, dan ia mudah ditulis terbalik.
uji("sempadan bersentuhan BUKAN pertindihan",
  !bertindih({mula:"10:00",tamat:"11:00"}, {mula:"09:00",tamat:"10:00"}));
uji("sempadan bersentuhan arah bertentangan",
  !bertindih({mula:"08:00",tamat:"09:00"}, {mula:"09:00",tamat:"10:00"}));
uji("terpisah jauh", !bertindih({mula:"14:00",tamat:"15:00"}, {mula:"09:00",tamat:"10:00"}));

/* ---------------------------------------------------------- semakan */

const HARI_INI = "2026-10-01";
const ok = (m: string, t: string, sedia: Tempahan[] = []) =>
  semakTempahan({ tarikh: "2026-10-01", mula: m, tamat: t }, sedia, HARI_INI);

uji("tempahan sah diterima", ok("09:00", "10:00").ok);
uji("tamat sebelum mula ditolak", !ok("10:00", "09:00").ok);
uji("tamat sama dengan mula ditolak", !ok("09:00", "09:00").ok);
uji("sebelum waktu buka ditolak", !ok("05:00", "06:00").ok);
uji("selepas waktu tutup ditolak", !ok("21:00", "23:00").ok);
uji("melebihi 8 jam ditolak", !ok("07:00", "17:00").ok);
uji("tepat 8 jam diterima", ok("08:00", "16:00").ok);
uji("waktu tidak sah ditolak", !ok("9am", "10am").ok);
uji("tarikh tidak sah ditolak",
  !semakTempahan({ tarikh: "1 Okt", mula: "09:00", tamat: "10:00" }, [], HARI_INI).ok);
uji("tarikh berlalu ditolak",
  !semakTempahan({ tarikh: "2026-09-30", mula: "09:00", tamat: "10:00" }, [], HARI_INI).ok);
uji("hari ini diterima",
  semakTempahan({ tarikh: HARI_INI, mula: "09:00", tamat: "10:00" }, [], HARI_INI).ok);
uji("tarikh akan datang diterima",
  semakTempahan({ tarikh: "2026-12-25", mula: "09:00", tamat: "10:00" }, [], HARI_INI).ok);

const sedia = [T("09:00", "10:00", { id: "sedia" })];
uji("pertindihan dengan tempahan sedia ada ditolak", !ok("09:30", "10:30", sedia).ok);
uji("tempahan yang berlanggar dinamakan",
  ok("09:30", "10:30", sedia).berlanggar?.id === "sedia");
uji("sebabnya menyebut waktu dan nama",
  (ok("09:30", "10:30", sedia).sebab ?? "").includes("09:00") &&
  (ok("09:30", "10:30", sedia).sebab ?? "").includes("Cikgu A"));
uji("slot bersebelahan diterima", ok("10:00", "11:00", sedia).ok);
uji("tempahan yang DIBATALKAN tidak menghalang",
  ok("09:30", "10:30", [T("09:00", "10:00", { dibatalkan: true })]).ok);

/* ------------------------------------------------------------ papar */

sama("labelTarikh", labelTarikh("2026-10-01"), "Khamis, 1 Okt");
sama("labelTarikh Ahad", labelTarikh("2026-10-04"), "Ahad, 4 Okt");

const banyak = [
  T("14:00", "15:00", { id: "c", tarikh: "2026-10-02" }),
  T("09:00", "10:00", { id: "a", tarikh: "2026-10-02" }),
  T("11:00", "12:00", { id: "b", tarikh: "2026-09-28" }),
];
sama("susunan ikut tarikh kemudian waktu",
  susunTempahan(banyak).map((t) => t.id), ["b", "a", "c"]);

const hari = ikutHari(banyak, HARI_INI);
sama("dikumpul kepada dua hari", hari.length, 2);
uji("hari lepas ditanda lalu", hari.find((h) => h.tarikh === "2026-09-28")?.lalu === true);
uji("hari akan datang tidak ditanda lalu", hari.find((h) => h.tarikh === "2026-10-02")?.lalu === false);
sama("tempahan dalam hari disusun ikut waktu",
  hari.find((h) => h.tarikh === "2026-10-02")?.tempahan.map((t) => t.id), ["a", "c"]);

/* ----------------------------------------------------------- notifikasi */

/**
 * Notifikasi ialah satu KEJADIAN, bukan mesej kepada seorang — dan peraturan
 * yang paling mudah dilanggar ialah menghantar kepada orang yang
 * mencetuskannya. Notifikasi yang memberitahu anda tentang perbuatan anda
 * sendiri ialah bunyi, dan bunyi mengajar orang mengabaikan loceng.
 */
sama("pencetus dibuang dari senarai penerima",
  penerimaBersih(["a@x.my", "b@x.my", "c@x.my"], "b@x.my"), ["a@x.my", "c@x.my"]);
sama("huruf besar tidak menipu perbandingan",
  penerimaBersih(["A@X.MY", "b@x.my"], "a@x.my"), ["b@x.my"]);
sama("penerima berulang dibuang",
  penerimaBersih(["a@x.my", "a@x.my", "b@x.my"], null), ["a@x.my", "b@x.my"]);
sama("emel kosong diabaikan", penerimaBersih(["", "  ", "a@x.my"], null), ["a@x.my"]);
sama("tiada pencetus bermakna semua terima",
  penerimaBersih(["a@x.my", "b@x.my"], null).length, 2);

const KINI = Date.parse("2026-09-17T12:00:00Z");
const lalu = (iso: string) => masaLalu(iso, KINI);
sama("baru sahaja", lalu("2026-09-17T11:59:40Z"), "baru sahaja");
sama("minit", lalu("2026-09-17T11:45:00Z"), "15 minit lalu");
sama("jam", lalu("2026-09-17T09:00:00Z"), "3 jam lalu");
sama("semalam", lalu("2026-09-16T10:00:00Z"), "semalam");
sama("hari", lalu("2026-09-14T12:00:00Z"), "3 hari lalu");
uji("tarikh rosak tidak menghempas", lalu("bukan tarikh") === "");

/* --------------------------------------------------------- waktu tetap */

/**
 * Waktu yang sudah "dimiliki" sebelum sesiapa menempah — dari jadual waktu
 * sekolah, atau ditutup pentadbir. Peraturan sempadan mesti SAMA seperti
 * tempahan biasa: 09:00-10:00 dan 10:00-11:00 hidup bersama.
 */
const T2 = (x: Partial<Tetap> = {}): Tetap => ({
  id: x.id ?? "t1", bilik_id: x.bilik_id ?? "b1", hari: x.hari ?? "selasa",
  mula: x.mula ?? "08:00", tamat: x.tamat ?? "10:00",
  sebab: x.sebab ?? "Kelas PM", sumber: x.sumber ?? "jadual",
  subjek: x.subjek ?? "PM", kelas: x.kelas ?? "3 AMANAH",
  dari_tarikh: x.dari_tarikh ?? null, hingga_tarikh: x.hingga_tarikh ?? null,
  aktif: x.aktif ?? true,
});

// 2026-09-15 ialah Selasa; 2026-09-16 Rabu.
sama("hari dari tarikh", hariTarikh("2026-09-15"), "selasa");
sama("Sabtu tiada dalam minggu persekolahan", hariTarikh("2026-09-19"), null);
sama("Ahad juga tiada", hariTarikh("2026-09-20"), null);
uji("tarikh rosak tidak menghempas", hariTarikh("bukan") === null);

uji("terpakai pada hari yang sama", terpakaiPada(T2(), "2026-09-15"));
uji("tidak terpakai pada hari lain", !terpakaiPada(T2(), "2026-09-16"));
uji("peraturan tidak aktif tidak terpakai", !terpakaiPada(T2({ aktif: false }), "2026-09-15"));
uji("sebelum julat tidak terpakai",
  !terpakaiPada(T2({ dari_tarikh: "2026-10-01" }), "2026-09-15"));
uji("selepas julat tidak terpakai",
  !terpakaiPada(T2({ hingga_tarikh: "2026-09-01" }), "2026-09-15"));
uji("dalam julat terpakai",
  terpakaiPada(T2({ dari_tarikh: "2026-09-01", hingga_tarikh: "2026-12-31" }), "2026-09-15"));

const minta = (mula: string, tamat: string, bilik = "b1", tarikh = "2026-09-15") =>
  ({ bilik_id: bilik, tarikh, mula, tamat });

uji("tempahan dalam waktu kelas ditolak",
  tetapBerlanggar(minta("09:00", "09:30"), [T2()]) !== null);
uji("sempadan bersentuhan dibenarkan",
  tetapBerlanggar(minta("10:00", "11:00"), [T2()]) === null);
uji("sebelum kelas dibenarkan",
  tetapBerlanggar(minta("07:00", "08:00"), [T2()]) === null);
uji("bilik lain tidak terjejas",
  tetapBerlanggar(minta("09:00", "09:30", "b2"), [T2()]) === null);
uji("hari lain tidak terjejas",
  tetapBerlanggar(minta("09:00", "09:30", "b1", "2026-09-16"), [T2()]) === null);

uji("sebab dari jadual menyebut subjek dan kelas",
  sebabTetap(T2()).includes("PM") && sebabTetap(T2()).includes("3 AMANAH"));
uji("sebab manual menyebut ayat pentadbir",
  sebabTetap(T2({ sumber: "manual", sebab: "Penyelenggaraan" })).includes("Penyelenggaraan"));

/* Tempahan sedia ada yang akan terjejas oleh peraturan baharu — dipapar
   sebelum peraturan itu disimpan, supaya tiada dua kumpulan tiba di pintu
   yang sama. */
const terjejas = tempahanTerjejas(
  [{ bilik_id: "b1", hari: "selasa", mula: "08:00", tamat: "10:00" }],
  [
    T("09:00", "09:30", { id: "kena", tarikh: "2026-09-15" }),
    T("11:00", "12:00", { id: "selamat", tarikh: "2026-09-15" }),
    T("09:00", "09:30", { id: "hari-lain", tarikh: "2026-09-16" }),
    T("09:00", "09:30", { id: "dibatal", tarikh: "2026-09-15", dibatalkan: true }),
  ],
);
sama("hanya tempahan yang benar-benar berlanggar", terjejas.map((t) => t.id), ["kena"]);


/* ================================================== GRID TEMPAHAN ===== */

/* ---- blok waktu dari set jadual ---- */
const sesi = sesiGrid(JADUAL_KOSONG);
sama("dua sesi: pagi dan petang", sesi.map((s) => s.sesi), ["pagi", "petang"]);
uji("blok pagi bermula 07:40", sesi[0].blok[0].mula === "07:40", sesi[0].blok[0].mula);
uji("blok petang bermula 13:00", sesi[1].blok[0].mula === "13:00", sesi[1].blok[0].mula);
// TIGA set pagi berkongsi sempadan blok yang SAMA (yang berbeza hanya blok
// mana yang rehat). Tanpa nyahdua, grid memapar 33 baris untuk 11 waktu.
sama("blok pagi dinyahdua", sesi[0].blok.length, 11);
sama("blok petang dinyahdua", sesi[1].blok.length, 10);
uji(
  "blok tersusun mengikut masa",
  sesi[0].blok.every((b, i) => i === 0 || sesi[0].blok[i - 1].mula <= b.mula),
);

/* ---- minggu ---- */
sama("Isnin bagi Khamis 17 Sep 2026", isninMinggu("2026-09-17"), "2026-09-14");
sama("Isnin bagi Isnin itu sendiri", isninMinggu("2026-09-14"), "2026-09-14");
// AHAD MILIK MINGGU SEBELUMNYA. Dalam `Date` JavaScript, Ahad ialah hari 0 —
// mengiranya sebagai permulaan minggu meletakkan Ahad 20 Sep dalam minggu
// yang bermula 21 Sep, iaitu hari SELEPASNYA.
sama("Ahad milik minggu sebelumnya", isninMinggu("2026-09-20"), "2026-09-14");
sama("tambah hari melintasi bulan", tambahHari("2026-09-30", 1), "2026-10-01");
sama("tambah hari negatif", tambahHari("2026-10-01", -1), "2026-09-30");
sama("lima hari minggu", tarikhMinggu("2026-09-14").length, 5);
sama("hari terakhir Jumaat", tarikhMinggu("2026-09-14")[4], "2026-09-18");
sama("tujuh hari bila diminta", tarikhMinggu("2026-09-14", 7)[6], "2026-09-20");
uji("Sabtu ialah hujung minggu", hujungMinggu("2026-09-19"));
uji("Ahad ialah hujung minggu", hujungMinggu("2026-09-20"));
uji("Khamis bukan hujung minggu", !hujungMinggu("2026-09-17"));
uji("label lajur membawa nama hari", labelLajur("2026-09-14") === "Isnin 14/9", labelLajur("2026-09-14"));

/* ---- cuti dari takwim ---- */
const acara = [
  { tarikh: "2026-12-25", program: "CUTI KRISMAS" },
  { tarikh: "2026-10-05", program: "MESYUARAT PANITIA MATEMATIK BIL 3" },
  { tarikh: "2026-11-01", program: "CUTI PENGGAL 3" },
  { tarikh: null, program: "CUTI TANPA TARIKH" },
  { tarikh: "2026-10-20", program: "UJIAN SUMATIF" },
];
sama("hanya program cuti diambil", tarikhCuti(acara), ["2026-11-01", "2026-12-25"]);
// MESYUARAT DAN UJIAN BUKAN CUTI. Kalau setiap acara takwim menutup hari itu,
// separuh tahun menjadi "perlu kelulusan" dan guru berhenti menggunakan grid.
uji("mesyuarat bukan cuti", !tarikhCuti(acara).includes("2026-10-05"));
uji("hari cuti perlu kelulusan", perluKelulusan("2026-12-25", ["2026-12-25"]));
uji("hujung minggu perlu kelulusan walau tiada dalam takwim", perluKelulusan("2026-09-19", []));
uji("hari sekolah biasa tidak perlu kelulusan", !perluKelulusan("2026-09-17", ["2026-12-25"]));

/* ---- status bilik dalam satu blok ---- */
const BILIK: Bilik[] = [
  { id: "b1", nama: "Bilik Mesyuarat", muatan: 20, nota: null, aktif: true },
  { id: "b2", nama: "Makmal 1", muatan: 40, nota: null, aktif: true },
  { id: "b3", nama: "Surau", muatan: 200, nota: null, aktif: true },
  { id: "b4", nama: "Bilik Lama", muatan: null, nota: null, aktif: false },
];
const blok = { id: "09:10-09:40", mula: "09:10", tamat: "09:40" };
const tetapMakmal: Tetap = {
  id: "x1", bilik_id: "b2", hari: "khamis", mula: "09:00", tamat: "10:00",
  sebab: "Kelas Moral", sumber: "jadual", subjek: "PM", kelas: "2 MAJU",
  dari_tarikh: null, hingga_tarikh: null, aktif: true,
};
const tempahanB1 = T("09:00", "09:30", { id: "tb1", tarikh: "2026-09-17" });
sama(
  "bilik yang ditempah = ditempah",
  statusBilik("b1", "2026-09-17", blok, [tempahanB1], []).status,
  "ditempah",
);
// WAKTU TETAP DIDAHULUKAN. Sebabnya berbeza, dan guru perlu tahu yang mana:
// "kelas menggunakannya setiap minggu" bukan "cuba waktu lain hari ini".
sama(
  "waktu tetap menang atas tempahan",
  statusBilik("b2", "2026-09-17", blok, [{ ...tempahanB1, bilik_id: "b2" }], [tetapMakmal]).status,
  "tetap",
);
sama(
  "bilik bebas = kosong",
  statusBilik("b3", "2026-09-17", blok, [tempahanB1], [tetapMakmal]).status,
  "kosong",
);
// SEMPADAN BERSENTUHAN BUKAN PERTINDIHAN, sama seperti tempahan biasa.
sama(
  "tempahan yang tamat tepat waktu blok mula",
  statusBilik("b1", "2026-09-17", { mula: "09:30", tamat: "10:00" }, [tempahanB1], []).status,
  "kosong",
);

const sel = selGrid("2026-09-17", blok, BILIK, [tempahanB1], [tetapMakmal], "2026-09-17");
sama("bilik tidak aktif tidak dikira", sel.jumlah, 3);
sama("satu kosong daripada tiga", sel.kosong, 1);
uji("hari ini bukan lalu", !sel.lalu);
uji(
  "hari sebelum hari ini ditanda lalu",
  selGrid("2026-09-16", blok, BILIK, [], [], "2026-09-17").lalu,
);
// TEMPAHAN MENUNGGU TIDAK MENGUNCI SLOT — dua guru boleh memohon hari cuti
// yang sama, dan pentadbir yang memilih.
// Tiga bilik aktif: tempahan yang DILULUSKAN menutup satu, tempahan yang
// masih menunggu tidak menutup apa-apa.
sama(
  "tempahan lulus menutup satu bilik",
  selGrid("2026-09-17", blok, BILIK, [tempahanB1], [], "2026-09-17").kosong,
  2,
);
sama(
  "tempahan menunggu tidak menutup slot",
  selGrid(
    "2026-09-17", blok, BILIK,
    [{ ...tempahanB1, status: "menunggu" }], [], "2026-09-17",
  ).kosong,
  3,
);
sama(
  "tempahan ditolak tidak menutup slot",
  selGrid("2026-09-17", blok, BILIK, [{ ...tempahanB1, status: "tolak" }], [], "2026-09-17").kosong,
  3,
);
sama(
  "tempahanAktif menapis menunggu dan dibatalkan",
  tempahanAktif([
    { ...tempahanB1, id: "a" },
    { ...tempahanB1, id: "b", status: "menunggu" },
    { ...tempahanB1, id: "c", dibatalkan: true },
    { ...tempahanB1, id: "d", status: "lulus" },
  ]).map((t) => t.id),
  ["a", "d"],
);

/* ---- gabung blok berturutan ---- */
const B = (mula: string, tamat: string) => ({ id: `${mula}-${tamat}`, mula, tamat });
sama(
  "tiga waktu berturut menjadi SATU tempahan",
  gabungJulat([B("09:10", "09:40"), B("09:40", "10:10"), B("10:10", "10:30")]),
  [{ mula: "09:10", tamat: "10:30" }],
);
sama(
  "urutan terbalik tetap digabung",
  gabungJulat([B("10:10", "10:30"), B("09:10", "09:40"), B("09:40", "10:10")]),
  [{ mula: "09:10", tamat: "10:30" }],
);
// BLOK YANG TIDAK BERSENTUHAN KEKAL BERASINGAN: memilih waktu pertama dan
// waktu terakhir hari itu bukan permintaan untuk seluruh hari.
sama(
  "jurang memecahkan julat",
  gabungJulat([B("08:10", "08:40"), B("11:00", "11:30")]),
  [{ mula: "08:10", tamat: "08:40" }, { mula: "11:00", tamat: "11:30" }],
);
sama("satu blok", gabungJulat([B("08:10", "08:40")]), [{ mula: "08:10", tamat: "08:40" }]);
sama("tiada blok", gabungJulat([]), []);

/* ---- kunci sel ---- */
sama("kunci sel", kunciSel("2026-09-17", "09:10-09:40"), "2026-09-17|09:10-09:40");
sama(
  "kunci boleh dihurai balik",
  huraiKunci(kunciSel("2026-09-17", "09:10-09:40")),
  { tarikh: "2026-09-17", blokId: "09:10-09:40" },
);

/* ---- tempahan menunggu tidak menghalang tempahan baharu ---- */
const semakMenunggu = semakTempahan(
  { tarikh: "2026-10-01", mula: "09:00", tamat: "10:00" },
  [T("09:00", "10:00", { id: "menunggu", status: "menunggu" })],
);
uji("permohonan menunggu tidak mengunci slot", semakMenunggu.ok);
const semakLulus = semakTempahan(
  { tarikh: "2026-10-01", mula: "09:00", tamat: "10:00" },
  [T("09:00", "10:00", { id: "lulus", status: "lulus" })],
);
uji("tempahan diluluskan MENGUNCI slot", !semakLulus.ok);

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
