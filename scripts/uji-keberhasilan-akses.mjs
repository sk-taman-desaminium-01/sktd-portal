/** Execute real Server Actions and React UI against an in-memory database.
 * No network, production records, environment files or credentials are used.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const projectRequire = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const clone = (x) => JSON.parse(JSON.stringify(x));
let bil = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(clone(actual), clone(expected), label); bil++;
};
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let saya, tables, notifications, gagalRangkaian = false;
const errors = [];
const pengguna = (n, peranan, mutlak = false) => ({ id: id(n), peranan, mutlak, nama: `Ujian ${n}`, emel: `ujian${n}@example.invalid`, rasmi: true });
function cocok(row, key, value) {
  if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
  if (value.startsWith("in.(")) return value.slice(4, -1).split(",").map((x) => x.replaceAll('"', "")).includes(String(row[key]));
  throw new Error(`Unsupported test filter: ${key}`);
}
async function minta(query, options = {}) {
  if (gagalRangkaian) throw new Error("Rangkaian ujian terputus");
  const [table, params] = query.split("?");
  const q = new URLSearchParams(params);
  if (!(table in tables)) throw new Error(`Unsupported test table: ${table}`);
  if (options.method === "POST") {
    const input = JSON.parse(options.body);
    if (table === "ekb_borang") {
      if (!tables[table].some((r) => r.tahun === input.tahun && r.pyd_id === input.pyd_id)) tables[table].push({ ...input, id: id(100 + tables[table].length), versi: 1 });
      return [];
    }
    const rows = Array.isArray(input) ? input : [input];
    tables[table].push(...rows); return clone(rows);
  }
  let rows = tables[table].filter((r) => [...q].every(([k, v]) => {
    if (["select", "order", "limit"].includes(k)) return true;
    if (k === "or") return v.slice(1, -1).split(",").some((term) => { const i = term.indexOf("."); return cocok(r, term.slice(0, i), term.slice(i + 1)); });
    return cocok(r, k, v);
  }));
  if (options.method === "PATCH") for (const row of rows) Object.assign(row, JSON.parse(options.body));
  if (q.has("limit")) rows = rows.slice(0, Number(q.get("limit")));
  return clone(rows);
}
const cache = new Map();
const stubs = {
  "next/cache": { revalidatePath() {} },
  [path.join(root, "src/lib/akses.ts")]: { pengguna: async () => saya },
  [path.join(root, "src/lib/supabase-pelayan.ts")]: { klienTulis: () => ({ minta }) },
  [path.join(root, "src/lib/baca-semua.ts")]: { bacaSemua: minta },
  [path.join(root, "src/lib/db-belum-sedia.ts")]: { belumDipasang: () => false },
  [path.join(root, "src/lib/notifikasi.ts")]: { hantar: async (n) => notifications.push(n) },
  [path.join(root, "src/lib/fail-sementara.ts")]: { tetapan() { throw new Error("Storage is outside this test"); } },
  [path.join(root, "src/lib/muat-naik-terus.ts")]: { mintaSlotMuatNaik() { throw new Error("Upload is outside this test"); } },
};
function load(file) {
  if (stubs[file]) return stubs[file];
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localRequire = (name) => {
    if (stubs[name]) return stubs[name];
    if (!name.startsWith(".") && !name.startsWith("@/")) return projectRequire(name);
    let target = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(file), name);
    if (!path.extname(target)) target += fs.existsSync(`${target}.ts`) ? ".ts" : ".tsx";
    return load(target);
  };
  vm.runInNewContext(code, { exports: m.exports, module: m, require: localRequire, console: { ...console, error: (...args) => errors.push(args) }, URLSearchParams, TextEncoder, TextDecoder,
    process: { env: Object.freeze({ ADMIN_EMAILS: "" }) }, fetch() { throw new Error("Network forbidden in this test"); } }, { filename: file });
  return m.exports;
}
const logic = load(path.join(root, "src/data/keberhasilan.ts"));
const access = load(path.join(root, "src/data/keberhasilan-akses.ts"));
const api = load(path.join(root, "src/lib/keberhasilan.ts"));
function reset(user) {
  saya = user; notifications = []; gagalRangkaian = false;
  const tahun = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(new Date()));
  const form = (n) => {
    const bidang = logic.susunBidangTetap([]);
    bidang[0].sasaran = Array.from({ length: 5 }, (_, i) => ({ ...logic.sasaranKosong(`sas${n}_${i}`, "KEKAL"), teks: `Menyelesaikan ${i + 1} tugasan ujian.` }));
    const peringkat = logic.peringkatKosong();
    peringkat.penetapan = { ...peringkat.penetapan, s: "dihantar", hantar: `${tahun}-01-15` };
    return { id: id(n + 10), tahun, pyd_id: id(n), versi: 1, pyd: { nama: `Ujian ${n}`, kp: "SULIT-UJIAN", gred: "", jawatan: "", tempat: "CONTOH" }, bidang, peringkat };
  };
  tables = {
    ekb_borang: [1, 2, 3, 4, 5].map(form),
    ekb_penilai: [1, 4].map((n) => ({ tahun, pyd_id: id(n), pp1_id: id(3), pp2_id: id(5) })),
    pbd_guru: [1, 2, 3, 4, 5].map((n) => ({ id: id(n), nama: `Ujian ${n}`, peranan: n < 3 ? "admin" : n === 3 ? "pentadbir" : "guru", email: `ujian${n}@example.invalid`, dibenarkan: true })),
    ekb_ulasan: [], ekb_bukti: [], ekb_log: [], ekb_pp_akp: [],
  };
}
const action = (n, tindakan, versi = 1, rest = {}) => api.tindakanPeringkat({ borangId: id(n + 10), versi, i: 0, tindakan, ...rest });
function ui(full) {
  const C = load(path.join(root, "src/app/keberhasilan/BorangEkb.tsx")).default;
  const s = { penuh: full, borangLihat: full.borang, draf: { bidang: full.borang.bidang, pyd: full.borang.pyd }, status: { jenis: "senyap" }, boleh: full.peranan !== "PP2", sibukTindak: false };
  return renderToStaticMarkup(React.createElement(C, { s, data: { hariIni: "2026-10-23" }, onRefresh() {} }));
}
async function main() {
  for (const peranan of ["admin", "pentadbir", "guru", "kerani", "kakitangan", "admin_mutlak"]) {
    reset(pengguna(2, peranan));
    check(`${peranan}: no global scope without trusted mutlak session`, access.urusSemuaKeberhasilan(saya), false);
    const d = await api.dataKeberhasilan();
    check(`${peranan}: only own form when not assigned`, [d.borangSaya.borang.pyd_id, d.pantau.length, d.pemerhati, d.guru.length, d.penilai.length, d.calon], [id(2), 0, false, 0, 0, null]);
    check(`${peranan}: direct access to unrelated form rejected`, (await api.bukaBorang(id(14))).ok, false);
    check(`${peranan}: forged mutlak approval rejected`, (await action(4, "sahkan", 1, { mutlak: true })).ok, false);
    check(`${peranan}: unrelated form cannot be edited`, (await api.simpanBorang({ borangId: id(14), versi: 1, bidang: [], mutlak: true })).ok, false);
    check(`${peranan}: unrelated form cannot be commented on`, (await api.tambahUlasan({ borangId: id(14), sasaranId: "sas4_0", teks: "Ulasan ujian" })).ok, false);
    check(`${peranan}: evaluator settings rejected`, (await api.tetapPenilai({ pydId: id(4), pp1Id: id(3), pp2Id: id(5) })).ok, false);
    check(`${peranan}: AKP settings rejected`, (await api.tetapPpAkp({ guruId: id(4), aktif: true })).ok, false);
  }
  reset(pengguna(3, "pentadbir"));
  check("ordinary admin cannot gain global scope from flag alone", access.urusSemuaKeberhasilan(pengguna(2, "admin", true)), false);
  let d = await api.dataKeberhasilan();
  check("appointed PP1 sees assigned PYDs only", d.pantau.map((r) => r.pyd.id).sort(), [id(1), id(4)]);
  check("appointed PP1 has no administration tab", d.pemerhati, false);
  check("PP1 unrelated access blocked", (await api.bukaBorang(id(12))).ok, false);
  let full = (await api.bukaBorang(id(14))).data;
  check("PP1 never receives PYD identity number or mutlak flag", [full.borang.pyd.kp, full.mutlak], ["", false]);
  check("PP1 receives confirmation UI", ui(full).includes("Sahkan Penetapan sasaran"), true);
  check("PP1 does not receive mutlak controls", ui(full).includes("Pengesahan admin mutlak"), false);
  check("PP1 can confirm assigned PYD", (await action(4, "sahkan")).ok, true);
  check("PP1 cannot impersonate PP2", (await action(4, "perakui", 2, { mutlak: true })).ok, false);
  saya = pengguna(5, "guru");
  check("appointed PP2 sees assigned PYDs only", (await api.dataKeberhasilan()).pantau.map((r) => r.pyd.id).sort(), [id(1), id(4)]);
  full = (await api.bukaBorang(id(14))).data;
  check("PP2 receives perakuan UI", ui(full).includes("Perakui Penetapan sasaran"), true);
  check("PP2 can approve assigned confirmed PYD", (await action(4, "perakui", 2)).ok, true);
  check("PP2 cannot confirm as PP1", (await action(1, "sahkan")).ok, false);

  reset(pengguna(1, "admin_mutlak", true));
  d = await api.dataKeberhasilan();
  check("mutlak sees all forms including own", d.pantau.map((r) => r.pyd.id).sort(), [1, 2, 3, 4, 5].map(id));
  check("mutlak has evaluator settings", d.pemerhati, true);
  check("ordinary admin is not an automatic evaluator", d.calon.pentadbir.some((g) => g.id === id(2)), false);
  check("ordinary admin label remains admin", d.guru.find((g) => g.id === id(2)).peranan, "admin");
  check("owner label is admin_mutlak", d.guru.find((g) => g.id === id(1)).peranan, "admin_mutlak");
  check("own form has mutlak confirmation controls", ui(d.borangSaya).includes("Pengesahan admin mutlak"), true);
  check("own submitted form has confirmation button", ui(d.borangSaya).includes("Sahkan Penetapan sasaran"), true);
  full = (await api.bukaBorang(id(12))).data;
  check("mutlak accesses unassigned form with masked identity number", [full.peranan, full.mutlak, full.borang.pyd.kp], ["PP1", true, ""]);
  check("unassigned form has mutlak confirmation controls", ui(full).includes("Pengesahan admin mutlak"), true);
  const assignments = clone(tables.ekb_penilai);
  check("mutlak cannot approve before PP1 confirmation", (await action(4, "perakui")).ok, false);
  check("mutlak can confirm without being appointed PP1", (await action(4, "sahkan")).ok, true);
  check("audit identifies real actor and override", [tables.ekb_log[0].oleh_id, tables.ekb_log[0].teks.includes("sebagai PP1")], [id(1), true]);
  check("mutlak can approve without being appointed PP2", (await action(4, "perakui", 2)).ok, true);
  check("mutlak can confirm own submitted form", (await action(1, "sahkan")).ok, true);
  full = (await api.bukaBorang(id(11))).data;
  check("own form shows perakuan after confirmation", ui(full).includes("Perakui Penetapan sasaran"), true);
  check("mutlak can approve own confirmed form", (await action(1, "perakui", 2)).ok, true);
  check("PP assignments remain unchanged after mutlak actions", tables.ekb_penilai, assignments);
  check("stale version rejected", (await action(2, "sahkan", 99)).konflik, true);
  tables.ekb_borang.find((b) => b.pyd_id === id(2)).bidang[0].sasaran = [];
  check("incomplete form cannot be confirmed by mutlak", (await action(2, "sahkan")).ok, false);
  check("mutlak return requires reason", (await action(3, "pulang")).ok, false);
  check("mutlak can return with reason", (await action(3, "pulang", 1, { sebab: "Pinda sasaran ujian" })).ok, true);
  gagalRangkaian = true;
  check("network failure reports failed approval", (await action(4, "sahkan")).ok, false);
  check("network error is logged by server", errors.some((args) => String(args[1]).includes("Rangkaian ujian terputus")), true);
  await assert.rejects(api.dataKeberhasilan(), /Rangkaian ujian/); bil++;
  reset(pengguna(1, "admin_mutlak", true));
  const concurrent = await Promise.all([action(4, "sahkan"), action(4, "sahkan")]);
  check("concurrent confirmations: exactly one succeeds", concurrent.filter((r) => r.ok).length, 1);
  check("concurrent confirmations: second request reports conflict", concurrent.filter((r) => !r.ok && r.konflik).length, 1);
  check("concurrent confirmations: one audit entry only", tables.ekb_log.length, 1);
  reset(pengguna(4, null));
  check("unapproved session cannot open a form", (await api.bukaBorang(id(14))).ok, false);
  check("unapproved session fails closed in shared guard", access.perananBorangKeberhasilan(saya, id(4), null), null);
  console.log(`Akses/aliran e-Keberhasilan: ${bil} semakan lulus (data tiruan, tiada rangkaian).`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
