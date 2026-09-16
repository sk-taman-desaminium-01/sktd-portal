/**
 * MEMBACA MUKA SURAT SEPERTI MATA MEMBACANYA.
 *
 * Masalah yang modul ini selesaikan: PDF tidak menyimpan perkataan, baris,
 * mahupun jadual. Ia menyimpan serpihan glif dengan matriks 2x3, disusun
 * mengikut urutan ia DILUKIS — yang selalunya bukan urutan ia DIBACA. Satu
 * perkataan boleh berpecah kepada lima serpihan; satu jadual boleh disimpan
 * lajur demi lajur; dan muka surat landskap boleh dicetak pada kertas potret
 * dengan setiap huruf diputar 90 darjah.
 *
 * Maka bacaan dilakukan dalam LIMA langkah, setiap satu memulihkan satu
 * lapisan struktur yang PDF buang:
 *
 *   1. RUANG PAPARAN  — matriks item didarab dengan matriks viewport, jadi
 *      koordinat menjadi seperti yang dilihat mata: x ke kanan, y ke BAWAH.
 *   2. BETULKAN PUTARAN — sudut dominan muka dikesan dan diputar balik, jadi
 *      teks yang dicetak mengiring dibaca menegak semula.
 *   3. BARIS — item dikumpul mengikut PERTINDIHAN kotak glif, bukan jarak
 *      tetap. Saiz huruf berbeza dalam satu baris jadual tidak memecahkannya.
 *   4. SEL — dalam satu baris, jurang yang lebih lebar daripada satu huruf
 *      memisahkan sel; jurang kecil menyambung perkataan yang berpecah.
 *   5. LAJUR — koridor putih menegak yang menembusi SEMUA baris dikesan, dan
 *      itulah sempadan lajur sebenar. Inilah cara jadual dibina semula tanpa
 *      garisan, dan ia yang membezakan jadual yang boleh dipercayai daripada
 *      tekaan.
 *
 * KENAPA BUKAN `grid-kedudukan.ts` SAHAJA: fail itu mengumpul nilai x yang
 * berhampiran menjadi lajur. Ia cukup untuk jadual waktu, yang selnya kecil
 * dan seragam, dan ia sudah disahkan 44/44 pada fail sekolah sebenar — jadi
 * ia TIDAK diusik. Tetapi pada muka buku pengurusan yang selnya panjang dan
 * berlainan lebar, pengumpulan x memecahkan satu lajur kepada tiga. Koridor
 * putih tidak, kerana ia melihat ruang KOSONG, bukan tempat teks bermula.
 *
 * TIADA pdf.js DI SINI, dan itu disengajakan: modul ini matematik tulen, jadi
 * ia boleh dijalankan di pelayan, di pelayar, dan dalam ujian Node tanpa
 * memuatkan 1.6 MB pustaka.
 */

/** Matriks 2x3 PDF: [a, b, c, d, e, f]. */
export type Matriks = [number, number, number, number, number, number];

/** Serpihan teks mentah, seperti yang pdf.js memulangkannya. */
export interface ItemMentah {
  str: string;
  transform: number[];
  width: number;
  height: number;
  /** "rtl" untuk Jawi dan Arab. pdf.js menetapkannya per serpihan. */
  dir?: string;
}

/** Serpihan teks dalam ruang bacaan: x ke kanan, y ke BAWAH. */
export interface ItemMuka {
  teks: string;
  x: number;
  y: number;
  lebar: number;
  /** Saiz huruf dalam ruang paparan. Asas kepada setiap toleransi di bawah. */
  tinggi: number;
  /** Sudut item selepas putaran muka dibetulkan. 0 untuk teks normal. */
  sudut: number;
  /** Teks kanan-ke-kiri (Jawi, Arab). Dari `dir` pdf.js. */
  rtl?: boolean;
}

export interface MukaNormal {
  lebar: number;
  tinggi: number;
  /** Putaran yang dikesan dan DIBETULKAN (0, 90, 180 atau 270). */
  putaran: number;
  item: ItemMuka[];
  /** Baris teks mengikut urutan bacaan. */
  baris: string[];
  /** Baris yang sama, tetapi dipecah kepada sel. */
  sel: string[][];
  /** Perkara luar biasa yang dikesan pada muka ini. */
  amaran: string[];
}

/* ------------------------------------------------------------- matematik */

/** Darab dua matriks 2x3 — sama seperti `Util.transform` dalam pdf.js. */
export function darab(m1: Matriks, m2: Matriks): Matriks {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/** Sudut arah tulisan, dibulatkan kepada 0/90/180/270. */
export function sudutMatriks(m: Matriks): number {
  const darjah = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  return ((Math.round(darjah / 90) * 90) % 360 + 360) % 360;
}

/** Putar satu titik dalam ruang y-ke-bawah. */
function putarTitik(x: number, y: number, darjah: number): [number, number] {
  const r = (darjah * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
}

/* ---------------------------------------------------- langkah 1 & 2: ruang */

/**
 * Tukar item mentah kepada ruang bacaan, dan betulkan putaran muka.
 *
 * `matriksViewport` datang dari `page.getViewport({ scale: 1 }).transform`.
 * Ia yang mengendalikan `/Rotate` pada muka surat — atribut yang menyebabkan
 * muka landskap disimpan sebagai potret dan diputar hanya semasa dipapar.
 * Mengabaikannya bermakna membaca jadual secara menegak.
 */
export function normalkanMuka(
  mentah: ItemMentah[],
  matriksViewport: number[],
  lebarViewport: number,
  tinggiViewport: number,
): MukaNormal {
  const vp = matriksViewport as unknown as Matriks;
  const amaran: string[] = [];

  const kasar: ItemMuka[] = [];
  for (const it of mentah) {
    if (typeof it.str !== "string" || it.str.trim() === "") continue;
    const m = darab(vp, it.transform as unknown as Matriks);
    kasar.push({
      teks: it.str,
      x: m[4],
      y: m[5],
      lebar: Number.isFinite(it.width) ? it.width : 0,
      tinggi: Math.hypot(m[2], m[3]) || (Number.isFinite(it.height) ? it.height : 0),
      sudut: sudutMatriks(m),
      rtl: it.dir === "rtl",
    });
  }
  if (kasar.length === 0) {
    return { lebar: lebarViewport, tinggi: tinggiViewport, putaran: 0,
             item: [], baris: [], sel: [], amaran: [] };
  }

  // SAIZ HURUF SIFAR. Sesetengah penjana PDF menghasilkan matriks teks yang
  // tidak memberi tinggi. Setiap toleransi di bawah berskala pada saiz huruf,
  // jadi sifar meruntuhkan semuanya: tiada dua item pernah dikira sebaris.
  // Nilai tengah muka ini digunakan sebagai ganti.
  const tengahTinggi = median(kasar.map((i) => i.tinggi).filter((h) => h > 0)) || 10;
  let bilTanpaTinggi = 0;
  let bilTanpaLebar = 0;
  for (const i of kasar) {
    if (i.tinggi <= 0) { i.tinggi = tengahTinggi; bilTanpaTinggi++; }
    // LEBAR SIFAR. Lebih bahaya daripada tinggi sifar, dan senyap: jurang
    // antara sel dikira `x(seterusnya) - (x + lebar)`, jadi lebar 0
    // menjadikan SETIAP jurang kelihatan besar — dan setiap perkataan pecah
    // menjadi selnya sendiri. Anggaran 0.5 em setiap aksara ialah purata
    // lebar glif Latin, cukup baik untuk membezakan ruang dari sempadan sel.
    if (i.lebar <= 0) { i.lebar = i.teks.length * i.tinggi * 0.5; bilTanpaLebar++; }
  }
  if (bilTanpaTinggi > kasar.length / 2) {
    amaran.push("Fail ini tidak memberi saiz huruf — susun atur dianggarkan.");
  }
  if (bilTanpaLebar > kasar.length / 2) {
    amaran.push("Fail ini tidak memberi lebar teks — sempadan lajur dianggarkan.");
  }

  // Sudut DOMINAN, ditimbang mengikut bilangan aksara — bukan bilangan item.
  // Satu tajuk menegak yang berpecah kepada 20 serpihan satu-huruf tidak
  // boleh mengalahkan 15 serpihan ayat penuh yang mendatar.
  const berat = new Map<number, number>();
  for (const i of kasar) berat.set(i.sudut, (berat.get(i.sudut) ?? 0) + i.teks.trim().length);
  const ikutBerat = [...berat.entries()].sort((a, b) => b[1] - a[1]);
  const putaran = ikutBerat[0][0];

  let lebar = lebarViewport;
  let tinggi = tinggiViewport;
  let item = kasar;

  if (putaran !== 0) {
    const diputar = putarSemua(kasar, -putaran, lebarViewport, tinggiViewport);
    item = diputar.item;
    lebar = diputar.lebar;
    tinggi = diputar.tinggi;
  }

  // PUTARAN BERCAMPUR. Muka yang ditulis manusia boleh mengandungi jadual
  // mendatar DAN tajuk lajur yang dicetak menegak di sebelahnya. Dahulu item
  // minoriti itu dibuang senyap dari aliran baris — teks yang wujud dalam
  // fail tetapi tidak pernah muncul di skrin. Sekarang setiap kumpulan sudut
  // dibaca dalam rangkanya SENDIRI dan dilampirkan selepas aliran utama.
  // CONDONG. Dibetulkan selepas putaran 90°, kerana ia sudut halus di atas
  // orientasi yang betul — bukan menggantikannya.
  const darjahCondong = sudutCondong(item.filter((i) => i.sudut === 0));
  if (darjahCondong !== 0) {
    item = luruskan(item, darjahCondong);
    amaran.push(`Muka ini senget ${darjahCondong.toFixed(1)}° — diluruskan sebelum dibaca.`);
  }

  const utama = item.filter((i) => i.sudut === 0);
  const condong = item.filter((i) => i.sudut !== 0);

  const barisUtama = utama.length > 0 ? bacaAliran(utama, lebar) : bacaAliran(item, lebar);
  const semuaBaris = [...barisUtama];

  if (utama.length > 0 && condong.length > 0) {
    const kumpulan = new Map<number, ItemMuka[]>();
    for (const i of condong) {
      const ada = kumpulan.get(i.sudut);
      if (ada) ada.push(i);
      else kumpulan.set(i.sudut, [i]);
    }
    for (const [sudut, isi] of kumpulan) {
      const aksara = isi.reduce((a, i) => a + i.teks.trim().length, 0);
      if (aksara < 3) continue;
      const diputar = putarSemua(isi, -sudut, lebar, tinggi);
      semuaBaris.push(...bacaAliran(diputar.item, diputar.lebar));
      amaran.push(`${aksara} aksara pada muka ini ditulis mengiring (${sudut}°) — dibaca berasingan.`);
    }
  }

  return {
    lebar, tinggi, putaran, item,
    baris: semuaBaris.map(barisKeTeks),
    sel: semuaBaris.map((b) => barisKeSel(b).map((s) => s.teks)),
    amaran,
  };
}

/** Putar satu set item, dan kotak mukanya, sebanyak `darjah`. */
function putarSemua(
  item: ItemMuka[], darjah: number, lebar: number, tinggi: number,
): { item: ItemMuka[]; lebar: number; tinggi: number } {
  if (darjah % 360 === 0) return { item, lebar, tinggi };
  const sudut4 = [
    putarTitik(0, 0, darjah), putarTitik(lebar, 0, darjah),
    putarTitik(0, tinggi, darjah), putarTitik(lebar, tinggi, darjah),
  ];
  const minX = Math.min(...sudut4.map((p) => p[0]));
  const minY = Math.min(...sudut4.map((p) => p[1]));
  return {
    lebar: Math.max(...sudut4.map((p) => p[0])) - minX,
    tinggi: Math.max(...sudut4.map((p) => p[1])) - minY,
    item: item.map((i) => {
      const [x, y] = putarTitik(i.x, i.y, darjah);
      return { ...i, x: x - minX, y: y - minY, sudut: ((i.sudut + darjah) % 360 + 360) % 360 };
    }),
  };
}

/**
 * Sudut CONDONG muka — imbasan yang senget, bukan putaran 90°.
 *
 * Kenapa ini perlu: muka yang senget 1.5° pada kertas selebar 595pt menghasil
 * anjakan menegak kira-kira 15pt dari kiri ke kanan — lebih besar daripada
 * satu baris teks 10pt. Akibatnya satu baris sebenar dipecahkan kepada
 * beberapa baris, dan tiada apa yang kelihatan salah sehingga seseorang
 * membaca hasilnya. Diukur pada muka SEBENAR buku sekolah: 33 baris menjadi
 * 57 sebelum pembetulan ini.
 *
 * Kaedah: bagi setiap serpihan, cari jiran terdekat di sebelah KANANnya yang
 * cukup rapat untuk berada pada baris yang sama, dan ambil sudut antara
 * kedua-duanya. NILAI TENGAH semua sudut itu ialah condong muka — nilai
 * tengah, bukan purata, supaya beberapa pasangan yang tersilap padan tidak
 * menarik keputusan.
 */
export function sudutCondong(item: ItemMuka[]): number {
  if (item.length < 12) return 0;
  const h = median(item.map((i) => i.tinggi)) || 10;
  const susun = [...item].sort((a, b) => a.x - b.x);
  const sudut: number[] = [];

  for (let i = 0; i < susun.length; i++) {
    const a = susun[i];
    for (let j = i + 1; j < susun.length; j++) {
      const b = susun[j];
      const jurang = b.x - (a.x + a.lebar);
      if (jurang < -a.lebar) continue;
      // Jiran yang terlalu jauh mungkin milik lajur lain sepenuhnya.
      if (jurang > h * 3) break;
      if (Math.abs(b.y - a.y) > h * 0.8) continue;
      const dx = b.x - a.x;
      if (dx <= 0) continue;
      sudut.push((Math.atan2(b.y - a.y, dx) * 180) / Math.PI);
      break;
    }
  }
  if (sudut.length < 8) return 0;
  const tengah = median(sudut);
  // Di bawah 0.2° ialah bunyi bising; di atas 10° ia bukan lagi condong —
  // itu teks yang memang dilukis serong, dan memutarnya merosakkan muka.
  return Math.abs(tengah) >= 0.2 && Math.abs(tengah) <= 10 ? tengah : 0;
}

/** Luruskan condong: alih kedudukan sahaja, sudut tulisan tidak berubah. */
function luruskan(item: ItemMuka[], darjah: number): ItemMuka[] {
  if (darjah === 0) return item;
  return item.map((i) => {
    const [x, y] = putarTitik(i.x, i.y, -darjah);
    return { ...i, x, y };
  });
}

/**
 * Baris satu aliran teks, mengambil kira susun atur DUA LAJUR.
 *
 * Halaman prosa dua lajur — panduan am guru, notis — memusnahkan urutan
 * bacaan kalau dibaca melintang: baris kiri dan baris kanan berada pada
 * ketinggian yang sama, jadi ia bercantum menjadi satu ayat bercampur yang
 * tidak bermakna dalam bahasa mana pun.
 *
 * Yang membezakan prosa dua lajur daripada JADUAL dua lajur ialah penjajaran:
 * dalam jadual, setiap baris kiri mempunyai pasangan di kanan pada garis dasar
 * yang sama. Dalam prosa, kedua-dua lajur mengalir sendiri dan garis dasarnya
 * tidak pernah sepadan. Itu ujian yang digunakan di bawah.
 */
function bacaAliran(item: ItemMuka[], lebarMuka: number): ItemMuka[][] {
  const pecah = lajurBacaan(item, lebarMuka);
  if (!pecah) return kumpulBaris(item);
  return [...kumpulBaris(pecah.kiri), ...kumpulBaris(pecah.kanan)];
}

/** Kesan prosa dua lajur. Null bila muka ini bukan dua lajur. */
export function lajurBacaan(
  item: ItemMuka[], lebarMuka: number,
): { kiri: ItemMuka[]; kanan: ItemMuka[] } | null {
  if (item.length < 30) return null;
  const h = median(item.map((i) => i.tinggi)) || 10;

  // Cari koridor menegak yang menembusi muka, dalam 30%-70% lebarnya.
  const BIN = 2;
  const bil = new Array(Math.ceil(lebarMuka / BIN) + 1).fill(0);
  for (const i of item) {
    const a = Math.max(0, Math.floor(i.x / BIN));
    const z = Math.min(bil.length - 1, Math.ceil((i.x + i.lebar) / BIN));
    for (let k = a; k <= z; k++) bil[k]++;
  }
  const dari = Math.floor((lebarMuka * 0.3) / BIN);
  const hingga = Math.ceil((lebarMuka * 0.7) / BIN);
  let terbaik: { tengah: number; lebar: number } | null = null;
  let mula = -1;
  for (let k = dari; k <= hingga; k++) {
    const kosong = bil[k] === 0;
    if (kosong && mula < 0) mula = k;
    if ((!kosong || k === hingga) && mula >= 0) {
      const lebarJurang = (k - mula) * BIN;
      if (!terbaik || lebarJurang > terbaik.lebar) {
        terbaik = { tengah: ((mula + k) / 2) * BIN, lebar: lebarJurang };
      }
      mula = -1;
    }
  }
  // Koridor mesti LEBAR. Jurang sempit ialah ruang antara lajur jadual,
  // bukan pemisah antara dua lajur bacaan.
  if (!terbaik || terbaik.lebar < h * 2.5) return null;

  const kiri = item.filter((i) => i.x + i.lebar <= terbaik!.tengah);
  const kanan = item.filter((i) => i.x >= terbaik!.tengah);
  if (kiri.length < 10 || kanan.length < 10) return null;

  // Ujian penjajaran: kalau kebanyakan garis dasar kiri ada pasangan di kanan,
  // ini JADUAL, bukan dua lajur bacaan — biarkan ia dibaca melintang.
  const asasKanan = [...new Set(kanan.map((i) => Math.round(i.y)))].sort((a, b) => a - b);
  const asasKiri = [...new Set(kiri.map((i) => Math.round(i.y)))];
  const sejajar = asasKiri.filter((y) =>
    asasKanan.some((k) => Math.abs(k - y) <= h * 0.3),
  ).length;
  if (sejajar > asasKiri.length * 0.5) return null;

  return { kiri, kanan };
}

/* --------------------------------------------------------- langkah 3: baris */

/**
 * Kumpul item menjadi baris mengikut PERTINDIHAN kotak glif.
 *
 * Toleransi tetap (contoh: "y dalam lingkungan 6 unit") gagal pada dokumen
 * sebenar kerana satu buku mengandungi teks 8pt dan tajuk 20pt. Pertindihan
 * pula berskala sendiri: dua glif pada baris yang sama SENTIASA bertindih
 * secara menegak, tidak kira saiznya.
 *
 * Wakil baris ialah PURATA berjalan, bukan item terakhir — kalau tidak,
 * baris yang sedikit condong akan merangkak menurun merentas muka dan
 * menelan baris di bawahnya.
 */
export function kumpulBaris(item: ItemMuka[]): ItemMuka[][] {
  if (item.length === 0) return [];
  const susun = [...item].sort((a, b) => a.y - b.y || a.x - b.x);

  const baris: { isi: ItemMuka[]; asas: number; tinggi: number }[] = [];
  for (const i of susun) {
    const semasa = baris[baris.length - 1];
    if (semasa) {
      const h = Math.min(semasa.tinggi, i.tinggi);
      const atasA = semasa.asas - semasa.tinggi;
      const atasB = i.y - i.tinggi;
      const tindih = Math.min(semasa.asas, i.y) - Math.max(atasA, atasB);
      if (tindih > 0.4 * h) {
        semasa.isi.push(i);
        // Purata berjalan, ditimbang mengikut bilangan item.
        const n = semasa.isi.length;
        semasa.asas = (semasa.asas * (n - 1) + i.y) / n;
        semasa.tinggi = (semasa.tinggi * (n - 1) + i.tinggi) / n;
        continue;
      }
    }
    baris.push({ isi: [i], asas: i.y, tinggi: i.tinggi });
  }
  // Susunan DALAM baris diuruskan `barisKeSel` — ia yang tahu arah tulisan.
  return baris.map((b) => b.isi);
}

/* ----------------------------------------------------------- langkah 4: sel */

export interface SelBaris {
  teks: string;
  x0: number;
  x1: number;
}

/**
 * Pecahkan satu baris kepada sel pada jurang yang LEBAR.
 *
 * Dua ambang, dan perbezaannya penting:
 *  · jurang > 0.22 x saiz huruf  → ruang antara perkataan
 *  · jurang > 1.20 x saiz huruf  → sempadan sel
 *
 * Ambang bawah membaiki pepijat yang paling kerap dalam teks PDF: pdf.js
 * memecahkan perkataan pada perubahan kerning, jadi "PENGETUA" boleh tiba
 * sebagai "PENG" + "ETUA". Menyambungnya tanpa ruang memulihkan perkataan;
 * menyambung SEMUANYA tanpa ruang melekatkan seluruh baris menjadi satu.
 */
export function barisKeSel(baris: ItemMuka[]): SelBaris[] {
  if (baris.length === 0) return [];

  // KANAN-KE-KIRI. Jawi dan Arab dibaca dari kanan, jadi menyusun ikut x
  // menaik memberikan ayat yang terbalik perkataan demi perkataan. pdf.js
  // sudah memulangkan setiap serpihan dalam urutan logiknya; yang perlu
  // dibetulkan hanyalah urutan ANTARA serpihan.
  const kanan = baris.filter((i) => i.rtl).reduce((a, i) => a + i.teks.trim().length, 0);
  const kiri = baris.filter((i) => !i.rtl).reduce((a, i) => a + i.teks.trim().length, 0);
  const rtl = kanan > kiri;
  const susun = rtl
    ? [...baris].sort((a, b) => b.x - a.x)
    : [...baris].sort((a, b) => a.x - b.x);

  const sel: SelBaris[] = [];
  let teks = "";
  let x0 = susun[0].x;
  let x1 = susun[0].x + susun[0].lebar;

  const simpan = () => sel.push({ teks: kemas(teks), x0: Math.min(x0, x1), x1: Math.max(x0, x1) });

  for (let n = 0; n < susun.length; n++) {
    const i = susun[n];
    if (n === 0) { teks = i.teks; x0 = i.x; x1 = i.x + i.lebar; continue; }

    const sebelum = susun[n - 1];
    const jurang = rtl
      ? sebelum.x - (i.x + i.lebar)
      : i.x - (sebelum.x + sebelum.lebar);
    const h = Math.min(sebelum.tinggi, i.tinggi) || 1;

    if (jurang > 1.2 * h) {
      simpan();
      teks = i.teks;
      x0 = i.x;
    } else if (jurang > 0.22 * h && !/\s$/.test(teks) && !/^\s/.test(i.teks)) {
      teks += ` ${i.teks}`;
    } else {
      teks += i.teks;
    }
    x1 = i.x + i.lebar;
  }
  simpan();
  return sel.filter((s) => s.teks !== "");
}

/**
 * Aksara dari fon simbol (Wingdings, Symbol) mendarat dalam Kawasan Guna
 * Persendirian Unicode: U+E000–U+F8FF.
 *
 * Ia KELIHATAN kosong pada skrin tetapi BUKAN kosong — `trim()` tidak
 * membuangnya. Diukur pada m.115 edisi 2025: setiap bulet senarai bidang
 * tugas ialah U+F0A7, dan kerana ia disangka teks, seluruh muka itu
 * dilaporkan "tidak boleh dibaca" sedangkan ia dibaca sempurna.
 *
 * Bahaya yang lebih senyap: satu aksara begini melekat pada hujung nama
 * menjadikan padanan nama gagal tanpa sebarang tanda di skrin.
 */
const RE_PUA = /[\uE000-\uF8FF]/g;

/** Aksara kawalan dan ruang sifar-lebar yang turut tidak kelihatan. */
const RE_HALIMUNAN = /[\u200B-\u200D\uFEFF\u00AD]/g;

function kemas(t: string): string {
  const asal = t.replace(RE_HALIMUNAN, "").replace(/\u00a0/g, " ");
  // Sel yang SELURUHNYA simbol ialah penanda senarai. Ia ditukar kepada
  // bulet sebenar supaya ia kelihatan dalam skrin semakan, bukan menjadi
  // sel kosong yang misterius.
  const tanpaSimbol = asal.replace(RE_PUA, "").trim();
  if (tanpaSimbol === "" && RE_PUA.test(asal)) return "\u2022";
  return buangGandaan(buangKurunganGanda(tanpaSimbol.replace(/\s+/g, " ").trim()));
}

/**
 * Runtuhkan kurungan berulang yang datang dari teks bertindih.
 *
 * Tajuk dua lapis menghasilkan "(PPSR)))" daripada "(PPSR)" — lapisan bayang
 * menyumbang kurungan tutupnya sendiri pada kedudukan yang hampir sama.
 * Tiada teks Melayu yang sah mengandungi "))" atau "((", jadi meruntuhkannya
 * tidak boleh merosakkan apa-apa yang betul.
 */
export function buangKurunganGanda(t: string): string {
  return t.replace(/\)\)+/g, ")").replace(/\(\(+/g, "(");
}

/**
 * Buang teks yang tertulis DUA KALI berturut-turut.
 *
 * Sesetengah tajuk dalam buku sebenar dilukis dua lapis untuk kesan bayang
 * atau garis luar. Kedua-dua lapisan membawa koordinat yang SAMA, jadi ia
 * mendarat pada baris yang sama dan menghasilkan
 * "CARTA ORGANISASI HAL EHWAL MURIDCARTA ORGANISASI HAL EHWAL MURID".
 * Diukur pada m.86 edisi 2025.
 */
export function buangGandaan(t: string): string {
  const n = t.length;
  if (n < 8 || n % 2 !== 0) return t;
  const separuh = n / 2;
  return t.slice(0, separuh) === t.slice(separuh) ? t.slice(0, separuh) : t;
}

function barisKeTeks(baris: ItemMuka[]): string {
  return kemas(barisKeSel(baris).map((s) => s.teks).join(" "));
}

/* --------------------------------------------------------- langkah 5: lajur */

/**
 * Cari sempadan lajur daripada KORIDOR PUTIH menegak.
 *
 * Idea: setiap sel menduduki selang [x0, x1]. Kalau satu jalur menegak tidak
 * diduduki sesiapa dari atas ke bawah muka, ia bukan kebetulan — ia ruang
 * antara lajur. Mengesan ruang KOSONG lebih tepat daripada mengumpulkan
 * tempat teks BERMULA, kerana sel yang panjang dan sel yang pendek bermula
 * di tempat yang sama tetapi berakhir di tempat berbeza.
 *
 * `toleransi` membenarkan segelintir baris menembusi koridor — tajuk yang
 * merentangi seluruh lebar muka tidak sepatutnya memusnahkan lajur bagi 40
 * baris di bawahnya.
 */
export function koridorLajur(
  barisSel: SelBaris[][],
  lebarMuka: number,
  saizHuruf: number,
): number[] {
  const baris = barisSel.filter((b) => b.length > 1);
  if (baris.length < 3) return [];

  const BIN = 2;
  const bilangan = new Array(Math.ceil(lebarMuka / BIN) + 1).fill(0);
  for (const b of baris) {
    for (const s of b) {
      const a = Math.max(0, Math.floor(s.x0 / BIN));
      const z = Math.min(bilangan.length - 1, Math.ceil(s.x1 / BIN));
      for (let i = a; i <= z; i++) bilangan[i]++;
    }
  }

  // Koridor mesti kosong bagi sekurang-kurangnya 92% baris. Bukan 100%:
  // satu tajuk merentang penuh berlaku pada hampir setiap muka jadual.
  const had = Math.max(0, Math.floor(baris.length * 0.08));
  // 0.6 x saiz huruf, bukan 0.9: lajur "BIL" yang hanya selebar dua digit
  // mempunyai koridor sempit, dan pada 0.9 ia melekat pada lajur di sebelahnya.
  const lebarMinimum = Math.max(3, saizHuruf * 0.6);

  const sempadan: number[] = [];
  let mula = -1;
  for (let i = 0; i < bilangan.length; i++) {
    const kosong = bilangan[i] <= had;
    if (kosong && mula < 0) mula = i;
    if (!kosong && mula >= 0) {
      if ((i - mula) * BIN >= lebarMinimum) sempadan.push(((mula + i) / 2) * BIN);
      mula = -1;
    }
  }
  // Koridor tepi kiri dan kanan bukan sempadan lajur — ia margin.
  return sempadan.filter((x) => x > saizHuruf && x < lebarMuka - saizHuruf);
}

/**
 * Bina jadual muka: baris x lajur, sel bergabung dikekalkan di lajur kirinya.
 *
 * Pulangkan `null` bila muka ini bukan jadual — kurang daripada dua lajur
 * dikesan. Memaksa prosa menjadi jadual satu lajur menghasilkan 500 baris
 * sampah yang admin terpaksa buang satu demi satu.
 */
export function jadualMuka(muka: MukaNormal): string[][] | null {
  const mendatar = muka.item.filter((i) => i.sudut === 0);
  const baris = kumpulBaris(mendatar.length > 0 ? mendatar : muka.item);
  if (baris.length === 0) return null;

  const barisSel = baris.map(barisKeSel);
  const tinggiTengah = median(muka.item.map((i) => i.tinggi)) || 10;
  const sempadan = koridorLajur(barisSel, muka.lebar, tinggiTengah);
  if (sempadan.length === 0) return null;

  const tepi = [0, ...sempadan, muka.lebar];
  const bilLajur = tepi.length - 1;

  const grid: string[][] = [];
  for (const b of barisSel) {
    const baris1 = new Array<string>(bilLajur).fill("");
    for (const s of b) {
      // Sel bergabung diletak di lajur tempat ia BERMULA. Meletakkannya di
      // lajur tengah (mengikut pusat) memindahkan tajuk merentang ke tengah
      // jadual, dan admin melihat lajur pertama yang kosong tanpa sebab.
      let c = 0;
      for (let k = 0; k < bilLajur; k++) if (s.x0 >= tepi[k] - 1) c = k;
      baris1[c] = baris1[c] ? `${baris1[c]} ${s.teks}` : s.teks;
    }
    if (baris1.some((s) => s !== "")) grid.push(baris1);
  }
  if (grid.length === 0) return null;

  // Margin kiri dan kanan menghasilkan koridor yang sah tetapi TIADA teks di
  // dalamnya. Membiarkannya bermakna admin melihat lajur kosong pada setiap
  // baris dan tertanya-tanya apa yang sistem terlepas baca.
  const ada: number[] = [];
  for (let c = 0; c < bilLajur; c++) if (grid.some((b) => b[c] !== "")) ada.push(c);
  const dipangkas = grid.map((b) => ada.map((c) => b[c]));
  return dipangkas.length > 0 && ada.length > 0 ? dipangkas : null;
}

export function median(n: number[]): number {
  if (n.length === 0) return 0;
  const s = [...n].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
