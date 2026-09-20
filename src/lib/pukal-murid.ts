"use server";

import { pastikanBoleh } from "./akses";
import { muatanKeFail, type MuatanFail } from "@/data/fail-base64";
import { semakFail } from "./storan";
import { calonDariFail } from "./baca-murid-fail";
import { pilihBacaan } from "@/data/pilih-bacaan";
import { kesanKelas } from "@/data/kesan-kelas";
import { bacaSenaraiMurid, type MuridDikenal } from "./kenal-murid";

/**
 * MUAT NAIK PUKAL SENARAI MURID — 57 kelas, satu pilihan fail.
 *
 * Pengguna menyebutnya terus: "Urus ePBD ini lagi banyak dari jadual, kalau
 * jadual boleh bulk zip files pdf, kenapa tidak kita letak perkara sama
 * dekat Urus ePBD." Betul — ePBD membawa 2,000 murid berbanding 57 jadual,
 * dan laluan satu-kelas-satu-masa ialah kerja sehari penuh.
 *
 * EMPAT KEPUTUSAN YANG SAMA SEPERTI PUKAL JADUAL, kerana sebabnya sama:
 *
 *  1. ZIP dibuka DALAM PELAYAR. Menghantar zip 20 MB ke pelayan ialah satu
 *     permintaan besar yang melepasi had badan, dan satu kegagalan
 *     menjatuhkan semuanya.
 *  2. Fail dibaca SATU DEMI SATU. Setiap permintaan kecil, kemajuan
 *     kelihatan, dan fail rosak tidak menghentikan yang lain.
 *  3. Kelas dikesan dari ISI fail, bukan dari namanya. Nama fail dari iDMe
 *     ialah nombor rujukan; kepala senarai membawa "4 BESTARI".
 *  4. TIADA apa ditulis sehingga pentadbir menekan Simpan, dan setiap kelas
 *     ditulis melalui `importMuridKelas` yang sama seperti laluan satu
 *     kelas — jadi pemadanan No. KP, pengesanan jantina dan cegahan pendua
 *     berkelakuan serupa. Pukal BUKAN laluan tulis kedua.
 */
export interface HasilPukalMurid {
  nama: string;
  /** Kelas yang dikesan, atau null bila fail tidak menyebutnya. */
  kelas: string | null;
  ok: boolean;
  mesej: string;
  /** Murid yang dibaca — untuk dipapar SEBELUM disimpan. */
  murid?: MuridDikenal[];
  /** Teks yang akhirnya digunakan; dihantar semula semasa menyimpan. */
  teks?: string;
  cara?: string;
  calon?: { cara: string; skor: number }[];
  /** Baris yang tidak difahami, dan No. KP berulang. */
  amaran?: string[];
}

/** Bentuk keputusan kad daripada teks yang sudah dipilih/OCR. */
function hasilDaripadaTeks(
  nama: string,
  teks: string,
  cara: string,
  calon: { cara: string; skor: number }[],
): HasilPukalMurid {
  const kelas = kesanKelas(teks, nama);
  const { murid, ditolak, berulang } = bacaSenaraiMurid(teks);
  const amaran: string[] = [];
  for (const b of ditolak.slice(0, 20)) amaran.push(`Tidak difahami: "${b.slice(0, 60)}"`);
  for (const kp of berulang) amaran.push(`No. KP ${kp} muncul lebih sekali dalam fail ini.`);

  if (murid.length === 0) {
    return {
      nama, kelas, ok: false, cara, calon, amaran,
      mesej: "Fail dibaca, tetapi tiada nama murid dapat difahami di dalamnya.",
    };
  }

  const lelaki = murid.filter((m) => m.jantina === "L").length;
  const perempuan = murid.filter((m) => m.jantina === "P").length;
  const tanpaKp = murid.filter((m) => !m.no_kp).length;
  return {
    nama, kelas, ok: true, murid, teks, cara, calon, amaran,
    mesej:
      `${murid.length} murid · ${lelaki} L, ${perempuan} P` +
      (tanpaKp > 0 ? ` · ${tanpaKp} TIADA No. KP` : "") +
      (kelas ? "" : " · kelas tidak dikesan — pilih sendiri"),
  };
}

/**
 * Terima teks OCR terus daripada PWA. Jangan bungkus sebagai `.ocr.txt`,
 * kod base64, hantar, kemudian baca fail itu semula — itulah jurang yang
 * menjadikan import solo berjaya tetapi ZIP gagal.
 */
export async function bacaTeksMuridPukal(nama: string, teks: string): Promise<HasilPukalMurid> {
  try {
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return { nama, kelas: null, ok: false, mesej: "Tiada kebenaran." };
  }
  const pilih = pilihBacaan([{ cara: "OCR pada peranti", teks }]);
  if (!pilih || pilih.skor === 0) {
    return {
      nama, kelas: kesanKelas(teks, nama), ok: false,
      calon: pilih?.semua,
      mesej: "OCR selesai tetapi tiada pasangan nama dan No. KP sah dapat dikenal pasti.",
    };
  }
  return hasilDaripadaTeks(nama, pilih.teks, pilih.cara, pilih.semua);
}

export async function bacaMuridPukal(muatan: MuatanFail): Promise<HasilPukalMurid> {
  const nama = muatan?.nama ?? "(fail)";
  try {
    // Pukal ialah kerja pentadbiran ke atas SEMUA kelas.
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return { nama, kelas: null, ok: false, mesej: "Tiada kebenaran." };
  }

  try {
    const fail = muatanKeFail(muatan);
    const tolak = semakFail(fail);
    if (tolak) return { nama, kelas: null, ok: false, mesej: tolak };

    const calon = await calonDariFail(fail);
    const pilih = pilihBacaan(calon);
    if (!pilih || pilih.skor === 0) {
      return {
        nama, kelas: null, ok: false,
        calon: pilih?.semua,
        mesej:
          `Tiada No. KP dikesan walau dibaca ${calon.length} cara. ` +
          "Jika ia PDF imbasan atau gambar, portal akan mencuba OCR automatik " +
          "serta putaran 0°, 90°, 180° dan 270° pada peranti ini.",
      };
    }

    // Kelas dikesan dari teks yang MENANG, bukan dari bacaan pertama —
    // bacaan yang tersasar juga menyebut nama kelas yang tersasar.
    return hasilDaripadaTeks(nama, pilih.teks, pilih.cara, pilih.semua);
  } catch (e) {
    return {
      nama, kelas: null, ok: false,
      mesej: "Fail gagal dibaca: " + (e instanceof Error ? `${e.name}: ${e.message}` : String(e)),
    };
  }
}
