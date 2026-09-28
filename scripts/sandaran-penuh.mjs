#!/usr/bin/env node
/**
 * Sandaran PENUH — bukan sekadar data. Kit pemulihan bencana lengkap dimampat
 * jadi satu ZIP berkunci kata laluan. Dijalankan MANUAL setiap ~3 bulan.
 *
 * EMPAT LAPISAN, supaya sistem boleh dibina semula dari KOSONG:
 *   1. db/      — data SEBENAR setiap jadual Supabase (PostgREST)
 *   2. storage/ — SEMUA fail dalam setiap bucket Storage
 *   3. skema/   — setiap fail *.sql (struktur jadual/RLS) merentas repo —
 *                 tanpa ini, data JSON dalam db/ tiada tempat untuk masuk
 *   4. git/     — bundle git PENUH (sejarah, bukan snapshot) bagi setiap
 *                 repo (sktd, sktd-web, sktd-portal, epbd) — kod terselamat
 *                 walau GitHub sendiri hilang
 *   5. dokumen/ — docs/*.md + CLAUDE.md/AGENTS.md setiap repo — KEPUTUSAN
 *                 dan SEBAB di sebalik seni bina, bukan cuma kod
 *
 * SENGAJA TIADA kunci/kata laluan sebenar (Vercel, Clerk, Cloudflare, dll)
 * dalam zip ini — lihat docs/pewarisan.md untuk PETA di mana kunci itu
 * disimpan semasa kecemasan sebenar. Zip berkunci kata laluan ialah lapisan
 * kedua, bukan alasan untuk simpan rahsia hidup di dalamnya.
 *
 * KENAPA IA JALAN TEMPATAN, BUKAN CRON PELAYAN:
 * Kunci `SUPABASE_SECRET_KEY` memintas RLS sepenuhnya. Menyimpannya sebagai
 * satu lagi rahsia Vercel yang dipanggil automatik setiap 3 bulan menambah
 * permukaan risiko untuk faedah kecil pada kadar ini. Skrip ini dijalankan
 * dengan tangan, hasilnya (ZIP) dimuat naik ke Google Drive secara berasingan
 * — dan SENGAJA tidak bergantung kepada Claude/AI langsung, supaya rutin ini
 * terus berjalan walau sesi/langganan AI tidak ada.
 *
 * CARA GUNA:
 *   1. Pastikan sktd-portal/.env.local ada NEXT_PUBLIC_SUPABASE_URL dan
 *      SUPABASE_SECRET_KEY sebenar (salin dari Vercel → Settings → Env Vars).
 *   2. SANDARAN_KATA_LALUAN=<kata laluan zip> node --env-file=.env.local \
 *        scripts/sandaran-penuh.mjs
 *   3. Fail keluar: sandaran/sktd-sandaran-YYYY-MM-DD.zip (dalam .gitignore).
 *
 * TIDAK PERNAH mengekod kata laluan atau kunci dalam fail ini — kedua-duanya
 * datang dari persekitaran semasa larian sahaja (peraturan keras #9 diguna
 * semula: rahsia hidup dalam persekitaran, bukan kod).
 *
 * Peraturan keras #1 dihormati: setiap jadual dan setiap senarai fail Storage
 * dibaca BERKEPING sehingga habis — tiada `.limit()` mentah yang boleh
 * memotong data senyap.
 */
import { mkdir, writeFile, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KUNCI = process.env.SUPABASE_SECRET_KEY;
const KATA_LALUAN = process.env.SANDARAN_KATA_LALUAN;

if (!URL || !KUNCI) {
  console.error(
    "[sandaran] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SECRET_KEY tiada.\n" +
    "Isi .env.local dengan nilai SEBENAR (Vercel → sktd-portal → Settings → Environment Variables),\n" +
    "kemudian jalankan semula dengan: node --env-file=.env.local scripts/sandaran-penuh.mjs",
  );
  process.exit(1);
}
if (!KATA_LALUAN) {
  console.error(
    "[sandaran] SANDARAN_KATA_LALUAN tiada. Contoh:\n" +
    "  SANDARAN_KATA_LALUAN='...' node --env-file=.env.local scripts/sandaran-penuh.mjs",
  );
  process.exit(1);
}

const KEPALA = { apikey: KUNCI, Authorization: `Bearer ${KUNCI}` };
const TARIKH = new Date().toISOString().slice(0, 10);
// Skrip duduk dalam sktd-portal/scripts/ — ROOT ialah folder induk `sktd`
// yang membawahi kesemua repo (sktd, sktd-web, sktd-portal, epbd) + docs/.
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const REPO = { sktd: ROOT, "sktd-web": path.join(ROOT, "sktd-web"), "sktd-portal": path.join(ROOT, "sktd-portal"), epbd: path.join(ROOT, "epbd") };
const DIR_KELUAR = path.resolve("sandaran");
const DIR_KERJA = path.resolve(DIR_KELUAR, `_kerja-${TARIKH}`);
const DIR_DB = path.join(DIR_KERJA, "db");
const DIR_STORAGE = path.join(DIR_KERJA, "storage");
const DIR_SKEMA = path.join(DIR_KERJA, "skema");
const DIR_GIT = path.join(DIR_KERJA, "git");
const DIR_DOKUMEN = path.join(DIR_KERJA, "dokumen");
const ZIP_KELUAR = path.join(DIR_KELUAR, `sktd-sandaran-${TARIKH}.zip`);

async function json(url, init) {
  const res = await fetch(url, { ...init, headers: { ...KEPALA, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${url} :: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Senarai SEMUA jadual yang didedahkan kepada service_role, terus dari
 *  dokumen OpenAPI PostgREST — bukan senarai ditulis tangan yang boleh lapuk. */
async function senaraiJadual() {
  const res = await fetch(`${URL}/rest/v1/`, { headers: KEPALA });
  if (!res.ok) throw new Error(`Gagal baca OpenAPI PostgREST: ${res.status} ${await res.text()}`);
  const spec = await res.json();
  const set = new Set();
  for (const k of Object.keys(spec.definitions ?? {})) set.add(k);
  for (const k of Object.keys(spec.components?.schemas ?? {})) set.add(k);
  for (const k of Object.keys(spec.paths ?? {})) {
    const nama = k.replace(/^\//, "");
    if (nama && !nama.startsWith("rpc/") && !nama.includes("{")) set.add(nama);
  }
  return [...set].sort();
}

/** Peraturan keras #1: baca berkeping sehingga habis. */
async function ambilSemua(jadual) {
  const KEPING = 1000;
  const keluar = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = await json(
      `${URL}/rest/v1/${jadual}?select=*&offset=${mula}&limit=${KEPING}`,
    );
    keluar.push(...keping);
    if (keping.length < KEPING) return keluar;
  }
}

async function senaraiBucket() {
  return json(`${URL}/storage/v1/bucket`);
}

/** Senarai SEMUA fail dalam satu bucket, rekursif ke semua sub-folder. */
async function senaraiFailBucket(bucket) {
  const keluar = [];
  async function jelajah(prefix) {
    const HAD = 1000;
    for (let mula = 0; ; mula += HAD) {
      const entri = await json(`${URL}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: HAD, offset: mula, sortBy: { column: "name", order: "asc" } }),
      });
      for (const e of entri) {
        const laluan = prefix ? `${prefix}/${e.name}` : e.name;
        // Folder tiada `id`; fail sebenar ada.
        if (e.id === null) await jelajah(laluan);
        else keluar.push(laluan);
      }
      if (entri.length < HAD) break;
    }
  }
  await jelajah("");
  return keluar;
}

const ABAI_DIR = new Set(["node_modules", ".git", ".next", "out", "build", "coverage", ".vercel"]);

/** Cari SEMUA fail *.sql merentas ROOT, rekursif, langkau node_modules/.git dsb. */
async function senaraiFailSql(dir) {
  const keluar = [];
  async function jelajah(d) {
    let entri;
    try {
      entri = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entri) {
      if (ABAI_DIR.has(e.name)) continue;
      const penuh = path.join(d, e.name);
      if (e.isDirectory()) await jelajah(penuh);
      else if (e.isFile() && e.name.endsWith(".sql")) keluar.push(penuh);
    }
  }
  await jelajah(dir);
  return keluar;
}

/** Bundle git PENUH (semua cabang & sejarah) bagi satu repo — bukan snapshot. */
function gitBundle(repoDir, namaKeluar, sasaranDir) {
  if (!existsSync(path.join(repoDir, ".git"))) return { ok: false, sebab: "tiada .git" };
  try {
    // Repo `epbd` mungkin belum ada commit — git bundle gagal tanpa sejarah.
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoDir, stdio: "ignore" });
  } catch {
    return { ok: false, sebab: "tiada commit lagi" };
  }
  const sasaran = path.join(sasaranDir, `${namaKeluar}.bundle`);
  execFileSync("git", ["bundle", "create", sasaran, "--all"], { cwd: repoDir, stdio: "ignore" });
  return { ok: true };
}

/** Dokumentasi — docs/*.md peringkat ROOT + CLAUDE.md/AGENTS.md/README.md setiap repo. */
async function salinDokumen() {
  await mkdir(DIR_DOKUMEN, { recursive: true });
  const docsRoot = path.join(ROOT, "docs");
  if (existsSync(docsRoot)) {
    await cp(docsRoot, path.join(DIR_DOKUMEN, "docs"), { recursive: true });
  }
  for (const [nama, dir] of Object.entries(REPO)) {
    for (const fail of ["CLAUDE.md", "AGENTS.md", "README.md", "GEMINI.md"]) {
      const sumber = path.join(dir, fail);
      if (existsSync(sumber)) {
        await mkdir(path.join(DIR_DOKUMEN, nama), { recursive: true });
        await cp(sumber, path.join(DIR_DOKUMEN, nama, fail));
      }
    }
    const copilot = path.join(dir, ".github", "copilot-instructions.md");
    if (existsSync(copilot)) {
      await mkdir(path.join(DIR_DOKUMEN, nama), { recursive: true });
      await cp(copilot, path.join(DIR_DOKUMEN, nama, "copilot-instructions.md"));
    }
  }
  const memoriPortal = path.join(REPO["sktd-portal"], "docs", "PROJECT_MEMORY.md");
  if (existsSync(memoriPortal)) {
    await mkdir(path.join(DIR_DOKUMEN, "sktd-portal", "docs"), { recursive: true });
    await cp(memoriPortal, path.join(DIR_DOKUMEN, "sktd-portal", "docs", "PROJECT_MEMORY.md"));
  }
}

async function muatTurunFail(bucket, laluan, sasaran) {
  const res = await fetch(`${URL}/storage/v1/object/${bucket}/${laluan}`, { headers: KEPALA });
  if (!res.ok) throw new Error(`Gagal muat turun ${bucket}/${laluan}: ${res.status}`);
  await mkdir(path.dirname(sasaran), { recursive: true });
  await writeFile(sasaran, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  console.log("[sandaran] Bersihkan direktori kerja lama, jika ada…");
  await rm(DIR_KERJA, { recursive: true, force: true });
  await mkdir(DIR_DB, { recursive: true });
  await mkdir(DIR_STORAGE, { recursive: true });

  console.log("[sandaran] Senarai jadual daripada OpenAPI PostgREST…");
  const jadual = await senaraiJadual();
  console.log(`[sandaran] ${jadual.length} jadual dijumpai: ${jadual.join(", ")}`);

  const manifestJadual = [];
  for (const j of jadual) {
    process.stdout.write(`[sandaran] jadual ${j} … `);
    try {
      const baris = await ambilSemua(j);
      await writeFile(path.join(DIR_DB, `${j}.json`), JSON.stringify(baris, null, 0));
      manifestJadual.push({ jadual: j, baris: baris.length, status: "ok" });
      console.log(`${baris.length} baris`);
    } catch (e) {
      manifestJadual.push({ jadual: j, baris: 0, status: "gagal", ralat: String(e?.message ?? e) });
      console.log(`GAGAL: ${e?.message ?? e}`);
    }
  }

  console.log("[sandaran] Senarai bucket Storage…");
  const bucket = await senaraiBucket();
  console.log(`[sandaran] ${bucket.length} bucket: ${bucket.map((b) => b.name).join(", ") || "(tiada)"}`);

  const manifestStorage = [];
  for (const b of bucket) {
    const fail = await senaraiFailBucket(b.name);
    console.log(`[sandaran] bucket ${b.name}: ${fail.length} fail`);
    let ok = 0;
    let gagal = 0;
    for (const f of fail) {
      try {
        await muatTurunFail(b.name, f, path.join(DIR_STORAGE, b.name, f));
        ok++;
      } catch (e) {
        gagal++;
        console.log(`  ! gagal ${b.name}/${f}: ${e?.message ?? e}`);
      }
    }
    manifestStorage.push({ bucket: b.name, jumlahFail: fail.length, berjaya: ok, gagal });
  }

  console.log("[sandaran] Salin skema SQL merentas repo…");
  await mkdir(DIR_SKEMA, { recursive: true });
  const failSql = await senaraiFailSql(ROOT);
  for (const f of failSql) {
    const rel = path.relative(ROOT, f);
    const sasaran = path.join(DIR_SKEMA, rel);
    await mkdir(path.dirname(sasaran), { recursive: true });
    await cp(f, sasaran);
  }
  console.log(`[sandaran] ${failSql.length} fail .sql disalin`);

  console.log("[sandaran] Bundle git penuh (sejarah, bukan snapshot) setiap repo…");
  await mkdir(DIR_GIT, { recursive: true });
  const manifestGit = [];
  for (const [nama, dir] of Object.entries(REPO)) {
    const hasil = gitBundle(dir, nama, DIR_GIT);
    manifestGit.push({ repo: nama, ...hasil });
    console.log(`[sandaran] git ${nama}: ${hasil.ok ? "ok" : `dilangkau (${hasil.sebab})`}`);
  }

  console.log("[sandaran] Salin dokumen (docs/, CLAUDE.md, AGENTS.md, PROJECT_MEMORY.md)…");
  await salinDokumen();

  const manifest = {
    dijana: new Date().toISOString(),
    sumber: URL,
    jadual: manifestJadual,
    storan: manifestStorage,
    skemaSqlBilFail: failSql.length,
    git: manifestGit,
  };
  await writeFile(path.join(DIR_KERJA, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("[sandaran] Mampatkan + kunci kata laluan…");
  await mkdir(DIR_KELUAR, { recursive: true });
  await rm(ZIP_KELUAR, { force: true });
  const kandungan = ["db", "storage", "skema", "git", "dokumen", "manifest.json"].filter((k) =>
    existsSync(path.join(DIR_KERJA, k)),
  );
  execFileSync(
    "zip",
    ["-r", "-P", KATA_LALUAN, ZIP_KELUAR, ...kandungan],
    { cwd: DIR_KERJA, stdio: "inherit" },
  );

  await rm(DIR_KERJA, { recursive: true, force: true });

  const gagalJadual = manifestJadual.filter((m) => m.status === "gagal").length;
  const gagalFail = manifestStorage.reduce((a, b) => a + b.gagal, 0);
  console.log("\n[sandaran] SIAP:", ZIP_KELUAR);
  console.log(
    `[sandaran] ${manifestJadual.length} jadual (${gagalJadual} gagal), ` +
    `${manifestStorage.reduce((a, b) => a + b.jumlahFail, 0)} fail storan (${gagalFail} gagal).`,
  );
  if (gagalJadual > 0 || gagalFail > 0) {
    console.log("[sandaran] ⚠️ Ada kegagalan — SEMAK manifest.json dalam zip sebelum padam sandaran lama.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[sandaran] RALAT:", e);
  process.exit(1);
});
