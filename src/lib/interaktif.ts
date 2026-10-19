"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { pengguna, type Pengguna } from "./akses";
import { boleh } from "./peranan";
import { klienTulis } from "./supabase-pelayan";
import { sahUuid } from "./sah";
import {
  BALDI_INTERAKTIF, HAD_FAIL, HAD_KOD_BAIT, HAD_LAMAN_BAIT, HAD_LAMAN_BULAN, HAD_LAMAN_MB,
  JENIS_LAMAN, SUBJEK_LAMAN, SUMBER_LAMAN, TAHUN_LAMAN,
  awalBulanMy, laluanSah, semakPautan, semakSubdomain, semakTajuk, sumberFail,
  type LamanInteraktif, type JenisLaman, type SumberLaman,
} from "@/data/interaktif";

/**
 * RUANG DEPLOY — guru menerbitkan laman HTML ke `<nama>.sktd.edu.my`.
 *
 * ALIRAN FAIL (dua langkah, kerana Vercel menolak badan > 4.5 MB):
 *   1. `sediaLaman()` menyemak semua, menyimpan baris, dan memulangkan URL
 *      muat naik bertandatangan — satu bagi setiap fail dalam laman.
 *   2. Pelayar menghantar fail TERUS ke Supabase Storage.
 *   3. `sahkanLaman()` memastikan `index.html` benar-benar tiba, kemudian
 *      menerbitkan laman.
 *
 * Setiap muat naik pergi ke FOLDER VERSI baharu (`<subdomain>/<versi>/`).
 * Worker mencache fail di tepi; folder baharu bermakna fail lama tidak
 * pernah dihidangkan selepas guru mengemas kini lamannya. Semasa SUNTING,
 * versi lama kekal hidup sehingga versi baharu disahkan.
 *
 * KUASA: guru hanya boleh mengubah laman sendiri. Pemegang
 * `terbit_kandungan` (admin/pentadbir) boleh menggantung atau memadam
 * mana-mana laman — disemak di SINI, bukan dengan menyembunyikan butang.
 */

const LAJUR = "id,subdomain,tajuk,subjek,tahun,jenis,sumber,pautan,saiz,pemilik_nama,status,created_at,updated_at";

interface Baris extends LamanInteraktif {
  pemilik_emel: string;
  awalan: string | null;
  awalan_baharu: string | null;
}

export interface Hasil {
  ok: boolean;
  mesej: string;
  id?: string;
  slot?: { laluan: string; url: string }[];
  selesai?: boolean;
}

/* ------------------------------------------------------------ storan ---- */

function storan() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rahsia = process.env.SUPABASE_SECRET_KEY;
  if (!url || !rahsia) throw new Error("[interaktif] tetapan Supabase tiada.");
  return { url, kepala: { apikey: rahsia, Authorization: `Bearer ${rahsia}` } };
}

const kodLaluan = (l: string) => l.split("/").map(encodeURIComponent).join("/");

/** Baldi AWAM untuk dibaca (Worker menghidangkannya), tulis dengan kunci rahsia sahaja. */
async function pastikanBaldi() {
  const { url, kepala } = storan();
  const semak = await fetch(`${url}/storage/v1/bucket/${BALDI_INTERAKTIF}`, { headers: kepala, cache: "no-store" });
  if (semak.ok) return;
  const cipta = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...kepala, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BALDI_INTERAKTIF, name: BALDI_INTERAKTIF, public: true, file_size_limit: HAD_LAMAN_BAIT }),
  });
  if (!cipta.ok && cipta.status !== 409) throw new Error(`Gagal menyediakan storan laman (${cipta.status}).`);
}

/** Senarai SEMUA fail di bawah satu folder (rekursif). */
async function senaraiFail(awalan: string): Promise<string[]> {
  const { url, kepala } = storan();
  const keluar: string[] = [];
  const baca = async (folder: string, dalam: number) => {
    if (dalam > 8 || keluar.length > 2000) return;
    const res = await fetch(`${url}/storage/v1/object/list/${BALDI_INTERAKTIF}`, {
      method: "POST",
      headers: { ...kepala, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: folder, limit: 1000 }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Storan tidak dapat disenaraikan (${res.status}).`);
    for (const f of (await res.json()) as { name: string; id: string | null }[]) {
      const penuh = `${folder}/${f.name}`;
      if (f.id === null) await baca(penuh, dalam + 1);
      else keluar.push(penuh);
    }
  };
  await baca(awalan, 0);
  return keluar;
}

/** Buang satu folder versi. Gagal memadam fail tidak menghalang padam rekod. */
async function buangFolder(awalan: string | null) {
  if (!awalan) return;
  try {
    const { url, kepala } = storan();
    const fail = await senaraiFail(awalan);
    for (let i = 0; i < fail.length; i += 100) {
      await fetch(`${url}/storage/v1/object/${BALDI_INTERAKTIF}`, {
        method: "DELETE",
        headers: { ...kepala, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: fail.slice(i, i + 100) }),
      });
    }
  } catch (e) {
    console.warn("[interaktif] gagal membuang folder", awalan, e instanceof Error ? e.message : e);
  }
}

/* ------------------------------------------------------------- baca ---- */

async function perluGuru(): Promise<Pengguna> {
  const saya = await pengguna();
  if (!saya?.peranan) throw new Error("Tiada kebenaran.");
  return saya;
}

async function ambilBaris(id: string): Promise<Baris | null> {
  const db = klienTulis();
  const b = (await db.minta(`web_interaktif?id=eq.${sahUuid(id)}&select=*`)) as Baris[];
  return b[0] ?? null;
}

/** Laman milik pengguna semasa, dan (bagi pentadbir) semua laman guru. */
/** Bilangan laman BAHARU yang guru ini terbitkan bulan ini (waktu Malaysia). */
async function kiraBulanIni(emel: string): Promise<number> {
  const baris = (await klienTulis().minta(
    `web_interaktif_log?pemilik_emel=eq.${encodeURIComponent(emel)}&created_at=gte.${awalBulanMy().toISOString()}&select=id`,
  )) as unknown[];
  return baris.length;
}

async function catatLog(emel: string, subdomain: string) {
  await klienTulis().minta("web_interaktif_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ pemilik_emel: emel, subdomain }),
  });
}

export async function senaraiLaman(): Promise<{ saya: LamanInteraktif[]; semua: LamanInteraktif[] | null; bulanIni: number }> {
  const saya = await perluGuru();
  const db = klienTulis();
  const sendiri = (await db.minta(
    `web_interaktif?pemilik_emel=eq.${encodeURIComponent(saya.emel.toLowerCase())}&status=neq.muat_naik&select=${LAJUR}&order=created_at.desc`,
  )) as LamanInteraktif[];
  const semua = boleh(saya.peranan, "terbit_kandungan")
    ? ((await db.minta(`web_interaktif?status=neq.muat_naik&select=${LAJUR}&order=created_at.desc&limit=1000`)) as LamanInteraktif[])
    : null;
  return { saya: sendiri, semua, bulanIni: await kiraBulanIni(saya.emel.toLowerCase()) };
}

/* ------------------------------------------------------------ terbit ---- */

export interface InputLaman {
  /** Ada = sunting laman sedia ada. */
  id?: string;
  nama: string;
  tajuk: string;
  subjek: string;
  tahun: number;
  jenis: JenisLaman;
  subdomain: string;
  sumber: SumberLaman;
  pautan?: string;
  /** Hanya bila sumber `fail` DAN guru memilih fail baharu. */
  fail?: { laluan: string; saiz: number }[];
}

/**
 * Langkah 1. Semak, simpan, dan (bagi fail) beri URL muat naik.
 * `selesai: true` bermakna laman sudah diterbitkan (sumber pautan, atau
 * sunting maklumat tanpa fail baharu).
 */
export async function sediaLaman(input: InputLaman): Promise<Hasil> {
  try {
    const saya = await perluGuru();
    const emel = saya.emel.toLowerCase();
    const nama = String(input.nama ?? "").trim().replace(/\s+/g, " ");
    const tajuk = String(input.tajuk ?? "").trim().replace(/\s+/g, " ");

    if (nama.length < 2 || nama.length > 80) return { ok: false, mesej: "Isi nama cikgu." };
    const salahTajuk = semakTajuk(tajuk);
    if (salahTajuk) return { ok: false, mesej: salahTajuk };
    if (!SUBJEK_LAMAN.includes(input.subjek)) return { ok: false, mesej: "Pilih mata pelajaran." };
    if (!TAHUN_LAMAN.some((t) => t.kod === input.tahun)) return { ok: false, mesej: "Pilih tahun." };
    if (!JENIS_LAMAN.some((j) => j.kod === input.jenis)) return { ok: false, mesej: "Pilih jenis laman." };
    if (!SUMBER_LAMAN.some((s) => s.kod === input.sumber)) return { ok: false, mesej: "Pilih sumber laman." };

    const db = klienTulis();
    let lama: Baris | null = null;
    let subdomain = String(input.subdomain ?? "").trim().toLowerCase();

    if (input.id) {
      lama = await ambilBaris(input.id);
      if (!lama || lama.pemilik_emel !== emel) return { ok: false, mesej: "Laman ini bukan milik anda." };
      subdomain = lama.subdomain; // alamat tidak berubah semasa sunting
    } else {
      const salahSub = semakSubdomain(subdomain);
      if (salahSub) return { ok: false, mesej: salahSub };

      // Muat naik yang ditinggalkan (tab ditutup, talian putus) melepaskan
      // alamatnya selepas sejam — atau serta-merta bila guru yang sama cuba lagi.
      const sejam = new Date(Date.now() - 3600_000).toISOString();
      const basi = (await db.minta(
        `web_interaktif?subdomain=eq.${subdomain}&status=eq.muat_naik` +
        `&or=(created_at.lt.${sejam},pemilik_emel.eq.${encodeURIComponent(`"${emel}"`)})&select=id,awalan`,
      )) as { id: string; awalan: string | null }[];
      for (const b of basi) {
        await buangFolder(b.awalan);
        await db.minta(`web_interaktif?id=eq.${b.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }

      const ada = (await db.minta(`web_interaktif?subdomain=eq.${subdomain}&select=id`)) as unknown[];
      if (ada.length > 0) return { ok: false, mesej: `${subdomain}.sktd.edu.my sudah digunakan. Cuba ${subdomain}2 atau nama lain.` };

      if ((await kiraBulanIni(emel)) >= HAD_LAMAN_BULAN) {
        return { ok: false, mesej: `Kuota ${HAD_LAMAN_BULAN} laman baharu bulan ini sudah penuh. Anda masih boleh menyunting laman sedia ada.` };
      }
    }

    const asas = { tajuk, subjek: input.subjek, tahun: input.tahun, jenis: input.jenis, pemilik_nama: nama, updated_at: new Date().toISOString() };

    /* --- Sumber pautan: terus terbit --- */
    if (!sumberFail(input.sumber)) {
      const pautan = String(input.pautan ?? "").trim();
      const salah = semakPautan(input.sumber, pautan);
      if (salah) return { ok: false, mesej: salah };
      const baris = { ...asas, sumber: input.sumber, pautan, awalan: null, awalan_baharu: null, saiz: 0 };
      if (lama) {
        await db.minta(`web_interaktif?id=eq.${lama.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ ...baris, status: lama.status === "gantung" ? "gantung" : "terbit" }),
        });
        await buangFolder(lama.awalan);
        await buangFolder(lama.awalan_baharu);
      } else {
        await db.minta("web_interaktif", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ ...baris, subdomain, pemilik_emel: emel, status: "terbit" }),
        });
        await catatLog(emel, subdomain);
      }
      revalidatePath("/ruang-deploy");
      return { ok: true, mesej: "Laman diterbitkan.", selesai: true };
    }

    /* --- Sumber fail, sunting maklumat sahaja --- */
    if (!input.fail || input.fail.length === 0) {
      if (!lama || lama.sumber !== input.sumber) {
        return { ok: false, mesej: input.sumber === "kod" ? "Tampal kod HTML laman." : "Pilih fail laman (.html atau .zip)." };
      }
      await db.minta(`web_interaktif?id=eq.${lama.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(asas),
      });
      revalidatePath("/ruang-deploy");
      return { ok: true, mesej: "Maklumat laman dikemas kini.", selesai: true };
    }

    /* --- Sumber fail, fail baharu --- */
    const fail = input.fail;
    if (input.sumber === "kod" && (fail.length !== 1 || fail[0].laluan !== "index.html" || fail[0].saiz > HAD_KOD_BAIT)) {
      return { ok: false, mesej: `Kod HTML mesti satu halaman, maksimum ${HAD_KOD_BAIT / 1048576} MB.` };
    }
    if (fail.length > HAD_FAIL) return { ok: false, mesej: `Terlalu banyak fail (had ${HAD_FAIL}).` };
    const salahLaluan = fail.find((f) => !laluanSah(f.laluan));
    if (salahLaluan) return { ok: false, mesej: `Nama fail tidak sah: ${salahLaluan.laluan}` };
    if (!fail.some((f) => f.laluan === "index.html")) return { ok: false, mesej: "Laman mesti ada fail index.html." };
    const saiz = fail.reduce((j, f) => j + (Number.isFinite(f.saiz) && f.saiz > 0 ? f.saiz : 0), 0);
    if (saiz > HAD_LAMAN_BAIT) {
      return { ok: false, mesej: `Laman ini ${(saiz / 1048576).toFixed(1)} MB. Had ialah ${HAD_LAMAN_MB} MB.` };
    }

    await pastikanBaldi();
    const awalan = `${subdomain}/${randomUUID().slice(0, 8)}`;
    let id: string;
    if (lama) {
      // Laman lama KEKAL hidup; folder baharu ditukar hanya selepas disahkan.
      await buangFolder(lama.awalan_baharu);
      await db.minta(`web_interaktif?id=eq.${lama.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ ...asas, awalan_baharu: awalan, saiz }),
      });
      id = lama.id;
    } else {
      const baru = (await db.minta("web_interaktif", {
        method: "POST",
        body: JSON.stringify({ ...asas, subdomain, sumber: input.sumber, awalan, saiz, pemilik_emel: emel, status: "muat_naik" }),
      })) as { id: string }[];
      id = baru[0].id;
    }

    const { url, kepala } = storan();
    const slot: { laluan: string; url: string }[] = [];
    for (let i = 0; i < fail.length; i += 10) {
      const kumpulan = await Promise.all(fail.slice(i, i + 10).map(async (f) => {
        const res = await fetch(`${url}/storage/v1/object/upload/sign/${BALDI_INTERAKTIF}/${kodLaluan(`${awalan}/${f.laluan}`)}`, {
          method: "POST", headers: { ...kepala, "Content-Type": "application/json" }, body: "{}",
        });
        if (!res.ok) throw new Error(`Storan menolak muat naik ${f.laluan} (${res.status}).`);
        const j = (await res.json()) as { url?: string };
        if (!j.url) throw new Error("Storan tidak memberi URL muat naik.");
        return { laluan: f.laluan, url: `${url}/storage/v1${j.url}` };
      }));
      slot.push(...kumpulan);
    }
    return { ok: true, mesej: "", id, slot };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/duplicate key|23505/.test(m)) return { ok: false, mesej: "Alamat ini baru sahaja diambil. Cuba nama lain." };
    return { ok: false, mesej: m };
  }
}

/** Langkah 3. Pastikan `index.html` tiba, kemudian terbitkan / tukar versi. */
export async function sahkanLaman(id: string, sumber: SumberLaman): Promise<Hasil> {
  try {
    const saya = await perluGuru();
    const b = await ambilBaris(id);
    if (!b || b.pemilik_emel !== saya.emel.toLowerCase()) return { ok: false, mesej: "Laman ini bukan milik anda." };
    if (!sumberFail(sumber)) return { ok: false, mesej: "Sumber tidak sah." };
    const baharu = b.awalan_baharu ?? (b.status === "muat_naik" ? b.awalan : null);
    if (!baharu) return { ok: false, mesej: "Tiada muat naik untuk disahkan." };

    const { url } = storan();
    const semak = await fetch(`${url}/storage/v1/object/public/${BALDI_INTERAKTIF}/${kodLaluan(`${baharu}/index.html`)}`, {
      method: "HEAD", cache: "no-store",
    });
    if (!semak.ok) return { ok: false, mesej: "index.html tidak sampai ke storan. Cuba terbitkan semula." };

    const db = klienTulis();
    await db.minta(`web_interaktif?id=eq.${b.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        sumber, pautan: null, awalan: baharu, awalan_baharu: null,
        status: b.status === "gantung" ? "gantung" : "terbit",
        updated_at: new Date().toISOString(),
      }),
    });
    if (b.status === "muat_naik") await catatLog(b.pemilik_emel, b.subdomain);
    if (b.awalan && b.awalan !== baharu) await buangFolder(b.awalan);
    revalidatePath("/ruang-deploy");
    return { ok: true, mesej: "Laman diterbitkan.", selesai: true };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal mengesahkan laman." };
  }
}

/** Kod HTML semasa bagi laman `kod` — supaya guru boleh menyuntingnya semula. */
export async function ambilKod(id: string): Promise<Hasil & { kod?: string }> {
  try {
    const saya = await perluGuru();
    const b = await ambilBaris(id);
    if (!b || b.pemilik_emel !== saya.emel.toLowerCase() || !b.awalan) return { ok: false, mesej: "Laman ini bukan milik anda." };
    const { url } = storan();
    const res = await fetch(`${url}/storage/v1/object/public/${BALDI_INTERAKTIF}/${kodLaluan(`${b.awalan}/index.html`)}`, { cache: "no-store" });
    if (!res.ok) return { ok: false, mesej: `Kod tidak dapat dibaca (${res.status}).` };
    return { ok: true, mesej: "", kod: await res.text() };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Kod tidak dapat dibaca." }
  }
}

/* ---------------------------------------------------- padam & gantung ---- */

export async function padamLaman(id: string): Promise<Hasil> {
  try {
    const saya = await perluGuru();
    const b = await ambilBaris(id);
    if (!b) return { ok: false, mesej: "Laman tidak dijumpai." };
    const pemilik = b.pemilik_emel === saya.emel.toLowerCase();
    if (!pemilik && !boleh(saya.peranan, "terbit_kandungan")) return { ok: false, mesej: "Tiada kebenaran memadam laman ini." };
    // Rekod dahulu: sebaik baris hilang, Worker berhenti menghidangkan laman.
    await klienTulis().minta(`web_interaktif?id=eq.${b.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await buangFolder(b.awalan);
    await buangFolder(b.awalan_baharu);
    revalidatePath("/ruang-deploy");
    return { ok: true, mesej: `${b.subdomain}.sktd.edu.my dipadam.` };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal memadam laman." };
  }
}

/** Pentadbir sahaja: sembunyikan laman tanpa memadam fail guru. */
export async function gantungLaman(id: string, gantung: boolean): Promise<Hasil> {
  try {
    const saya = await perluGuru();
    if (!boleh(saya.peranan, "terbit_kandungan")) return { ok: false, mesej: "Tiada kebenaran." };
    const b = await ambilBaris(id);
    if (!b || b.status === "muat_naik") return { ok: false, mesej: "Laman tidak dijumpai." };
    await klienTulis().minta(`web_interaktif?id=eq.${b.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: gantung ? "gantung" : "terbit" }),
    });
    revalidatePath("/ruang-deploy");
    return { ok: true, mesej: gantung ? "Laman digantung." : "Laman diaktifkan semula." };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal." };
  }
}
