"use server";

import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { tahunSesiAktif } from "./sesi-aktif";
import { senaraiDokumen, seksyenDokumen, barisSeksyen } from "./pengurusan";
import { tetapGuruKelas } from "./guru-kelas";
import { pasanganGuruKelas } from "@/data/guru-kelas-buku";
import { samaOrang, palingHampir } from "@/data/padan-nama";
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
  /**
   * Bentuk sebenar buku, dipapar bila tiada apa yang dikenali.
   *
   * Larian kering pertama memulangkan SIFAR pada setiap lajur, dan sifar
   * tidak memberitahu apa-apa: adakah seksyen kosong, adakah lajur berbeza,
   * adakah nama ditulis lain? Tanpa ini, satu-satunya jalan ke hadapan ialah
   * meneka — dan meneka pada data sekolah yang hidup bukan pilihan.
   */
  diagnostik?: { tajuk: string; lajur: string[]; bilBaris: number; contoh: string[] };
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

  // --- Baca baris seksyen mengikut struktur sebenar buku ---
  const semuaBaris: string[][] = [];
  for (const sk of gk) {
    for (const b of await barisSeksyen(sk.id)) semuaBaris.push(b.sel ?? []);
  }
  const pasangan = pasanganGuruKelas(semuaBaris);

  const calon: CalonTag[] = [];
  for (const p of pasangan) {
    if (adaGuru.has(p.kelas)) {
      calon.push({ kelas: p.kelas, namaBuku: p.guru, keputusan: "sudah-ada" });
      continue;
    }
    const padan = orang.filter((o) => o.nama && samaOrang(o.nama, p.guru));
    if (padan.length === 1) {
      calon.push({
        kelas: p.kelas, namaBuku: p.guru, guruId: padan[0].id,
        namaPortal: padan[0].nama ?? undefined, keputusan: "boleh",
      });
    } else if (padan.length > 1) {
      calon.push({
        kelas: p.kelas, namaBuku: p.guru, keputusan: "kabur",
        calon: padan.map((x) => x.nama ?? "").filter(Boolean),
      });
    } else {
      // "Tiada padanan" sahaja menghantar pentadbir mencari antara 130 nama.
      // Nama terdekat menjawab soalan sebenar: tiada akses, atau eja lain?
      const hampir = palingHampir(p.guru, orang.map((o) => o.nama ?? "").filter(Boolean));
      calon.push({
        kelas: p.kelas, namaBuku: p.guru, keputusan: "tiada-padanan",
        ...(hampir ? { calon: [hampir] } : {}),
      });
    }
  }

  const boleh = calon.filter((c) => c.keputusan === "boleh");
  const diagnostik = calon.length === 0
    ? {
        tajuk: gk.map((x) => x.tajuk).join(" · "),
        lajur: gk[0]?.lajur ?? [],
        bilBaris: semuaBaris.length,
        contoh: semuaBaris.slice(0, 8).map((r) => r.filter(Boolean).join(" | ")),
      }
    : undefined;

  if (!tulis) {
    return {
      ok: true, ditulis: false, calon, diagnostik,
      mesej: calon.length === 0
        ? `Tiada pasangan kelas + nama dikenali daripada ${semuaBaris.length} baris. ` +
          "Lihat contoh baris di bawah — hantar kepada kami kalau bentuknya berbeza."
        : `${boleh.length} kelas boleh ditag. ` +
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

/**
 * TAG SEORANG GURU SAHAJA — dipanggil sebaik aksesnya diluluskan.
 *
 * Pentadbir tidak sepatutnya perlu ingat menekan "Tag dari Buku" selepas
 * setiap kelulusan. Bila seseorang diluluskan dan buku pengurusan berkata
 * dia guru kelas sesuatu kelas yang MASIH KOSONG, dia ditag serta-merta.
 *
 * Peraturan yang sama seperti tag pukal, dan atas sebab yang sama:
 *  · kelas yang sudah ada guru kelas TIDAK disentuh
 *  · nama kabur DILANGKAU
 *  · kegagalan tidak pernah menghalang kelulusan itu sendiri — orang itu
 *    tetap mendapat akses walaupun tag gagal
 *
 * Memulangkan label kelas yang ditag, atau null. Tidak melontar.
 */
export async function tagSatuGuru(guruId: string, nama: string): Promise<string | null> {
  try {
    const hasil = await tagGuruKelas(false);
    const padan = hasil.calon.filter(
      (c) => c.keputusan === "boleh" && (c.guruId === guruId || samaOrang(c.namaBuku, nama)),
    );
    // Dua kelas untuk orang yang sama dalam buku: jangan pilih sendiri.
    if (padan.length !== 1 || !padan[0].guruId) return null;
    const r = await tetapGuruKelas(padan[0].guruId, padan[0].kelas);
    return r.ok ? padan[0].kelas : null;
  } catch {
    return null;
  }
}

/**
 * TAG GURU KELAS DARIPADA JADUAL WAKTU — sumber yang pasti.
 *
 * KENAPA INI, BUKAN BUKU PENGURUSAN
 * Padanan daripada Buku Pengurusan memulangkan sifar: buku memecahkan tahun
 * dan nama kelas ke lajur berasingan, dan bentuknya berbeza setiap edisi.
 * Jadual waktu pula mencetak "Guru kelas : NAMA" pada kepala SETIAP muka,
 * bersebelahan nama kelas — satu kelas, satu nama, tiada kekaburan bentuk.
 * Ia datang daripada pangkalan data jadual sekolah sendiri.
 *
 * Peraturan keselamatan SAMA seperti tag pukal:
 *  · kelas yang sudah ada guru kelas TIDAK disentuh
 *  · nama yang padan dua orang, atau tiada padanan, DILANGKAU
 *  · tiada apa dipadam
 */
export async function tagDariJadual(
  pasangan: { kelas: string; guruKelas: string }[],
): Promise<HasilTag> {
  await pastikanBoleh("urus_guru_kelas");
  const SESI = await tahunSesiAktif();
  const db = klienTulis();

  const [sudah, orang] = await Promise.all([
    db.minta(
      `pbd_guru_kelas?select=tahun,kelas&tahun_sesi=eq.${SESI}&peranan=eq.guru_kelas`,
    ) as Promise<{ tahun: number; kelas: string }[]>,
    db.minta("pbd_guru?select=id,nama&dibenarkan=eq.true") as Promise<
      { id: string; nama: string | null }[]
    >,
  ]);
  const adaGuru = new Set(sudah.map((s) => (s.tahun === 0 ? s.kelas : `${s.tahun} ${s.kelas}`)));

  const calon: CalonTag[] = [];
  for (const p of pasangan) {
    if (!p.kelas || !p.guruKelas) continue;
    if (adaGuru.has(p.kelas)) {
      calon.push({ kelas: p.kelas, namaBuku: p.guruKelas, keputusan: "sudah-ada" });
      continue;
    }
    const padan = orang.filter((o) => o.nama && samaOrang(o.nama, p.guruKelas));
    if (padan.length === 1) {
      calon.push({
        kelas: p.kelas, namaBuku: p.guruKelas, guruId: padan[0].id,
        namaPortal: padan[0].nama ?? undefined, keputusan: "boleh",
      });
    } else if (padan.length > 1) {
      calon.push({
        kelas: p.kelas, namaBuku: p.guruKelas, keputusan: "kabur",
        calon: padan.map((x) => x.nama ?? "").filter(Boolean),
      });
    } else {
      calon.push({ kelas: p.kelas, namaBuku: p.guruKelas, keputusan: "tiada-padanan" });
    }
  }

  let berjaya = 0;
  const gagal: string[] = [];
  for (const c of calon.filter((x) => x.keputusan === "boleh")) {
    const r = await tetapGuruKelas(c.guruId!, c.kelas);
    if (r.ok) berjaya++;
    else gagal.push(`${c.kelas}: ${r.mesej}`);
  }

  revalidatePath("/admin/guru-kelas");
  revalidatePath("/admin/jadual");
  return {
    ok: gagal.length === 0,
    ditulis: true,
    calon,
    mesej: `${berjaya} guru kelas ditetapkan daripada jadual waktu. ` +
      `${calon.filter((c) => c.keputusan === "sudah-ada").length} sudah ada, ` +
      `${calon.filter((c) => c.keputusan === "tiada-padanan").length} nama tiada dalam senarai akses` +
      `${gagal.length ? `, ${gagal.length} gagal` : ""}.`,
  };
}
