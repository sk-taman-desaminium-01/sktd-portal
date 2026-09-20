"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { jantinaDariKp } from "./kenal-murid";
import { namaSubjek } from "@/data/subjek";
import {
  kuasaPbd, sesiSemasa, muridKelas, nilaiPendaftaran, simpanNilai,
  simpanUlasan, ulasanKelas, bolehTulisNilai, bolehLihatKelas, labelKelas,
  tetapGuruSubjek, buangGuruSubjek, naikTahun, naikTahunKering, undoNaikTahun,
  padamSesi, tetapSesi, senaraiSesi, suntingMurid, buangPendaftaran,
  tukarKelasMurid, adakahUasaAktif, tetapUasaAktif,
  type Nilai,
} from "./pbd";
import { gerakKelas, type RancanganNaik } from "@/data/naik-tahun";
import { hantar } from "./notifikasi";

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
  uasa: string | null;
  oleh: string | null;
}

export interface HasilSenaraiIsi extends HasilPbd {
  tahunSesi?: number;
  sesiTutup?: boolean;
  bolehTulis?: boolean;
  namaSubjek?: string;
  uasaAktif?: boolean;
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

    const [murid, uasaAktif] = await Promise.all([
      muridKelas(sesi.tahun_sesi, tahun, kelas),
      adakahUasaAktif(sesi.tahun_sesi, tahun),
    ]);
    const nilai = await nilaiPendaftaran(murid.map((m) => m.pendaftaran_id), subjek);
    const peta = new Map(nilai.map((n) => [n.pendaftaran_id, n]));

    return {
      ok: true,
      tahunSesi: sesi.tahun_sesi,
      sesiTutup: sesi.status === "tutup",
      bolehTulis: tulis && sesi.status !== "tutup",
      namaSubjek: namaSubjek(subjek),
      uasaAktif,
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
        uasa: peta.get(m.pendaftaran_id)?.uasa ?? null,
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
  masuk: { pendaftaran_id: string; tp: number | null; sumatif: string | null; uasa?: string | null }[],
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
    const uasaAktif = await adakahUasaAktif(sesi.tahun_sesi, tahun);
    if (!uasaAktif && masuk.some((m) => m.uasa !== undefined)) {
      return { ok: false, mesej: "Pengisian UASA Tahun 6 belum dibuka oleh pentadbir." };
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
      if (m.uasa != null && !["A", "B", "C"].includes(m.uasa)) return false;
      return true;
    });
    if (tapis.length !== masuk.length) {
      return { ok: false, mesej: "TP mesti antara 1 hingga 6. Tiada apa disimpan." };
    }

    const bil = await simpanNilai(subjek, tapis, k.emel);
    const label = labelKelas(tahun, kelas);
    await hantar({
      penerima: [], tugasan: [{ peranan: "guru_kelas", skop: label }], jenis: "pbd",
      tajuk: `ePBD dikemas kini · ${label}`,
      teks: `${namaSubjek(subjek)} disimpan untuk ${bil} murid.`,
      pautan: "/pbd", oleh: k.emel,
    });
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
  nilai: Record<string, { tp: number | null; sumatif: string | null; uasa: string | null }>;
  ulasan: string;
}

export interface HasilSlip extends HasilPbd {
  tahunSesi?: number;
  baris?: BarisSlip[];
  subjekAda?: string[];
  subjekUasa?: string[];
  uasaAktif?: boolean;
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
    const [nilai, ulasan, uasaAktif] = await Promise.all([
      nilaiPendaftaran(ids),
      ulasanKelas(ids),
      adakahUasaAktif(sesi.tahun_sesi, tahun),
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
    const adaUasa = new Set<string>();
    if (uasaAktif) for (const n of nilai) if (n.uasa) adaUasa.add(n.subjek);

    return {
      ok: true,
      tahunSesi: sesi.tahun_sesi,
      subjekAda: [...adaSubjek],
      subjekUasa: [...adaUasa],
      uasaAktif,
      baris: murid.map((m) => ({
        pendaftaran_id: m.pendaftaran_id,
        nama: m.nama,
        ulasan: ulasan.get(m.pendaftaran_id) ?? "",
        nilai: Object.fromEntries(
          (ikutMurid.get(m.pendaftaran_id) ?? []).map((n) => [
            n.subjek, { tp: n.tp, sumatif: n.sumatif, uasa: n.uasa ?? null },
          ]),
        ),
      })),
      mesej: `${murid.length} murid.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function tetapUasaTindakan(aktif: boolean): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await sesiSemasa();
    if (!sesi || sesi.status === "tutup") return { ok: false, mesej: "Tiada sesi aktif." };
    await tetapUasaAktif(sesi.tahun_sesi, aktif);
    revalidatePath("/admin/pbd");
    revalidatePath("/pbd/isi");
    revalidatePath("/pbd/slip");
    return { ok: true, mesej: `UASA Tahun 6 ${aktif ? "dibuka" : "ditutup"}.` };
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
/**
 * SESI PERCUBAAN — jalankan naik tahun tanpa menulis apa-apa.
 *
 * Pengguna meminta percubaan sebelum 1 Januari 2027, dan ini bentuknya:
 * rancangan penuh atas data sebenar, dipapar untuk dibaca, boleh diulang
 * seberapa kerap yang dimahukan. Peraturan keras #5 — larian kering dahulu —
 * dan ini operasi yang paling wajar mematuhinya.
 */
export async function cubaNaikTahun(): Promise<
  HasilPbd & { rancangan?: RancanganNaik; gerak?: { label: string; bil: number }[] }
> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi untuk dinaikkan." };
    const rancangan = await naikTahunKering(sesi.tahun_sesi, sesi.tahun_sesi + 1);
    return {
      ok: true,
      rancangan,
      gerak: gerakKelas(rancangan),
      mesej:
        `Larian kering sahaja — TIADA apa yang ditulis. ` +
        `${rancangan.naik.length} murid akan naik, ${rancangan.tamat.length} Tahun 6 akan tamat` +
        (rancangan.sudahAda.length > 0 ? `, ${rancangan.sudahAda.length} dilangkau` : "") +
        (rancangan.ditolak.length > 0 ? `, ${rancangan.ditolak.length} ditolak` : "") +
        ".",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

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
    const { dinaikkan, tamat, dilangkau } = await naikTahun(sesi.tahun_sesi, keSesi);

    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return {
      ok: true,
      mesej:
        `Sesi ${sesi.tahun_sesi} ditutup, sesi ${keSesi} dibuka. ` +
        `${dinaikkan} murid dinaikkan satu tahun; ${tamat} murid Tahun 6 ditandakan tamat` +
        (dilangkau > 0 ? `; ${dilangkau} dilangkau kerana sudah berdaftar` : "") + ". " +
        `Keputusan sesi ${sesi.tahun_sesi} TIDAK disentuh — slipnya kekal boleh dicetak.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------- betulkan murid */

export interface MuridRingkas {
  pendaftaran_id: string;
  murid_id: string;
  nama: string;
  no_kp: string | null;
}

export interface MuridUrusKelas extends MuridRingkas {
  tahun: number;
  kelas: string;
  keadaan: "aktif" | "apung" | "pindah_keluar";
}

type BarisUrusMurid = {
  id: string;
  murid_id: string;
  tahun: number;
  kelas: string;
  status: string;
  pbd_murid: { nama: string; no_kp: string | null; status: string } | null;
};

async function pastikanKelasSendiri(tahun: number, kelas: string) {
  const kuasa = await kuasaPbd();
  if (!kuasa || !bolehLihatKelas(kuasa, tahun, kelas)) {
    throw new Error(`Anda bukan guru kelas ${labelKelas(tahun, kelas)}.`);
  }
  const sesi = await sesiSemasa();
  if (!sesi || sesi.status === "tutup") throw new Error("Tiada sesi aktif yang boleh diubah.");
  return sesi;
}

async function pendaftaranUntukUrus(pendaftaranId: string): Promise<BarisUrusMurid> {
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_pendaftaran?select=id,murid_id,tahun,kelas,status,pbd_murid(nama,no_kp,status)` +
      `&id=eq.${encodeURIComponent(pendaftaranId)}&limit=1`,
  )) as BarisUrusMurid[];
  if (!baris[0] || !baris[0].pbd_murid) throw new Error("Rekod murid tidak ditemui.");
  return baris[0];
}

function keadaanMurid(b: BarisUrusMurid): MuridUrusKelas["keadaan"] {
  if (b.status !== "pindah_keluar") return "aktif";
  return b.pbd_murid?.status === "pindah_keluar" ? "pindah_keluar" : "apung";
}

function segarSemulaMurid() {
  for (const laluan of [
    "/guru-kelas", "/admin/pbd", "/pbd", "/pbd/guru", "/pbd/slip",
    "/disiplin", "/rmt", "/borang/urus", "/borang/aktiviti", "/kawalan-kelas",
  ]) revalidatePath(laluan);
}

/** Senarai lengkap kelas untuk guru kelas, termasuk murid apung dan pindah. */
export async function senaraiUrusMuridKelasTindakan(
  tahun: number, kelas: string,
): Promise<{ ok: boolean; mesej: string; murid?: MuridUrusKelas[] }> {
  try {
    const sesi = await pastikanKelasSendiri(tahun, kelas);
    const db = klienTulis();
    const baris = (await db.minta(
      `pbd_pendaftaran?select=id,murid_id,tahun,kelas,status,pbd_murid(nama,no_kp,status)` +
        `&tahun_sesi=eq.${sesi.tahun_sesi}&tahun=eq.${tahun}` +
        `&kelas=eq.${encodeURIComponent(kelas)}&order=id.asc`,
    )) as BarisUrusMurid[];
    const murid = baris.filter((b) => b.pbd_murid && keadaanMurid(b) !== "pindah_keluar").map((b) => ({
      pendaftaran_id: b.id,
      murid_id: b.murid_id,
      nama: b.pbd_murid!.nama,
      no_kp: b.pbd_murid!.no_kp,
      tahun: b.tahun,
      kelas: b.kelas,
      keadaan: keadaanMurid(b),
    })).sort((a, b) => a.nama.localeCompare(b.nama, "ms"));
    return { ok: true, mesej: `${murid.filter((m) => m.keadaan === "aktif").length} murid aktif.`, murid };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/** Tambah murid pada sumber pusat; modul lain terus membaca rekod yang sama. */
export async function tambahMuridKelasTindakan(
  tahun: number, kelas: string, nama: string, noKp: string,
): Promise<HasilPbd> {
  try {
    const sesi = await pastikanKelasSendiri(tahun, kelas);
    const namaBersih = nama.trim().replace(/\s+/g, " ").toUpperCase();
    const kp = noKp.replace(/\D/g, "");
    if (namaBersih.length < 3) throw new Error("Nama murid terlalu pendek.");
    if (kp.length !== 12) throw new Error("No. KP/MyKid mesti 12 digit.");

    const db = klienTulis();
    const sedia = (await db.minta(
      `pbd_murid?select=id,status&no_kp=eq.${kp}&limit=1`,
    )) as { id: string; status: string }[];
    let muridId = sedia[0]?.id;
    let daftar: { id: string; tahun: number; kelas: string; status: string }[] = [];
    if (!muridId) {
      const cipta = (await db.minta("pbd_murid", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ nama: namaBersih, no_kp: kp, jantina: jantinaDariKp(kp), status: "aktif" }),
      })) as { id: string }[];
      muridId = cipta[0]?.id;
    } else {
      daftar = (await db.minta(
        `pbd_pendaftaran?select=id,tahun,kelas,status&murid_id=eq.${muridId}` +
          `&tahun_sesi=eq.${sesi.tahun_sesi}&limit=1`,
      )) as { id: string; tahun: number; kelas: string; status: string }[];
      if (daftar[0] && daftar[0].status !== "pindah_keluar") {
        throw new Error(`Murid ini sudah aktif dalam ${labelKelas(daftar[0].tahun, daftar[0].kelas)}.`);
      }
      await db.minta(`pbd_murid?id=eq.${muridId}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ nama: namaBersih, jantina: jantinaDariKp(kp), status: "aktif" }),
      });
    }
    if (!muridId) throw new Error("Rekod murid gagal diwujudkan.");

    const badanDaftar = {
      tahun_sesi: sesi.tahun_sesi,
      murid_id: muridId,
      tahun,
      kelas: kelas.trim().toUpperCase(),
      aliran: /^PPKI\b/i.test(kelas) ? "ppki" : tahun === 0 ? "prasekolah" : "perdana",
      status: daftar[0] ? "pindah_masuk" : "aktif",
    };
    if (daftar[0]) {
      await db.minta(`pbd_pendaftaran?id=eq.${daftar[0].id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(badanDaftar),
      });
      // Jika murid ini pernah menerima RMT, pulihkan rekod yang sama dan
      // pindahkan label kelasnya. Murid bukan RMT tidak pernah ditambah.
      await db.minta(`pbd_rmt_murid?murid_id=eq.${muridId}&tahun_sesi=eq.${sesi.tahun_sesi}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ tahun, kelas: kelas.trim().toUpperCase(), aktif: true }),
      });
    } else {
      await db.minta("pbd_pendaftaran", {
        method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(badanDaftar),
      });
    }
    segarSemulaMurid();
    return { ok: true, mesej: `${namaBersih} ditambah ke ${labelKelas(tahun, kelas)}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function ubahKeadaanMuridTindakan(
  pendaftaranId: string, keadaan: "apung" | "pindah_keluar" | "aktif",
  tahunSasaran?: number, kelasSasaran?: string,
): Promise<HasilPbd> {
  try {
    const b = await pendaftaranUntukUrus(pendaftaranId);
    const tahun = keadaan === "aktif" && tahunSasaran !== undefined ? tahunSasaran : b.tahun;
    const kelas = keadaan === "aktif" && kelasSasaran ? kelasSasaran : b.kelas;
    const sesi = await pastikanKelasSendiri(tahun, kelas);
    if (keadaan !== "aktif") await pastikanKelasSendiri(b.tahun, b.kelas);
    if (keadaan === "aktif" && (b.status !== "pindah_keluar" || b.pbd_murid?.status === "pindah_keluar")) {
      throw new Error("Hanya murid apung boleh dimasukkan semula.");
    }
    const db = klienTulis();

    await db.minta(`pbd_pendaftaran?id=eq.${b.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(keadaan === "aktif"
        ? { tahun, kelas: kelas.trim().toUpperCase(), status: "aktif" }
        : { status: "pindah_keluar" }),
    });
    await db.minta(`pbd_murid?id=eq.${b.murid_id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: keadaan === "pindah_keluar" ? "pindah_keluar" : "aktif" }),
    });
    await db.minta(`pbd_rmt_murid?murid_id=eq.${b.murid_id}&tahun_sesi=eq.${sesi.tahun_sesi}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(keadaan === "aktif"
        ? { tahun, kelas: kelas.trim().toUpperCase(), aktif: true }
        : { aktif: false }),
    });
    segarSemulaMurid();
    const kata = keadaan === "aktif" ? "diaktifkan semula" : keadaan === "apung" ? "diapungkan" : "ditandakan pindah keluar";
    return { ok: true, mesej: `${b.pbd_murid!.nama} ${kata}.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function muridKelasTindakan(
  tahun: number, kelas: string,
): Promise<{ ok: boolean; mesej: string; murid?: MuridRingkas[] }> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, mesej: "Tiada sesi aktif." };
    const senarai = await muridKelas(sesi.tahun_sesi, tahun, kelas);
    return {
      ok: true,
      murid: senarai.map((m) => ({
        pendaftaran_id: m.pendaftaran_id, murid_id: m.murid_id,
        nama: m.nama, no_kp: m.no_kp,
      })),
      mesej: `${senarai.length} murid dalam ${tahun} ${kelas}.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function suntingMuridTindakan(
  muridId: string, nama: string, noKp: string,
): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    await suntingMurid(muridId, { nama, no_kp: noKp });
    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return { ok: true, mesej: "Butiran murid dibetulkan." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function buangMuridTindakan(pendaftaranId: string): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    await buangPendaftaran(pendaftaranId);
    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return { ok: true, mesej: "Murid dikeluarkan dari kelas. Rekodnya kekal." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function tukarKelasTindakan(
  pendaftaranId: string, tahun: number, kelas: string,
): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    await tukarKelasMurid(pendaftaranId, tahun, kelas);
    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return { ok: true, mesej: `Dipindahkan ke ${tahun} ${kelas}. Nilai PBDnya ikut sama.` };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function undoNaikTahunTindakan(): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const sesi = await senaraiSesi();
    if (sesi.length < 2) {
      return { ok: false, mesej: "Hanya ada satu sesi — tiada naik tahun untuk dipatahkan balik." };
    }
    const terkini = Math.max(...sesi.map((s) => s.tahun_sesi));
    const sebelum = Math.max(...sesi.map((s) => s.tahun_sesi).filter((t) => t < terkini));

    const { dibuang, dipulih } = await undoNaikTahun(sebelum, terkini);

    await tetapSesi(sebelum, "aktif");
    await tetapSesi(terkini, "tutup");
    // Sesi sasaran yang kini kosong dibuang supaya senarai sesi tidak
    // menyimpan tahun yang tidak pernah benar-benar bermula.
    try {
      await padamSesi(terkini);
    } catch {
      // Ia masih ada pendaftaran yang bukan dari naik tahun. Itu betul —
      // sesi itu dikekalkan, cuma ditutup.
    }

    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return {
      ok: true,
      mesej:
        `Dipatahkan balik. ${dibuang} pendaftaran sesi ${terkini} dibuang, ` +
        `${dipulih} murid Tahun 6 dikembalikan kepada aktif. ` +
        `Sesi ${sebelum} dibuka semula — keadaannya seperti sebelum naik tahun ditekan.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Senarai sesi, untuk dipapar dan ditukar.
 *
 * Ini jalan pulang yang paling RINGAN: menukar sesi aktif tidak memadam
 * apa-apa. Pengguna yang menguji naik tahun dan mahu kembali ke 2026 tidak
 * semestinya mahu membuang sesi 2027 — kadang mereka hanya mahu berdiri di
 * tempat yang betul semula.
 */
export async function senaraiSesiTindakan(): Promise<{
  ok: boolean; mesej: string; sesi?: { tahun_sesi: number; status: string }[];
}> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    return { ok: true, mesej: "", sesi: await senaraiSesi() };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Jadikan satu sesi AKTIF, dan tutup yang lain.
 *
 * Satu sesi aktif pada satu masa. Dua sesi terbuka bermakna import dan
 * pengisian TP boleh mendarat di tahun yang salah tanpa sesiapa perasan —
 * dan itu kerosakan yang hanya ditemui berbulan kemudian.
 */
export async function jadikanSesiAktif(tahunSesi: number): Promise<HasilPbd> {
  try {
    await pastikanBoleh("urus_guru_kelas");
    const semua = await senaraiSesi();
    if (!semua.some((s) => s.tahun_sesi === tahunSesi)) {
      return { ok: false, mesej: `Sesi ${tahunSesi} tidak wujud.` };
    }
    for (const s of semua) {
      await tetapSesi(s.tahun_sesi, s.tahun_sesi === tahunSesi ? "aktif" : "tutup");
    }
    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return {
      ok: true,
      mesej:
        `Sesi ${tahunSesi} kini aktif; sesi lain ditutup. ` +
        "Tiada data dipadam — pendaftaran dan nilai setiap sesi kekal seperti sedia ada.",
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
