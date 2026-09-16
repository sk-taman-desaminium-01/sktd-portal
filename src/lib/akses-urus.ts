"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh, domainRasmi } from "./akses";
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
  // Peraturan domain hidup di SATU tempat sahaja (`domainRasmi` dalam
  // akses.ts). Menyalinnya ke sini pernah menyebabkan skrin log masuk dan
  // borang ini tidak sependapat tentang emel yang sama.
  if (!domainRasmi(email)) {
    return { ok: false, mesej: "Hanya emel MOE dibenarkan (domain mesti mengandungi \"moe\")." };
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
  // MESTI menangkap: tindakan pelayan yang MELONTAR tidak pernah memulangkan
  // Hasil, jadi pemanggil di pelayar tidak pernah mematikan keadaan "sibuk"
  // dan SETIAP butang pada skrin tersekat berdetik. Ralat mesti pulang
  // sebagai nilai, bukan sebagai lontaran.
  try {
    const db = klienTulis();
    await db.minta(`pbd_guru?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ peranan }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menukar peranan." };
  }
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
/**
 * TOLAK permohonan — baris dibuang terus daripada jadual.
 *
 * ⚠️ INI SATU-SATUNYA TEMPAT DALAM PORTAL YANG MEMADAM REKOD ORANG.
 * Di tempat lain kami menegakkan "kosong ≠ padam" dan menyimpan rekod untuk
 * audit (lihat `tarikAkses`). Pengecualian ini diminta secara khusus: senarai
 * menunggu ialah ruang kerja harian, dan permohonan yang jelas salah — akaun
 * peribadi, orang luar — mesti boleh dibersihkan supaya senarai itu kekal
 * boleh dibaca.
 *
 * HAD YANG MESTI DIKETAHUI: penolakan TIDAK KEKAL. Kalau orang yang sama log
 * masuk sekali lagi, `pengguna()` tidak menemui baris mereka dan menulis satu
 * baris menunggu yang baharu — jadi mereka muncul semula. Untuk penolakan
 * yang kekal, jadual perlu satu lajur status, iaitu perubahan skema.
 */
export async function tolakAkses(id: string): Promise<Hasil> {
  await pastikanBoleh("urus_akses");
  try {
    const db = klienTulis();
    const baris = (await db.minta(`pbd_guru?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    })) as { nama: string; dibenarkan: boolean }[] | null;

    if (!Array.isArray(baris) || baris.length === 0) {
      return { ok: false, mesej: "Rekod itu tidak dijumpai — mungkin ia sudah dibuang. Muat semula halaman." };
    }
    revalidatePath("/admin/akses");
    return { ok: true, mesej: `Permohonan ${baris[0].nama} ditolak dan dibuang dari senarai.` };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menolak permohonan." };
  }
}

export async function tarikAkses(id: string, dibenarkan: boolean): Promise<Hasil> {
  await pastikanBoleh("urus_akses");
  try {
    const db = klienTulis();
    const baris = (await db.minta(`pbd_guru?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ dibenarkan }),
    })) as { id: string; nama: string }[];

    // PostgREST memulangkan senarai KOSONG bila tiada baris sepadan — dan
    // status HTTPnya tetap 200. Tanpa semakan ini, "tiada apa berubah"
    // dilaporkan sebagai kejayaan, iaitu tepat apa yang berlaku: butang
    // ditekan, mesej hijau muncul, orang itu tidak bergerak ke mana-mana.
    if (!Array.isArray(baris) || baris.length === 0) {
      return { ok: false, mesej: "Rekod itu tidak dijumpai — mungkin ia sudah dibuang. Muat semula halaman." };
    }

    revalidatePath("/admin/akses");
    return {
      ok: true,
      mesej: dibenarkan
        ? `${baris[0].nama} kini dibenarkan masuk.`
        : `Akses ${baris[0].nama} ditarik. Rekod dikekalkan untuk audit.`,
    };
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal mengemas kini akses." };
  }
}
