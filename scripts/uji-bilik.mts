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

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

const T = (mula: string, tamat: string, x: Partial<Tempahan> = {}): Tempahan => ({
  id: x.id ?? "t1", bilik_id: "b1", tarikh: x.tarikh ?? "2026-10-01",
  mula, tamat, tujuan: "Mesyuarat", oleh: "a@x", nama: "Cikgu A",
  dibatalkan: x.dibatalkan ?? false, dicipta: "",
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

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
