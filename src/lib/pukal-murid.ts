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
          "Kalau ia PDF imbasan, teksnya gambar semata-mata — jalankan " +
          "scripts/ocr-senarai-murid.py di Mac dahulu, atau tampal senarai itu terus.",
      };
    }

    // Kelas dikesan dari teks yang MENANG, bukan dari bacaan pertama —
    // bacaan yang tersasar juga menyebut nama kelas yang tersasar.
    const kelas = kesanKelas(pilih.teks, nama);
    const { murid, ditolak, berulang } = bacaSenaraiMurid(pilih.teks);

    const amaran: string[] = [];
    for (const b of ditolak.slice(0, 20)) amaran.push(`Tidak difahami: "${b.slice(0, 60)}"`);
    for (const kp of berulang) amaran.push(`No. KP ${kp} muncul lebih sekali dalam fail ini.`);

    if (murid.length === 0) {
      return {
        nama, kelas, ok: false, cara: pilih.cara, calon: pilih.semua, amaran,
        mesej: "Fail dibaca, tetapi tiada nama murid dapat difahami di dalamnya.",
      };
    }

    const lelaki = murid.filter((m) => m.jantina === "L").length;
    const perempuan = murid.filter((m) => m.jantina === "P").length;
    const tanpaKp = murid.filter((m) => !m.no_kp).length;

    return {
      nama,
      kelas,
      ok: true,
      murid,
      teks: pilih.teks,
      cara: pilih.cara,
      calon: pilih.semua,
      amaran,
      mesej:
        `${murid.length} murid · ${lelaki} L, ${perempuan} P` +
        (tanpaKp > 0 ? ` · ${tanpaKp} TIADA No. KP` : "") +
        (kelas ? "" : " · kelas tidak dikesan — pilih sendiri"),
    };
  } catch (e) {
    return {
      nama, kelas: null, ok: false,
      mesej: "Fail gagal dibaca: " + (e instanceof Error ? `${e.name}: ${e.message}` : String(e)),
    };
  }
}
