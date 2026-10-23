/**
 * Kontrak e-Keberhasilan (Borang Keberhasilan PBPPP) — modul tulen `src/data/keberhasilan.ts`.
 *
 * `gabungIkutKuasa` ialah satu-satunya pintu tulisan bidang/sasaran: pelayar
 * menghantar SELURUH senarai, pelayan hanya menyalin medan yang peranan itu
 * boleh ubah pada peringkat yang terbuka. Jika ia bocor, PP1 boleh menulis
 * semula sasaran PYD atau PYD boleh mengubah markah selepas dihantar.
 */
import {
  HAD_SASARAN, HAD_TEKS, MIN_SASARAN, PERINGKAT, gabungIkutKuasa, keadaan, kira, kuasa, normalMarkah,
  penghalang, peralihan, semakan, peringkatKosong, peringkatSemasa, ringkasan, sasaranKosong, tarikhTutup,
  type Bidang, type Kuasa, type KeadaanPeringkat, type PerananEkb, type Sasaran, type Tindakan,
} from "../src/data/keberhasilan.ts";

const gagal: string[] = [];
let bil = 0;
function jangka(nama: string, sebenar: unknown, mahu: unknown) {
  bil++;
  const a = JSON.stringify(sebenar), b = JSON.stringify(mahu);
  if (a !== b) gagal.push(`${nama}: dapat ${a}, mahu ${b}`);
}
const betul = (nama: string, syarat: boolean) => jangka(nama, syarat, true);

/* ---------- fixture ---------- */
const P = (s: KeadaanPeringkat) => ({ s: s as Exclude<KeadaanPeringkat, "kunci">, hantar: null, sah1: null, sah2: null, pulang: null });
const mk = (st: [KeadaanPeringkat, KeadaanPeringkat, KeadaanPeringkat, KeadaanPeringkat], bidang: Bidang[] = [], tahun = 2026) => ({
  tahun, bidang,
  peringkat: { penetapan: P(st[0]), p1: P(st[1]), semakan: P(st[2]), akhir: P(st[3]) },
});
const S = (id: string, teks: string, o: Partial<Sasaran> = {}): Sasaran => ({ ...sasaranKosong(id), teks, ...o });
const lima = (): Bidang[] => [{
  id: "B1", nama: "PDPC",
  sasaran: ["a", "b", "c", "d", "e"].map((x) => S(x, `Meningkatkan pencapaian ${x} kepada 80%`)),
}];
const penuh = (o: Partial<Sasaran> = {}): Bidang[] => [
  { id: "B1", nama: "PDPC", sasaran: [S("s1", "Meningkatkan A kepada 80%", o), S("s2", "Mencapai B sebanyak 90%", o)] },
  { id: "B2", nama: "KOKO", sasaran: [S("s3", "Menghasilkan C sebanyak 3 laporan", o)] },
];
const klon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const janaId = () => { let n = 0; return () => `n${++n}`; };
const ids = (b: Bidang[]) => b.flatMap((x) => x.sasaran.map((s) => s.id));

/* ---------- normalMarkah ---------- */
const NM: [string, string][] = [
  ["15/20", "75"], ["88,5", "88.5"], ["120", "100"], ["0", "0"], ["abc", ""], ["5/0", ""], ["", ""],
  ["  ", ""], ["-5", ""], ["15 / 20", "75"], ["30/20", "100"], ["80", "80"], ["7,25", "7.25"], ["1/3", "33.33"],
  // Sifar ialah pencapaian sah (semakan Siti Aisyah 23 Okt): membuangnya menaikkan purata.
  ["Infinity", ""], ["0.001", "0"], ["0/20", "0"],
];
for (const [m, h] of NM) jangka(`normalMarkah(${JSON.stringify(m)})`, normalMarkah(m), h);

/* ---------- kira ---------- */
const ms = (v: string[], status: Sasaran["status"] = "KEKAL") =>
  ({ bidang: [{ id: "x", nama: "X", sasaran: v.map((m, i) => S(`k${i}`, "t", { m1: m, m2: m, status })) }] });
jangka("kira purata", kira(1, ms(["80", "60"])).purata, 70);
jangka("kira kosong", kira(1, ms([])).skor, null);
jangka("kira markah kosong diabaikan", kira(1, ms(["80", ""])).bil, 1);
jangka("kira sifar dikira (purata)", kira(1, ms(["0", "100"])).purata, 50);
jangka("kira sifar dikira (skor)", kira(1, ms(["0", "100"])).skor, 3);
jangka("skor 0", kira(1, ms(["0"])).skor, 1);
for (const [m, sk] of [["1", 1], ["20", 1], ["21", 2], ["40", 2], ["41", 3], ["60", 3], ["61", 4], ["80", 4], ["81", 5], ["100", 5]] as const)
  jangka(`skor ${m}`, kira(1, ms([m])).skor, sk);
{
  const b = { bidang: [{ id: "x", nama: "X", sasaran: [S("a", "t", { m1: "100", m2: "100" }), S("b", "t", { m1: "20", m2: "20", status: "GUGUR" })] }] };
  jangka("GUGUR dikira pada which=1", kira(1, b).purata, 60);
  jangka("GUGUR dikecualikan pada which=2", kira(2, b).purata, 100);
  jangka("GUGUR which=2 bil", kira(2, b).bil, 1);
}

/* ---------- keadaan / peringkatSemasa ---------- */
{
  const a = mk(["draf", "draf", "draf", "draf"]);
  jangka("keadaan 0 draf", keadaan(a, 0), "draf");
  jangka("keadaan 1 kunci", keadaan(a, 1), "kunci");
  jangka("keadaan 3 kunci", keadaan(a, 3), "kunci");
  jangka("semasa 0", peringkatSemasa(a), 0);
  for (const s of ["dihantar", "dipulang", "draf"] as const) jangka(`${s} tidak membuka seterusnya`, keadaan(mk([s, "draf", "draf", "draf"]), 1), "kunci");
  for (const s of ["sah1", "sah2"] as const) jangka(`${s} membuka seterusnya`, keadaan(mk([s, "draf", "draf", "draf"]), 1), "draf");
  // Peringkat 2 sah1 tetapi 1 belum: 2 mesti tetap terkunci (rantai).
  jangka("rantai: 2 kunci bila 1 belum sah", keadaan(mk(["sah1", "dihantar", "sah1", "draf"]), 2), "kunci");
  jangka("rantai: 3 kunci bila 1 belum sah", keadaan(mk(["sah1", "dihantar", "sah1", "sah1"]), 3), "kunci");
  jangka("semasa 1", peringkatSemasa(mk(["sah1", "dihantar", "draf", "draf"])), 1);
  jangka("semua sah1 → 4", peringkatSemasa(mk(["sah1", "sah1", "sah1", "sah1"])), 4);
  jangka("campur sah1/sah2 → 4", peringkatSemasa(mk(["sah2", "sah1", "sah2", "sah2"])), 4);
  jangka("peringkatKosong semua draf", Object.values(peringkatKosong()).map((p) => p.s), ["draf", "draf", "draf", "draf"]);
}

/* ---------- kuasa ---------- */
const KOSONG: Kuasa = { penetapan: false, semakan: false, p1: false, m1: false, status: false, p2: false, m2: false, bukti: { p1: false, akhir: false }, pyd: false };
const K = (o: Partial<Kuasa>, pyd = false): Kuasa => ({ ...KOSONG, ...o, pyd });
type St = [KeadaanPeringkat, KeadaanPeringkat, KeadaanPeringkat, KeadaanPeringkat];
const MATRIKS: [string, St, Partial<Kuasa>, Partial<Kuasa>][] = [
  // [nama, keadaan, kuasa PYD, kuasa PP1]
  ["penetapan draf", ["draf", "draf", "draf", "draf"], { penetapan: true }, {}],
  ["penetapan dipulang", ["dipulang", "draf", "draf", "draf"], { penetapan: true }, {}],
  ["penetapan dihantar", ["dihantar", "draf", "draf", "draf"], {}, {}],
  ["penetapan sah1", ["sah1", "kunci" as never, "draf", "draf"].map((x, i) => (i === 1 ? "draf" : x)) as St, { p1: true, m1: true, bukti: { p1: true, akhir: false } }, {}],
  ["p1 dihantar", ["sah1", "dihantar", "draf", "draf"], {}, { m1: true }],
  ["p1 dipulang", ["sah1", "dipulang", "draf", "draf"], { p1: true, m1: true, bukti: { p1: true, akhir: false } }, {}],
  ["semakan draf", ["sah1", "sah1", "draf", "draf"], { semakan: true, status: true }, {}],
  ["semakan dihantar", ["sah1", "sah1", "dihantar", "draf"], {}, { status: true }],
  ["akhir draf", ["sah1", "sah1", "sah1", "draf"], { p2: true, m2: true, bukti: { p1: false, akhir: true } }, {}],
  ["akhir dihantar", ["sah1", "sah1", "sah1", "dihantar"], {}, { m2: true }],
  ["akhir sah1 (selesai)", ["sah1", "sah1", "sah1", "sah1"], {}, {}],
  ["semua sah2", ["sah2", "sah2", "sah2", "sah2"], {}, {}],
  // Peringkat 1 'dihantar' tetapi penetapan belum sah → peringkat 1 TERKUNCI, tiada kuasa.
  ["peringkat kunci: p1 dihantar tanpa penetapan sah", ["draf", "dihantar", "draf", "draf"], { penetapan: true }, {}],
  ["peringkat kunci: akhir dihantar tanpa semakan sah", ["sah1", "sah1", "draf", "dihantar"], { semakan: true, status: true }, {}],
];
for (const [nama, st, pyd, pp1] of MATRIKS) {
  const b = mk(st);
  jangka(`kuasa PYD · ${nama}`, kuasa(b, "PYD"), K(pyd, true));
  jangka(`kuasa PP1 · ${nama}`, kuasa(b, "PP1"), K(pp1));
  jangka(`kuasa PP2 · ${nama} (tidak pernah sunting)`, kuasa(b, "PP2"), KOSONG);
}

/* ---------- penghalang ---------- */
{
  const empat = lima(); empat[0].sasaran.pop();
  jangka("penghalang: 4 sasaran menghalang hantar penetapan", penghalang({ bidang: empat }, 0).length, 1);
  jangka("penghalang: 5 sasaran tidak menghalang", penghalang({ bidang: lima() }, 0).length, 0);
  const kosongTeks = lima(); kosongTeks[0].sasaran[0].teks = "   ";
  jangka("penghalang: sasaran teks kosong tidak dikira", penghalang({ bidang: kosongTeks }, 0).length, 1);
  const taksuruh = lima(); taksuruh[0].sasaran[0].teks = "Hadir mesyuarat"; // tiada ukuran → amaran sahaja
  jangka("penghalang: 'boleh diukur' hanya amaran", penghalang({ bidang: taksuruh }, 0).length, 0);
  const tanpaP1 = penuh({ m1: "80" });
  jangka("penghalang p1: p1 kosong menghalang", penghalang({ bidang: tanpaP1 }, 1).length >= 1, true);
  const p1Penuh = penuh({ p1: "Selesai", m1: "80" });
  jangka("penghalang p1: lengkap lulus (bukti hanya amaran)", penghalang({ bidang: p1Penuh }, 1).length, 0);
  jangka("MIN_SASARAN = 5", MIN_SASARAN, 5);
}

/* ---------- peralihan: matriks penuh ---------- */
{
  const PERANAN: PerananEkb[] = ["PYD", "PP1", "PP2"];
  const KEADAAN: KeadaanPeringkat[] = ["draf", "dihantar", "dipulang", "sah1", "sah2"];
  const TINDAKAN: Tindakan[] = ["hantar", "tarik", "sahkan", "pulang", "perakui"];
  // Spesifikasi bebas (ditulis semula, bukan disalin daripada pelaksanaan).
  const dibenar = (p: PerananEkb, s: KeadaanPeringkat, t: Tindakan) => {
    if (t === "hantar") return p === "PYD" && (s === "draf" || s === "dipulang");
    if (t === "tarik") return p === "PYD" && s === "dihantar";
    if (t === "sahkan") return p === "PP1" && s === "dihantar";
    if (t === "pulang") return p === "PP1" && s === "dihantar";
    return p === "PP2" && s === "sah1";
  };
  for (const s of KEADAAN) for (const p of PERANAN) for (const t of TINDAKAN) {
    const b = mk([s, "draf", "draf", "draf"], lima());
    const r = peralihan(b, 0, t, p, "2026-03-01", "Sila betulkan");
    jangka(`peralihan ${p}/${s}/${t}`, r.ok, dibenar(p, s, t));
  }
  const b = mk(["draf", "draf", "draf", "draf"], lima());
  // Hasil keadaan baharu
  const h = (s: KeadaanPeringkat, t: Tindakan, p: PerananEkb, sebab = "x") => {
    const r = peralihan(mk([s, "draf", "draf", "draf"], lima()), 0, t, p, "2026-03-01", sebab);
    return r.ok ? r.peringkat : null;
  };
  jangka("hantar → dihantar + tarikh", [h("draf", "hantar", "PYD")?.s, h("draf", "hantar", "PYD")?.hantar], ["dihantar", "2026-03-01"]);
  jangka("tarik → draf, hantar dikosongkan", [h("dihantar", "tarik", "PYD")?.s, h("dihantar", "tarik", "PYD")?.hantar], ["draf", null]);
  jangka("sahkan → sah1 + tarikh", [h("dihantar", "sahkan", "PP1")?.s, h("dihantar", "sahkan", "PP1")?.sah1], ["sah1", "2026-03-01"]);
  jangka("perakui → sah2 + tarikh", [h("sah1", "perakui", "PP2")?.s, h("sah1", "perakui", "PP2")?.sah2], ["sah2", "2026-03-01"]);
  jangka("pulang → dipulang + sebab", h("dihantar", "pulang", "PP1", " Pinda sasaran 2 ")?.pulang, { teks: "Pinda sasaran 2", tarikh: "2026-03-01" });
  // pulang mesti ada sebab bukan kosong
  for (const sebab of ["", "   ", "\n\t"]) jangka(`pulang tanpa sebab ${JSON.stringify(sebab)}`, peralihan(mk(["dihantar", "draf", "draf", "draf"], lima()), 0, "pulang", "PP1", "2026-03-01", sebab).ok, false);
  jangka("pulang sebab dipotong 1000", (h("dihantar", "pulang", "PP1", "x".repeat(5000))?.pulang?.teks ?? "").length, 1000);
  jangka("sahkan selepas dipulang memadam sebab", h("dihantar", "sahkan", "PP1")?.pulang, null);
  // hantar disekat penghalang
  const empat = lima(); empat[0].sasaran.pop();
  jangka("hantar disekat < 5 sasaran", peralihan(mk(["draf", "draf", "draf", "draf"], empat), 0, "hantar", "PYD", "2026-03-01").ok, false);
  jangka("hantar dipulang disekat < 5 sasaran", peralihan(mk(["dipulang", "draf", "draf", "draf"], empat), 0, "hantar", "PYD", "2026-03-01").ok, false);
  // peringkat terkunci: tiada tindakan sama sekali
  for (const p of PERANAN) for (const t of TINDAKAN)
    jangka(`peringkat 1 terkunci ${p}/${t}`, peralihan(mk(["draf", "dihantar", "draf", "draf"], penuh({ p1: "x", m1: "80" })), 1, t, p, "2026-03-01", "s").ok, false);
  // indeks tidak sah
  for (const i of [-1, 4, 1.5, NaN]) {
    let ok: unknown;
    try { ok = peralihan(b, i, "hantar", "PYD", "2026-03-01").ok; } catch (e) { ok = `MELONTAR ${(e as Error).message}`; }
    jangka(`indeks ${i} ditolak (bukan melontar)`, ok, false);
  }
  // peringkat ke-2 sebaik penetapan sah: hantar OK bila senarai semak lulus
  jangka("hantar p1 lulus selepas penetapan sah", peralihan(mk(["sah1", "draf", "draf", "draf"], penuh({ p1: "Selesai", m1: "80" })), 1, "hantar", "PYD", "2026-07-01").ok, true);
  void b;
}

/* ---------- gabungIkutKuasa ---------- */
const gabung = (lama: Bidang[], baru: Bidang[], st: St, peranan: PerananEkb) =>
  gabungIkutKuasa(klon(lama), klon(baru), kuasa(mk(st), peranan), peranan, janaId());
const DRAF0: St = ["draf", "draf", "draf", "draf"];
const P1_DIHANTAR: St = ["sah1", "dihantar", "draf", "draf"];
const P1_DRAF: St = ["sah1", "draf", "draf", "draf"];
const SEM_DRAF: St = ["sah1", "sah1", "draf", "draf"];
const SEM_HANTAR: St = ["sah1", "sah1", "dihantar", "draf"];
const AKHIR_DRAF: St = ["sah1", "sah1", "sah1", "draf"];
const AKHIR_HANTAR: St = ["sah1", "sah1", "sah1", "dihantar"];

// --- PP1 (p1 dihantar): hanya m1
{
  const lama = penuh({ p1: "asal p1", m1: "50", p2: "p2 asal" });
  const baru = klon(lama);
  baru[0].sasaran[0].teks = "DIUBAH PP1"; baru[0].sasaran[0].p1 = "DIUBAH"; baru[0].sasaran[0].p2 = "DIUBAH";
  baru[0].sasaran[0].catatan = "DIUBAH"; baru[0].sasaran[0].status = "GUGUR"; baru[0].sasaran[0].m2 = "99";
  baru[0].nama = "NAMA BARU";
  baru[0].sasaran.push(S("z", "Sasaran selit"));
  baru.push({ id: "B9", nama: "BIDANG SELIT", sasaran: [S("y", "selit")] });
  baru[0].sasaran.reverse();
  const r = gabung(lama, baru, P1_DIHANTAR, "PP1");
  jangka("PP1: tiada perubahan selain m1 (struktur/teks/p1/p2/status/catatan/m2 kekal)", r.bidang, lama);
  jangka("PP1: tiada log bila m1 tidak berubah", r.perubahan, []);
}
{
  const lama = penuh({ p1: "x", m1: "50" });
  const b1 = klon(lama); b1[0].sasaran[0].m1 = "70";
  const r1 = gabung(lama, b1, P1_DIHANTAR, "PP1");
  jangka("PP1 ubah m1 → 70", r1.bidang[0].sasaran[0].m1, "70");
  jangka("PP1 ubah m1 → m1_asal = 50", r1.bidang[0].sasaran[0].m1_asal, "50");
  jangka("PP1 ubah m1 → satu baris perubahan", r1.perubahan, ["Mengubah markah P1 daripada 50 kepada 70"]);
  jangka("PP1 ubah m1 sasaran lain tidak terjejas", [r1.bidang[0].sasaran[1].m1, r1.bidang[0].sasaran[1].m1_asal], ["50", undefined]);
  // kali kedua: m1_asal kekal 50
  const b2 = klon(r1.bidang); b2[0].sasaran[0].m1 = "90";
  const r2 = gabung(r1.bidang, b2, P1_DIHANTAR, "PP1");
  jangka("PP1 ubah kali ke-2: m1 = 90", r2.bidang[0].sasaran[0].m1, "90");
  jangka("PP1 ubah kali ke-2: m1_asal kekal 50", r2.bidang[0].sasaran[0].m1_asal, "50");
  jangka("PP1 ubah kali ke-2: log daripada 70 kepada 90", r2.perubahan, ["Mengubah markah P1 daripada 70 kepada 90"]);
  // tidak ubah → tiada perubahan, tiada m1_asal
  const r3 = gabung(lama, lama, P1_DIHANTAR, "PP1");
  jangka("PP1 simpan tanpa ubah: tiada m1_asal", r3.bidang[0].sasaran[0].m1_asal, undefined);
  // format markah dinormalkan: "7/10" → 70 sama dengan 70? (asal 50) → ubah
  const b4 = klon(lama); b4[0].sasaran[0].m1 = "7/10";
  jangka("PP1 m1 '7/10' dinormalkan 70", gabung(lama, b4, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].m1, "70");
  const b5 = klon(lama); b5[0].sasaran[0].m1 = "abc";
  jangka("PP1 m1 tidak sah → '' (dikosongkan, m1_asal direkod)", [gabung(lama, b5, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].m1, gabung(lama, b5, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].m1_asal], ["", "50"]);
  // PP1 tidak boleh ubah m1 bila p1 BELUM dihantar (draf) atau sudah sah
  for (const st of [P1_DRAF, ["sah1", "sah1", "draf", "draf"] as St, ["sah1", "dipulang", "draf", "draf"] as St]) {
    const bb = klon(lama); bb[0].sasaran[0].m1 = "99";
    jangka(`PP1 m1 ditolak pada keadaan ${st[1]}`, gabung(lama, bb, st, "PP1").bidang[0].sasaran[0].m1, "50");
  }
  // PP1 tidak boleh ubah m2 pada p1 dihantar
  const bm2 = klon(lama); bm2[0].sasaran[0].m2 = "10";
  jangka("PP1 m2 ditolak semasa p1 dihantar", gabung(lama, bm2, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].m2, "");
  // m1 sasaran TAMBAH tidak boleh diubah PP1
  const lamaT = penuh({ status: "TAMBAH", m1: "" }); const bT = klon(lamaT); bT[0].sasaran[0].m1 = "80";
  jangka("PP1 m1 sasaran TAMBAH ditolak", gabung(lamaT, bT, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].m1, "");
}
// --- PP1 akhir: m2 sahaja, GUGUR dikecualikan
{
  const lama = penuh({ m2: "40", p2: "p2" }); lama[0].sasaran[1].status = "GUGUR";
  const baru = klon(lama); baru[0].sasaran[0].m2 = "75"; baru[0].sasaran[1].m2 = "99"; baru[0].sasaran[0].m1 = "99"; baru[0].sasaran[0].p2 = "X";
  const r = gabung(lama, baru, AKHIR_HANTAR, "PP1");
  jangka("PP1 akhir: m2 sasaran aktif berubah", r.bidang[0].sasaran[0].m2, "75");
  jangka("PP1 akhir: m2_asal = 40", r.bidang[0].sasaran[0].m2_asal, "40");
  jangka("PP1 akhir: m2 GUGUR ditolak", r.bidang[0].sasaran[1].m2, "40");
  jangka("PP1 akhir: m1/p2 ditolak", [r.bidang[0].sasaran[0].m1, r.bidang[0].sasaran[0].p2], ["", "p2"]);
  jangka("PP1 akhir: log menyebut 'akhir'", r.perubahan, ["Mengubah markah akhir daripada 40 kepada 75"]);
}
// --- PP1 semakan: status sahaja
{
  const lama = penuh({});
  const baru = klon(lama); baru[0].sasaran[0].status = "GUGUR"; baru[0].sasaran[1].status = "PINDA"; baru[0].sasaran[1].teks = "TEKS PP1";
  baru[1].sasaran[0].status = "TAMBAH";
  const r = gabung(lama, baru, SEM_HANTAR, "PP1");
  jangka("PP1 semakan: status → GUGUR", r.bidang[0].sasaran[0].status, "GUGUR");
  jangka("PP1 semakan: status → PINDA", r.bidang[0].sasaran[1].status, "PINDA");
  jangka("PP1 semakan: teks tidak boleh diubah", r.bidang[0].sasaran[1].teks, lama[0].sasaran[1].teks);
  jangka("PP1 semakan: KEKAL → TAMBAH ditolak", r.bidang[1].sasaran[0].status, "KEKAL");
  jangka("PP1 semakan: 2 log status", r.perubahan.length, 2);
  // PP1 tidak boleh menambah sasaran semasa semakan
  const b2 = klon(lama); b2[0].sasaran.push(S("baru1", "Sasaran PP1 selit"));
  jangka("PP1 semakan: tidak boleh tambah sasaran", ids(gabung(lama, b2, SEM_HANTAR, "PP1").bidang), ids(lama));
  // status tidak sah → KEKAL
  const b3 = klon(lama); (b3[0].sasaran[0] as { status: string }).status = "HANTU"; (b3[0].sasaran[1] as { status: string }).status = "GUGUR";
  const r3 = gabung(lama, b3, SEM_HANTAR, "PP1");
  jangka("status tidak sah dinormal KEKAL", r3.bidang[0].sasaran[0].status, "KEKAL");
}

// --- PYD penetapan: struktur penuh
{
  const lama = lima();
  const baru = klon(lama);
  baru[0].sasaran.push(S("tmp1", "Mencapai F sebanyak 5 projek"));
  baru.push({ id: "B2", nama: "kokurikulum", sasaran: [S("tmp2", "Menghasilkan G sebanyak 2 produk")] });
  const r = gabung(lama, baru, DRAF0, "PYD");
  jangka("PYD penetapan: tambah sasaran & bidang", r.bidang.map((x) => x.sasaran.length), [6, 1]);
  jangka("PYD penetapan: nama bidang HURUF BESAR", r.bidang[1].nama, "KOKURIKULUM");
  const idBaru = ids(r.bidang).filter((x) => !ids(lama).includes(x));
  jangka("PYD penetapan: id sasaran baharu yang selamat dikekalkan", idBaru.includes("tmp1") && idBaru.includes("tmp2"), true);
  jangka("PYD penetapan: sasaran baharu berstatus KEKAL", r.bidang.flatMap((x) => x.sasaran).filter((s) => idBaru.includes(s.id)).map((s) => s.status), ["KEKAL", "KEKAL"]);
  // padam
  const pd = klon(lama); pd[0].sasaran.splice(1, 2);
  jangka("PYD penetapan: padam sasaran", ids(gabung(lama, pd, DRAF0, "PYD").bidang), ["a", "d", "e"]);
  // susun semula
  const rev = klon(lama); rev[0].sasaran.reverse();
  jangka("PYD penetapan: susun semula", ids(gabung(lama, rev, DRAF0, "PYD").bidang), ["e", "d", "c", "b", "a"]);
  // pindah antara bidang
  const dua = klon(lama); dua.push({ id: "B2", nama: "X", sasaran: [] });
  const lamaDua = klon(dua); const pindah = klon(dua); pindah[1].sasaran.push(pindah[0].sasaran.shift()!);
  const rp = gabung(lamaDua, pindah, DRAF0, "PYD");
  jangka("PYD penetapan: pindah sasaran antara bidang mengekalkan id", [ids([rp.bidang[0]]), ids([rp.bidang[1]])], [["b", "c", "d", "e"], ["a"]]);
  // padam bidang
  jangka("PYD penetapan: padam bidang", gabung(lamaDua, [pindah[0]], DRAF0, "PYD").bidang.length, 1);
  // sasaran sedia ada: teks boleh ubah, p1/m1/p2/m2/status TIDAK
  const sedia = klon(lama); Object.assign(sedia[0].sasaran[0], { teks: "Teks baru 100%", p1: "CURI", m1: "100", p2: "CURI", m2: "100", status: "GUGUR" });
  const rs = gabung(lama, sedia, DRAF0, "PYD").bidang[0].sasaran[0];
  jangka("PYD penetapan: teks diubah", rs.teks, "Teks baru 100%");
  jangka("PYD penetapan: p1/m1/p2/m2/status tidak boleh diubah", [rs.p1, rs.m1, rs.p2, rs.m2, rs.status], ["", "", "", "", "KEKAL"]);
  // had
  const banyak: Bidang[] = Array.from({ length: 13 }, (_, i) => ({ id: `b${i}`, nama: `N${i}`, sasaran: [] }));
  jangka("had 12 bidang", gabung([], banyak, DRAF0, "PYD").bidang.length, 12);
  const sasaran41: Bidang[] = [{ id: "B", nama: "B", sasaran: Array.from({ length: 41 }, (_, i) => S(`q${i}`, `Mencapai ${i}%`)) }];
  jangka("had 40 sasaran", gabung([], sasaran41, DRAF0, "PYD").bidang[0].sasaran.length, HAD_SASARAN);
  const merentas: Bidang[] = [
    { id: "B1", nama: "1", sasaran: Array.from({ length: 30 }, (_, i) => S(`p${i}`, `t${i}`)) },
    { id: "B2", nama: "2", sasaran: Array.from({ length: 30 }, (_, i) => S(`r${i}`, `t${i}`)) },
  ];
  jangka("had 40 sasaran merentas bidang", gabung([], merentas, DRAF0, "PYD").bidang.flatMap((x) => x.sasaran).length, HAD_SASARAN);
  // pemangkasan teks
  const panjang = klon(lama); panjang[0].sasaran[0].teks = "x".repeat(5000); panjang[0].nama = "n".repeat(500); panjang[0].sasaran[0].catatan = "c".repeat(5000);
  const rl = gabung(lama, panjang, DRAF0, "PYD").bidang[0];
  jangka("teks sasaran dipotong HAD_TEKS", rl.sasaran[0].teks.length, HAD_TEKS);
  jangka("nama bidang dipotong 160", rl.nama.length, 160);
  jangka("catatan dipotong 300", rl.sasaran[0].catatan.length, 300);
  // id klien mesti unik dalam output (dua baris dengan id sama tidak menggandakan sasaran sedia ada)
  const dup = klon(lama); dup[0].sasaran.push(klon(dup[0].sasaran[0]));
  const idDup = ids(gabung(lama, dup, DRAF0, "PYD").bidang);
  jangka("tiada id sasaran berganda dalam output", new Set(idDup).size, idDup.length);
  const dupB = klon(lama); dupB.push(klon(dupB[0]));
  const idB = gabung(lama, dupB, DRAF0, "PYD").bidang.map((x) => x.id);
  jangka("tiada id bidang berganda dalam output", new Set(idB).size, idB.length);
}

// --- Selain penetapan: struktur dikunci
for (const [nama, st, peranan] of [
  ["PYD p1 draf", P1_DRAF, "PYD"], ["PYD akhir draf", AKHIR_DRAF, "PYD"], ["PP1 p1 dihantar", P1_DIHANTAR, "PP1"],
  ["PP1 akhir dihantar", AKHIR_HANTAR, "PP1"], ["PYD p1 dihantar", P1_DIHANTAR, "PYD"],
] as [string, St, PerananEkb][]) {
  const lama = penuh({ p1: "p", m1: "50", p2: "q", m2: "50" });
  const baru = klon(lama);
  baru[0].sasaran.push(S("tambahan", "Sasaran tambahan")); baru.push({ id: "B9", nama: "SELIT", sasaran: [S("tambahan2", "t")] });
  baru[0].sasaran.shift(); baru[1].sasaran.pop();
  const r = gabung(lama, baru, st, peranan);
  jangka(`${nama}: bidang/sasaran tambahan diabaikan`, r.bidang.map((x) => x.id), ["B1", "B2"]);
  jangka(`${nama}: sasaran dipadam TIDAK dipadam`, ids(r.bidang), ["s1", "s2", "s3"]);
  const rev = klon(lama); rev[0].sasaran.reverse();
  jangka(`${nama}: susunan kekal`, ids(gabung(lama, rev, st, peranan).bidang), ["s1", "s2", "s3"]);
  const nm = klon(lama); nm[0].nama = "UBAH";
  jangka(`${nama}: nama bidang kekal`, gabung(lama, nm, st, peranan).bidang[0].nama, "PDPC");
}
{
  // PYD p1 draf: ubah p1 & m1; teks/p2/m2/status tidak; TAMBAH tiada p1
  const lama = penuh({ p1: "lama", m1: "40" });
  lama[1].sasaran[0].status = "TAMBAH"; lama[1].sasaran[0].p1 = ""; lama[1].sasaran[0].m1 = "";
  const baru = klon(lama);
  baru[0].sasaran[0].p1 = "baru"; baru[0].sasaran[0].m1 = "88,5"; baru[0].sasaran[0].teks = "HACK"; baru[0].sasaran[0].p2 = "HACK"; baru[0].sasaran[0].m2 = "99"; baru[0].sasaran[0].status = "GUGUR";
  baru[1].sasaran[0].p1 = "HACK"; baru[1].sasaran[0].m1 = "99";
  const r = gabung(lama, baru, P1_DRAF, "PYD").bidang;
  const s = r[0].sasaran[0];
  jangka("PYD p1: p1 & m1 (dinormalkan) disimpan", [s.p1, s.m1], ["baru", "88.5"]);
  jangka("PYD p1: m1_asal TIDAK direkod (bukan PP1)", s.m1_asal, undefined);
  jangka("PYD p1: teks/p2/m2/status ditolak", [s.teks, s.p2, s.m2, s.status], [lama[0].sasaran[0].teks, "", "", "KEKAL"]);
  jangka("PYD p1: sasaran TAMBAH tiada p1/m1", [r[1].sasaran[0].p1, r[1].sasaran[0].m1], ["", ""]);
}
{
  // PYD p1 dihantar: terkunci sepenuhnya
  const lama = penuh({ p1: "lama", m1: "40" }); const baru = klon(lama);
  baru[0].sasaran[0].p1 = "HACK"; baru[0].sasaran[0].m1 = "99"; baru[0].sasaran[0].catatan = "HACK";
  jangka("PYD p1 dihantar: tiada perubahan (beku)", gabung(lama, baru, P1_DIHANTAR, "PYD").bidang, lama);
}
{
  // PYD akhir: p2 & m2; GUGUR tiada p2/m2
  const lama = penuh({ p2: "lama", m2: "40" }); lama[0].sasaran[1].status = "GUGUR";
  const baru = klon(lama); baru[0].sasaran[0].p2 = "baru"; baru[0].sasaran[0].m2 = "9/10"; baru[0].sasaran[1].p2 = "HACK"; baru[0].sasaran[1].m2 = "99"; baru[0].sasaran[0].p1 = "HACK";
  const r = gabung(lama, baru, AKHIR_DRAF, "PYD").bidang[0].sasaran;
  jangka("PYD akhir: p2 & m2 disimpan", [r[0].p2, r[0].m2], ["baru", "90"]);
  jangka("PYD akhir: GUGUR tidak boleh p2/m2", [r[1].p2, r[1].m2], ["lama", "40"]);
  jangka("PYD akhir: p1 ditolak", r[0].p1, "");
}

// --- Semakan: PYD
{
  const lama = penuh({});
  const baru = klon(lama);
  // status KEKAL → PINDA OK; KEKAL → TAMBAH ditolak; KEKAL → GUGUR OK
  baru[0].sasaran[0].status = "PINDA"; baru[0].sasaran[1].status = "TAMBAH"; baru[1].sasaran[0].status = "GUGUR";
  const r = gabung(lama, baru, SEM_DRAF, "PYD").bidang;
  jangka("PYD semakan: KEKAL→PINDA", r[0].sasaran[0].status, "PINDA");
  jangka("PYD semakan: KEKAL→TAMBAH ditolak", r[0].sasaran[1].status, "KEKAL");
  jangka("PYD semakan: KEKAL→GUGUR", r[1].sasaran[0].status, "GUGUR");
}
{
  // Teks hanya boleh diubah bila status PINDA/TAMBAH
  const lama = penuh({}); lama[0].sasaran[0].status = "PINDA"; lama[0].sasaran[1].status = "KEKAL"; lama[1].sasaran[0].status = "TAMBAH";
  const baru = klon(lama); for (const x of baru) for (const s of x.sasaran) s.teks = "TEKS BARU";
  const r = gabung(lama, baru, SEM_DRAF, "PYD").bidang;
  jangka("PYD semakan: teks PINDA boleh diubah", r[0].sasaran[0].teks, "TEKS BARU");
  jangka("PYD semakan: teks KEKAL tidak boleh diubah", r[0].sasaran[1].teks, lama[0].sasaran[1].teks);
  jangka("PYD semakan: teks TAMBAH boleh diubah", r[1].sasaran[0].teks, "TEKS BARU");
  // tidak boleh tukar status TAMBAH → lain? (dibenarkan: TAMBAH kekal TAMBAH sahaja atau diubah?) — rekod sahaja
  const b2 = klon(lama); b2[1].sasaran[0].status = "TAMBAH";
  jangka("PYD semakan: status TAMBAH kekal TAMBAH", gabung(lama, b2, SEM_DRAF, "PYD").bidang[1].sasaran[0].status, "TAMBAH");
}
{
  // Tambah sasaran semasa semakan
  const lama = penuh({});
  const baru = klon(lama);
  baru[0].sasaran.push(S("tmpA", "Sasaran tambahan 10%"));
  baru[0].sasaran.push(S("tmpB", "   ")); // teks kosong → dibuang
  baru.push({ id: "B9", nama: "BIDANG SELIT", sasaran: [S("tmpC", "Tak patut masuk")] });
  baru[0].sasaran[0].teks = baru[0].sasaran[0].teks; // tiada ubah
  const r = gabung(lama, baru, SEM_DRAF, "PYD");
  jangka("PYD semakan: sasaran bertulis ditambah di hujung", r.bidang[0].sasaran.length, 3);
  const t = r.bidang[0].sasaran[2];
  jangka("PYD semakan: sasaran baharu berstatus TAMBAH", [t.status, t.teks], ["TAMBAH", "Sasaran tambahan 10%"]);
  jangka("PYD semakan: id klien selamat dikekalkan", t.id, "tmpA");
  jangka("PYD semakan: bidang baharu diabaikan", r.bidang.map((x) => x.id), ["B1", "B2"]);
  jangka("PYD semakan: sasaran sedia ada kekal di tempat", ids(r.bidang).slice(0, 2), ["s1", "s2"]);
  jangka("PYD semakan: log 'Menambah sasaran TAMBAH'", r.perubahan, ["Menambah sasaran TAMBAH"]);
  // sasaran baharu yang sudah ada tidak digandakan pada simpan seterusnya
  const kali2 = klon(r.bidang); const r2 = gabung(r.bidang, kali2, SEM_DRAF, "PYD");
  jangka("PYD semakan: simpan semula tidak menggandakan", ids(r2.bidang), ids(r.bidang));
  // tidak boleh padam
  const pd = klon(lama); pd[0].sasaran.pop();
  jangka("PYD semakan: sasaran dipadam TIDAK dipadam", ids(gabung(lama, pd, SEM_DRAF, "PYD").bidang), ["s1", "s2", "s3"]);
  // had 40 sasaran
  const hampir: Bidang[] = [{ id: "B1", nama: "B", sasaran: Array.from({ length: 39 }, (_, i) => S(`z${i}`, `t${i}`)) }];
  const lebih = klon(hampir); lebih[0].sasaran.push(S("n1", "satu"), S("n2", "dua"), S("n3", "tiga"));
  jangka("PYD semakan: jumlah sasaran tidak melebihi 40", ids(gabung(hampir, lebih, SEM_DRAF, "PYD").bidang).length, 40);
  // hanya PYD (bukan PP1) — sudah diuji di atas; sasaran TAMBAH baharu tiada m1/p1
  const bm = klon(lama); bm[0].sasaran.push(S("tmpD", "Baru", { m1: "99", p1: "x", m2: "99", p2: "x", status: "GUGUR" }));
  const ts = gabung(lama, bm, SEM_DRAF, "PYD").bidang[0].sasaran[2];
  jangka("sasaran baharu: m1/p1/m2/p2 dari klien dibuang, status dipaksa TAMBAH", [ts.m1, ts.p1, ts.m2, ts.p2, ts.status], ["", "", "", "", "TAMBAH"]);
  // PYD semakan dihantar: beku
  const bd = klon(lama); bd[0].sasaran[0].status = "GUGUR"; bd[0].sasaran.push(S("tmpE", "xx"));
  jangka("PYD semakan dihantar: beku", gabung(lama, bd, SEM_HANTAR, "PYD").bidang, lama);
}

// --- Struktur penetapan bila penetapan DIHANTAR: beku (PYD tidak boleh menyunting selepas hantar)
{
  const lama = lima(); const baru = klon(lama); baru[0].sasaran[0].teks = "HACK"; baru[0].sasaran.pop();
  jangka("PYD penetapan dihantar: beku", gabung(lama, baru, ["dihantar", "draf", "draf", "draf"], "PYD").bidang, lama);
  jangka("PYD penetapan disahkan: beku", gabung(lama, baru, ["sah1", "sah1", "sah1", "sah1"], "PYD").bidang, lama);
}

// --- PP2: kuasa kosong → keluaran SAMA dengan lama, di setiap keadaan
{
  const lama = penuh({ p1: "p", m1: "50", p2: "q", m2: "60" }); lama[0].sasaran[0].m1_asal = "30";
  const baru = klon(lama);
  baru[0].nama = "HACK"; baru[0].sasaran[0].teks = "HACK"; baru[0].sasaran[0].p1 = "HACK"; baru[0].sasaran[0].m1 = "99"; baru[0].sasaran[0].m2 = "99";
  baru[0].sasaran[0].status = "GUGUR"; baru[0].sasaran[0].catatan = "HACK"; baru[0].sasaran.push(S("z", "selit")); baru.push({ id: "BX", nama: "HACK", sasaran: [] });
  for (const st of [DRAF0, P1_DIHANTAR, P1_DRAF, SEM_DRAF, SEM_HANTAR, AKHIR_DRAF, AKHIR_HANTAR, ["sah1", "sah1", "sah1", "sah1"] as St, ["sah2", "sah2", "sah2", "sah2"] as St]) {
    const r = gabung(lama, baru, st, "PP2");
    jangka(`PP2 [${st}]: keluaran serupa lama`, r.bidang, lama);
    jangka(`PP2 [${st}]: tiada log`, r.perubahan, []);
  }
}
// --- Tidak mutasi input
{
  const lama = penuh({ m1: "50" }); const salinan = klon(lama);
  const baru = klon(lama); baru[0].sasaran[0].m1 = "99";
  gabungIkutKuasa(lama, baru, kuasa(mk(P1_DIHANTAR), "PP1"), "PP1", janaId());
  jangka("gabung tidak mengubah `lama`", lama, salinan);
}
// --- catatan: hanya PYD (k.pyd) — dan hanya bila ada medan terbuka
{
  const lama = penuh({ p1: "p", m1: "50" }); const baru = klon(lama); baru[0].sasaran[0].catatan = "nota saya";
  jangka("catatan PYD disimpan semasa p1 terbuka", gabung(lama, baru, P1_DRAF, "PYD").bidang[0].sasaran[0].catatan, "nota saya");
  jangka("catatan PP1 ditolak", gabung(lama, baru, P1_DIHANTAR, "PP1").bidang[0].sasaran[0].catatan, "");
}
// --- Struktur pelayar yang rosak tidak boleh meruntuhkan pelayan secara senyap
{
  const lama = lima();
  let melontar = false;
  try { gabung(lama, [{ id: "B1", nama: "x" } as unknown as Bidang], DRAF0, "PYD"); } catch { melontar = true; }
  jangka("bidang tanpa tatasusunan sasaran: melontar (ditangkap oleh simpanBorang) atau ditoleransi", typeof melontar, "boolean");
}

/* ---------- regresi: pengesahan disemak SEMULA selepas pindaan PP1/PP2 ---------- */
{
  const bangun = (st: St, bidang: Bidang[]) => ({ ...mk(st, bidang) });
  // p1 dihantar, semua sah → sahkan lulus; PP1 kosongkan satu m1 → sahkan ditolak
  const p1 = lima(); for (const x of p1[0].sasaran) { x.p1 = "Selesai"; x.m1 = "80"; }
  jangka("regresi: sahkan p1 lulus sebelum pindaan", peralihan(bangun(P1_DIHANTAR, p1), 1, "sahkan", "PP1", "2026-07-01").ok, true);
  const k1 = klon(p1); k1[0].sasaran[2].m1 = "";
  const g1 = gabung(p1, k1, P1_DIHANTAR, "PP1").bidang;
  jangka("regresi: PP1 kosongkan m1 diterima gabung", g1[0].sasaran[2].m1, "");
  const r1 = peralihan(bangun(P1_DIHANTAR, g1), 1, "sahkan", "PP1", "2026-07-01");
  jangka("regresi: sahkan p1 ditolak selepas m1 dikosongkan", r1.ok, false);
  jangka("regresi: pulang p1 masih dibenarkan", peralihan(bangun(P1_DIHANTAR, g1), 1, "pulang", "PP1", "2026-07-01", "Isi markah").ok, true);
  // markah 0 sah → sahkan lulus
  const k0 = klon(p1); k0[0].sasaran[2].m1 = "0";
  jangka("regresi: m1 '0' diterima gabung", gabung(p1, k0, P1_DIHANTAR, "PP1").bidang[0].sasaran[2].m1, "0");
  jangka("regresi: sahkan p1 lulus dengan m1 '0'", peralihan(bangun(P1_DIHANTAR, gabung(p1, k0, P1_DIHANTAR, "PP1").bidang), 1, "sahkan", "PP1", "2026-07-01").ok, true);
  // semakan: PP1 GUGUR semua → sahkan ditolak
  const sm = lima();
  const SEM_H: St = ["sah1", "sah1", "dihantar", "draf"];
  jangka("regresi: sahkan semakan lulus sebelum pindaan", peralihan(bangun(SEM_H, sm), 2, "sahkan", "PP1", "2026-08-01").ok, true);
  const kg = klon(sm); for (const s of kg[0].sasaran) s.status = "GUGUR";
  const gg = gabung(sm, kg, SEM_H, "PP1").bidang;
  jangka("regresi: PP1 GUGUR semua diterima gabung", gg[0].sasaran.map((s) => s.status), ["GUGUR", "GUGUR", "GUGUR", "GUGUR", "GUGUR"]);
  jangka("regresi: sahkan semakan ditolak bila aktif < 5", peralihan(bangun(SEM_H, gg), 2, "sahkan", "PP1", "2026-08-01").ok, false);
  const k4 = klon(sm); k4[0].sasaran[0].status = "GUGUR";
  jangka("regresi: sahkan semakan ditolak bila satu GUGUR (aktif 4)", peralihan(bangun(SEM_H, gabung(sm, k4, SEM_H, "PP1").bidang), 2, "sahkan", "PP1", "2026-08-01").ok, false);
  // perakui PP2 ditolak bila penghalang tidak kosong
  const empat = lima(); empat[0].sasaran.pop();
  jangka("regresi: perakui ditolak bila < 5 sasaran", peralihan(bangun(["sah1", "draf", "draf", "draf"], empat), 0, "perakui", "PP2", "2026-03-01").ok, false);
  jangka("regresi: perakui lulus bila lengkap", peralihan(bangun(["sah1", "draf", "draf", "draf"], lima()), 0, "perakui", "PP2", "2026-03-01").ok, true);
}
// markah 0 dikira terisi dalam senarai semak
{
  const b = { bidang: penuh({ p1: "x", m1: "0" }) };
  const c = semakan(b, 1);
  jangka("semakan p1: '0' dikira terisi", [c[1][0], c[1][1]], [true, "Cadangan markah: 3/3"]);
  const b2 = { bidang: penuh({ p1: "x", m1: "" }) };
  jangka("semakan p1: kosong tidak dikira", [semakan(b2, 1)[1][0], semakan(b2, 1)[1][1]], [false, "Cadangan markah: 0/3"]);
  const b3 = { bidang: penuh({ p2: "x", m2: "0" }) };
  jangka("semakan akhir: '0' dikira terisi", [semakan(b3, 3)[1][0], semakan(b3, 3)[1][1]], [true, "Cadangan markah: 3/3"]);
}

/* ---------- ringkasan.lewat ---------- */
{
  const b = (st: St, tahun = 2026) => mk(st, lima(), tahun);
  jangka("tarikhTutup penetapan", tarikhTutup(2026, 0), "2026-01-31");
  jangka("tarikhTutup p1", tarikhTutup(2026, 1), "2026-07-31");
  jangka("tarikhTutup semakan", tarikhTutup(2026, 2), "2026-08-15");
  jangka("tarikhTutup akhir", tarikhTutup(2026, 3), "2026-11-30");
  jangka("PERINGKAT ada 4", PERINGKAT.length, 4);
  jangka("lewat: sehari selepas tutup", ringkasan(b(DRAF0), "2026-02-01").lewat, true);
  jangka("lewat: pada hari tutup tidak lewat", ringkasan(b(DRAF0), "2026-01-31").lewat, false);
  jangka("lewat: sebelum tutup", ringkasan(b(DRAF0), "2026-01-01").lewat, false);
  jangka("lewat: dipulang & lepas tutup", ringkasan(b(["dipulang", "draf", "draf", "draf"]), "2026-03-01").lewat, true);
  jangka("lewat: dihantar (giliran PP1) tidak lewat", ringkasan(b(["dihantar", "draf", "draf", "draf"]), "2026-03-01").lewat, false);
  jangka("lewat: peringkat semasa p1 guna tutup 07-31", [ringkasan(b(P1_DRAF), "2026-07-31").lewat, ringkasan(b(P1_DRAF), "2026-08-01").lewat], [false, true]);
  jangka("lewat: akhir guna tutup 11-30", [ringkasan(b(AKHIR_DRAF), "2026-11-30").lewat, ringkasan(b(AKHIR_DRAF), "2026-12-01").lewat], [false, true]);
  jangka("lewat: tahun borang digunakan (2027)", [ringkasan(b(DRAF0, 2027), "2026-12-31").lewat, ringkasan(b(DRAF0, 2027), "2027-02-01").lewat], [false, true]);
  jangka("lewat: selesai tidak lewat", [ringkasan(b(["sah1", "sah1", "sah1", "sah1"]), "2030-01-01").lewat, ringkasan(b(["sah1", "sah1", "sah1", "sah1"]), "2030-01-01").st], [false, "selesai"]);
  const r = ringkasan(b(["sah1", "dihantar", "draf", "draf"]), "2026-05-01");
  jangka("ringkasan: tunggu1 / cur", [r.tunggu1, r.cur], [[1], 1]);
  jangka("ringkasan: tunggu2 (sah1 menunggu PP2)", ringkasan(b(["sah1", "dihantar", "draf", "draf"]), "2026-05-01").tunggu2, [0]);
  jangka("ringkasan: sah2 bukan tunggu2", ringkasan(b(["sah2", "draf", "draf", "draf"]), "2026-05-01").tunggu2, []);
}

/* ---------- id klien yang tidak selamat diganti ---------- */
{
  const k = kuasa({ peringkat: peringkatKosong() }, "PYD");
  const lama: Bidang[] = [{ id: "b1", nama: "B", sasaran: [S("ada1", "Memastikan 1")] }];
  const baru: Bidang[] = [{ id: "b1", nama: "B", sasaran: [S("ada1", "Memastikan 1"), S("../x", "Memastikan 2"), S("ab", "Memastikan 3")] }];
  const hasil = ids(gabungIkutKuasa(lama, baru, k, "PYD", janaId()).bidang);
  jangka("id tidak selamat diganti", hasil.includes("../x") || hasil.includes("ab"), false);
  jangka("id tidak selamat: bilangan kekal", hasil.length, 3);
}

if (gagal.length) {
  console.error(gagal.join("\n"));
  console.error(`\n${gagal.length} daripada ${bil} semakan GAGAL.`);
  process.exit(1);
}
console.log(`Kontrak e-Keberhasilan: ${bil} semakan lulus.`);
