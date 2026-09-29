"use server";

import { bacaSemua } from "./baca-semua";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { klienTulis } from "./supabase-pelayan";
import { belumDipasang } from "./db-belum-sedia";
import { sahTarikh, sahUuid } from "./sah";

/**
 * Kehadiran murid satu-satu setiap hari — bahagian BAHARU dalam kad
 * Kawalan Kelas (bukan kad/laluan berasingan; permintaan pengguna 29 Sep
 * 2026: "guna dari rekod kawalan kelas je").
 *
 * BERBEZA daripada `pbd_kawalan_kelas.bil_hadir`/`bil_murid` (kiraan sahaja,
 * per SUBJEK/masuk-kelas): kehadiran ialah SATU fakta SEHARI semurid, jadi
 * ia jadual tersendiri, dikunci (tahun_sesi, tarikh, kelas, murid_id).
 *
 * Kenapa extension iSPEL memerlukan ini: iSPEL perlukan NAMA + kategori +
 * sebab SETIAP murid tidak hadir — `pbd_kawalan_kelas` tidak pernah
 * menyimpan nama, hanya kiraan. Lihat `README.md` extension
 * `~/Projects/ispel-kehadiran` untuk sebelah sana jambatan ini.
 *
 * ALIRAN: guru kelas tanda murid tidak hadir + kategori/sebab (draf, boleh
 * disunting berulang kali) → klik SAH → `pbd_kehadiran_status.disahkan_pada`
 * ditetapkan → extension (`GET /api/kehadiran`) hanya boleh baca hari yang
 * SUDAH disahkan. Draf yang belum disahkan tidak pernah sampai ke extension
 * — mengelakkan iSPEL diisi dengan data separuh siap.
 */

export interface MuridRoster {
  murid_id: string;
  nama: string;
}

export interface TidakHadirMurid {
  murid_id: string;
  nama_murid: string;
  kategori: string;
  sebab: string;
}

export interface StatusKehadiran {
  belumSedia: boolean;
  boleh: boolean;
  disahkanOleh: string | null;
  disahkanPada: string | null;
  tidakHadir: TidakHadirMurid[];
}

/** "4 NILAM" → { tahun: 4, kelas: "NILAM" }. PPKI: tahun 0, kelas penuh. */
function pecahLabelKelas(label: string): { tahun: number; kelas: string } | null {
  const l = label.trim();
  if (/^PPKI\s+/i.test(l)) return { tahun: 0, kelas: l.toUpperCase() };
  const m = /^([1-6])\s+(.+)$/.exec(l);
  if (!m) return null;
  return { tahun: Number(m[1]), kelas: m[2].trim().toUpperCase() };
}

/** Kelas ini boleh diurus oleh pengguna semasa? `null` daripada
 *  `kelasBolehSunting()` bermakna admin/pentadbir — semua kelas. */
async function bolehUrusKelas(labelKelas: string): Promise<boolean> {
  const kelasSaya = await kelasBolehSunting();
  if (kelasSaya === null) return true;
  return kelasSaya.includes(labelKelas.trim().toUpperCase()) || kelasSaya.includes(labelKelas.trim());
}

/** Senarai murid aktif dalam satu kelas, untuk `PilihCari` tandakan tidak hadir. */
export async function senaraiMuridKelas(labelKelas: string): Promise<MuridRoster[]> {
  const saya = await pengguna();
  if (!saya?.peranan) return [];
  if (!(await bolehUrusKelas(labelKelas))) return [];

  const pecah = pecahLabelKelas(labelKelas);
  if (!pecah) return [];
  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  const baris = (await db.minta(
    `pbd_pendaftaran?select=murid_id,pbd_murid!inner(nama)` +
      `&tahun_sesi=eq.${sesi}&status=in.(aktif,pindah_masuk,ulang)` +
      `&tahun=eq.${pecah.tahun}&kelas=eq.${encodeURIComponent(pecah.kelas)}&order=pbd_murid(nama).asc`,
  )) as { murid_id: string; pbd_murid: { nama: string } }[];
  return baris.map((b) => ({ murid_id: b.murid_id, nama: b.pbd_murid.nama }));
}

/** Status kehadiran (draf/disahkan) bagi satu kelas + tarikh. */
export async function statusKehadiran(tarikh: string, labelKelas: string): Promise<StatusKehadiran> {
  const kosong = { belumSedia: false, boleh: false, disahkanOleh: null, disahkanPada: null, tidakHadir: [] };
  const saya = await pengguna();
  if (!saya?.peranan) return kosong;
  if (!(await bolehUrusKelas(labelKelas))) return kosong;
  sahTarikh(tarikh);

  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  try {
    const [status, tidakHadir] = await Promise.all([
      db.minta(
        `pbd_kehadiran_status?select=disahkan_oleh,disahkan_pada&tahun_sesi=eq.${sesi}` +
          `&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}`,
      ) as Promise<{ disahkan_oleh: string | null; disahkan_pada: string | null }[]>,
      bacaSemua<TidakHadirMurid>(
        `pbd_kehadiran_murid?select=murid_id,nama_murid,kategori,sebab&tahun_sesi=eq.${sesi}` +
          `&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}&order=nama_murid.asc`,
      ),
    ]);
    return {
      belumSedia: false, boleh: true,
      disahkanOleh: status[0]?.disahkan_oleh ?? null,
      disahkanPada: status[0]?.disahkan_pada ?? null,
      tidakHadir,
    };
  } catch (e) {
    if (belumDipasang(e, "pbd_kehadiran_status", "pbd_kehadiran_murid")) {
      return { belumSedia: true, boleh: true, disahkanOleh: null, disahkanPada: null, tidakHadir: [] };
    }
    return kosong;
  }
}

/**
 * Simpan senarai murid tidak hadir bagi satu (kelas, tarikh) — GANTI
 * SEPENUHNYA senarai lama (padam + tulis semula). Senarai harian kecil
 * (jarang > 10 murid sekelas), jadi ganti-sepenuhnya lebih ringkas dan
 * tidak berisiko dibandingkan cuba kira pertokokan.
 *
 * Boleh disunting BILA-BILA, walaupun hari itu sudah disahkan — keputusan
 * pengguna 29 Sep 2026 ("buang keperluan buka semula") supaya guru kelas
 * tidak perlu langkah tambahan bila terjumpa kesilapan. `disahkan_pada`
 * TIDAK disentuh oleh fungsi ini — sunting kandungan tidak membatalkan
 * pengesahan; `sahkanKehadiran()` sahaja yang menetapkannya.
 */
export async function simpanTidakHadir(
  tarikh: string, labelKelas: string,
  senarai: { murid_id: string; kategori: string; sebab: string }[],
): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!(await bolehUrusKelas(labelKelas))) return { ok: false, mesej: "Bukan kelas anda." };
  sahTarikh(tarikh);
  senarai.forEach((s) => sahUuid(s.murid_id));
  if (senarai.length > 60) return { ok: false, mesej: "Terlalu banyak murid dalam satu senarai." };

  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  try {
    await db.minta(
      `pbd_kehadiran_murid?tahun_sesi=eq.${sesi}&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );

    if (senarai.length > 0) {
      const ids = senarai.map((s) => s.murid_id);
      const roster = (await db.minta(
        `pbd_pendaftaran?select=murid_id,pbd_murid!inner(nama)&tahun_sesi=eq.${sesi}` +
          `&status=in.(aktif,pindah_masuk,ulang)&murid_id=in.(${ids.join(",")})`,
      )) as { murid_id: string; pbd_murid: { nama: string } }[];
      const nama = new Map(roster.map((r) => [r.murid_id, r.pbd_murid.nama]));

      await db.minta("pbd_kehadiran_murid", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(senarai.map((s) => ({
          tahun_sesi: sesi, tarikh, kelas: labelKelas, murid_id: s.murid_id,
          nama_murid: nama.get(s.murid_id) ?? "(tidak dikenali)",
          kategori: s.kategori.trim(), sebab: s.sebab.trim(),
          dicipta_oleh: saya.emel,
        }))),
      });
    }
  } catch (e) {
    if (belumDipasang(e, "pbd_kehadiran_status", "pbd_kehadiran_murid")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Kehadiran Murid dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: `Draf disimpan — ${senarai.length} murid tidak hadir.` };
}

/** Sahkan hari ini — SELEPAS ini extension iSPEL boleh membacanya. */
export async function sahkanKehadiran(tarikh: string, labelKelas: string): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!(await bolehUrusKelas(labelKelas))) return { ok: false, mesej: "Bukan kelas anda." };
  sahTarikh(tarikh);

  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  try {
    await db.minta(`pbd_kehadiran_status?on_conflict=tahun_sesi,tarikh,kelas`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        tahun_sesi: sesi, tarikh, kelas: labelKelas,
        disahkan_oleh: saya.emel, disahkan_pada: new Date().toISOString(),
        dicipta_oleh: saya.emel,
      }]),
    });
  } catch (e) {
    if (belumDipasang(e, "pbd_kehadiran_status")) {
      return { ok: false, mesej: "Ciri ini belum dipasang — admin perlu jalankan SQL Kehadiran Murid dahulu." };
    }
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal mengesahkan." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Kehadiran hari ini disahkan — extension iSPEL kini boleh menariknya." };
}

/** Buka semula hari yang sudah disahkan, untuk pembetulan. */
export async function bukaSemulaKehadiran(tarikh: string, labelKelas: string): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!(await bolehUrusKelas(labelKelas))) return { ok: false, mesej: "Bukan kelas anda." };
  sahTarikh(tarikh);

  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  try {
    await db.minta(
      `pbd_kehadiran_status?tahun_sesi=eq.${sesi}&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membuka semula." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Dibuka semula — boleh disunting." };
}
