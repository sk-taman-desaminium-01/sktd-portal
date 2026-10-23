// JALANKAN: set -a; . ./.env.local; set +a; node --experimental-strip-types --no-warnings scripts/uji-aliran-hidup-keberhasilan.mjs "$PWD"
// MENULIS ke Supabase HIDUP (akaun ujian ZZUJIAN EKB …) dan memadamnya sendiri di akhir. 50 semakan lulus pada 23 Okt 2026.
// Ujian aliran penuh e-Keberhasilan terhadap Supabase HIDUP, melalui tindakan
// pelayan SEBENAR (src/lib/keberhasilan.ts). Hanya Clerk/notifikasi/next dipalsukan.
// Mencipta 3 akaun ujian sementara (dibenarkan=false, email null) dan MEMADAMNYA di akhir.
import fs from "node:fs"; import vm from "node:vm"; import { createRequire } from "node:module";
const AKAR = process.argv[2];
const req = createRequire(AKAR + "/package.json");
const ts = req("typescript");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, RAHSIA = process.env.SUPABASE_SECRET_KEY;
const kepala = { apikey: RAHSIA, Authorization: `Bearer ${RAHSIA}` };
async function minta(laluan, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${laluan}`, { ...init, headers: { ...kepala, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) } });
  const t = await res.text();
  if (!res.ok) throw new Error(`[supabase] ${res.status} ${t}`);
  return t.trim() ? JSON.parse(t) : null;
}
const db = { minta };
const bacaSemua = async (l) => { const out = []; for (let o = 0; ; o += 500) { const r = await minta(`${l}&limit=500&offset=${o}`); out.push(...r); if (r.length < 500) return out; } };
const hantarLog = [];
let saya = null;
const muat = (fail, deps) => {
  const src = ts.transpileModule(fs.readFileSync(fail, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(src, { exports: mod.exports, module: mod, require: (id) => { if (!(id in deps)) throw new Error("dep tiada: " + id); return deps[id]; }, fetch, Response, console, Date, Map, Set, URL, AbortSignal, process, Promise, JSON, structuredClone, setTimeout });
  return mod.exports;
};
const k = await import(AKAR + "/src/data/keberhasilan.ts");
const nama = await import(AKAR + "/src/lib/nama.ts");
const ekb = muat(AKAR + "/src/lib/keberhasilan.ts", {
  "node:crypto": req("node:crypto"), "next/cache": { revalidatePath() {} },
  "./akses": { pengguna: async () => saya }, "./supabase-pelayan": { klienTulis: () => db },
  "./baca-semua": { bacaSemua }, "./db-belum-sedia": await import(AKAR + "/src/lib/db-belum-sedia.ts"),
  "./notifikasi": { hantar: async (h) => { hantarLog.push(h); return true; } },
  "./sah": await import(AKAR + "/src/lib/sah.ts"), "./nama": nama,
  "./fail-sementara": { tetapan: () => ({ url: URL_, rahsia: RAHSIA, kepala }) },
  "@/data/tarikh-my": await import(AKAR + "/src/data/tarikh-my.ts"), "@/data/had-fail": { HAD_BAIT: 10485760 },
  "@/data/keberhasilan": k,
});

const gagal = []; let bil = 0;
const jangka = (n, ok, info = "") => { bil++; if (!ok) gagal.push(`✗ ${n} ${info}`); else console.log(`✓ ${n}`); };
const cap = Date.now().toString(36).toUpperCase();
const ids = {};
try {
  // Akaun ujian: dibenarkan=false + email null → tidak muncul di mana-mana senarai, tiada notifikasi.
  for (const [kunci, peranan] of [["pyd", "guru"], ["pp1", "pentadbir"], ["pp2", "pentadbir"], ["guru2", "guru"]]) {
    const [r] = await minta("pbd_guru", { method: "POST", body: JSON.stringify({ nama: `ZZUJIAN EKB ${kunci.toUpperCase()} ${cap}`, email: `${kunci}.${cap.toLowerCase()}@ujian.invalid`, peranan, dibenarkan: kunci === "pp1" || kunci === "pp2" }) });
    ids[kunci] = r.id;
  }
  const sebagai = (kunci, peranan) => { saya = { id: ids[kunci], emel: `${kunci}@ujian.invalid`, nama: `UJIAN ${kunci}`, peranan, mutlak: false, rasmi: true }; };

  // 1. PYD buka modul → borang dicipta
  sebagai("pyd", "guru");
  let d = await ekb.dataKeberhasilan();
  jangka("PYD: borang sendiri dicipta", !!d.borangSaya && d.borangSaya.peranan === "PYD");
  jangka("PYD guru: tiada Pantau & tiada Tetapan", d.pantau.length === 0 && d.pemerhati === false);
  let b = d.borangSaya.borang;

  // 2. PYD tulis 5 sasaran (penetapan)
  const bidang = structuredClone(b.bidang);
  for (let i = 0; i < 5; i++) bidang[i % bidang.length].sasaran.push({ ...k.sasaranKosong(`ujs${i}${cap.slice(-3)}`.toLowerCase()), teks: `Memastikan ${20 + i} daripada 30 murid mencapai TP3 (ujian)` });
  let r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi, pyd: { ...b.pyd, kp: "900101-10-1234", gred: "dg10" }, bidang });
  jangka("PYD simpan 5 sasaran", r.ok, r.mesej);
  b = r.data.borang;
  jangka("id sasaran klien dikekalkan", k.semuaSasaran(b).some((s) => s.id.startsWith("ujs0")));
  jangka("gred dihuruf-besarkan", b.pyd.gred === "DG10");

  // 3. Konflik versi
  r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi - 1, bidang: b.bidang });
  jangka("versi lama → konflik", !r.ok && r.konflik === true);

  // 4. Hantar tanpa PP1 ditolak
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "hantar" });
  jangka("hantar tanpa PP1 ditolak", !r.ok && /PP1/.test(r.mesej));

  // 5. Guru biasa tidak boleh tetapkan PP
  r = await ekb.tetapPenilai({ pydId: ids.pyd, pp1Id: ids.pp1, pp2Id: ids.pp2 });
  jangka("guru tidak boleh tetapkan PP", !r.ok);
  // 6. Pentadbir tetapkan PP; guru biasa sebagai PP ditolak
  sebagai("pp1", "pentadbir");
  r = await ekb.tetapPenilai({ pydId: ids.pyd, pp1Id: ids.guru2, pp2Id: null });
  jangka("guru biasa sebagai PP ditolak", !r.ok, r.mesej);
  r = await ekb.tetapPenilai({ pydId: ids.pyd, pp1Id: ids.pp1, pp2Id: ids.pp2 });
  jangka("pentadbir tetapkan PP1/PP2", r.ok, r.mesej);

  // 7. Guru lain tidak boleh buka borang PYD
  sebagai("guru2", "guru");
  r = await ekb.bukaBorang(b.id);
  jangka("guru lain tidak boleh buka borang orang", !r.ok);

  // 8. PYD hantar penetapan
  sebagai("pyd", "guru");
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "hantar" });
  jangka("PYD hantar penetapan", r.ok, r.mesej); b = r.data.borang;
  jangka("notifikasi ke PP1 sahaja (peribadi)", hantarLog.some((h) => h.peribadi === true && h.penerima.length === 1 && h.penerima[0].startsWith("pp1.")), JSON.stringify(hantarLog.at(-1)?.penerima));

  // 9. PP1 buka: K/P disembunyikan; pulangkan tanpa sebab ditolak; dengan sebab berjaya
  sebagai("pp1", "pentadbir");
  r = await ekb.bukaBorang(b.id);
  jangka("PP1 buka borang sebagai PP1", r.ok && r.data.peranan === "PP1");
  jangka("No. K/P tidak sampai kepada PP1", r.ok && r.data.borang.pyd.kp === "");
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "pulang", sebab: "" });
  jangka("pulang tanpa sebab ditolak", !r.ok);
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "pulang", sebab: "Nyatakan peringkat sasaran." });
  jangka("PP1 pulangkan dengan sebab", r.ok, r.mesej); b = r.data.borang;

  // 10. Ulasan dua hala
  const s0 = k.semuaSasaran(b)[0].id;
  r = await ekb.tambahUlasan({ borangId: b.id, sasaranId: s0, teks: "Sila tambah peringkat." });
  jangka("PP1 mengulas", r.ok, r.mesej);
  sebagai("pyd", "guru");
  r = await ekb.tambahUlasan({ borangId: b.id, sasaranId: s0, teks: "Baik, dipinda." });
  jangka("PYD membalas", r.ok, r.mesej);

  // 11. PYD hantar semula → PP1 sahkan → PP2 perakui
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "hantar" }); jangka("PYD hantar semula", r.ok, r.mesej); b = r.data.borang;
  sebagai("pp2", "pentadbir");
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "perakui" });
  jangka("PP2 tidak boleh perakui sebelum PP1 sahkan", !r.ok);
  sebagai("pp1", "pentadbir");
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "sahkan" }); jangka("PP1 sahkan penetapan", r.ok, r.mesej); b = r.data.borang;
  sebagai("pp2", "pentadbir");
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 0, tindakan: "perakui" }); jangka("PP2 perakui penetapan", r.ok, r.mesej); b = r.data.borang;

  // 12. P1: PYD isi pencapaian + markah (termasuk 0 dan 15/20), bukti
  sebagai("pyd", "guru");
  const bd = structuredClone(b.bidang); let n = 0;
  for (const x of bd) for (const s of x.sasaran) { s.p1 = "Dicapai separa"; s.m1 = ["15/20", "0", "100", "80", "60"][n++]; s.teks = "CUBA UBAH TEKS"; }
  r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi, bidang: bd, pyd: { ...b.pyd, gred: "DG99" } });
  jangka("PYD simpan P1", r.ok, r.mesej); b = r.data.borang;
  jangka("teks sasaran TIDAK berubah selepas penetapan", k.semuaSasaran(b).every((s) => s.teks !== "CUBA UBAH TEKS"));
  jangka("maklumat PYD dikunci selepas penetapan", b.pyd.gred === "DG10");
  jangka("15/20 → 75 dan 0 sah", k.semuaSasaran(b).map((s) => s.m1).join(",") === "75,0,100,80,60", k.semuaSasaran(b).map((s) => s.m1).join(","));
  jangka("skor P1 = purata 63 → 4", k.kira(1, b).skor === 4, JSON.stringify(k.kira(1, b)));

  const slot = await ekb.mintaSlotBukti({ borangId: b.id, sasaranId: s0, peringkat: "p1", nama: "bukti-ujian.pdf", saiz: 20 });
  jangka("slot muat naik bukti", slot.ok, slot.mesej);
  const put = await fetch(slot.urlMuatNaik, { method: "PUT", headers: { "content-type": "application/pdf", "x-upsert": "false" }, body: "%PDF-1.4 ujian ekb\n" });
  jangka("PUT bukti ke baldi persendirian", put.ok, String(put.status));
  r = await ekb.daftarBukti({ borangId: b.id, sasaranId: s0, peringkat: "p1", laluan: slot.laluan, nama: "bukti-ujian.pdf" });
  jangka("daftar bukti (versi naik)", r.ok && r.versi === b.versi + 1, r.mesej); const buktiId = r.bukti?.id; b = { ...b, versi: r.versi };
  const awam = await fetch(`${URL_}/storage/v1/object/public/ekb-bukti/${slot.laluan}`);
  jangka("bukti TIDAK boleh dibaca secara awam", !awam.ok, String(awam.status));
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 1, tindakan: "hantar" }); jangka("PYD hantar P1", r.ok, r.mesej); b = r.data.borang;

  // 13. PP1 buka bukti, ubah markah (m1_asal), kosongkan satu → sahkan ditolak, pulihkan → sahkan
  sebagai("pp1", "pentadbir");
  r = await ekb.pautanBukti(buktiId); jangka("PP1 dapat pautan bukti bertandatangan", r.ok, r.mesej);
  if (r.ok) { const f = await fetch(r.url); jangka("pautan bukti boleh dibuka", f.ok, String(f.status)); }
  let bd2 = structuredClone(b.bidang); bd2[0].sasaran[0].m1 = "70"; bd2[0].sasaran[0].teks = "PP1 CUBA UBAH";
  r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi, bidang: bd2 }); jangka("PP1 ubah markah", r.ok, r.mesej); b = r.data.borang;
  const s0b = k.semuaSasaran(b)[0];
  jangka("cadangan asal PYD disimpan (m1_asal=75)", s0b.m1 === "70" && s0b.m1_asal === "75", `${s0b.m1}/${s0b.m1_asal}`);
  jangka("PP1 tidak boleh ubah teks", s0b.teks !== "PP1 CUBA UBAH");
  bd2 = structuredClone(b.bidang); k.semuaSasaran({ bidang: bd2 })[3].m1 = "";
  r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi, bidang: bd2 }); b = r.data.borang;
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 1, tindakan: "sahkan" });
  jangka("PP1 tidak boleh sahkan borang tidak lengkap", !r.ok && /tidak lengkap/.test(r.mesej));
  bd2 = structuredClone(b.bidang); k.semuaSasaran({ bidang: bd2 })[3].m1 = "80";
  r = await ekb.simpanBorang({ borangId: b.id, versi: b.versi, bidang: bd2 }); b = r.data.borang;
  r = await ekb.tindakanPeringkat({ borangId: b.id, versi: b.versi, i: 1, tindakan: "sahkan" }); jangka("PP1 sahkan P1", r.ok, r.mesej); b = r.data.borang;

  // 14. Selepas sah: PYD tidak boleh buang bukti / ubah markah
  sebagai("pyd", "guru");
  r = await ekb.buangBukti(buktiId); jangka("bukti dikunci selepas P1 disahkan", !r.ok);

  // 15. Pantau & keterlihatan
  sebagai("pp1", "pentadbir");
  d = await ekb.dataKeberhasilan();
  const baris = d.pantau.find((x) => x.borang_id === b.id);
  jangka("Pantau PP1 memaparkan PYD sebagai PP1", baris?.peranan === "PP1");
  jangka("Pentadbir mendapat Tetapan", d.pemerhati === true && Array.isArray(d.penilai));
  jangka("calon PP tidak memuatkan guru biasa", !d.calon.pentadbir.some((o) => o.id === ids.guru2));
  sebagai("guru2", "guru");
  d = await ekb.dataKeberhasilan();
  jangka("guru biasa tidak nampak borang orang lain", d.pantau.length === 0);
  saya = { id: null, emel: "admin@ujian.invalid", nama: "Admin", peranan: "admin", mutlak: false, rasmi: true };
  r = await ekb.tetapPenilai({ pydId: ids.pyd, pp1Id: ids.pp1, pp2Id: null });
  jangka("admin biasa tidak boleh tetapkan PP", !r.ok);

  // 16. Aktiviti log
  sebagai("pyd", "guru");
  r = await ekb.bukaBorang(b.id);
  jangka("jejak aktiviti direkod", r.ok && r.data.log.length >= 8, String(r.data?.log.length));
  jangka("ulasan dua hala tersimpan", r.ok && r.data.ulasan.length === 2);

  // Buang bukti dari storan (baris DB terpadam melalui cascade)
  await fetch(`${URL_}/storage/v1/object/ekb-bukti/${slot.laluan}`, { method: "DELETE", headers: kepala });
} catch (e) {
  gagal.push("✗ RALAT: " + (e?.stack || e));
} finally {
  // PEMBERSIHAN: padam akaun ujian → cascade padam ekb_borang/penilai/ulasan/bukti/log.
  for (const id of Object.values(ids)) await minta(`pbd_guru?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch((e) => gagal.push("✗ bersih " + e.message));
  const sisa = await minta(`pbd_guru?select=id&nama=like.ZZUJIAN EKB*`);
  jangka("pembersihan: tiada akaun ujian tertinggal", sisa.length === 0, JSON.stringify(sisa));
  const sisaB = Object.values(ids).length ? await minta(`ekb_borang?select=id&pyd_id=in.(${Object.values(ids).join(",")})`) : [];
  jangka("pembersihan: tiada borang ujian tertinggal", sisaB.length === 0);
}
if (gagal.length) { console.error("\n" + gagal.join("\n")); console.error(`\n${gagal.length} daripada ${bil} GAGAL`); process.exit(1); }
console.log(`\nAliran hidup e-Keberhasilan: ${bil} semakan lulus.`);
