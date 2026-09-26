"use server";

import { pengguna, pastikanBoleh } from "./akses";
import { kelasBolehSunting } from "./guru-kelas";
import { semakFail } from "./storan";
import type { MuatanFail } from "@/data/fail-base64";
import { bacaMuatan, adaMuatan } from "./muatan";
import { setUntukKelas, type KelasJadual, type Waktu } from "@/data/jadual-jenis";
import { kesanKelas, semuaKelasDalam } from "@/data/kesan-kelas";
import { binaDraf, binaDrafDariGrid, binaDrafDariKedudukan } from "./jadual-huraian";
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
 * APA YANG BOLEH DIBACA
 *  · PDF dengan lapisan teks  → boleh (ditaip dalam Word/Excel lalu dieksport)
 *  · DOCX                     → boleh
 *  · PDF imbasan / gambar     → komponen muat naik menjalankan OCR dalam
 *    pelayar sebelum teks dihantar ke tindakan ini.
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

export async function naikFailJadual(
  kelas: string,
  muatan: MuatanFail,
): Promise<HasilBaca> {
  // SELURUH tindakan dibalut. Sebarang lontaran yang terlepas dari sini
  // TIDAK sampai kepada pengguna sebagai ralat yang boleh dibaca — Next
  // menggantikannya dengan "An unexpected response was received from the
  // server", yang tidak menyebut apa yang gagal mahupun di mana. Itu berlaku,
  // dan ia menyembunyikan puncanya selama beberapa pusingan.
  try {
    return await jalankan(kelas, muatan);
  } catch (e) {
    return {
      ok: false,
      mesej:
        "Sistem gagal membaca fail itu. Tunjukkan mesej ini kepada admin: " +
        (e instanceof Error ? `${e.name}: ${e.message}` : String(e)),
    };
  }
}

async function jalankan(kelas: string, muatan: MuatanFail): Promise<HasilBaca> {
  const saya = await pengguna();
  if (!saya?.peranan) return { ok: false, mesej: "Tidak dibenarkan." };

  const label = kelas.trim();
  if (!adaMuatan(muatan)) return { ok: false, mesej: "Tiada fail dipilih." };
  const fail = await bacaMuatan(muatan);

  const dibenar = await kelasBolehSunting();
  if (dibenar !== null && !dibenar.includes(label)) {
    return { ok: false, mesej: `Anda bukan guru kelas ${label}.` };
  }
  if (fail.size === 0) return { ok: false, mesej: "Fail itu kosong." };

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

  // TIGA KAEDAH, dari yang paling tepat ke yang paling terdesak:
  //  1. KOORDINAT PDF — setiap hari satu jalur y, setiap waktu satu jalur x.
  //     Ini yang membaca jadual aSc sekolah: 37/45 slot pada fail sebenar,
  //     berbanding 0 dengan kedua-dua kaedah di bawah.
  //  2. GRID — Excel, CSV dan jadual DOCX menyimpan baris dan lajur sebenar.
  //  3. TEKS RATA — jaring terakhir. Ia mengandaikan subjek muncul mengikut
  //     turutan, yang jarang benar pada fail sebenar.
  const dariKedudukan = dok.item?.length
    ? binaDrafDariKedudukan(dok.item, senaraiWaktu)
    : null;
  const dariGrid = dariKedudukan
    ? null
    : dok.grid.length > 0
      ? binaDrafDariGrid(dok.grid, senaraiWaktu)
      : null;
  const { draf, dikenal, jumlah, kosong, tidakDikenali } =
    dariKedudukan ?? dariGrid ?? binaDraf(dok.teks, senaraiWaktu);
  const bersih = dok.teks;
  const kaedah = dariKedudukan
    ? "kedudukan dalam PDF"
    : dariGrid
      ? "struktur jadual"
      : "teks";
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
          (tidakDikenali > 0
            ? `. ${tidakDikenali} sel ada teks yang sistem tidak cam — semak sel kosong dalam grid.`
            : kosong > 0
              ? `. Tiada yang terlepas — ${kosong} waktu lagi memang kosong dalam fail itu.`
              : ". Tiada yang terlepas — jadual penuh.") +
          " SEMAK setiap satu sebelum menyimpan.",
  };
}


/* ------------------------------------------------------- muat naik PUKAL */

export interface HasilPukal {
  nama: string;
  /** Kelas yang dikesan, atau null jika tidak pasti. */
  kelas: string | null;
  ok: boolean;
  mesej: string;
  draf?: KelasJadual;
  /**
   * Waktu kelas ini — supaya pelayar boleh MEMAPAR draf sebagai grid
   * sebelum pentadbir menekan Simpan.
   *
   * Tanpa ini, satu-satunya maklumat sebelum menyimpan ialah nombor
   * "44 slot dibaca" — dan nombor itu betul sekalipun setiap subjek
   * diletakkan pada hari yang salah. Pengguna meminta melihat jadual
   * kelas itu dahulu, dan itu betul: slot yang tersasar kelihatan serta
   * -merta dalam grid, dan tidak pernah kelihatan dalam satu nombor.
   */
  waktu?: Waktu[];
  keyakinan?: { dikenal: number; jumlah: number };
  /**
   * Nama guru kelas seperti TERCETAK pada kepala muka jadual.
   *
   * Perisian jadual mencetak "Guru kelas : NAMA" pada setiap muka. Itu sumber
   * yang PASTI — ia datang daripada pangkalan data jadual sekolah sendiri,
   * bukan senarai yang ditaip semula. Buku Pengurusan pula memecahkan tahun
   * dan kelas ke lajur berasingan dengan bentuk berbeza setiap edisi, dan
   * itulah sebab padanan daripadanya memulangkan sifar.
   */
  guruKelas?: string;
}

/**
 * Baca SATU fail dalam muat naik pukal.
 *
 * Pukal diproses satu fail pada satu masa dari pelayar, BUKAN sekaligus.
 * 57 kelas x 300 KB ialah kira-kira 17 MB, dan base64 menjadikannya 23 MB —
 * jauh melebihi had badan permintaan. Menghantarnya satu demi satu
 * mengekalkan setiap permintaan kecil, memberi kemajuan yang boleh dilihat,
 * dan bermakna satu fail rosak tidak menjatuhkan keseluruhan kerja.
 */
/**
 * Nama guru kelas daripada kepala muka jadual.
 *
 * Bentuk sebenar (disahkan pada JW KELAS PETANG 31.7.2026, 30 muka):
 *   "SK Taman Desaminium, Seri Kembangan, Selangor   Guru kelas : ADHLINA …"
 *
 * DUA PEMOTONGAN, kedua-duanya perlu:
 *  1. Teks selepas nama ialah kaki muka ("Jadual waktu terjana:7/31/2026"),
 *     jadi ia dipotong pada perkataan itu dan pada digit pertama — nama guru
 *     tidak mengandungi nombor.
 *  2. Bila DUA nama tersenarai, yang kedua ialah PEMBANTU guru kelas, bukan
 *     guru kelas. Hanya yang pertama diambil. Mengambil kedua-duanya bermakna
 *     memberi pembantu kuasa menyunting jadual kelas itu.
 */
function guruKelasDariKepala(item: { str: string }[]): string | null {
  const gabung = item.map((i) => i.str).join(" ").replace(/\s+/g, " ");
  const m = /Guru\s*kelas\s*:\s*(.+)/i.exec(gabung);
  if (!m) return null;
  const nama = m[1]
    .split(/\b(?:Jadual|aSc|Tarikh|Kelas)\b/i)[0]
    .split(/\d/)[0]
    // Pembantu guru kelas dipisahkan "/", "&" atau koma — ambil yang pertama.
    .split(/[/&,]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  // Dua perkataan minimum: sel kosong atau "-" bukan nama.
  return nama.split(" ").filter(Boolean).length >= 2 ? nama : null;
}

export async function bacaJadualPukal(muatan: MuatanFail): Promise<HasilPukal> {
  try {
    // Pukal ialah kerja pentadbiran ke atas SEMUA kelas, jadi ia memerlukan
    // kuasa peringkat sekolah — bukan sekadar guru kelas.
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return { nama: muatan?.nama ?? "(fail)", kelas: null, ok: false, mesej: "Tiada kebenaran." };
  }

  const nama = muatan?.nama ?? "(fail)";
  try {
    const failPukal = await bacaMuatan(muatan);
    const tolak = semakFail(failPukal);
    if (tolak) return { nama, kelas: null, ok: false, mesej: tolak };

    const dok = await bacaDokumen(failPukal);
    if (dok.jenis === "imbasan" || dok.jenis === "lain") {
      return { nama, kelas: null, ok: false, mesej: dok.amaran[0] ?? "Fail ini tidak boleh dibaca." };
    }

    const kelas = kesanKelas(dok.teks, nama);
    if (!kelas) {
      return {
        nama, kelas: null, ok: false,
        mesej: "Kelas tidak dapat dikesan dari fail ini. Muat naik ia seorang diri dan pilih kelasnya.",
      };
    }

    const jadual = await ambilJadual();
    const senaraiWaktu = setUntukKelas(jadual, kelas)?.senarai ?? [];
    if (senaraiWaktu.length === 0) {
      return { nama, kelas, ok: false, mesej: `Tiada set waktu untuk ${kelas}.` };
    }

    const hasil =
      (dok.item?.length ? binaDrafDariKedudukan(dok.item, senaraiWaktu) : null) ??
      (dok.grid.length ? binaDrafDariGrid(dok.grid, senaraiWaktu) : null) ??
      binaDraf(dok.teks, senaraiWaktu);

    return {
      nama, kelas, ok: hasil.dikenal > 0,
      draf: hasil.draf,
      waktu: senaraiWaktu,
      keyakinan: { dikenal: hasil.dikenal, jumlah: hasil.jumlah },
      mesej:
        hasil.dikenal > 0
          ? `${hasil.dikenal} slot dibaca`
          : "Fail dibaca tetapi tiada subjek dikenal pasti.",
    };
  } catch (e) {
    return {
      nama, kelas: null, ok: false,
      mesej: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}


/**
 * SATU FAIL, SEMUA KELAS — jadual induk yang pentadbir sebenarnya terima.
 *
 * MASALAH YANG INI SELESAIKAN
 * Muat naik pukal direka untuk satu fail satu kelas: pilih 57 fail, atau satu
 * zip yang mengandunginya. Tetapi pentadbir sekolah tidak menerima 57 fail.
 * Mereka menerima SATU PDF dengan semua kelas di dalamnya, dicetak oleh
 * perisian jadual waktu.
 *
 * Pada fail itu, laluan lama gagal dengan tepat tetapi tidak berguna:
 * `kesanKelas` menjumpai 57 nama kelas, memulangkan null kerana ia kabur, dan
 * pentadbir membaca "Kelas tidak dapat dikesan dari fail ini" — untuk fail
 * yang sebenarnya mengandungi setiap kelas di sekolah.
 *
 * CARA IA DIBACA
 * Satu muka surat = satu kelas. Itu bentuk yang dicetak oleh perisian jadual;
 * setiap kelas mendapat halamannya sendiri. Jadi setiap muka dibaca
 * berasingan: nama kelas dikesan dari teks muka ITU, dan grid dibina hanya
 * dari koordinat pada muka ITU.
 *
 * APA YANG IA TIDAK BUAT, DENGAN SENGAJA
 * Kalau satu muka mengandungi BEBERAPA kelas (jadual induk satu helaian
 * besar), ia TIDAK meneka. Ia melaporkan muka itu dengan menamakan kelas yang
 * dijumpai, supaya pentadbir nampak apa yang berlaku. Meneka di situ bermakna
 * menulis jadual satu kelas ke dalam kelas lain — dan tiada siapa akan
 * perasan sampai seorang guru berdiri di bilik yang salah.
 *
 * Muka tanpa nama kelas (muka hadapan, nota, halaman kosong) dilangkau senyap.
 *
 * Helaian Excel dikira sama: buku kerja dengan satu helaian setiap kelas
 * berfungsi melalui laluan yang sama.
 */
export async function bacaJadualPukalBanyak(muatan: MuatanFail): Promise<HasilPukal[]> {
  const nama = muatan?.nama ?? "(fail)";
  try {
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return [{ nama, kelas: null, ok: false, mesej: "Tiada kebenaran." }];
  }

  try {
    const failPukal = await bacaMuatan(muatan);
    const tolak = semakFail(failPukal);
    if (tolak) return [{ nama, kelas: null, ok: false, mesej: tolak }];

    const dok = await bacaDokumen(failPukal);
    if (dok.jenis === "imbasan" || dok.jenis === "lain") {
      return [{ nama, kelas: null, ok: false, mesej: dok.amaran[0] ?? "Fail ini tidak boleh dibaca." }];
    }

    const bilMuka = Math.max(dok.item?.length ?? 0, dok.grid.length);
    // Satu muka sahaja: tiada apa untuk dipecahkan. Guna laluan asal supaya
    // setiap mesejnya kekal sama seperti sebelum ini.
    if (bilMuka <= 1) return [await bacaJadualPukal(muatan)];

    /** Teks satu muka, daripada koordinat PDF atau daripada helaian Excel. */
    const teksMukaKe = (i: number): string => {
      const item = dok.item?.[i];
      if (item?.length) return item.map((t) => t.str).join(" ");
      return (dok.grid[i] ?? []).map((b) => b.join(" ")).join("\n");
    };

    // SATU KELAS MERENTAS BEBERAPA MUKA bukan jadual induk.
    //
    // Jadual satu kelas kadang-kadang dicetak pada dua muka — hari Isnin
    // hingga Rabu pada muka pertama, selebihnya pada muka kedua. Kalau muka
    // dipecahkan di situ, muka kedua ditolak sebagai "sudah dibaca" dan kelas
    // itu disimpan dengan SEPARUH jadualnya. Separuh jadual lebih buruk
    // daripada tiada: ia kelihatan lengkap.
    //
    // Jadi pecahan hanya berlaku bila ada DUA ATAU LEBIH kelas berbeza dalam
    // fail itu. Kalau semua muka menunjuk kepada kelas yang sama, dokumen itu
    // dibaca sebagai SATU, tepat seperti sebelum ini.
    const kelasSetiapMuka: string[][] = [];
    for (let i = 0; i < bilMuka; i++) {
      const t = teksMukaKe(i);
      kelasSetiapMuka.push(t.trim() ? semuaKelasDalam(t) : []);
    }
    const kelasBerbeza = new Set(kelasSetiapMuka.flat());
    if (kelasBerbeza.size <= 1) return [await bacaJadualPukal(muatan)];

    const jadual = await ambilJadual();
    const keluar: HasilPukal[] = [];
    const sudah = new Set<string>();

    for (let i = 0; i < bilMuka; i++) {
      const item = dok.item?.[i];
      const grid = dok.grid[i];
      const teksMuka = teksMukaKe(i);
      if (!teksMuka.trim()) continue;

      const jumpa = kelasSetiapMuka[i];
      const label = `${nama} — muka ${i + 1}`;

      if (jumpa.length === 0) continue; // muka hadapan, nota, halaman kosong
      if (jumpa.length > 1) {
        keluar.push({
          nama: label, kelas: null, ok: false,
          mesej:
            `Muka ini mengandungi ${jumpa.length} kelas (${jumpa.slice(0, 4).join(", ")}` +
            `${jumpa.length > 4 ? ", …" : ""}), jadi ia tidak dibaca — meneka di sini ` +
            `boleh meletakkan jadual satu kelas ke dalam kelas lain. Muat naik kelas ini ` +
            `seorang diri, atau hantar fail ini kepada kami untuk disokong.`,
        });
        continue;
      }

      const kelas = jumpa[0];
      // Kelas yang sama pada dua muka: yang KEDUA dilaporkan, bukan ditimpa
      // senyap. Selalunya itu muka kedua jadual yang sama (sambungan), dan
      // menimpanya akan membuang separuh pertama.
      if (sudah.has(kelas)) {
        keluar.push({
          nama: label, kelas, ok: false,
          mesej: `${kelas} sudah dibaca dari muka terdahulu. Muka ini dilangkau supaya ia tidak menimpanya.`,
        });
        continue;
      }

      const senaraiWaktu = setUntukKelas(jadual, kelas)?.senarai ?? [];
      if (senaraiWaktu.length === 0) {
        keluar.push({ nama: label, kelas, ok: false, mesej: `Tiada set waktu untuk ${kelas}.` });
        continue;
      }

      const hasil =
        (item?.length ? binaDrafDariKedudukan([item], senaraiWaktu) : null) ??
        (grid?.length ? binaDrafDariGrid([grid], senaraiWaktu) : null) ??
        binaDraf(teksMuka, senaraiWaktu);

      sudah.add(kelas);
      keluar.push({
        nama: label, kelas, ok: hasil.dikenal > 0,
        ...(item?.length ? { guruKelas: guruKelasDariKepala(item) ?? undefined } : {}),
        draf: hasil.draf,
        waktu: senaraiWaktu,
        keyakinan: { dikenal: hasil.dikenal, jumlah: hasil.jumlah },
        mesej:
          hasil.dikenal > 0
            ? `${hasil.dikenal} slot dibaca`
            : "Muka dibaca tetapi tiada subjek dikenal pasti.",
      });
    }

    // Tiada satu muka pun memberi kelas. Jangan pulangkan senarai kosong —
    // itu kelihatan seperti tiada apa berlaku. Pulangkan laluan asal supaya
    // sebab sebenarnya kelihatan.
    if (keluar.length === 0) return [await bacaJadualPukal(muatan)];
    return keluar;
  } catch (e) {
    return [{
      nama, kelas: null, ok: false,
      mesej: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    }];
  }
}
