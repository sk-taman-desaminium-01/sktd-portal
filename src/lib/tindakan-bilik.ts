"use server";

import { revalidatePath } from "next/cache";
import { pengguna, pastikanBoleh } from "./akses";
import { boleh } from "./peranan";
import {
  senaraiBilik, tempahanJulat, tempahanBilikTarikh, simpanTempahan,
  batalTempahan, satuTempahan, simpanBilik, padamBilik, hariIniMY,
  putuskanTempahan,
} from "./bilik";
import {
  semakTempahan, labelTarikh, type Bilik, type StatusTempahan, type Tempahan,
} from "@/data/bilik";
import { ambilJadual } from "./jadual";
import { barisIkutKod } from "./pengurusan";
import { leraiTakwim } from "./takwim";
import {
  sesiGrid, tarikhCuti, perluKelulusan, gabungJulat, type SesiGrid,
} from "@/data/grid-bilik";
import { hantar } from "./notifikasi";
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
  bolehLulus: boolean;
  /**
   * Blok waktu grid, dari SET WAKTU jadual sekolah — bukan senarai yang
   * ditulis dalam kod. Bila sekolah menukar waktu rehat, grid tempahan
   * menyusul sendiri.
   */
  sesi: SesiGrid[];
  /**
   * Tarikh cuti dalam takwim. Tempahan pada tarikh ini perlu kelulusan
   * pentadbir; hari sekolah biasa pula siapa dapat dahulu, dia menang.
   */
  cuti: string[];
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
    bolehLulus: ["admin_mutlak", "admin", "pentadbir"].includes(saya.peranan),
  };

  try {
    // SATU SKRIN, SATU PERJALANAN (peraturan keras #31). Enam bacaan
    // berturutan mengambil enam kali lebih lama daripada enam bacaan
    // serentak, dan perbezaannya kelihatan pada telefon.
    const [bilik, tempahan, tetap, petaSubjek, sesi, cuti] = await Promise.all([
      // Pentadbir melihat bilik yang dinyahaktifkan juga — kalau tidak,
      // bilik yang tersalah nyahaktif hilang dan tiada cara memulihkannya.
      senaraiBilik(asas.bolehUrus),
      tempahanJulat(mula, akhir),
      senaraiTetap(),
      petaSubjekBilik().catch(() => ({} as Record<string, string>)),
      ambilJadual().then(sesiGrid).catch(() => [] as SesiGrid[]),
      tarikhCutiTakwim(),
    ]);
    return { ...asas, belumSedia: false, bilik, tempahan, tetap, petaSubjek, sesi, cuti };
  } catch (e) {
    // PostgREST memulangkan 404/42P01 bila jadual tiada. Itu bukan pepijat —
    // ia bermakna satu langkah pemasangan belum dibuat, dan skrin patut
    // mengatakannya dan bukan menghempas.
    const teks = e instanceof Error ? e.message : String(e);
    if (/bilik_khas|tempahan_bilik|42P01|does not exist|Not Found|404/i.test(teks)) {
      return {
        ...asas, belumSedia: true, bilik: [], tempahan: [], tetap: [],
        petaSubjek: {}, sesi: [], cuti: [],
      };
    }
    throw e;
  }
}

function tambahHari(iso: string, n: number): string {
  const [y, b, h] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, b - 1, h + n));
  return d.toISOString().slice(0, 10);
}

/** Bacaan takwim mesti berjaya sebelum status kelulusan ditentukan. */
async function tarikhCutiTakwim(): Promise<string[]> {
  const program = await barisIkutKod("takwim");
  if (!program) throw new Error("Takwim belum disahkan. Semakan hari cuti diperlukan sebelum tempahan.");
  return tarikhCuti(leraiTakwim(program.lajur, program.baris));
}

export async function tempahTindakan(data: {
  bilik_id: string; tarikh: string; mula: string; tamat: string; tujuan: string;
  /** Peralatan ICT yang perlu disediakan untuk tempahan ini. */
  peralatan?: { barang_id: string; kuantiti: number }[];
}): Promise<HasilBilik> {
  return tempahBanyakTindakan({
    bilik_ids: [data.bilik_id], tarikh: data.tarikh,
    blok: [{ mula: data.mula, tamat: data.tamat }],
    tujuan: data.tujuan, peralatan: data.peralatan,
  });
}

/**
 * TEMPAH BANYAK BILIK, BANYAK WAKTU, SATU TEKAN.
 *
 * Keputusan pengguna: "boleh tempah banyak bilik dan boleh tempah ikut
 * banyak waktu, mungkin ada guru tempah 3 waktu misalnya." Borang lama
 * memerlukan satu penghantaran untuk setiap gabungan — tiga waktu × dua
 * bilik ialah enam borang, dan menjelang borang keempat seseorang akan
 * tersilap taip jam.
 *
 * TIGA PERATURAN YANG MENJADIKANNYA SELAMAT:
 *
 *  1. Blok BERTURUTAN digabung menjadi satu tempahan (`gabungJulat`). Tiga
 *     waktu berturut ialah satu majlis sejam setengah, bukan tiga tempahan
 *     bersebelahan yang perlu dibatalkan tiga kali.
 *  2. Setiap gabungan disemak SENDIRI, dan kegagalan satu tidak
 *     menjatuhkan yang lain — pentadbir yang menempah lima bilik dan
 *     mendapati satu sudah diambil tetap mendapat empat.
 *  3. Hari cuti dan hujung minggu masuk sebagai `menunggu`, bukan `lulus`.
 *     Ia tidak mengunci slot sampai pentadbir memutuskan.
 */
export async function tempahBanyakTindakan(data: {
  bilik_ids: string[];
  /** Satu tarikh setiap kali: pemilihan merentas hari menjadi satu panggilan per hari. */
  tarikh: string;
  blok: { mula: string; tamat: string }[];
  tujuan: string;
  peralatan?: { barang_id: string; kuantiti: number }[];
}): Promise<HasilBilik & { berjaya?: number; gagal?: string[]; menunggu?: number }> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };

  const tujuan = data.tujuan.trim();
  if (tujuan.length < 3) {
    return { ok: false, mesej: "Tulis tujuan tempahan — itu yang guru lain baca sebelum bertanya." };
  }
  const bilikIds = [...new Set(data.bilik_ids.filter(Boolean))];
  if (bilikIds.length === 0) return { ok: false, mesej: "Pilih sekurang-kurangnya satu bilik." };

  const julat = gabungJulat(
    data.blok.map((b) => ({ id: `${b.mula}-${b.tamat}`, mula: b.mula, tamat: b.tamat })),
  );
  if (julat.length === 0) return { ok: false, mesej: "Pilih sekurang-kurangnya satu waktu." };

  try {
    const cuti = await tarikhCutiTakwim();
    const menunggu = perluKelulusan(data.tarikh, cuti);
    const status: StatusTempahan = menunggu ? "menunggu" : "lulus";
    const tetap = await senaraiTetap();
    const namaBilik = new Map((await senaraiBilik()).map((b) => [b.id, b.nama]));

    const gagal: string[] = [];
    const dicipta: { id: string; bilik_id: string; mula: string; tamat: string }[] = [];

    for (const bilik_id of bilikIds) {
      // Tempahan sedia ada dibaca SEKALI setiap bilik, bukan sekali setiap
      // julat — satu bilik dengan empat julat ialah satu bacaan, bukan empat.
      if (!namaBilik.has(bilik_id)) { gagal.push("Bilik tidak aktif atau tidak ditemui."); continue; }
      const sedia = await tempahanBilikTarikh(bilik_id, data.tarikh);
      const label = namaBilik.get(bilik_id) ?? "Bilik";

      for (const j of julat) {
        const minta = { tarikh: data.tarikh, mula: j.mula, tamat: j.tamat };
        const semak = semakTempahan(minta, sedia, hariIniMY());
        if (!semak.ok) {
          gagal.push(`${label} ${j.mula}–${j.tamat}: ${semak.sebab}`);
          continue;
        }
        const langgar = tetapBerlanggar({ bilik_id, ...minta }, tetap);
        if (langgar) {
          gagal.push(`${label} ${j.mula}–${j.tamat}: ${sebabTetap(langgar)}`);
          continue;
        }
        try {
          const rekod = await simpanTempahan({
            bilik_id, ...minta, tujuan,
            oleh: saya.emel ?? "",
            nama: saya.nama ?? saya.emel ?? "",
            status,
          });
          if (rekod) {
            dicipta.push({ id: rekod.id, bilik_id, mula: j.mula, tamat: j.tamat });
            // Slot itu kini diambil untuk julat seterusnya dalam bilik yang
            // sama — tanpa ini, dua julat yang bertindih dalam SATU
            // penghantaran akan lulus semakan dan ditolak pangkalan data.
            if (!menunggu) sedia.push(rekod);
          }
        } catch (e) {
          gagal.push(`${label} ${j.mula}–${j.tamat}: ${ralat(e)}`);
        }
      }
    }

    if (dicipta.length === 0) {
      return {
        ok: false,
        gagal,
        mesej: gagal[0] ?? "Tiada tempahan berjaya.",
      };
    }

    // Peralatan dimohon SEKALI untuk keseluruhan tempahan, bukan sekali
    // setiap bilik: guru yang menempah dua bilik untuk satu majlis
    // memerlukan satu projektor, bukan dua.
    const peralatan = (data.peralatan ?? []).filter((x) => x.barang_id && x.kuantiti > 0);
    let notaAlat = "";
    if (peralatan.length > 0) {
      try {
        await simpanPermohonanPukal(
          peralatan.map((x) => ({
            barang_id: x.barang_id,
            kuantiti: x.kuantiti,
            tujuan: `${tujuan} — tempahan bilik ${data.tarikh}`,
            perlu_pada: data.tarikh,
            oleh: (saya.emel ?? "").toLowerCase(),
            nama: saya.nama ?? saya.emel ?? "",
            tempahan_id: dicipta[0]?.id ?? null,
          })),
        );
        notaAlat = ` ${peralatan.length} permohonan peralatan dihantar kepada unit ICT.`;
      } catch {
        notaAlat =
          " Tempahan berjaya, TETAPI permohonan peralatan gagal dihantar — " +
          "mohon peralatan itu secara berasingan.";
      }
    }

    await hantar({
      penerima: [],
      peranan: ["unit_ict"],
      jenis: "tempahan",
      tajuk: menunggu ? "Tempahan hari cuti MENUNGGU kelulusan" : "Bilik ditempah",
      teks:
        `${saya.nama ?? saya.emel} menempah ${dicipta.length} slot pada ` +
        `${labelTarikh(data.tarikh)}. Tujuan: ${tujuan}.` +
        (menunggu ? " Hari cuti — ia menunggu keputusan anda." : ""),
      pautan: "/bilik",
      oleh: saya.emel ?? null,
    });

    revalidatePath("/bilik");
    return {
      ok: true,
      berjaya: dicipta.length,
      menunggu: menunggu ? dicipta.length : 0,
      gagal,
      rekod: dicipta[0] ? { id: dicipta[0].id } : undefined,
      mesej:
        (menunggu
          ? `${dicipta.length} tempahan dihantar untuk KELULUSAN pentadbir — ` +
            `${labelTarikh(data.tarikh)} hari cuti atau hujung minggu. ` +
            "Ia belum mengunci bilik itu."
          : `${dicipta.length} slot ditempah pada ${labelTarikh(data.tarikh)}.`) +
        notaAlat +
        (gagal.length > 0 ? ` ${gagal.length} tidak berjaya — lihat senarai di bawah.` : ""),
    };
  } catch (e) {
    return { ok: false, mesej: ralat(e) };
  }
}

/**
 * Luluskan atau tolak tempahan hari cuti.
 *
 * Hanya `urus_bilik`. Meluluskan ialah saat pertama tempahan itu MENGUNCI
 * slot — sampai itu, dua permohonan yang bertindih boleh hidup bersama, dan
 * pentadbir yang memilih. Kalau kedua-duanya diluluskan, kekangan
 * pangkalan data menolak yang kedua, dan mesejnya mengatakan begitu.
 */
export async function putuskanTempahanTindakan(
  id: string, status: "lulus" | "tolak",
): Promise<HasilBilik> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tiada kebenaran." };
  if (!["admin_mutlak", "admin", "pentadbir"].includes(saya.peranan)) {
    return { ok: false, mesej: "Hanya pentadbir boleh meluluskan tempahan hari cuti." };
  }
  try {
    const t = await satuTempahan(id);
    if (!t || t.dibatalkan || t.status !== "menunggu") return { ok: false, mesej: "Permohonan ini tidak lagi menunggu." };
    if (status !== "lulus" && status !== "tolak") return { ok: false, mesej: "Keputusan tidak sah." };

    if (status === "lulus") {
      // Semakan pertindihan DIBUAT SEMULA pada saat kelulusan, bukan
      // dipercayai dari saat permohonan: sesuatu yang lain mungkin sudah
      // mengambil slot itu dalam minggu sejak permohonan dibuat.
      const sedia = (await tempahanBilikTarikh(t.bilik_id, t.tarikh)).filter((x) => x.id !== id);
      const semak = semakTempahan(t, sedia, hariIniMY());
      const aktif = (await senaraiBilik()).some((b) => b.id === t.bilik_id);
      if (!aktif) return { ok: false, mesej: "Bilik tidak lagi aktif." };
      const langgar = tetapBerlanggar(t, await senaraiTetap());
      if (langgar) return { ok: false, mesej: sebabTetap(langgar) };
      if (!semak.ok) return { ok: false, mesej: semak.sebab ?? "Slot itu sudah diambil." };
    }

    await putuskanTempahan(id, status);

    await hantar({
      penerima: [t.oleh],
      jenis: "tempahan",
      tajuk: status === "lulus" ? "Tempahan hari cuti DILULUSKAN" : "Tempahan hari cuti DITOLAK",
      teks:
        `Tempahan anda pada ${labelTarikh(t.tarikh)}, ${t.mula}–${t.tamat} ` +
        `${status === "lulus" ? "diluluskan" : "ditolak"} oleh ${saya.nama ?? saya.emel}.`,
      pautan: "/bilik",
      oleh: saya.emel ?? null,
    });

    revalidatePath("/bilik");
    return {
      ok: true,
      mesej: status === "lulus" ? "Tempahan diluluskan." : "Tempahan ditolak.",
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
