"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { PERANAN, perananBolehDiberi, sembunyiBaris, type Peranan } from "./peranan";

export interface BarisAkses {
  id: string;
  nama: string;
  email: string | null;
  peranan: Peranan;
  dibenarkan: boolean;
}

export async function senaraiAkses(): Promise<BarisAkses[]> {
  const saya = await pastikanBoleh("urus_akses");
  const db = klienTulis();
  const semua = (await db.minta(
    "pbd_guru?select=id,nama,email,peranan,dibenarkan&order=dibenarkan.desc,peranan.asc,nama.asc",
  )) as BarisAkses[];

  // Keahlian jawatankuasa admin dirahsiakan daripada bukan-mutlak.
  // Ditapis di PELAYAN, bukan dengan CSS — baris yang ditapis di pelayar
  // tetap sampai ke pelayar dalam payload RSC (peraturan keras #12).
  return semua.filter((b) => !sembunyiBaris(saya.peranan, b.peranan));
}

export type Hasil = { ok: boolean; mesej: string };

export async function tambahAkses(data: FormData): Promise<Hasil> {
  const saya = await pastikanBoleh("urus_akses");

  const nama = String(data.get("nama") ?? "").trim();
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const peranan = String(data.get("peranan") ?? "guru") as Peranan;

  if (!nama) return { ok: false, mesej: "Nama diperlukan." };
  if (!email) return { ok: false, mesej: "Emel diperlukan." };
  if (!PERANAN.includes(peranan)) return { ok: false, mesej: "Peranan tidak sah." };
  // Hanya admin mutlak boleh melantik admin. Mesejnya sengaja sama dengan
  // peranan yang memang tidak wujud — jika tidak, ia mengesahkan bahawa
  // lapisan yang lebih tinggi wujud.
  if (!perananBolehDiberi(saya.peranan).includes(peranan)) {
    return { ok: false, mesej: "Peranan tidak sah." };
  }

  // Sekolah guna emel rasmi; membenarkan emel luar membuka pintu belakang.
  if (!email.endsWith("@moe-dl.edu.my") && !email.endsWith("@moe.edu.my")) {
    return { ok: false, mesej: "Hanya emel rasmi @moe-dl.edu.my atau @moe.edu.my dibenarkan." };
  }
  // NOTA: emel admin mutlak SENGAJA tidak disekat di sini.
  // Menolaknya dengan mesej khas akan memberitahu sesiapa yang cuba bahawa
  // emel itu istimewa — iaitu tepat apa yang kita mahu rahsiakan. Baris yang
  // ditulis tidak memberi atau menarik apa-apa kuasa: `pengguna()` membaca
  // env DAHULU, jadi status mutlak tidak pernah datang dari jadual ini.

  const db = klienTulis();
  try {
    await db.minta("pbd_guru", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ nama, email, peranan, dibenarkan: true }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menambah." };
  }
  revalidatePath("/admin/akses");
  return { ok: true, mesej: `${nama} ditambah sebagai ${peranan}.` };
}

export async function tukarPeranan(id: string, peranan: Peranan): Promise<Hasil> {
  const saya = await pastikanBoleh("urus_akses");
  if (!perananBolehDiberi(saya.peranan).includes(peranan)) {
    return { ok: false, mesej: "Peranan tidak sah." };
  }
  const db = klienTulis();
  await db.minta(`pbd_guru?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ peranan }),
  });
  revalidatePath("/admin/akses");
  return { ok: true, mesej: "Peranan dikemas kini." };
}

/**
 * Tarik balik akses. SENGAJA tidak memadam baris.
 *
 * Peraturan keras #2: medan kosong ≠ padam. Memadam orang juga membuang
 * jejak siapa pernah ada akses — dan itu maklumat yang audit perlukan.
 * Jadi kita tetapkan `dibenarkan = false`; orangnya kekal dalam rekod.
 */
export async function tarikAkses(id: string, dibenarkan: boolean): Promise<Hasil> {
  await pastikanBoleh("urus_akses");
  const db = klienTulis();
  await db.minta(`pbd_guru?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ dibenarkan }),
  });
  revalidatePath("/admin/akses");
  return { ok: true, mesej: dibenarkan ? "Akses dipulihkan." : "Akses ditarik. Rekod dikekalkan untuk audit." };
}
