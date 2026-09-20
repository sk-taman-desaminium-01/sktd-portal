import "server-only";
import { klienTulis } from "./supabase-pelayan";
import { pengguna } from "./akses";
import { boleh } from "./peranan";
import { kelasBolehSunting } from "./guru-kelas";
import { rancangNaik, type Pendaftaran, type RancanganNaik } from "@/data/naik-tahun";

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
  return tahun === 0 ? kelas.trim() : `${tahun} ${kelas}`.trim();
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

/**
 * Betulkan butiran seorang murid.
 *
 * Nama tersalah eja dan No. KP tersalah taip berlaku pada setiap import,
 * kerana sumbernya ialah senarai yang ditaip manusia. Tanpa cara
 * membetulkannya di skrin, jalan keluar satu-satunya ialah memadam kelas
 * dan mengimport semula — dan itu memusnahkan nilai PBD yang sudah diisi.
 */
export async function suntingMurid(
  muridId: string, ubah: { nama?: string; no_kp?: string | null; jantina?: string | null },
): Promise<void> {
  const db = klienTulis();
  const badan: Record<string, unknown> = {};
  if (ubah.nama !== undefined) {
    const n = ubah.nama.trim();
    // Peraturan keras #2: medan kosong BUKAN padam. Nama kosong ialah
    // kesilapan borang, bukan hasrat.
    if (n.length < 3) throw new Error("Nama terlalu pendek.");
    badan.nama = n.toUpperCase();
  }
  if (ubah.no_kp !== undefined) {
    const k = (ubah.no_kp ?? "").replace(/\D/g, "");
    if (k !== "" && k.length !== 12) throw new Error("No. KP mesti 12 digit.");
    badan.no_kp = k === "" ? null : k;
  }
  if (ubah.jantina !== undefined) badan.jantina = ubah.jantina;
  if (Object.keys(badan).length === 0) return;

  await db.minta(`pbd_murid?id=eq.${encodeURIComponent(muridId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(badan),
  });
}

/**
 * Buang seorang murid dari kelas.
 *
 * Pendaftaran DIBUANG, rekod murid KEKAL. Murid yang dimasukkan ke kelas
 * yang salah perlu dikeluarkan dari kelas itu — bukan dihapuskan dari
 * sekolah. Kalau nilai PBD sudah diisi bagi pendaftaran itu, operasi
 * berhenti: markah tanpa murid ialah kerosakan yang tiada butang boleh
 * pulihkan.
 */
export async function buangPendaftaran(pendaftaranId: string): Promise<void> {
  const db = klienTulis();
  const nilai = (await db.minta(
    `pbd_nilai?select=subjek&pendaftaran_id=eq.${encodeURIComponent(pendaftaranId)}&limit=1`,
  )) as { subjek: string }[];
  if (nilai.length > 0) {
    throw new Error(
      "Murid ini sudah ada nilai PBD yang diisi guru. Buang nilai itu dahulu, " +
        "atau tukar kelasnya dan bukan membuangnya.",
    );
  }
  await db.minta(`pbd_pendaftaran?id=eq.${encodeURIComponent(pendaftaranId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

/** Pindahkan murid ke kelas lain tanpa kehilangan nilainya. */
export async function tukarKelasMurid(
  pendaftaranId: string, tahun: number, kelas: string,
): Promise<void> {
  const db = klienTulis();
  await db.minta(`pbd_pendaftaran?id=eq.${encodeURIComponent(pendaftaranId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ tahun, kelas }),
  });
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
/**
 * Baca pendaftaran satu sesi, berkeping-keping sehingga habis.
 *
 * Peraturan keras #1: had lalai Supabase 1,000 pernah memotong 87% data.
 * Sekolah ini ada ~700 murid hari ini, jadi satu permintaan "cukup" —
 * sehingga ia tidak lagi cukup, dan tiada siapa akan perasan.
 */
async function pendaftaranSesi(tahunSesi: number): Promise<Pendaftaran[]> {
  const db = klienTulis();
  const KEPING = 500;
  const keluar: Pendaftaran[] = [];
  for (let mula = 0; ; mula += KEPING) {
    const keping = (await db.minta(
      `pbd_pendaftaran?select=murid_id,tahun,kelas,aliran&tahun_sesi=eq.${tahunSesi}` +
        `&status=in.(aktif,pindah_masuk)&offset=${mula}&limit=${KEPING}`,
    )) as Pendaftaran[];
    keluar.push(...keping);
    if (keping.length < KEPING) return keluar;
  }
}

/**
 * LARIAN KERING. Tidak menulis apa-apa.
 *
 * Pengguna meminta sesi percubaan sebelum 1 Januari 2027, dan ini ialah
 * bentuk paling berguna bagi percubaan itu: rancangan penuh atas data
 * sebenar, dipapar, tanpa sebarang tulisan. Boleh dijalankan seberapa kerap
 * yang dimahukan.
 */
export async function naikTahunKering(
  dariSesi: number, keSesi: number,
): Promise<RancanganNaik> {
  const [lama, sasaran] = await Promise.all([
    pendaftaranSesi(dariSesi),
    pendaftaranSesi(keSesi),
  ]);
  return rancangNaik(lama, dariSesi, keSesi, sasaran.map((x) => x.murid_id));
}

/**
 * Jalankan naik tahun.
 *
 * Rancangan dibina semula DI SINI, bukan diterima dari pelayar. Rancangan
 * yang dihantar dari pelayar ialah rancangan yang boleh diubah dalam
 * pelayar — dan "naikkan murid ini ke Tahun 6" bukan sesuatu yang patut
 * boleh ditaip oleh sesiapa.
 */
export async function naikTahun(
  dariSesi: number, keSesi: number,
): Promise<{ dinaikkan: number; tamat: number; dilangkau: number }> {
  const db = klienTulis();
  const rancangan = await naikTahunKering(dariSesi, keSesi);

  if (keSesi <= dariSesi) {
    throw new Error(`Sesi sasaran (${keSesi}) mesti lebih lewat daripada sesi sumber (${dariSesi}).`);
  }

  for (let i = 0; i < rancangan.naik.length; i += 200) {
    const muatan = rancangan.naik.slice(i, i + 200).map((x) => ({
      murid_id: x.murid_id, tahun_sesi: keSesi,
      tahun: x.ke, kelas: x.kelas, aliran: x.aliran, status: "aktif",
    }));
    await db.minta("pbd_pendaftaran?on_conflict=murid_id,tahun_sesi", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(muatan),
    });
  }

  // Tahun 6 tamat persekolahan. Statusnya ditukar, BUKAN dipadam — slip
  // mereka mesti kekal boleh dicetak.
  //
  // Ini berlaku SELEPAS kenaikan berjaya. Terbalik, satu kegagalan di
  // pertengahan meninggalkan Tahun 6 ditanda tamat sementara Tahun 1–5
  // masih di sesi lama — keadaan yang tiada siapa tahu cara membetulkan.
  for (let i = 0; i < rancangan.tamat.length; i += 100) {
    const senarai = rancangan.tamat.slice(i, i + 100).join(",");
    if (!senarai) continue;
    await db.minta(`pbd_murid?id=in.(${senarai})`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "tamat" }),
    });
  }

  return {
    dinaikkan: rancangan.naik.length,
    tamat: rancangan.tamat.length,
    dilangkau: rancangan.sudahAda.length,
  };
}

/**
 * PATAH BALIK selepas naik tahun.
 *
 * Pengguna menguji naik tahun pada September 2026 dan bertanya perkara yang
 * betul: "macam mana saya nak patah balik ke belakang selepas ujian?"
 * Operasi yang tiada jalan pulang bermakna orang takut mengujinya — dan
 * operasi yang tidak pernah diuji ialah operasi yang gagal pada 1 Januari.
 *
 * TIGA PAGAR, kerana ini memadam baris:
 *
 *  1. Hanya pendaftaran yang BOLEH dijejak kembali ke sesi sumber dibuang.
 *     Murid yang didaftarkan terus ke sesi sasaran (masuk pertengahan tahun)
 *     tidak pernah datang dari naik tahun, dan bukan milik operasi ini.
 *
 *  2. Kalau ada NILAI sudah direkod dalam sesi sasaran, ia BERHENTI. Guru
 *     sudah mula mengisi TP; membuang pendaftaran mereka meninggalkan markah
 *     tanpa murid, dan itu kerosakan yang tiada butang boleh pulihkan.
 *
 *  3. Status `tamat` Tahun 6 dipulihkan kepada `aktif` — tetapi hanya bagi
 *     murid yang memang Tahun 6 dalam sesi sumber.
 */
export async function undoNaikTahun(
  dariSesi: number, keSesi: number,
): Promise<{ dibuang: number; dipulih: number }> {
  const db = klienTulis();

  // DIKERJAKAN DARI SISI SASARAN, bukan sisi sumber.
  //
  // Versi pertama menuntut sesi SUMBER mempunyai pendaftaran, dan berhenti
  // dengan "Sesi 2026 tiada pendaftaran, jadi tiada apa yang boleh
  // dipatahkan balik" — tepat ketika pengguna paling perlukan jalan pulang.
  // Itu soalan yang salah: yang perlu dibuang ialah apa yang ada dalam sesi
  // SASARAN, dan sesi sasaran itu wujud tanpa mengira keadaan sumbernya.
  const asal = await pendaftaranSesi(dariSesi);
  const dariSini = new Set(asal.map((x) => x.murid_id));

  const sasaran = (await db.minta(
    `pbd_pendaftaran?select=id,murid_id&tahun_sesi=eq.${keSesi}`,
  )) as { id: string; murid_id: string }[];

  // Bila sumber masih ada pendaftarannya, hanya murid yang BOLEH DIJEJAK
  // kembali ke sana dibuang — murid yang didaftarkan terus ke sesi sasaran
  // tidak pernah datang dari naik tahun. Bila sumber sudah kosong, tiada
  // jejak untuk diikuti, dan seluruh sesi sasaran ialah hasil naik tahun.
  const calon = dariSini.size > 0
    ? sasaran.filter((x) => dariSini.has(x.murid_id))
    : sasaran;
  if (calon.length === 0) return { dibuang: 0, dipulih: 0 };

  // PAGAR 2. Nilai dalam sesi sasaran bermakna kerja sebenar sudah bermula.
  const ada = (await db.minta(
    `pbd_nilai?select=subjek&pendaftaran_id=in.(${calon.slice(0, 500).map((x) => x.id).join(",")})&limit=1`,
  )) as { subjek: string }[];
  if (ada.length > 0) {
    throw new Error(
      `Sesi ${keSesi} sudah mengandungi nilai PBD yang diisi guru. ` +
        "Patah balik dihentikan — membuang pendaftaran akan meninggalkan markah tanpa murid.",
    );
  }

  for (let i = 0; i < calon.length; i += 100) {
    const senarai = calon.slice(i, i + 100).map((x) => x.id).join(",");
    if (!senarai) continue;
    await db.minta(`pbd_pendaftaran?id=in.(${senarai})`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  // PAGAR 3. Tahun 6 dikembalikan kepada aktif.
  //
  // Bila sesi sumber sudah kosong, senarai Tahun 6 tidak dapat dibina
  // daripadanya — maka SEMUA murid bertanda `tamat` dipulihkan. Itu betul
  // dalam konteks ini: satu-satunya perkara yang menandakan murid `tamat`
  // ialah naik tahun yang sedang dipatahkan balik.
  const tamat = asal.length > 0
    ? asal.filter((x) => x.tahun === 6).map((x) => x.murid_id)
    : ((await db.minta("pbd_murid?select=id&status=eq.tamat")) as { id: string }[])
        .map((x) => x.id);
  for (let i = 0; i < tamat.length; i += 100) {
    const senarai = tamat.slice(i, i + 100).join(",");
    if (!senarai) continue;
    await db.minta(`pbd_murid?id=in.(${senarai})&status=eq.tamat`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "aktif" }),
    });
  }

  return { dibuang: calon.length, dipulih: tamat.length };
}

/** Buang satu sesi yang kosong — selepas patah balik, sesi itu tiada gunanya. */
export async function padamSesi(tahunSesi: number): Promise<void> {
  const db = klienTulis();
  const ada = await pendaftaranSesi(tahunSesi);
  if (ada.length > 0) {
    throw new Error(
      `Sesi ${tahunSesi} masih ada ${ada.length} pendaftaran. Patah balik dahulu.`,
    );
  }
  await db.minta(`pbd_sesi?tahun_sesi=eq.${tahunSesi}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function tetapSesi(tahunSesi: number, status: "aktif" | "tutup"): Promise<void> {
  const db = klienTulis();
  await db.minta("pbd_sesi?on_conflict=tahun_sesi", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ tahun_sesi: tahunSesi, status }),
  });
}
