/**
 * Menghurai Buku Pengurusan Tahunan.
 *
 * ⚠️ PERATURAN UTAMA: JANGAN bergantung pada nombor muka surat.
 * Buku pengurusan tahun depan tidak semestinya sama dengan tahun ini —
 * susunan berubah, muka beranjak, tajuk ditulis semula. Apa-apa yang
 * bergantung pada "guru kelas ada di muka 73" akan pecah senyap pada edisi
 * berikutnya, dan pecahnya hanya disedari selepas data salah tersebar.
 *
 * Maka seksyen dikenali melalui KATA KUNCI dalam tajuknya, dan bentuk data
 * dikesan daripada susunan teks — bukan daripada kedudukan dalam buku.
 *
 * DUA BENTUK, kerana buku sebenar mengandungi kedua-duanya. Diukur pada
 * edisi 2025 (174 muka): 84 muka berjadual, 90 muka bukan jadual.
 *   · `jadual`  — baris dan lajur (senarai guru, takwim program)
 *   · `senarai` — baris "PERANAN : NAMA" (jawatankuasa, panitia), termasuk
 *                 baris sambungan ": NAMA LAIN" yang berkongsi peranan sama
 *
 * Import relatif dengan .ts supaya modul ini boleh diuji terus dengan Node.
 */

import { gridDariKedudukan, type ItemKedudukan } from "./grid-kedudukan.ts";
import { kesanJenis, type KodSeksyen } from "../data/seksyen-pengurusan.ts";

export interface MukaDokumen {
  muka: number;
  /** Teks muka ini, satu baris satu elemen. */
  baris: string[];
  /** Koordinat teks, bila ada — hanya PDF. */
  item?: ItemKedudukan[];
  /**
   * Jadual muka ini, sudah dibina oleh enjin koridor (`muka-teks.ts`).
   *
   * Bila ia ada, ia DIDAHULUKAN daripada `item`: koridor putih membaca sel
   * yang panjang dan tidak sama lebar dengan betul, manakala pengumpulan x
   * memecahkan satu lajur kepada tiga. Bandingan pada buku sebenar:
   * 2,124 baris (x) berbanding 4,268 baris (koridor), dan seksyen Guru Kelas
   * m.73 yang langsung TIDAK dijumpai oleh kaedah lama.
   */
  jadual?: string[][] | null;
  /** Muka ini gambar — hampir tiada teks. Dikira oleh `mukaGambar()`. */
  gambar?: boolean;
}

export interface SeksyenDikesan {
  kod: KodSeksyen;
  tajuk: string;
  mukaMula: number;
  mukaAkhir: number;
  bentuk: "jadual" | "senarai";
  lajur: string[];
  baris: string[][];
  /** 0–100. Berapa yakin sistem dengan hasil ini. */
  keyakinan: number;
  amaran: string[];
}

/* ------------------------------------------------------------- tajuk muka */

/**
 * Tajuk muka: baris pertama yang bermakna.
 *
 * Nombor muka, tarikh cetakan dan baris kosong dilangkau — dalam buku sebenar
 * baris pertama selalunya "38" (nombor muka) dan bukan tajuk.
 */
export function tajukMuka(baris: string[]): string {
  for (const b of baris) {
    const t = b.trim();
    if (t.length < 4) continue;                 // "38", "1", tanda sempang
    if (/^\d+$/.test(t)) continue;              // nombor muka
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(t)) continue;   // baris bertarikh
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2}/.test(t)) continue;       // "25-Jun-25 ..."
    if (/^[:：]/.test(t)) continue;              // baris sambungan ": NAMA"
    return t;
  }
  return "";
}

/**
 * Adakah teks ini BENAR-BENAR tajuk seksyen, bukan ayat yang kebetulan
 * mengandungi kata kunci?
 *
 * Diuji pada buku sebenar 2025, dan setiap peraturan di sini menangkap
 * kesilapan yang BENAR-BENAR berlaku:
 *
 *  · "5.2 Guru Kelas" — perenggan dalam Panduan Am Guru, bukan senarai guru
 *    kelas. Tanpa penapis ini ia menelan 17 muka prosa dan menghasilkan 557
 *    baris sampah.
 *  · ": SEMUA KETUA UNIT UNIT KOKURIKULUM" — baris sambungan senarai ahli.
 *  · "25-Jun-25 RABU SUMATIF 2 UNIT BERUNIFORM (5)" — satu baris dalam
 *    takwim, disangka tajuk seksyen baharu.
 *
 * Tajuk sebenar dalam buku ini DITULIS BESAR. Itu bukan kebetulan — ia cara
 * dokumen rasmi sekolah ditaip, dan ia pembeza yang paling boleh dipercayai
 * antara tajuk dan ayat biasa.
 */
export function kelihatanTajuk(teks: string): boolean {
  const t = teks.trim();
  if (t.length < 4 || t.length > 90) return false;
  if (/^[:：]/.test(t)) return false;
  if (/^\d{1,2}[-/][A-Za-z0-9]{2,4}[-/]\d{2,4}/.test(t)) return false;

  const huruf = t.replace(/[^A-Za-z]/g, "");
  if (huruf.length < 4) return false;
  const besar = huruf.replace(/[^A-Z]/g, "").length / huruf.length;
  // 0.7, bukan 1.0: tajuk sebenar kadang mengandungi perkataan bercampur
  // seperti "PdPc" atau "aSc", tetapi prosa Huruf Besar Di Awal Sahaja
  // sentiasa jatuh jauh di bawah ambang ini.
  return besar >= 0.7;
}

/* ------------------------------------------------------- enjin: senarai */

const RE_PERANAN = /^\s*(.*?)\s*[:：]\s*(.+?)\s*$/;

/**
 * Baris "PERANAN : NAMA".
 *
 * Baris sambungan ": NAMA LAIN" mewarisi peranan baris sebelumnya — itu cara
 * buku sebenar menyenaraikan beberapa orang bagi satu jawatan, dan
 * mengabaikannya bermakna kehilangan setiap ahli kecuali yang pertama.
 */
export function huraiSenarai(baris: string[]): string[][] {
  const keluar: string[][] = [];
  let peranan = "";
  for (const b of baris) {
    const m = RE_PERANAN.exec(b);
    if (!m) continue;
    const label = m[1].trim();
    const nilai = m[2].trim();
    if (!nilai || nilai.length < 2) continue;
    if (label) peranan = label;
    if (!peranan) continue;
    keluar.push([peranan, nilai]);
  }
  return keluar;
}

/* -------------------------------------------------------- enjin: jadual */

/** Adakah baris ini kelihatan seperti baris kepala jadual? */
function barisKepala(baris: string[]): boolean {
  const berisi = baris.filter((s) => s.trim() !== "");
  if (berisi.length < 2) return false;
  // Kepala jadual jarang mengandungi ayat penuh.
  return berisi.every((s) => s.trim().length <= 40);
}

/**
 * Bina jadual daripada koordinat, kemudian buang lajur dan baris kosong.
 *
 * Lajur kosong berlaku kerana grid dibina dari kedudukan: satu sel yang
 * tersasar sedikit mencipta lajurnya sendiri. Membiarkannya bermakna admin
 * menyemak jadual yang penuh ruang kosong.
 */
export function huraiJadual(item: ItemKedudukan[]): { lajur: string[]; baris: string[][] } {
  const grid = gridDariKedudukan(item);
  if (grid.length === 0) return { lajur: [], baris: [] };

  const lebar = Math.max(...grid.map((b) => b.length));
  const penuh = grid.map((b) => [...b, ...Array(lebar - b.length).fill("")]);

  // Buang lajur yang kosong sepenuhnya.
  const lajurAda: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (penuh.some((b) => (b[c] ?? "").trim() !== "")) lajurAda.push(c);
  }
  const dipangkas = penuh
    .map((b) => lajurAda.map((c) => (b[c] ?? "").trim()))
    .filter((b) => b.some((s) => s !== ""));

  if (dipangkas.length === 0) return { lajur: [], baris: [] };

  const kepala = barisKepala(dipangkas[0]) ? dipangkas[0] : [];
  const baris = kepala.length > 0 ? dipangkas.slice(1) : dipangkas;
  return { lajur: kepala, baris };
}

/**
 * Asingkan baris kepala daripada baris data dalam jadual yang sudah dibina.
 *
 * Kepala tidak semestinya baris PERTAMA: muka jadual dalam buku sebenar
 * bermula dengan tajuk seksyen dan nama penyelaras sebelum "BIL | KELAS |
 * GURU KELAS". Maka kepala dicari dalam beberapa baris pertama — baris
 * pertama yang setiap selnya berisi dan pendek.
 */
export function pisahKepala(grid: string[][]): { lajur: string[]; baris: string[][] } {
  const bersih = grid.filter((b) => b.some((s) => s.trim() !== ""));
  if (bersih.length === 0) return { lajur: [], baris: [] };

  const had = Math.min(4, bersih.length);
  for (let i = 0; i < had; i++) {
    const b = bersih[i];
    if (b.length >= 2 && b.every((s) => s.trim() !== "") && barisKepala(b)) {
      return { lajur: b.map((s) => s.trim()), baris: bersih.slice(i + 1) };
    }
  }
  return { lajur: [], baris: bersih };
}

/* --------------------------------------------------------- pengesan seksyen */

/**
 * Kepala jadual ialah baris yang BERULANG pada beberapa muka.
 *
 * Mencari kepala pada baris pertama gagal pada buku sebenar: muka Senarai
 * Nama Guru bermula dengan tajuk seksyen, jadi baris data pertama
 * ("29 | IRHAMI BINTI ISMAIL | GAG | PENDIDIKAN ISLAM") diambil sebagai
 * nama lajur — dan seorang guru sebenar hilang menjadi tajuk lajur.
 *
 * Pengulangan pula tidak boleh disilap: "BIL | KELAS | GURU KELAS" dicetak
 * semula pada setiap muka seksyen itu kerana ia memang kepala jadual. Tiada
 * baris data yang berulang begitu.
 */
export function kepalaBerulang(mukaJadual: string[][][]): string[] {
  const kira = new Map<string, { baris: string[]; n: number }>();
  for (const grid of mukaJadual) {
    // Kepala berada dekat atas muka, bukan di tengahnya.
    const dilihat = new Set<string>();
    for (const b of grid.slice(0, 6)) {
      if (b.length < 2 || !b.every((c) => c.trim() !== "") || !barisKepala(b)) continue;
      const kunci = b.map((c) => c.trim().toUpperCase()).join("\u0001");
      if (dilihat.has(kunci)) continue;
      dilihat.add(kunci);
      const ada = kira.get(kunci);
      if (ada) ada.n++;
      else kira.set(kunci, { baris: b.map((c) => c.trim()), n: 1 });
    }
  }
  const terbaik = [...kira.values()].sort((a, b) => b.n - a.n)[0];
  if (!terbaik) return [];
  // Satu muka sahaja? Terima baris itu. Lebih daripada satu? Ia mesti
  // berulang, kalau tidak ia cuma baris data yang kebetulan pendek.
  if (mukaJadual.length === 1 || terbaik.n >= 2) return terbaik.baris;
  return [];
}

/** Buang lajur yang kosong pada SETIAP baris. */
function pangkasLajur(lajur: string[], baris: string[][]): { lajur: string[]; baris: string[][] } {
  const lebar = Math.max(lajur.length, ...baris.map((b) => b.length), 0);
  const ada: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (baris.some((b) => (b[c] ?? "").trim() !== "") || (lajur[c] ?? "").trim() !== "") ada.push(c);
  }
  return {
    lajur: lajur.length ? ada.map((c) => lajur[c] ?? "") : [],
    baris: baris.map((b) => ada.map((c) => b[c] ?? "")).filter((b) => b.some((x) => x.trim() !== "")),
  };
}

/**
 * Bahagikan dokumen kepada seksyen.
 *
 * Muka yang tajuknya memadankan jenis seksyen MEMULAKAN seksyen baharu;
 * muka selepasnya tergolong dalam seksyen itu sehingga tajuk lain dikesan.
 * Muka sebelum seksyen pertama diabaikan — itu muka hadapan, kata aluan dan
 * ikrar, yang tiada data berstruktur.
 *
 * Dua pelarasan yang datang daripada membaca buku sebenar, bukan daripada
 * teori:
 *
 *  · Takwim dan mesyuarat berselang-seli bulan demi bulan, jadi kedua-duanya
 *    digabungkan semula menjadi SATU kalendar setiap satu (`gabungSemua`).
 *  · Muka gambar di hujung buku — 21 muka berturut-turut dalam edisi 2025 —
 *    dibuang dari julat seksyen terakhir. Tanpa ini seksyen terakhir kelihatan
 *    seperti merangkumi 27 muka sedangkan 21 daripadanya tiada apa-apa teks,
 *    dan skor keyakinan menjadi mengelirukan.
 */
export function kesanSeksyen(muka: MukaDokumen[]): SeksyenDikesan[] {
  const mula: { i: number; tajuk: string; jenis: NonNullable<ReturnType<typeof kesanJenis>> }[] = [];

  muka.forEach((m, i) => {
    const tajuk = tajukMuka(m.baris);
    if (!tajuk || !kelihatanTajuk(tajuk)) return;
    const jenis = kesanJenis(tajuk);
    if (!jenis) return;
    // Muka berturutan dengan jenis SAMA ialah sambungan, bukan seksyen baharu.
    const akhir = mula[mula.length - 1];
    if (akhir && akhir.jenis.kod === jenis.kod) return;
    mula.push({ i, tajuk, jenis });
  });

  // Kumpulkan muka bagi setiap kemunculan, kemudian gabung kemunculan yang
  // sepatutnya menjadi satu.
  type Kepingan = { tajuk: string; jenis: (typeof mula)[number]["jenis"]; muka: MukaDokumen[] };
  const kepingan: Kepingan[] = mula.map((s, n) => {
    const hingga = n + 1 < mula.length ? mula[n + 1].i : muka.length;
    let isi = muka.slice(s.i, hingga);
    // Buang muka gambar di HUJUNG sahaja — gambar di tengah seksyen (carta
    // organisasi, sisipan) memang sebahagian daripadanya.
    while (isi.length > 1 && isi[isi.length - 1].gambar) isi = isi.slice(0, -1);
    return { tajuk: s.tajuk, jenis: s.jenis, muka: isi };
  });

  const gabung: Kepingan[] = [];
  for (const k of kepingan) {
    const sama = k.jenis.gabungSemua
      ? gabung.find((g) => g.jenis.kod === k.jenis.kod)
      : undefined;
    if (sama) sama.muka.push(...k.muka);
    else gabung.push(k);
  }

  return gabung.map((s) => {
    const amaran: string[] = [];
    let lajur: string[] = [];
    let baris: string[][] = [];

    if (s.jenis.bentuk === "senarai") {
      lajur = ["Jawatan", "Nama"];
      baris = s.muka.flatMap((m) => huraiSenarai(m.baris));
    } else {
      const grid = s.muka
        .map((m) => (m.jadual?.length ? m.jadual : m.item?.length ? gridDariKedudukan(m.item) : null))
        .filter((g): g is string[][] => !!g && g.length > 0);

      lajur = kepalaBerulang(grid);
      const kunciKepala = lajur.map((c) => c.trim().toUpperCase()).join("\u0001");
      // Tajuk muka dicetak semula di atas setiap muka seksyen. Dalam grid ia
      // menjadi baris satu sel, dan ia BUKAN data — ia tajuk yang admin sudah
      // nampak di kepala seksyen.
      const tajukSeksyen = new Set(
        s.muka.map((m) => tajukMuka(m.baris).trim().toUpperCase()).filter((t) => t !== ""),
      );
      for (const g of grid) {
        for (const b of g) {
          // Kepala dicetak semula pada setiap muka — simpan sekali, bukan
          // sekali bagi setiap muka.
          if (kunciKepala && b.map((c) => c.trim().toUpperCase()).join("\u0001") === kunciKepala) continue;
          const berisi = b.filter((c) => c.trim() !== "");
          if (berisi.length === 0) continue;
          if (berisi.length === 1 && tajukSeksyen.has(berisi[0].trim().toUpperCase())) continue;
          baris.push(b);
        }
      }
      ({ lajur, baris } = pangkasLajur(lajur, baris));

      if (baris.length === 0) {
        amaran.push("Tiada jadual dikesan dalam seksyen ini — kemungkinan ia gambar atau imbasan.");
      }
    }

    const bilGambar = s.muka.filter((m) => m.gambar).length;
    if (bilGambar > 0) {
      amaran.push(
        `${bilGambar} daripada ${s.muka.length} muka dalam seksyen ini ialah gambar — isinya tidak boleh dibaca sebagai teks.`,
      );
    }

    // Keyakinan dikira ke atas muka BERTEKS sahaja. Membahagi dengan muka
    // gambar menghukum seksyen yang sebenarnya dibaca sempurna.
    const mukaTeks = Math.max(1, s.muka.length - bilGambar);
    const keyakinan = Math.max(0, Math.min(100, Math.round((baris.length / mukaTeks) * 12)));
    if (keyakinan < 30) {
      amaran.push("Sedikit sahaja data dikesan berbanding saiz seksyen — semak rapi.");
    }

    return {
      kod: s.jenis.kod,
      tajuk: s.tajuk,
      mukaMula: s.muka[0]?.muka ?? 0,
      mukaAkhir: s.muka[s.muka.length - 1]?.muka ?? 0,
      bentuk: s.jenis.bentuk,
      lajur,
      baris,
      keyakinan,
      amaran,
    };
  });
}
