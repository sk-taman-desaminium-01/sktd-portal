"use server";

import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { tahunSesiAktif } from "./sesi-aktif";
import { senaraiDokumen, seksyenDokumen, barisSeksyen } from "./pengurusan";
import { tetapGuruKelas } from "./guru-kelas";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import { tokenNama } from "@/data/borang-aktiviti";
import { revalidatePath } from "next/cache";

/**
 * TAG GURU KELAS TERUS DARIPADA BUKU PENGURUSAN.
 *
 * MASALAH YANG INI SELESAIKAN
 * Guru sudah mula log masuk. Setiap seorang perlu ditag sebagai guru kelas
 * sebelum mereka boleh menyunting jadual waktu kelasnya atau melihat kad
 * Guru Kelas — dan pentadbir sedang memadankan 57 kelas dengan tangan,
 * satu demi satu, daripada senarai yang SUDAH ADA dalam Buku Pengurusan.
 *
 * Padanan ikut NAMA, bukan nombor KPM-Guru: buku pengurusan tidak menyimpan
 * nombor itu, dan menunggu sehingga ia dimasukkan bermakna menunggu.
 *
 * TIGA PERATURAN YANG MENJADIKANNYA SELAMAT — guru sedang log masuk sekarang,
 * jadi tiada ruang untuk "baiki kemudian":
 *
 *  1. TAMBAH SAHAJA. Kelas yang SUDAH ada guru kelas tidak disentuh, walaupun
 *     buku pengurusan berkata orang lain. Buku dicetak sekali setahun; sekolah
 *     berubah sepanjang tahun, dan tugasan yang pentadbir tetapkan sendiri
 *     adalah lebih terkini daripada buku. (Peraturan keras #21.)
 *  2. LARIAN KERING DAHULU. `tagGuruKelas(false)` melaporkan apa yang AKAN
 *     berlaku tanpa menulis apa-apa. Tiada import tanpa larian kering —
 *     peraturan keras #5.
 *  3. KABUR BERMAKNA BERHENTI. Nama yang padan dengan dua orang, atau tidak
 *     padan dengan sesiapa, DILANGKAU dan dilaporkan. Meneka di sini bermakna
 *     memberi seorang guru kuasa menyunting kelas orang lain.
 *
 * Tiada apa yang dipadam, dan tiada tugasan sedia ada yang ditukar. Kes
 * terburuk fungsi ini ialah ia tidak menambah apa-apa.
 */

export interface CalonTag {
  kelas: string;
  namaBuku: string;
  /** Diisi bila ada padanan tunggal yang jelas. */
  guruId?: string;
  namaPortal?: string;
  keputusan: "boleh" | "sudah-ada" | "tiada-padanan" | "kabur" | "kelas-tak-dikenali";
  /** Nama-nama yang padan bila `kabur`. */
  calon?: string[];
}

export interface HasilTag {
  ok: boolean;
  mesej: string;
  /** Benar bila tulisan benar-benar berlaku. */
  ditulis: boolean;
  calon: CalonTag[];
}

/** Padanan nama yang BOLEH DIPERCAYAI untuk memberi kuasa. */
function samaOrang(a: string, b: string): boolean {
  const x = tokenNama(a), y = tokenNama(b);
  if (x.length === 0 || y.length === 0) return false;
  if (x.join(" ") === y.join(" ")) return true;
  // Buku menulis "MOHD" di mana portal menulis "MUHAMMAD", dan sebaliknya;
  // selain itu setiap perkataan mesti sama, mengikut urutan. Ini SENGAJA
  // ketat: padanan separa memberi kuasa kepada orang yang salah.
  const normal = (t: string[]) =>
    t.map((w) => (w === "MOHD" || w === "MUHD" ? "MUHAMMAD" : w)).join(" ");
  return normal(x) === normal(y);
}

/** Label kelas yang sah, daripada senarai rasmi — bukan apa sahaja yang ditulis buku. */
function padanKelas(teks: string): string | null {
  const semua = [...semuaKelas(), ...semuaKelasPPKI()];
  const bersih = teks.toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!bersih) return null;
  const tepat = semua.find((k) => k.toUpperCase() === bersih);
  if (tepat) return tepat;
  // "KELAS 4 NILAM" atau "4 NILAM (PAGI)" — cari label rasmi di dalamnya.
  const dalam = semua.filter((k) => ` ${bersih} `.includes(` ${k.toUpperCase()} `));
  return dalam.length === 1 ? dalam[0] : null;
}

export async function tagGuruKelas(tulis = false): Promise<HasilTag> {
  await pastikanBoleh("urus_guru_kelas");
  const SESI = await tahunSesiAktif();
  const db = klienTulis();

  // --- Buku pengurusan terkini yang DISAHKAN ---
  const dokumen = await senaraiDokumen();
  if (dokumen.length === 0) {
    return { ok: false, ditulis: false, calon: [], mesej: "Belum ada Buku Pengurusan dimuat naik." };
  }
  const seksyen = await seksyenDokumen(dokumen[0].id);
  const gk = seksyen.filter((s) => s.kod === "gurukelas");
  if (gk.length === 0) {
    return {
      ok: false, ditulis: false, calon: [],
      mesej: "Buku Pengurusan terkini tiada seksyen Guru Kelas yang dikenal pasti.",
    };
  }

  // --- Siapa sudah ada guru kelas, dan siapa ada akses portal ---
  const [sudah, orang] = await Promise.all([
    db.minta(
      `pbd_guru_kelas?select=tahun,kelas&tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas`,
    ) as Promise<{ tahun: number; kelas: string }[]>,
    db.minta(
      "pbd_guru?select=id,nama&dibenarkan=eq.true",
    ) as Promise<{ id: string; nama: string | null }[]>,
  ]);
  const adaGuru = new Set(sudah.map((s) => (s.tahun === 0 ? s.kelas : `${s.tahun} ${s.kelas}`)));

  // --- Baca baris seksyen, cari pasangan kelas + nama ---
  const calon: CalonTag[] = [];
  const sudahDilihat = new Set<string>();

  for (const s of gk) {
    for (const b of await barisSeksyen(s.id)) {
      const sel = b.sel.map((x) => (x ?? "").trim()).filter(Boolean);
      if (sel.length < 2) continue;

      // Sel mana kelas, sel mana nama? Dicari, bukan diandaikan lajur ke-berapa
      // — susunan lajur berbeza antara edisi buku.
      let kelas: string | null = null;
      let nama = "";
      for (const isi of sel) {
        const k = padanKelas(isi);
        if (k && !kelas) { kelas = k; continue; }
        if (!k && tokenNama(isi).length >= 2 && isi.length > nama.length) nama = isi;
      }
      if (!kelas || !nama) continue;
      if (sudahDilihat.has(kelas)) continue;
      sudahDilihat.add(kelas);

      if (adaGuru.has(kelas)) {
        calon.push({ kelas, namaBuku: nama, keputusan: "sudah-ada" });
        continue;
      }
      const padan = orang.filter((o) => o.nama && samaOrang(o.nama, nama));
      if (padan.length === 1) {
        calon.push({
          kelas, namaBuku: nama, guruId: padan[0].id,
          namaPortal: padan[0].nama ?? undefined, keputusan: "boleh",
        });
      } else if (padan.length > 1) {
        calon.push({
          kelas, namaBuku: nama, keputusan: "kabur",
          calon: padan.map((p) => p.nama ?? "").filter(Boolean),
        });
      } else {
        calon.push({ kelas, namaBuku: nama, keputusan: "tiada-padanan" });
      }
    }
  }

  const boleh = calon.filter((c) => c.keputusan === "boleh");
  if (!tulis) {
    return {
      ok: true, ditulis: false, calon,
      mesej: `${boleh.length} kelas boleh ditag. ` +
        `${calon.filter((c) => c.keputusan === "sudah-ada").length} sudah ada guru kelas, ` +
        `${calon.filter((c) => c.keputusan === "tiada-padanan").length} nama tiada dalam senarai akses, ` +
        `${calon.filter((c) => c.keputusan === "kabur").length} kabur.`,
    };
  }

  // --- Tulis: satu demi satu, dan satu kegagalan tidak menghentikan yang lain ---
  let berjaya = 0;
  const gagal: string[] = [];
  for (const c of boleh) {
    const r = await tetapGuruKelas(c.guruId!, c.kelas);
    if (r.ok) berjaya++;
    else gagal.push(`${c.kelas}: ${r.mesej}`);
  }

  revalidatePath("/admin/guru-kelas");
  return {
    ok: gagal.length === 0,
    ditulis: true,
    calon,
    mesej: gagal.length === 0
      ? `${berjaya} guru kelas ditag daripada Buku Pengurusan.`
      : `${berjaya} berjaya, ${gagal.length} gagal: ${gagal.slice(0, 3).join("; ")}`,
  };
}
