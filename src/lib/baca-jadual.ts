"use server";

import { pengguna } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { semakFail } from "./storan";
import { setUntukKelas, type KelasJadual, type Waktu } from "@/data/jadual-jenis";
import { binaDraf, binaDrafDariGrid } from "./jadual-huraian";
import { bacaDokumen } from "./baca-dokumen";
import { ambilJadual } from "./jadual";

/**
 * Baca fail jadual waktu yang dimuat naik, dan CADANGKAN draf.
 *
 * FALSAFAH SAMA DENGAN BUKU PENGURUSAN (docs/buku-pengurusan.md): andaikan
 * pengekstrakan PASTI silap kadang-kadang. Tiada apa yang diterbitkan
 * automatik. Fungsi ini memulangkan CADANGAN; guru kelas menyemaknya dalam
 * grid dan menekan Simpan sendiri.
 *
 * APA YANG BOLEH DAN TIDAK BOLEH DIBACA
 *  · PDF dengan lapisan teks  → boleh (ditaip dalam Word/Excel lalu dieksport)
 *  · DOCX                     → boleh
 *  · PDF imbasan / gambar     → TIDAK. Ia perlu OCR, dan OCR dalam projek ini
 *    menggunakan Ollama tempatan yang tidak wujud di Vercel. Kita BERHENTI dan
 *    beritahu, bukan meneka — tekaan pada jadual bermakna ibu bapa membaca
 *    subjek yang salah untuk anak mereka.
 *
 * FAIL TIDAK DISIMPAN. Ia dibaca dalam ingatan dan dilupakan.
 *
 * Keputusan pengguna (16 Sep 2026): fail jadual dipadam sebaik dibaca. Kami
 * pergi satu langkah lagi dan tidak menulisnya langsung — menyimpan lalu
 * memadam serta-merta ialah dua operasi storan untuk fail yang tiada sesiapa
 * akan buka. Guru kelas baru sahaja memilih fail itu dari peranti mereka;
 * salinan mereka masih ada di situ.
 *
 * INI BERBEZA DENGAN BUKU PENGURUSAN, dan sengaja: PDF Buku Pengurusan ialah
 * sumber kebenaran yang disimpan dan hanya diganti apabila edisi baharu
 * dimuat naik (docs/buku-pengurusan.md). Jadual waktu pula sementara — yang
 * kekal ialah grid yang guru kelas sahkan, bukan failnya.
 */

export interface HasilBaca {
  ok: boolean;
  mesej: string;
  /** Teks mentah yang dibaca, untuk guru bandingkan. */
  teks?: string;
  /** Cadangan jadual. Tiada jika fail tidak boleh dibaca. */
  draf?: KelasJadual;
  /** Berapa slot dikenal pasti berbanding jumlah slot PdP. */
  keyakinan?: { dikenal: number; jumlah: number };
  amaran?: string[];
}

/* ------------------------------------------------------------ baca dokumen */

/* ---------------------------------------------------------------- tindakan */

export async function naikFailJadual(data: FormData): Promise<HasilBaca> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tidak dibenarkan." };

  const label = String(data.get("kelas") ?? "").trim();
  const fail = data.get("fail");

  const dibenar = await kelasBolehSunting();
  if (dibenar !== null && !dibenar.includes(label)) {
    return { ok: false, mesej: `Anda bukan guru kelas ${label}.` };
  }
  if (!(fail instanceof File) || fail.size === 0) {
    return { ok: false, mesej: "Tiada fail dipilih." };
  }

  // Jenis dan saiz disemak SEBELUM apa-apa dibaca — pembacaan memuatkan
  // seluruh fail ke dalam ingatan, jadi had itu mesti dikuatkuasakan dahulu.
  const tolak = semakFail(fail);
  if (tolak) return { ok: false, mesej: tolak };

  // Waktu kelas ini menentukan berapa slot ada dan mana yang rehat. Ia
  // datang dari SET WAKTU tahun kelas itu, bukan dari fail — fail hanya
  // memberitahu subjek apa, bukan jam berapa sekolah bermula.
  let senaraiWaktu: Waktu[];
  try {
    const jadual = await ambilJadual();
    senaraiWaktu = setUntukKelas(jadual, label)?.senarai ?? [];
  } catch {
    senaraiWaktu = [];
  }
  if (senaraiWaktu.length === 0) {
    return {
      ok: true,
      mesej:
        "Fail disimpan, tetapi kelas ini belum ada set waktu. Pentadbir perlu " +
        "menetapkan waktu & rehat bagi tahun kelas ini dahulu.",
    };
  }

  // Satu pembaca untuk semua format — dikongsi dengan Buku Pengurusan.
  let dok;
  try {
    dok = await bacaDokumen(fail);
  } catch (e) {
    return {
      ok: true,
      mesej: "Fail disimpan, tetapi gagal dibaca. Isi grid di bawah secara manual.",
      amaran: [e instanceof Error ? e.message : "Ralat membaca fail."],
    };
  }

  if (dok.jenis === "imbasan" || dok.jenis === "lain") {
    return {
      ok: true, teks: dok.teks || undefined,
      mesej:
        "Fail disimpan, tetapi isinya TIDAK boleh dibaca automatik. Sistem " +
        "tidak meneka. Buka fail itu di sebelah dan isi grid di bawah.",
      amaran: dok.amaran,
    };
  }

  // GRID DAHULU. Excel, CSV dan jadual DOCX menyimpan baris dan lajur sebenar,
  // jadi kita tahu sel mana di bawah hari yang mana — padanan kedudukan, bukan
  // tekaan urutan. Teks rata hanya digunakan bila tiada struktur (PDF).
  const dariGrid = dok.grid.length > 0 ? binaDrafDariGrid(dok.grid, senaraiWaktu) : null;
  const { draf, dikenal, jumlah } = dariGrid ?? binaDraf(dok.teks, senaraiWaktu);
  const bersih = dok.teks;
  const kaedah = dariGrid ? "struktur jadual" : "teks";
  const jumlahGuru = Object.keys(draf.guruSubjek ?? {}).length;

  return {
    ok: true,
    teks: bersih.slice(0, 4000),
    draf,
    keyakinan: { dikenal, jumlah },
    amaran: dok.amaran.length > 0 ? dok.amaran : undefined,
    mesej:
      dikenal === 0
        ? "Fail dibaca, tetapi tiada subjek dikenal pasti. Isi grid secara manual."
        : `Fail dibaca melalui ${kaedah}. ${dikenal} slot dikenal pasti` +
          (jumlahGuru > 0 ? ` dan ${jumlahGuru} nama guru` : "") +
          " — SEMAK setiap satu sebelum menyimpan.",
  };
}
