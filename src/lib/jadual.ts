"use server";

import { revalidatePath } from "next/cache";
import { janaSemulaDariJadual } from "./bilik-tetap";
import { pastikanBoleh, pengguna } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { klienTulis } from "./supabase-pelayan";
import { binaSemulaLamanAwam } from "./bina-semula";
import { JADUAL_KOSONG, naikTarafJadual, type Jadual, type KelasJadual, type SetWaktu } from "@/data/jadual-jenis";

/**
 * Jadual Waktu — baca dan simpan.
 *
 * Disimpan sebagai JSON dalam `web_halaman` (slug `jadual-waktu`), corak
 * yang sama dengan Barisan Pentadbir. Lihat nota dalam
 * `src/data/jadual-jenis.ts` untuk sebab pilihan itu.
 */

const SLUG = "jadual-waktu";

export type HasilJadual = { ok: boolean; mesej: string };

/**
 * Baca jadual.
 *
 * Sesiapa yang ada peranan boleh MEMBACA — guru kelas perlu melihat jadual
 * kelasnya untuk menyuntingnya, dan guru lain tidak mendapat apa-apa yang
 * ibu bapa tidak dapat lihat di laman awam. Kawalan sebenar ada pada
 * MENYIMPAN.
 */
export async function ambilJadual(): Promise<Jadual> {
  const saya = await pengguna();
  if (!saya?.peranan) throw new Error("Tidak dibenarkan.");
  const db = klienTulis();
  const baris = (await db.minta(
    `web_halaman?slug=eq.${SLUG}&select=kandungan`,
  )) as { kandungan: string | null }[];

  const isi = baris[0]?.kandungan;
  if (!isi) return JADUAL_KOSONG;

  try {
    // `naikTarafJadual` menerima bentuk LAMA (satu senarai waktu per sesi)
    // dan menukarkannya kepada set. Data yang sudah tersimpan tidak hilang
    // apabila bentuknya berubah.
    return naikTarafJadual(JSON.parse(isi));
  } catch {
    // Peraturan #4: jangan pulangkan kosong secara senyap — jadual kosong
    // kelihatan sama seperti "belum diisi", dan admin akan menyimpan di
    // atasnya lalu memusnahkan kerja sebenar.
    throw new Error(
      "Data jadual waktu dalam pangkalan data rosak dan tidak boleh dibaca. " +
        "JANGAN simpan apa-apa di skrin ini sehingga ia diperiksa — menyimpan " +
        "sekarang akan menimpanya.",
    );
  }
}

/**
 * Simpan jadual SATU KELAS.
 *
 * Guru kelas menyimpan kelasnya sendiri; pentadbir dan admin menyimpan
 * mana-mana kelas. Kebenaran disemak di PELAYAN pada setiap simpanan —
 * menapis senarai kelas di skrin bukan kawalan, kerana sesiapa boleh
 * menghantar nama kelas yang lain.
 *
 * Menyimpan SATU kelas pada satu masa, bukan seluruh jadual, kerana:
 * simpanan seluruh jadual daripada guru kelas akan menulis semula kerja
 * setiap guru lain dengan salinan yang mereka muat turun sebelum itu —
 * kerja sehari boleh hilang tanpa sesiapa menekan apa-apa yang salah.
 */
export async function simpanJadualKelas(
  label: string,
  data: KelasJadual,
): Promise<HasilJadual> {
  const dibenar = await kelasBolehSunting();
  if (dibenar !== null && !dibenar.includes(label)) {
    return { ok: false, mesej: `Anda bukan guru kelas ${label}.` };
  }

  let semasa: Jadual;
  try {
    semasa = await ambilJadual();
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membaca jadual semasa." };
  }

  const bersih: Jadual = {
    set: semasa.set,
    tahunSet: semasa.tahunSet,
    kelas: { ...semasa.kelas, [label]: data },
    dikemaskini: new Date().toISOString(),
  };
  return tulis(bersih, `Jadual ${label} disimpan.`);
}

/**
 * Simpan jadual BANYAK kelas sekaligus.
 *
 * SATU tulisan, bukan satu tulisan setiap kelas. Menyimpan 57 kelas satu demi
 * satu bermakna 57 kitaran baca-ubah-tulis ke atas baris JSON yang SAMA —
 * perlahan, dan setiap kitaran menimpa apa yang kitaran sebelumnya baru
 * tulis kalau dua berjalan bertindih. Menggabungkan dalam ingatan dahulu
 * menghapuskan kedua-dua masalah itu.
 *
 * Pentadbir ke atas sahaja: ini menyentuh kelas milik orang lain.
 */
export async function simpanJadualBanyak(
  masukan: { kelas: string; data: KelasJadual }[],
): Promise<HasilJadual> {
  await pastikanBoleh("urus_guru_kelas");

  if (!Array.isArray(masukan) || masukan.length === 0) {
    return { ok: false, mesej: "Tiada jadual untuk disimpan." };
  }

  let semasa: Jadual;
  try {
    semasa = await ambilJadual();
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membaca jadual semasa." };
  }

  const kelas = { ...semasa.kelas };
  for (const m of masukan) {
    if (!m?.kelas || !m.data) continue;
    // Nama guru yang sudah ada dikekalkan untuk subjek yang fail baharu
    // tidak menyebutnya — sama seperti muat naik satu fail.
    const lama = kelas[m.kelas];
    const guruSubjek = { ...(lama?.guruSubjek ?? {}), ...(m.data.guruSubjek ?? {}) };
    kelas[m.kelas] = {
      hari: m.data.hari,
      ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}),
    };
  }

  return tulis(
    { set: semasa.set, tahunSet: semasa.tahunSet, kelas, dikemaskini: new Date().toISOString() },
    `${masukan.length} jadual kelas disimpan.`,
  );
}

/**
 * Simpan waktu sesi. Pentadbir ke atas SAHAJA.
 *
 * Waktu dikongsi semua kelas dalam sesi itu, jadi satu suntingan mengubah
 * paparan setiap kelas. Itu keputusan peringkat sekolah, bukan keputusan
 * seorang guru kelas.
 */
export async function simpanSetWaktu(
  set: SetWaktu[],
  tahunSet: Record<number, string>,
): Promise<HasilJadual> {
  await pastikanBoleh("urus_guru_kelas");

  if (!Array.isArray(set) || set.length === 0) {
    return { ok: false, mesej: "Sekurang-kurangnya satu set waktu diperlukan." };
  }
  for (const s of set) {
    if (!s.senarai?.length) {
      return { ok: false, mesej: `Set "${s.nama}" tiada waktu langsung.` };
    }
  }
  // Setiap tahun mesti menunjuk kepada set yang WUJUD, kalau tidak kelas
  // tahun itu tidak akan ada waktu langsung dan skrinnya kelihatan kosong
  // tanpa sebab yang jelas.
  const idSah = new Set(set.map((s) => s.id));
  for (const [tahun, id] of Object.entries(tahunSet ?? {})) {
    if (!idSah.has(id)) {
      return { ok: false, mesej: `Tahun ${tahun} menunjuk kepada set yang tidak wujud.` };
    }
  }

  let semasa: Jadual;
  try {
    semasa = await ambilJadual();
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal membaca jadual semasa." };
  }

  return tulis(
    { set, tahunSet, kelas: semasa.kelas, dikemaskini: new Date().toISOString() },
    "Waktu & rehat disimpan.",
  );
}

/** Tulis JSON penuh dan cetuskan binaan semula laman ibu bapa. */
async function tulis(bersih: Jadual, mesejOk: string): Promise<HasilJadual> {
  try {
    const db = klienTulis();
    await db.minta("web_halaman", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        slug: SLUG,
        tajuk: "Jadual Waktu",
        kandungan: JSON.stringify(bersih),
        dikemaskini: bersih.dikemaskini,
      }),
    });
  } catch (e) {
    return { ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan jadual." };
  }

  revalidatePath("/admin/jadual");

  // SEKATAN BILIK MENYUSUL SENDIRI.
  //
  // Jadual waktu ialah sumber kebenaran tentang bilik mana digunakan bila.
  // Kalau ia berubah dan sekatan tidak, maka bilik yang kini kosong kekal
  // tertutup — dan bilik yang kini digunakan boleh ditempah orang lain.
  // Keduanya ditemui hanya apabila dua kumpulan tiba di pintu yang sama.
  //
  // Kegagalannya tidak membatalkan jadual yang sudah tersimpan.
  let notaBilik = "";
  try {
    const hasil = await janaSemulaDariJadual();
    if (hasil.peta > 0) {
      notaBilik = ` ${hasil.dijana} waktu bilik dikemas kini mengikut jadual baharu.`;
    }
  } catch {
    notaBilik =
      " Jadual tersimpan, TETAPI sekatan bilik tidak dapat dikemas kini — " +
      "semak di skrin Tempahan.";
  }
  revalidatePath("/bilik");

  // Laman awam ialah eksport statik: tanpa binaan semula, jadual tersimpan
  // dalam DB tetapi ibu bapa tidak pernah melihatnya.
  const bina = await binaSemulaLamanAwam();
  return {
    ok: true,
    mesej:
      (bina.ok
        ? `${mesejOk} Laman untuk ibu bapa sedang dibina semula.`
        : `${mesejOk} TETAPI binaan semula laman awam gagal: ${bina.sebab}`) + notaBilik,
  };
}
