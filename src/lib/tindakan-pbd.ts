"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { namaSubjek } from "@/data/subjek";
import {
  kuasaPbd, sesiSemasa, muridKelas, nilaiPendaftaran, simpanNilai,
  simpanUlasan, ulasanKelas, bolehTulisNilai, bolehLihatKelas, labelKelas,
  tetapGuruSubjek, buangGuruSubjek, naikTahun, tetapSesi, senaraiSesi,
  type Nilai,
} from "./pbd";

/**
 * Tindakan pelayan ePBD.
 *
 * SETIAP satu menyemak kebenaran sendiri. Tiada satu pun mengandaikan
 * pemanggilnya sudah menyemak, dan tiada satu pun bergantung pada UI
 * menyembunyikan butang. Itu pengajaran langsung dari `/api/slip/*` dalam
 * repo gpi: ia selamat hanya kerana tersembunyi, dan persembunyian berhenti
 * menjadi benteng pada hari skrin itu dibuka kepada semua guru.
 *
 * Semuanya memulangkan `{ ok, mesej }`. Lontaran yang terlepas dari Server
 * Action sampai kepada pengguna sebagai "An unexpected response was received
 * from the server" — yang tidak menyebut apa yang gagal mahupun di mana.
 */

export interface HasilPbd {
  ok: boolean;
  mesej: string;
}

export interface BarisIsi {
  pendaftaran_id: string;
  nama: string;
  no_kp: string | null;
  tp: number | null;
  sumatif: string | null;
  oleh: string | null;
}

export interface HasilSenaraiIsi extends HasilPbd {
  tahunSesi?: number;
  sesiTutup?: boolean;
  bolehTulis?: boolean;
  namaSubjek?: string;
  baris?: BarisIsi[];
}

/** Senarai murid + nilai bagi satu (kelas, subjek). */
export async function senaraiIsi(
  tahun: number, kelas: string, subjek: string,
): Promise<HasilSenaraiIsi> {
  try {
    const k = await kuasaPbd();
    if (!k) return { ok: false, mesej: "Tiada kebenaran." };

    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Belum ada sesi persekolahan dibuka." };

    // Guru subjek melihat subjeknya; guru kelas melihat kelasnya.
    const tulis = bolehTulisNilai(k, tahun, kelas, subjek);
    const lihat = tulis || bolehLihatKelas(k, tahun, kelas);
    if (!lihat) {
      return {
        ok: false,
        mesej: `Anda tidak ditugaskan mengajar ${namaSubjek(subjek)} bagi ${labelKelas(tahun, kelas)}.`,
      };
    }

    const murid = await muridKelas(sesi.tahun_sesi, tahun, kelas);
    const nilai = await nilaiPendaftaran(murid.map((m) => m.pendaftaran_id), subjek);
    const peta = new Map(nilai.map((n) => [n.pendaftaran_id, n]));

    return {
      ok: true,
      tahunSesi: sesi.tahun_sesi,
      sesiTutup: sesi.status === "tutup",
      bolehTulis: tulis && sesi.status !== "tutup",
      namaSubjek: namaSubjek(subjek),
      baris: murid.map((m) => ({
        pendaftaran_id: m.pendaftaran_id,
        nama: m.nama,
        // No. KP TIDAK dihantar ke pelayar.
        //
        // Peraturan keras #12: apa yang sampai ke pelayar adalah AWAM,
        // walaupun tidak dipapar. FinDelima bocor betul-betul begini —
        // objek murid penuh dihantar kepada komponen klien, dan setiap
        // lajur termasuk No. KP tertanam dalam HTML sedangkan skrin hanya
        // memapar nama. Skrin isi TP tidak perlukan No. KP langsung.
        no_kp: null,
        tp: peta.get(m.pendaftaran_id)?.tp ?? null,
        sumatif: peta.get(m.pendaftaran_id)?.sumatif ?? null,
        oleh: peta.get(m.pendaftaran_id)?.oleh ?? null,
      })),
      mesej: `${murid.length} murid.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/** Simpan TP dan sumatif bagi satu subjek. */
export async function simpanIsi(
  tahun: number, kelas: string, subjek: string,
  masuk: { pendaftaran_id: string; tp: number | null; sumatif: string | null }[],
): Promise<HasilPbd> {
  try {
    const k = await kuasaPbd();
    if (!k) return { ok: false, mesej: "Tiada kebenaran." };

    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi aktif." };
    if (sesi.status === "tutup") {
      return {
        ok: false,
        mesej: `Sesi ${sesi.tahun_sesi} sudah ditutup. Keputusannya tidak boleh diubah lagi.`,
      };
    }
    if (!bolehTulisNilai(k, tahun, kelas, subjek)) {
      return {
        ok: false,
        mesej: `Anda tidak ditugaskan mengajar ${namaSubjek(subjek)} bagi ${labelKelas(tahun, kelas)}.`,
      };
    }

    // Murid yang dihantar mesti BENAR-BENAR dalam kelas ini. Tanpa semakan
    // ini, permintaan yang direka tangan boleh menulis TP kepada murid
    // mana-mana kelas dengan hanya menukar satu id.
    const murid = await muridKelas(sesi.tahun_sesi, tahun, kelas);
    const sah = new Set(murid.map((m) => m.pendaftaran_id));
    const asing = masuk.filter((m) => !sah.has(m.pendaftaran_id));
    if (asing.length > 0) {
      return { ok: false, mesej: "Ada murid yang bukan dari kelas ini. Tiada apa disimpan." };
    }

    const tapis = masuk.filter((m) => {
      if (m.tp !== null && (!Number.isInteger(m.tp) || m.tp < 1 || m.tp > 6)) return false;
      return true;
    });
    if (tapis.length !== masuk.length) {
      return { ok: false, mesej: "TP mesti antara 1 hingga 6. Tiada apa disimpan." };
    }

    const bil = await simpanNilai(subjek, tapis, k.emel);
    revalidatePath("/pbd");
    return { ok: true, mesej: `${bil} murid disimpan.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------------------- slip */

export interface BarisSlip {
  pendaftaran_id: string;
  nama: string;
  nilai: Record<string, { tp: number | null; sumatif: string | null }>;
  ulasan: string;
}

export interface HasilSlip extends HasilPbd {
  tahunSesi?: number;
  baris?: BarisSlip[];
  subjekAda?: string[];
}

/**
 * Data slip bagi SATU kelas.
 *
 * Hanya guru kelas kelas itu, atau pentadbir ke atas. Guru subjek TIDAK
 * boleh membuka slip penuh — mereka melihat subjek mereka sahaja melalui
 * skrin isi.
 */
export async function slipKelas(tahun: number, kelas: string): Promise<HasilSlip> {
  try {
    const k = await kuasaPbd();
    if (!k) return { ok: false, mesej: "Tiada kebenaran." };
    if (!bolehLihatKelas(k, tahun, kelas)) {
      return { ok: false, mesej: `Anda bukan guru kelas ${labelKelas(tahun, kelas)}.` };
    }

    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi aktif." };

    const murid = await muridKelas(sesi.tahun_sesi, tahun, kelas);
    const ids = murid.map((m) => m.pendaftaran_id);
    const [nilai, ulasan] = await Promise.all([
      nilaiPendaftaran(ids),
      ulasanKelas(ids),
    ]);

    const ikutMurid = new Map<string, Nilai[]>();
    for (const n of nilai) {
      const ada = ikutMurid.get(n.pendaftaran_id);
      if (ada) ada.push(n);
      else ikutMurid.set(n.pendaftaran_id, [n]);
    }

    // Subjek yang BENAR-BENAR ada nilai. Memapar 13 lajur kosong pada slip
    // Tahun 1 memberi ibu bapa gambaran anak mereka gagal 13 subjek.
    const adaSubjek = new Set<string>();
    for (const n of nilai) if (n.tp !== null || n.sumatif) adaSubjek.add(n.subjek);

    return {
      ok: true,
      tahunSesi: sesi.tahun_sesi,
      subjekAda: [...adaSubjek],
      baris: murid.map((m) => ({
        pendaftaran_id: m.pendaftaran_id,
        nama: m.nama,
        ulasan: ulasan.get(m.pendaftaran_id) ?? "",
        nilai: Object.fromEntries(
          (ikutMurid.get(m.pendaftaran_id) ?? []).map((n) => [
            n.subjek, { tp: n.tp, sumatif: n.sumatif },
          ]),
        ),
      })),
      mesej: `${murid.length} murid.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function simpanUlasanMurid(
  tahun: number, kelas: string, pendaftaranId: string, ulasan: string,
): Promise<HasilPbd> {
  try {
    const k = await kuasaPbd();
    if (!k) return { ok: false, mesej: "Tiada kebenaran." };
    if (!bolehLihatKelas(k, tahun, kelas)) {
      return { ok: false, mesej: `Anda bukan guru kelas ${labelKelas(tahun, kelas)}.` };
    }
    const sesi = await sesiSemasa();
    if (!sesi || sesi.status === "tutup") {
      return { ok: false, mesej: "Sesi ini sudah ditutup." };
    }
    const murid = await muridKelas(sesi.tahun_sesi, tahun, kelas);
    if (!murid.some((m) => m.pendaftaran_id === pendaftaranId)) {
      return { ok: false, mesej: "Murid itu bukan dari kelas ini." };
    }
    if (ulasan.length > 600) {
      return { ok: false, mesej: "Ulasan terlalu panjang (had 600 aksara)." };
    }
    await simpanUlasan(pendaftaranId, ulasan, k.emel);
    return { ok: true, mesej: "Ulasan disimpan." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------------- pentadbiran */

export async function tugaskanGuruSubjek(
  emel: string, subjek: string, tahun: number, kelas: string,
): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi aktif." };
    if (!emel.includes("@")) return { ok: false, mesej: "Emel tidak sah." };
    await tetapGuruSubjek(sesi.tahun_sesi, emel, subjek, tahun, kelas);
    revalidatePath("/admin/pbd");
    return { ok: true, mesej: `${emel} ditugaskan ${namaSubjek(subjek)} ${labelKelas(tahun, kelas)}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function buangTugasanGuruSubjek(id: string): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    await buangGuruSubjek(id);
    revalidatePath("/admin/pbd");
    return { ok: true, mesej: "Tugasan dibuang." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Tutup sesi semasa, buka sesi baharu, dan naikkan semua murid.
 *
 * Tiga langkah dalam SATU tindakan kerana ketiga-tiganya mesti berlaku
 * bersama: sesi lama yang masih terbuka membenarkan keputusannya diubah
 * selepas slip diedarkan, dan sesi baharu tanpa murid bermakna tiada
 * sesiapa boleh mengisi apa-apa.
 */
export async function naikTahunTindakan(): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi untuk dinaikkan." };

    const keSesi = sesi.tahun_sesi + 1;
    const sedia = await senaraiSesi();
    if (sedia.some((s) => s.tahun_sesi === keSesi)) {
      return { ok: false, mesej: `Sesi ${keSesi} sudah wujud.` };
    }

    await tetapSesi(sesi.tahun_sesi, "tutup");
    await tetapSesi(keSesi, "aktif");
    const { dinaikkan, tamat } = await naikTahun(sesi.tahun_sesi, keSesi);

    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return {
      ok: true,
      mesej:
        `Sesi ${sesi.tahun_sesi} ditutup, sesi ${keSesi} dibuka. ` +
        `${dinaikkan} murid dinaikkan satu tahun; ${tamat} murid Tahun 6 ditandakan tamat. ` +
        `Keputusan sesi ${sesi.tahun_sesi} TIDAK disentuh — slipnya kekal boleh dicetak.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function tukarStatusSesi(
  tahunSesi: number, status: "aktif" | "tutup",
): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    await tetapSesi(tahunSesi, status);
    revalidatePath("/admin/pbd");
    return { ok: true, mesej: `Sesi ${tahunSesi} kini ${status}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

function ralat(e: unknown): string {
  return "Sistem gagal. Tunjukkan mesej ini kepada admin: " +
    (e instanceof Error ? `${e.name}: ${e.message}` : String(e));
}

