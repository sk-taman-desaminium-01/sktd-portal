"use server";

import { revalidatePath } from "next/cache";
import { pengguna, pastikanBoleh } from "./akses";
import { boleh } from "./peranan";
import {
  senaraiBilik, tempahanJulat, tempahanBilikTarikh, simpanTempahan,
  batalTempahan, satuTempahan, simpanBilik, padamBilik, hariIniMY,
} from "./bilik";
import { semakTempahan, labelTarikh, type Bilik, type Tempahan } from "@/data/bilik";
import { hantar, emelIkutPeranan } from "./notifikasi";
import { simpanPermohonanPukal, penyeliaUnit } from "./inventori";
import {
  senaraiTetap, semuaTetap, tambahTetapPukal, padamTetap,
  petaSubjekBilik, tetapSubjekBilik, janaSemulaDariJadual,
} from "./bilik-tetap";
import {
  tetapBerlanggar, sebabTetap, hariTarikh, type Tetap,
} from "@/data/bilik-tetap";
import { HARI, NAMA_HARI, type Hari } from "@/data/jadual-jenis";

/**
 * Tempahan Bilik Khas — tindakan pelayan.
 *
 * SEMAKAN PERTINDIHAN BERLAKU DI SINI, bukan hanya dalam pelayar. Pelayar
 * menyemak untuk memberi jawapan segera; pelayan menyemak kerana dua guru
 * boleh menekan "Tempah" dalam saat yang sama, dan hanya pelayan melihat
 * kedua-duanya.
 *
 * Pangkalan data menyemaknya SEKALI LAGI dengan kekangan EXCLUDE (lihat
 * supabase/bilik.sql). Tiga lapisan bukan berlebihan: dua permintaan serentak
 * boleh kedua-duanya lulus semakan pelayan sebelum salah satu menulis, dan
 * hanya kekangan pangkalan data menangkap keadaan itu.
 */

export interface HasilBilik {
  ok: boolean;
  mesej: string;
  /**
   * Rekod yang BARU DICIPTA, dengan id sebenarnya.
   *
   * KENAPA INI WAJIB. Skrin menyisipkan baris sementara supaya papan bergerak
   * serta-merta, dan versi pertama memberi baris itu id rekaan
   * (`baharu-1789639712473`). Bila pengguna menekan "Batal" pada tempahan
   * yang baru sahaja dibuat, id rekaan itu dihantar ke pangkalan data dan
   * Postgres menolaknya: `invalid input syntax for type uuid`. Baris itu
   * kelihatan wujud tetapi tidak boleh disentuh.
   *
   * Pelayan tahu id sebenar; ia hanya perlu memulangkannya.
   */
  rekod?: { id: string };
}

function ralat(e: unknown): string {
  const teks = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  // Kekangan pangkalan data bercakap dalam bahasa Postgres. Diterjemah di
  // sini, sekali, supaya guru tidak pernah melihat "conflicting key value
  // violates exclusion constraint".
  if (/exclusion constraint|tempahan_tiada_tindih|23P01/i.test(teks)) {
    return "Bilik itu baru sahaja ditempah orang lain untuk waktu yang sama. Muat semula dan cuba waktu lain.";
  }
  return "Sistem gagal. Tunjukkan mesej ini kepada admin: " + teks;
}

export interface PapanBilik {
  /**
   * Jadual pangkalan data belum wujud — SQL belum dijalankan.
   *
   * Tanpa medan ini, skrin ini memaparkan "A server error occurred" kepada
   * guru yang membuka kad Tempahan Bilik Khas sebelum admin menjalankan
   * SQLnya. Skrin yang gagal tanpa memberitahu apa-apa menghantar orang
   * mencari kesilapan yang bukan milik mereka.
   */
  belumSedia: boolean;
  bilik: Bilik[];
  /** Waktu yang sudah "dimiliki" — dari jadual waktu, atau ditutup pentadbir. */
  tetap: Tetap[];
  /** Kod subjek → id bilik. Pemetaan yang menjana sekatan dari jadual waktu. */
  petaSubjek: Record<string, string>;
  tempahan: Tempahan[];
  hariIni: string;
  dari: string;
  hingga: string;
  sayaEmel: string;
  bolehUrus: boolean;
}

/** Baca papan tempahan untuk julat tarikh. Lalai: 14 hari dari hari ini. */
export async function papanBilik(dari?: string, hari = 14): Promise<PapanBilik | null> {
  const saya = await pengguna();
  if (!saya?.peranan) return null;

  const hariIni = hariIniMY();
  const mula = dari && /^\d{4}-\d{2}-\d{2}$/.test(dari) ? dari : hariIni;
  const akhir = tambahHari(mula, hari);

  const asas = {
    hariIni, dari: mula, hingga: akhir,
    sayaEmel: saya.emel ?? "",
    bolehUrus: boleh(saya.peranan, "urus_bilik"),
  };

  try {
    const [bilik, tempahan, tetap, petaSubjek] = await Promise.all([
      // Pentadbir melihat bilik yang dinyahaktifkan juga — kalau tidak,
      // bilik yang tersalah nyahaktif hilang dan tiada cara memulihkannya.
      senaraiBilik(asas.bolehUrus),
      tempahanJulat(mula, akhir),
      senaraiTetap().catch(() => [] as Tetap[]),
      petaSubjekBilik().catch(() => ({} as Record<string, string>)),
    ]);
    return { ...asas, belumSedia: false, bilik, tempahan, tetap, petaSubjek };
  } catch (e) {
    // PostgREST memulangkan 404/42P01 bila jadual tiada. Itu bukan pepijat —
    // ia bermakna satu langkah pemasangan belum dibuat, dan skrin patut
    // mengatakannya dan bukan menghempas.
    const teks = e instanceof Error ? e.message : String(e);
    if (/bilik_khas|tempahan_bilik|42P01|does not exist|Not Found|404/i.test(teks)) {
      return { ...asas, belumSedia: true, bilik: [], tempahan: [], tetap: [], petaSubjek: {} };
    }
    throw e;
  }
}

function tambahHari(iso: string, n: number): string {
  const [y, b, h] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, b - 1, h + n));
  return d.toISOString().slice(0, 10);
}

export async function tempahTindakan(data: {
  bilik_id: string; tarikh: string; mula: string; tamat: string; tujuan: string;
  /** Peralatan ICT yang perlu disediakan untuk tempahan ini. */
  peralatan?: { barang_id: string; kuantiti: number }[];
}): Promise<HasilBilik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const tujuan = data.tujuan.trim();
  if (tujuan.length < 3) {
    return { ok: false, mesej: "Tulis tujuan tempahan — itu yang guru lain baca sebelum bertanya." };
  }
  if (!data.bilik_id) return { ok: false, mesej: "Pilih bilik." };

  try {
    const sedia = await tempahanBilikTarikh(data.bilik_id, data.tarikh);
    const semak = semakTempahan(data, sedia, hariIniMY());
    if (!semak.ok) return { ok: false, mesej: semak.sebab ?? "Tempahan tidak sah." };

    // WAKTU YANG SUDAH DIMILIKI. Jadual waktu sekolah mengatakan kelas
    // Pendidikan Moral berada di Makmal 2 pada Selasa pagi; tiada siapa
    // patut boleh menempahnya. Disemak di PELAYAN, bukan hanya di pelayar —
    // pelayar menjawab lebih awal, pelayan yang memutuskan.
    const langgar = tetapBerlanggar(data, await senaraiTetap().catch(() => []));
    if (langgar) {
      return { ok: false, mesej: sebabTetap(langgar) };
    }

    const rekod = await simpanTempahan({
      bilik_id: data.bilik_id,
      tarikh: data.tarikh,
      mula: data.mula,
      tamat: data.tamat,
      tujuan,
      oleh: saya.emel ?? "",
      nama: saya.nama ?? saya.emel ?? "",
    });

    // PERALATAN ICT DIMOHON SEKALI GUS.
    //
    // Guru yang menempah dewan dan memerlukan projektor membuat SATU
    // tindakan. Menuntut mereka membuka skrin lain dan mengisi borang
    // berasingan untuk setiap barang ialah tepat kerja yang penggabungan
    // ini hapuskan — pengguna menyebutnya: "kalau buat kad baru, ia semak
    // dan serabut je."
    //
    // Kegagalannya tidak membatalkan tempahan yang sudah tersimpan.
    const peralatan = (data.peralatan ?? []).filter((x) => x.barang_id && x.kuantiti > 0);
    let notaAlat = "";
    if (peralatan.length > 0) {
      try {
        await simpanPermohonanPukal(
          peralatan.map((x) => ({
            barang_id: x.barang_id,
            kuantiti: x.kuantiti,
            tujuan: `${tujuan} — tempahan bilik ${data.tarikh} ${data.mula}–${data.tamat}`,
            perlu_pada: data.tarikh,
            oleh: (saya.emel ?? "").toLowerCase(),
            nama: saya.nama ?? saya.emel ?? "",
            tempahan_id: rekod?.id ?? null,
          })),
        );
        notaAlat = ` ${peralatan.length} permohonan peralatan dihantar kepada unit ICT.`;
      } catch {
        notaAlat =
          " Tempahan berjaya, TETAPI permohonan peralatan gagal dihantar — " +
          "mohon peralatan itu secara berasingan.";
      }
    }
    // Pentadbir diberitahu — mereka yang menguruskan bilik, dan mereka yang
    // perlu tahu bila dewan ditempah pada hari majlis. Kegagalan di sini
    // TIDAK membatalkan tempahan yang sudah berjaya.
    const namaBilik = (await senaraiBilik()).find((b) => b.id === data.bilik_id)?.nama ?? "Bilik";
    void hantar({
      penerima: await emelIkutPeranan(["admin", "pentadbir"]),
      jenis: "tempahan",
      tajuk: `${namaBilik} ditempah`,
      teks:
        `${saya.nama ?? saya.emel} menempah ${namaBilik} pada ` +
        `${labelTarikh(data.tarikh)}, ${data.mula}–${data.tamat}. Tujuan: ${tujuan}.`,
      pautan: "/bilik",
      oleh: saya.emel ?? null,
    });

    revalidatePath("/bilik");
    return {
      ok: true,
      rekod: rekod ? { id: rekod.id } : undefined,
      mesej: `Bilik ditempah ${data.mula}–${data.tamat}.` + notaAlat,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Batal tempahan.
 *
 * Guru membatalkan tempahan SENDIRI. Membatalkan tempahan orang lain
 * memerlukan `urus_bilik` — kalau tidak, sesiapa boleh mengosongkan bilik
 * yang ditempah orang lain sejam sebelum majlis.
 */
export async function batalTindakan(id: string): Promise<HasilBilik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  try {
    const t = await satuTempahan(id);
    if (!t) return { ok: false, mesej: "Tempahan itu tiada." };
    const milikSaya = t.oleh !== "" && t.oleh === saya.emel;
    if (!milikSaya && !boleh(saya.peranan, "urus_bilik")) {
      return { ok: false, mesej: "Hanya penempah atau pentadbir boleh membatalkan tempahan ini." };
    }
    await batalTempahan(id);
    revalidatePath("/bilik");
    return { ok: true, mesej: "Tempahan dibatalkan." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function padamBilikTindakan(id: string): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  try {
    const hasil = await padamBilik(id);
    revalidatePath("/bilik");
    return {
      ok: true,
      mesej:
        hasil === "dipadam"
          ? "Bilik dipadam."
          : "Bilik ini pernah ditempah, jadi ia DISEMBUNYIKAN dan bukan dipadam — " +
            "rekod tempahan lamanya kekal utuh.",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/* ------------------------------------------------------- tempahan tetap */

/**
 * Tutup satu waktu berulang — pukal, mengikut hari dan julat tarikh.
 *
 * Pentadbir menanda "Makmal 2 tertutup setiap Selasa 8–10 pagi sepanjang
 * penggal" sebagai SATU peraturan, bukan empat puluh baris tempahan.
 * Empat puluh baris menjadi lapuk, menyusahkan untuk dibatalkan, dan
 * mengaburkan sebab waktu itu tertutup.
 */
export async function tambahTetapTindakan(data: {
  bilik_id: string; hari: string[]; mula: string; tamat: string;
  sebab: string; dari_tarikh: string; hingga_tarikh: string;
}): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }

  const hari = data.hari.filter((h) => (HARI as readonly string[]).includes(h));
  if (!data.bilik_id) return { ok: false, mesej: "Pilih bilik." };
  if (hari.length === 0) return { ok: false, mesej: "Pilih sekurang-kurangnya satu hari." };
  if (data.sebab.trim().length < 3) {
    // Sekatan tanpa sebab menghantar guru bertanya kepada pentadbir kenapa
    // bilik itu tertutup — kerja yang modul ini wujud untuk hapuskan.
    return { ok: false, mesej: "Tulis sebab. Guru membacanya bila waktu itu ditolak." };
  }
  const semak = semakTempahan(
    { tarikh: data.dari_tarikh || hariIniMY(), mula: data.mula, tamat: data.tamat },
    [],
  );
  if (!semak.ok) return { ok: false, mesej: semak.sebab ?? "Waktu tidak sah." };

  try {
    await tambahTetapPukal(
      hari.map((h) => ({
        bilik_id: data.bilik_id, hari: h, mula: data.mula, tamat: data.tamat,
        sebab: data.sebab.trim(), sumber: "manual", subjek: null, kelas: null,
        dari_tarikh: data.dari_tarikh || null,
        hingga_tarikh: data.hingga_tarikh || null,
      })),
    );
    revalidatePath("/bilik");
    return {
      ok: true,
      mesej:
        `${hari.length} hari ditutup ${data.mula}–${data.tamat}` +
        (data.dari_tarikh || data.hingga_tarikh
          ? ` (${data.dari_tarikh || "mula"} hingga ${data.hingga_tarikh || "akhir"})`
          : " sepanjang tahun") + ".",
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function padamTetapTindakan(id: string): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
    await padamTetap(id);
    revalidatePath("/bilik");
    return { ok: true, mesej: "Waktu itu dibuka semula." };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function petakanSubjekTindakan(
  subjek: string, bilikId: string | null,
): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
    await tetapSubjekBilik(subjek, bilikId);
    const hasil = await janaSemulaDariJadual();
    revalidatePath("/bilik");
    return {
      ok: true,
      mesej: bilikId
        ? `${subjek} dipetakan. ${hasil.dijana} waktu ditutup mengikut jadual waktu sekolah.`
        : `Pemetaan ${subjek} dibuang. Waktu yang dijana untuknya dibuka semula.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function janaSemulaTindakan(): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
    const hasil = await janaSemulaDariJadual();
    revalidatePath("/bilik");
    return {
      ok: true,
      mesej:
        hasil.peta === 0
          ? "Tiada subjek dipetakan ke bilik. Petakan satu dahulu — contohnya Pendidikan Moral ke Makmal 2."
          : `${hasil.dijana} waktu ditutup daripada jadual waktu, bagi ${hasil.peta} subjek.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

export async function simpanBilikTindakan(b: {
  id?: string; nama: string; muatan: string; nota: string; aktif: boolean;
}): Promise<HasilBilik> {
  try {
    await pastikanBoleh("urus_bilik");
  } catch {
    return { ok: false, mesej: "Tiada kebenaran." };
  }
  const nama = b.nama.trim();
  if (nama.length < 2) return { ok: false, mesej: "Nama bilik diperlukan." };
  const muatan = b.muatan.trim() === "" ? null : Number(b.muatan);
  if (muatan !== null && (!Number.isInteger(muatan) || muatan < 1 || muatan > 2000)) {
    return { ok: false, mesej: "Muatan mesti nombor antara 1 dan 2000." };
  }
  try {
    const rekod = await simpanBilik({
      id: b.id, nama, muatan, nota: b.nota.trim() || null, aktif: b.aktif,
    });
    revalidatePath("/bilik");
    return {
      ok: true,
      rekod: rekod ? { id: rekod.id } : undefined,
      mesej: b.id ? "Bilik dikemas kini." : `Bilik "${nama}" ditambah.`,
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}
