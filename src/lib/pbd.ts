import "server-only";
import { klienTulis } from "./supabase-pelayan";
import { pengguna } from "./akses";
import { boleh } from "./peranan";
import { kelasBolehSunting } from "./guru-kelas";

/**
 * ePBD — pentaksiran bilik darjah.
 *
 * ALIRAN SEBENAR DI SEKOLAH, dan setiap keputusan di bawah datang daripadanya:
 *
 *   GURU SUBJEK  mengisi TP setiap murid bagi subjeknya sahaja
 *        ↓
 *   GURU KELAS   menyemak slip kelasnya, menulis ulasan, dan mencetaknya
 *        ↓
 *   IBU BAPA     menerima slip
 *
 * 🔴 KEBENARAN DIKUATKUASAKAN DI SINI, BUKAN DI UI.
 * Dalam repo `gpi`, `/api/slip/*` TIADA semakan per-kelas — ia selamat
 * setakat ini hanya kerana tersembunyi dalam tab admin. Sebaik ePBD
 * membukanya kepada semua guru, persembunyian itu bukan lagi benteng.
 * Maka setiap fungsi di bawah menyemak sendiri, dan tiada satu pun
 * bergantung pada pemanggilnya sudah menyemak.
 *
 * DUA NILAI SAHAJA, dan itu keputusan pengguna (17 Sep 2026): Tahap
 * Penguasaan (TP 1–6) dan gred sumatif UASA (A–E). Itu yang masuk ke slip
 * PBD, dan tiada apa lagi.
 *
 * Penandaan Standard Prestasi setiap SP TIDAK dibuat di sini — itu kerja
 * eRPM, app berasingan setiap panitia. Membinanya semula dalam ePBD
 * bermakna guru menanda perkara yang sama dua kali dalam dua sistem.
 *
 * TP TIDAK PERNAH DIKIRA AUTOMATIK. Ia ditaip guru subjek sendiri, kerana
 * tahap penguasaan ialah pertimbangan profesional, bukan purata.
 */

export interface Murid {
  pendaftaran_id: string;
  murid_id: string;
  nama: string;
  no_kp: string | null;
  tahun: number;
  kelas: string;
  status: string;
}

export interface Nilai {
  pendaftaran_id: string;
  subjek: string;
  tp: number | null;
  sumatif: string | null;
  oleh: string | null;
  dikemaskini: string | null;
}

export interface TugasSubjek {
  subjek: string;
  tahun: number;
  kelas: string;
}

/* ------------------------------------------------------------------ sesi */

/**
 * Sesi persekolahan semasa.
 *
 * Sesi yang `tutup` menolak SEMUA tulisan. Tanpa kunci ini, satu import
 * tersilap tahun boleh menulis ganti keputusan tahun lepas yang sudah
 * diedarkan kepada ibu bapa — dan tiada sesiapa akan perasan sehingga
 * seseorang mencetak semula slip lama.
 */
export async function sesiSemasa(): Promise<{ tahun_sesi: number; status: string } | null> {
  const db = klienTulis();
  const baris = (await db.minta(
    "pbd_sesi?select=tahun_sesi,status&order=tahun_sesi.desc&limit=1",
  )) as { tahun_sesi: number; status: string }[];
  return baris[0] ?? null;
}

export async function senaraiSesi(): Promise<{ tahun_sesi: number; status: string }[]> {
  const db = klienTulis();
  return (await db.minta(
    "pbd_sesi?select=tahun_sesi,status&order=tahun_sesi.desc",
  )) as { tahun_sesi: number; status: string }[];
}

/* ------------------------------------------------------------- kebenaran */

export interface Kuasa {
  emel: string;
  /** Pentadbir ke atas — semua kelas, semua subjek. */
  penuh: boolean;
  /** Kelas yang orang ini jadi GURU KELAS. Null bermakna semua kelas. */
  kelasSendiri: string[] | null;
  /** Tugasan guru subjek bagi sesi ini. */
  tugas: TugasSubjek[];
}

/**
 * Apa yang pengguna semasa BOLEH sentuh.
 *
 * Dipanggil oleh setiap fungsi tulis dan setiap fungsi baca yang membawa
 * data murid. Ia sengaja mengembalikan data, bukan boolean: skrin perlu
 * tahu kelas MANA untuk dipapar, dan menghitungnya dua kali dengan logik
 * berbeza ialah cara dua jawapan bercanggah muncul.
 */
export async function kuasaPbd(): Promise<Kuasa | null> {
  const saya = await pengguna();
  if (!saya?.peranan) return null;

  const penuh = boleh(saya.peranan, "lihat_data_murid") &&
    boleh(saya.peranan, "urus_guru_kelas");

  const sesi = await sesiSemasa();
  let tugas: TugasSubjek[] = [];
  if (sesi) {
    const db = klienTulis();
    tugas = (await db.minta(
      `pbd_guru_subjek?select=subjek,tahun,kelas&emel=eq.${encodeURIComponent(saya.emel)}` +
        `&tahun_sesi=eq.${sesi.tahun_sesi}&order=tahun.asc,kelas.asc`,
    )) as TugasSubjek[];
  }

  return {
    emel: saya.emel,
    penuh,
    kelasSendiri: await kelasBolehSunting(),
    tugas,
  };
}

/** Label kelas seperti dipapar: "3 AMANAH". */
export function labelKelas(tahun: number, kelas: string): string {
  return `${tahun} ${kelas}`.trim();
}

/** Boleh MENULIS nilai subjek ini bagi kelas ini? */
export function bolehTulisNilai(k: Kuasa, tahun: number, kelas: string, subjek: string): boolean {
  if (k.penuh) return true;
  return k.tugas.some(
    (t) => t.subjek === subjek && t.tahun === tahun && sama(t.kelas, kelas),
  );
}

/**
 * Boleh MELIHAT seluruh slip kelas ini?
 *
 * Guru kelas melihat SEMUA subjek kelasnya — itu tugasnya: menyemak dan
 * mengedarkan slip. Guru subjek pula hanya melihat subjeknya sendiri, dan
 * fungsi ini memulangkan false untuk mereka.
 */
export function bolehLihatKelas(k: Kuasa, tahun: number, kelas: string): boolean {
  if (k.penuh) return true;
  if (k.kelasSendiri === null) return true;
  return k.kelasSendiri.some((x) => sama(x, labelKelas(tahun, kelas)));
}

function sama(a: string, b: string): boolean {
  const n = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  return n(a) === n(b);
}

/* ------------------------------------------------------------------ murid */

/**
 * Murid dalam satu kelas bagi satu sesi.
 *
 * Peraturan keras #1: TIADA `.limit()` mentah. Satu kelas ialah 30-40 murid
 * hari ini, tetapi corak yang sama digunakan untuk seluruh sekolah di bawah,
 * dan had lalai 1,000 pernah memotong 87% data dua kali dalam projek lain.
 */
export async function muridKelas(
  tahunSesi: number, tahun: number, kelas: string,
): Promise<Murid[]> {
  const db = klienTulis();
  const KEPING = 500;
  const keluar: Murid[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_pendaftaran?select=id,murid_id,tahun,kelas,status,pbd_murid(nama,no_kp)` +
        `&tahun_sesi=eq.${tahunSesi}&tahun=eq.${tahun}` +
        `&kelas=eq.${encodeURIComponent(kelas)}` +
        `&status=in.(aktif,pindah_masuk,ulang)` +
        `&offset=${mula}&limit=${KEPING}`,
    )) as {
      id: string; murid_id: string; tahun: number; kelas: string; status: string;
      pbd_murid: { nama: string; no_kp: string | null } | null;
    }[];

    for (const b of keping) {
      keluar.push({
        pendaftaran_id: b.id,
        murid_id: b.murid_id,
        nama: b.pbd_murid?.nama ?? "(nama tiada)",
        no_kp: b.pbd_murid?.no_kp ?? null,
        tahun: b.tahun,
        kelas: b.kelas,
        status: b.status,
      });
    }
    if (keping.length < KEPING) break;
  }
  // Disusun di sini, bukan dalam pertanyaan: nama berada dalam jadual
  // bersarang, dan PostgREST tidak boleh menyusun ikutnya.
  return keluar.sort((a, b) => a.nama.localeCompare(b.nama, "ms"));
}

/** Semua kelas yang ada murid dalam sesi ini. */
export async function kelasBerisi(
  tahunSesi: number,
): Promise<{ tahun: number; kelas: string; bil: number }[]> {
  const db = klienTulis();
  const KEPING = 1000;
  const kira = new Map<string, { tahun: number; kelas: string; bil: number }>();
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_pendaftaran?select=tahun,kelas&tahun_sesi=eq.${tahunSesi}` +
        `&status=in.(aktif,pindah_masuk,ulang)&offset=${mula}&limit=${KEPING}`,
    )) as { tahun: number; kelas: string }[];
    for (const b of keping) {
      const kunci = `${b.tahun}|${b.kelas}`;
      const ada = kira.get(kunci);
      if (ada) ada.bil++;
      else kira.set(kunci, { tahun: b.tahun, kelas: b.kelas, bil: 1 });
    }
    if (keping.length < KEPING) break;
  }
  return [...kira.values()].sort(
    (a, b) => a.tahun - b.tahun || a.kelas.localeCompare(b.kelas, "ms"),
  );
}

/* ------------------------------------------------------------------ nilai */

/** Nilai bagi satu set pendaftaran. Kosong bila senarai kosong. */
export async function nilaiPendaftaran(ids: string[], subjek?: string): Promise<Nilai[]> {
  if (ids.length === 0) return [];
  const db = klienTulis();
  const keluar: Nilai[] = [];
  // Dipecah: URL `in.(...)` dengan 40 uuid sudah panjang; seluruh sekolah
  // akan melebihi had panjang URL dan gagal dengan ralat yang tidak
  // menyebut sebabnya.
  const KEPING = 60;
  for (let i = 0; i < ids.length; i += KEPING) {
    const senarai = ids.slice(i, i + KEPING).join(",");
    const tapis = subjek ? `&subjek=eq.${encodeURIComponent(subjek)}` : "";
    keluar.push(...((await db.minta(
      `pbd_nilai?select=*&pendaftaran_id=in.(${senarai})${tapis}`,
    )) as Nilai[]));
  }
  return keluar;
}

/**
 * Simpan TP dan sumatif bagi SATU subjek, banyak murid.
 *
 * ⚠️ MEDAN KOSONG BUKAN PADAM (peraturan keras #2). Corak "kosong = padam"
 * pernah memusnahkan TP yang guru sudah masukkan: satu skrin dimuat separuh,
 * disimpan, dan setiap medan yang belum dimuat menjadi kosong di pangkalan
 * data. Di sini, `undefined` bermakna "jangan sentuh" dan hanya `null`
 * yang ditulis sebagai kosong — dan `null` hanya datang apabila guru
 * benar-benar mengosongkan medan itu.
 */
export async function simpanNilai(
  subjek: string,
  masuk: { pendaftaran_id: string; tp?: number | null; sumatif?: string | null }[],
  oleh: string,
): Promise<number> {
  const bersih = masuk.filter((m) => m.tp !== undefined || m.sumatif !== undefined);
  if (bersih.length === 0) return 0;

  const db = klienTulis();
  const sedia = await nilaiPendaftaran(bersih.map((m) => m.pendaftaran_id), subjek);
  const lama = new Map(sedia.map((n) => [n.pendaftaran_id, n]));

  const muatan = bersih.map((m) => {
    const l = lama.get(m.pendaftaran_id);
    return {
      pendaftaran_id: m.pendaftaran_id,
      subjek,
      tp: m.tp === undefined ? (l?.tp ?? null) : m.tp,
      sumatif: m.sumatif === undefined ? (l?.sumatif ?? null) : m.sumatif,
      oleh,
      dikemaskini: new Date().toISOString(),
    };
  });

  const KEPING = 200;
  for (let i = 0; i < muatan.length; i += KEPING) {
    await db.minta("pbd_nilai?on_conflict=pendaftaran_id,subjek", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(muatan.slice(i, i + KEPING)),
    });
  }
  return muatan.length;
}

/* ----------------------------------------------------------------- ulasan */

export async function ulasanKelas(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = klienTulis();
  const peta = new Map<string, string>();
  const KEPING = 60;
  for (let i = 0; i < ids.length; i += KEPING) {
    const baris = (await db.minta(
      `pbd_ulasan?select=pendaftaran_id,ulasan&pendaftaran_id=in.(${ids.slice(i, i + KEPING).join(",")})`,
    )) as { pendaftaran_id: string; ulasan: string | null }[];
    for (const b of baris) if (b.ulasan) peta.set(b.pendaftaran_id, b.ulasan);
  }
  return peta;
}

export async function simpanUlasan(
  pendaftaranId: string, ulasan: string, oleh: string,
): Promise<void> {
  const db = klienTulis();
  await db.minta("pbd_ulasan?on_conflict=pendaftaran_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      pendaftaran_id: pendaftaranId,
      ulasan: ulasan.trim() || null,
      oleh,
      dikemaskini: new Date().toISOString(),
    }),
  });
}

/* ------------------------------------------------------------ guru subjek */

export async function tugasanSubjek(
  tahunSesi: number,
): Promise<{ id: string; emel: string; subjek: string; tahun: number; kelas: string }[]> {
  const db = klienTulis();
  return (await db.minta(
    `pbd_guru_subjek?select=*&tahun_sesi=eq.${tahunSesi}&order=tahun.asc,kelas.asc,subjek.asc`,
  )) as { id: string; emel: string; subjek: string; tahun: number; kelas: string }[];
}

export async function tetapGuruSubjek(
  tahunSesi: number, emel: string, subjek: string, tahun: number, kelas: string,
): Promise<void> {
  const db = klienTulis();
  await db.minta("pbd_guru_subjek?on_conflict=emel,subjek,tahun_sesi,tahun,kelas", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      emel: emel.trim().toLowerCase(), subjek, tahun_sesi: tahunSesi, tahun, kelas,
    }),
  });
}

export async function buangGuruSubjek(id: string): Promise<void> {
  const db = klienTulis();
  await db.minta(`pbd_guru_subjek?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}


/* ------------------------------------------------------------ naik tahun */

/**
 * Buka sesi baharu dan naikkan semua murid satu tahun.
 *
 * ⚠️ INI OPERASI PALING BERBAHAYA DALAM SISTEM, dan rekaannya yang
 * menjadikannya selamat:
 *
 *   · KEPUTUSAN LAMA TIDAK DISENTUH. Murid mendapat pendaftaran BAHARU
 *     untuk sesi baharu; pendaftaran lama dan nilainya kekal, jadi slip
 *     tahun lepas boleh dicetak selamanya.
 *   · BOLEH DIULANG. `unique (murid_id, tahun_sesi)` bermakna menekan
 *     butang dua kali tidak mencipta murid pendua.
 *   · BOLEH DIUNDUR sebelum nilai diisi — padam pendaftaran sesi baharu.
 *   · TAHUN 6 TAMAT, tidak dinaikkan ke tahun 7.
 *
 * Kelas dibawa sebagai nilai AWAL sahaja; pentadbir menyusun semula selepas
 * penstriman.
 */
export async function naikTahun(
  dariSesi: number, keSesi: number,
): Promise<{ dinaikkan: number; tamat: number }> {
  const db = klienTulis();

  const KEPING = 500;
  const lama: { murid_id: string; tahun: number; kelas: string; aliran: string }[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_pendaftaran?select=murid_id,tahun,kelas,aliran&tahun_sesi=eq.${dariSesi}` +
        `&status=in.(aktif,pindah_masuk)&offset=${mula}&limit=${KEPING}`,
    )) as typeof lama;
    lama.push(...keping);
    if (keping.length < KEPING) break;
  }

  const naik = lama.filter((x) => x.tahun < 6);
  const tamat = lama.filter((x) => x.tahun === 6);

  for (let i = 0; i < naik.length; i += 200) {
    const muatan = naik.slice(i, i + 200).map((x) => ({
      murid_id: x.murid_id, tahun_sesi: keSesi,
      tahun: x.tahun + 1, kelas: x.kelas, aliran: x.aliran, status: "aktif",
    }));
    await db.minta("pbd_pendaftaran?on_conflict=murid_id,tahun_sesi", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(muatan),
    });
  }

  // Tahun 6 tamat persekolahan. Statusnya ditukar, BUKAN dipadam — slip
  // mereka mesti kekal boleh dicetak.
  for (let i = 0; i < tamat.length; i += 100) {
    const senarai = tamat.slice(i, i + 100).map((x) => x.murid_id).join(",");
    if (!senarai) continue;
    await db.minta(`pbd_murid?id=in.(${senarai})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "tamat" }),
    });
  }

  return { dinaikkan: naik.length, tamat: tamat.length };
}

export async function tetapSesi(tahunSesi: number, status: "aktif" | "tutup"): Promise<void> {
  const db = klienTulis();
  await db.minta("pbd_sesi?on_conflict=tahun_sesi", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ tahun_sesi: tahunSesi, status }),
  });
}
