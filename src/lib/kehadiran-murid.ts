"use server";

import { bacaSemua } from "./baca-semua";
import { tahunSesiAktif } from "./sesi-aktif";
import { revalidatePath } from "next/cache";
import { pengguna, bolehBuat } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { klienTulis } from "./supabase-pelayan";
import { belumDipasang } from "./db-belum-sedia";
import { sahTarikh, sahUuid } from "./sah";
import { hariIniMY } from "@/data/tarikh-my";

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

/**
 * Emel → nama guru, untuk paparan "Disahkan oleh" yang mesra cikgu.
 * `pbd_kehadiran_status.disahkan_oleh` menyimpan EMEL (identiti tetap,
 * audit-safe), tapi memaparkan emel mentah ("g-45550141@moe-dl.edu.my")
 * kepada cikgu lain kelihatan teknikal dan mengelirukan (laporan pengguna
 * 1 Okt 2026, semakan sebelum lancar). Jatuh balik ke bahagian sebelum "@"
 * jika guru tiada dalam pbd_guru (cth akaun admin_mutlak).
 */
async function namaGuru(db: ReturnType<typeof klienTulis>, emel: string): Promise<string> {
  try {
    const baris = (await db.minta(
      `pbd_guru?select=nama&email=eq.${encodeURIComponent(emel)}&limit=1`,
    )) as { nama: string }[];
    return baris[0]?.nama?.trim() || emel.split("@")[0];
  } catch {
    return emel.split("@")[0];
  }
}

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
  /**
   * Boleh SIMPAN DRAF — SESIAPA guru log masuk (bukan guru kelas sahaja).
   * Permintaan pengguna 2 Okt 2026: "guru subjek boleh simpan perubahan
   * sekiranya kehadiran murid telah diisi, namun jika belum diisi,
   * seorang guru kena isi dahulu dan simpan draf." Guru subjek yang nampak
   * murid tidak hadir semasa period mereka boleh terus tambah/kemaskini —
   * tak perlu tunggu guru kelas.
   */
  boleh: boolean;
  /** Boleh SAHKAN (kuning → hijau, dibaca extension iSPEL) — GURU KELAS
   *  SAHAJA. "Button sah kehadiran hanya guru kelas je nampak." */
  bolehSahkan: boolean;
  /**
   * Boleh PADAM rekod hari ini sepenuhnya — PENTADBIR/ADMIN SAHAJA, bukan
   * guru kelas. Permintaan pengguna 2 Okt 2026: "boleh tak admin padam dan
   * edit rekod kehadiran?... mungkin berlaku kesilapan pengisian, takut
   * ada konflik antara kelas." Lebih ketat daripada `bolehSahkan` sengaja —
   * guru kelas boleh sunting/sahkan rekod SENDIRI tapi tidak padam terus;
   * padam hanya untuk betulkan kesilapan (cth tersalah kelas) yang perlu
   * pandangan pentadbir.
   */
  bolehPadam: boolean;
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
  const kosong = { belumSedia: false, boleh: false, bolehSahkan: false, bolehPadam: false, disahkanOleh: null, disahkanPada: null, tidakHadir: [] };
  const saya = await pengguna();
  if (!saya?.peranan) return kosong;
  sahTarikh(tarikh);
  // SESIAPA guru log masuk boleh simpan draf (guru subjek termasuk) — hanya
  // SAHKAN yang dikhaskan guru kelas, dan PADAM dikhaskan pentadbir sahaja.
  // Lihat nota penuh pada StatusKehadiran.
  const [bolehSahkan, bolehPadam] = await Promise.all([
    bolehUrusKelas(labelKelas),
    bolehBuat("urus_guru_kelas"),
  ]);

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
    const emelSah = status[0]?.disahkan_oleh ?? null;
    return {
      belumSedia: false, boleh: true, bolehSahkan, bolehPadam,
      disahkanOleh: emelSah ? await namaGuru(db, emelSah) : null,
      disahkanPada: status[0]?.disahkan_pada ?? null,
      tidakHadir,
    };
  } catch (e) {
    if (belumDipasang(e, "pbd_kehadiran_status", "pbd_kehadiran_murid")) {
      return { belumSedia: true, boleh: true, bolehSahkan, bolehPadam, disahkanOleh: null, disahkanPada: null, tidakHadir: [] };
    }
    return kosong;
  }
}

export interface LogKehadiranMurid {
  tarikh: string;
  kelas: string;
  disahkanOleh: string | null;
  disahkanPada: string | null;
  bilTidakHadir: number;
  /**
   * DRAF — murid tidak hadir sudah diisi tetapi guru kelas belum sahkan.
   * `disahkanOleh` ketika itu ialah nama orang yang MENGISI draf. Ditambah
   * 8 Okt 2026: draf dahulu hanya kelihatan jika kelas DAN tarikhnya dipilih
   * semula di panel atas, jadi guru menyangka draf mereka hilang.
   */
  draf: boolean;
  /** Pentadbir/admin sahaja — sama seperti `padamKehadiranMurid()`. */
  bolehPadam: boolean;
}

/**
 * Senarai hari yang SUDAH DISAHKAN, untuk digabung ke "Log Terkini" di
 * Kawalan Kelas — permintaan pengguna 2 Okt 2026: "tambah rekod kehadiran
 * digabungkan bersama dengan rekod kawalan kelas... ia kena sentiasa tally
 * untuk dimasukkan ke dalam borang rekod kawalan kelas."
 *
 * Sebelum ini Kehadiran Murid (pbd_kehadiran_status/_murid) dan Kawalan
 * Kelas (pbd_kawalan_kelas) hidup dalam jadual BERASINGAN sepenuhnya, dan
 * Log Terkini hanya baca yang kedua — guru kelas yang sahkan Kehadiran
 * Murid tidak pernah nampak rekod itu dalam log, walaupun ia berjaya
 * (extension boleh tarik), menjadikannya kelihatan "hilang".
 *
 * DRAF turut disenaraikan sejak 8 Okt 2026, berlabel jelas `draf: true` —
 * supaya guru nampak apa yang belum disahkan. Extension iSPEL tidak
 * terjejas: `GET /api/kehadiran` tetap hanya membaca hari yang disahkan.
 *
 * SIAPA NAMPAK APA (8 Okt 2026) — sama seperti `senaraiKawalanKelas()`:
 * pentadbir semua kelas; guru kelas kelasnya sendiri; guru lain hanya hari
 * yang dia sendiri sahkan atau isi. Ditapis di pelayan.
 */
export async function senaraiKehadiranMuridLog(tahun_sesi: number, hari: number = 30): Promise<LogKehadiranMurid[]> {
  const saya = await pengguna();
  if (!saya?.peranan) return [];

  const sejakIso = hariIniMY(-hari);
  const db = klienTulis();
  try {
    const [disahkan, murid, kelasSaya_, bolehPadam] = await Promise.all([
      bacaSemua<{ tarikh: string; kelas: string; disahkan_oleh: string | null; disahkan_pada: string }>(
        `pbd_kehadiran_status?select=tarikh,kelas,disahkan_oleh,disahkan_pada&tahun_sesi=eq.${tahun_sesi}` +
          `&tarikh=gte.${sejakIso}&disahkan_pada=not.is.null&order=tarikh.desc,kelas.asc`,
      ),
      bacaSemua<{ tarikh: string; kelas: string; dicipta_oleh: string | null }>(
        `pbd_kehadiran_murid?select=tarikh,kelas,dicipta_oleh&tahun_sesi=eq.${tahun_sesi}&tarikh=gte.${sejakIso}&order=tarikh.desc,kelas.asc,murid_id.asc`,
      ),
      kelasBolehSunting(),
      bolehBuat("urus_guru_kelas"),
    ]);
    const kiraan = new Map<string, number>();
    const sayaIsi = new Set<string>();
    const sudahSah = new Set(disahkan.map((s) => `${s.tarikh}|${s.kelas}`));
    // Draf = ada murid tidak hadir, tiada pengesahan. Draf "semua hadir"
    // tidak meninggalkan sebarang baris, jadi ia memang tiada untuk dipapar.
    const draf = new Map<string, { tarikh: string; kelas: string; disahkan_oleh: string | null; disahkan_pada: null }>();
    for (const m of murid) {
      const kunci = `${m.tarikh}|${m.kelas}`;
      kiraan.set(kunci, (kiraan.get(kunci) ?? 0) + 1);
      if (m.dicipta_oleh === saya.emel) sayaIsi.add(kunci);
      if (!sudahSah.has(kunci) && !draf.has(kunci)) draf.set(kunci, { tarikh: m.tarikh, kelas: m.kelas, disahkan_oleh: m.dicipta_oleh, disahkan_pada: null });
    }
    const semuaStatus: { tarikh: string; kelas: string; disahkan_oleh: string | null; disahkan_pada: string | null }[] = [...disahkan, ...draf.values()];
    if (!semuaStatus.length) return [];
    const kelasSaya = kelasSaya_ === null ? null : new Set(kelasSaya_.map((k) => k.trim().toUpperCase()));
    const status = kelasSaya === null ? semuaStatus : semuaStatus.filter((s) =>
      kelasSaya.has(s.kelas.trim().toUpperCase()) || s.disahkan_oleh === saya.emel || sayaIsi.has(`${s.tarikh}|${s.kelas}`));
    if (!status.length) return [];

    // Nama guru sebenar, bukan emel mentah — satu panggilan sahaja per
    // emel unik (bukan per baris) supaya tidak N+1 bila banyak hari.
    const emelUnik = [...new Set(status.map((s) => s.disahkan_oleh).filter((e): e is string => !!e))];
    const namaIkutEmel = new Map(await Promise.all(emelUnik.map(async (e) => [e, await namaGuru(db, e)] as const)));

    return status.map((s) => ({
      tarikh: s.tarikh, kelas: s.kelas,
      disahkanOleh: s.disahkan_oleh ? (namaIkutEmel.get(s.disahkan_oleh) ?? s.disahkan_oleh) : null,
      disahkanPada: s.disahkan_pada,
      draf: s.disahkan_pada === null,
      bilTidakHadir: kiraan.get(`${s.tarikh}|${s.kelas}`) ?? 0,
      bolehPadam,
    }));
  } catch (e) {
    if (belumDipasang(e, "pbd_kehadiran_status", "pbd_kehadiran_murid")) return [];
    throw e;
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
 *
 * SESIAPA guru log masuk boleh simpan draf — BUKAN guru kelas sahaja.
 * Permintaan pengguna 2 Okt 2026: guru subjek yang nampak murid tidak
 * hadir semasa period mereka patut boleh terus tambah/kemaskini draf,
 * sama seperti `hantarKawalanKelas()` (log bersama semua guru). Kawalan
 * sebenar ada pada `sahkanKehadiran()` — SAHAJA guru kelas boleh sahkan.
 */
export async function simpanTidakHadir(
  tarikh: string, labelKelas: string,
  senarai: { murid_id: string; kategori: string; sebab: string }[],
): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
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

/**
 * Padam rekod Kehadiran Murid SEPENUHNYA (status + setiap murid) bagi satu
 * (kelas, tarikh) — PENTADBIR/ADMIN SAHAJA, bukan guru kelas. Permintaan
 * pengguna 2 Okt 2026: "boleh tak admin padam dan edit rekod kehadiran?...
 * mungkin berlaku kesilapan pengisian, takut ada konflik antara kelas."
 *
 * Lebih ketat daripada sahkan/buka semula (yang guru kelas sendiri pun
 * boleh) — padam ialah tindakan tidak boleh patah balik, jadi dikhaskan
 * peranan yang sudah ada `urus_guru_kelas` (sama tahap kebenaran dengan
 * padam Kawalan Kelas sedia ada).
 */
export async function padamKehadiranMurid(tarikh: string, labelKelas: string): Promise<{ ok: boolean; mesej: string }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!(await bolehBuat("urus_guru_kelas"))) return { ok: false, mesej: "Hanya pentadbir boleh padam rekod ini." };
  sahTarikh(tarikh);

  const sesi = await tahunSesiAktif();
  const db = klienTulis();
  try {
    await Promise.all([
      db.minta(
        `pbd_kehadiran_status?tahun_sesi=eq.${sesi}&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      ),
      db.minta(
        `pbd_kehadiran_murid?tahun_sesi=eq.${sesi}&tarikh=eq.${tarikh}&kelas=eq.${encodeURIComponent(labelKelas)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      ),
    ]);
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal memadam." };
  }
  revalidatePath("/kawalan-kelas");
  return { ok: true, mesej: "Rekod kehadiran hari ini dipadam." };
}
