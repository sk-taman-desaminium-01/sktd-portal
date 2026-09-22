"use client";

type ModulTesseract = typeof import("tesseract.js");
type PekerjaOcr = Awaited<ReturnType<ModulTesseract["createWorker"]>>;

interface HasilKenalOcr {
  teks: string;
  sudut: number;
  skor: number;
  keyakinan: number;
}

interface KataTsv {
  teks: string;
  kiri: number;
  atas: number;
  lebar: number;
  tinggi: number;
  tengahY: number;
}

export interface PembacaImbasan {
  baca(fail: File, kemajuan?: (teks: string) => void, hadMuka?: number): Promise<string>;
  tutup(): Promise<void>;
}

function kpSah(kp: string): boolean {
  if (!/^\d{12}$/.test(kp)) return false;
  const bulan = Number(kp.slice(2, 4));
  const hari = Number(kp.slice(4, 6));
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return false;
  const tahun = 2000 + Number(kp.slice(0, 2));
  const tarikh = new Date(Date.UTC(tahun, bulan - 1, hari));
  return tarikh.getUTCMonth() === bulan - 1 && tarikh.getUTCDate() === hari;
}

/** Bilangan No. KP sah — ukuran orientasi yang jauh lebih kuat daripada keyakinan OCR. */
export function kiraKpOcr(teks: string): number {
  const jumpa = teks.match(/\d(?:[\s./\-–—]?\d){11}/g) ?? [];
  return new Set(jumpa.map((x) => x.replace(/\D/g, "")).filter(kpSah)).size;
}

function kataDariTsv(tsv: string | null): KataTsv[] {
  if (!tsv) return [];
  const keluar: KataTsv[] = [];
  for (const baris of tsv.split(/\r?\n/).slice(1)) {
    const sel = baris.split("\t");
    if (sel.length < 12 || sel[0] !== "5") continue;
    const teks = sel.slice(11).join("\t").trim();
    const kiri = Number(sel[6]);
    const atas = Number(sel[7]);
    const lebar = Number(sel[8]);
    const tinggi = Number(sel[9]);
    const yakin = Number(sel[10]);
    if (!teks || !Number.isFinite(kiri + atas + lebar + tinggi) || yakin < 0) continue;
    keluar.push({ teks, kiri, atas, lebar, tinggi, tengahY: atas + tinggi / 2 });
  }
  return keluar;
}

/**
 * PDF PBD ialah jadual: nama boleh memenuhi tiga baris sementara No. KP cuma
 * satu baris. Teks OCR biasa memisahkan kedua-duanya lalu pengecam melihat
 * nombor tanpa nama. Koordinat TSV digunakan untuk mengumpulkan seluruh nama
 * dalam jalur menegak No. KP yang sama.
 */
export function susunJadualOcr(tsv: string | null): string {
  const kata = kataDariTsv(tsv);
  const sauh = kata
    .map((k) => ({ ...k, kp: k.teks.replace(/\D/g, "") }))
    .filter((k) => kpSah(k.kp))
    .sort((a, b) => a.tengahY - b.tengahY);
  if (!sauh.length) return "";

  const abaikan = /^(BIL|NO|NAMA|ID|PENGENALAN|JANTINA|KELAS)$/i;
  const baris: string[] = [];
  for (let i = 0; i < sauh.length; i++) {
    const semasa = sauh[i];
    const jarakAtas = i > 0 ? semasa.tengahY - sauh[i - 1].tengahY :
      (sauh[i + 1] ? sauh[i + 1].tengahY - semasa.tengahY : semasa.tinggi * 4);
    const jarakBawah = i + 1 < sauh.length ? sauh[i + 1].tengahY - semasa.tengahY : jarakAtas;
    const mula = semasa.tengahY - Math.max(semasa.tinggi, jarakAtas / 2);
    const tamat = semasa.tengahY + Math.max(semasa.tinggi, jarakBawah / 2);
    const nama = kata
      .filter((k) =>
        k.tengahY >= mula && k.tengahY < tamat &&
        k.kiri + k.lebar <= semasa.kiri + 2 &&
        /[A-Z]/i.test(k.teks) && !abaikan.test(k.teks.replace(/[^A-Z]/gi, "")))
      .sort((a, b) => Math.abs(a.tengahY - b.tengahY) < Math.max(a.tinggi, b.tinggi) * 0.45
        ? a.kiri - b.kiri
        : a.tengahY - b.tengahY)
      .map((k) => k.teks.replace(/[^A-ZÀ-ÖØ-öø-ÿ/'@.-]/gi, " ").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (nama.length >= 3) baris.push(`${betulkanNamaOcr(nama)} ${semasa.kp}`);
  }
  return baris.join("\n");
}

/**
 * Dua salah baca Tesseract yang berulang pada senarai iDMe (diukur pada
 * 30 fail Tahap 1): huruf "I" di awal perkataan hilang sebelum "ZZ"
 * ("ZZUDDIN", "ZZAT"), dan "BINTI" terpotong menjadi "BINT". Tiada nama
 * Melayu bermula dengan "ZZ", jadi pembetulan ini selamat.
 */
export function betulkanNamaOcr(nama: string): string {
  return nama
    .replace(/(^|\s)ZZ(?=[A-Z])/g, "$1IZZ")
    .replace(/(^|\s)BINT(?=\s|$)/g, "$1BINTI");
}

function darjah(sudut: number): number {
  return Math.round((sudut * 180) / Math.PI);
}

function putarDanPotongMurid(canvas: HTMLCanvasElement, sudut: number): HTMLCanvasElement {
  const sukuPusing = Math.abs(Math.round(sudut / (Math.PI / 2))) % 2 === 1;
  const putar = document.createElement("canvas");
  putar.width = sukuPusing ? canvas.height : canvas.width;
  putar.height = sukuPusing ? canvas.width : canvas.height;
  const ctx = putar.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Pelayar tidak dapat memutar imej OCR.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, putar.width, putar.height);
  ctx.translate(putar.width / 2, putar.height / 2);
  ctx.rotate(sudut);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  // Format iDMe/PBD meletakkan Bil, Nama dan ID Pengenalan di sebelah kiri.
  // Memotong lajur ini menghalang gred serta ulasan guru daripada mengganggu
  // huruf awal nama, dan mengurangkan jumlah piksel OCR kira-kira 60%.
  const potong = document.createElement("canvas");
  potong.width = Math.ceil(putar.width * 0.4);
  potong.height = putar.height;
  const pctx = potong.getContext("2d", { willReadFrequently: true });
  if (!pctx) throw new Error("Pelayar tidak dapat memotong lajur murid.");
  pctx.fillStyle = "#fff";
  pctx.fillRect(0, 0, potong.width, potong.height);
  pctx.drawImage(putar, 0, 0, potong.width, potong.height, 0, 0, potong.width, potong.height);
  putar.width = 1;
  putar.height = 1;
  return potong;
}

async function kanvasImej(fail: File): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(fail);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Pelayar tidak dapat menyediakan imej OCR.");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        return canvas;
      } finally {
        bitmap.close();
      }
    } catch {
      // Safari lama dan sesetengah fail kamera menolak createImageBitmap;
      // HTMLImageElement di bawah ialah laluan serasi iPhone/Android.
    }
  }

  const url = URL.createObjectURL(fail);
  try {
    const imej = new Image();
    imej.decoding = "async";
    imej.src = url;
    await new Promise<void>((selesai, gagal) => {
      imej.onload = () => selesai();
      imej.onerror = () => gagal(new Error("Format gambar tidak dapat dibaca oleh pelayar ini."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = imej.naturalWidth;
    canvas.height = imej.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Pelayar tidak dapat menyediakan imej OCR.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imej, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function kenalSatu(
  worker: PekerjaOcr,
  imej: File | Blob | HTMLCanvasElement,
  sudut: number,
): Promise<HasilKenalOcr> {
  const hasil = await worker.recognize(
    imej,
    { rotateRadians: sudut },
    { text: true, tsv: true, blocks: false },
  );
  const jadual = susunJadualOcr(hasil.data.tsv);
  const teks = kiraKpOcr(jadual) >= kiraKpOcr(hasil.data.text) ? jadual : hasil.data.text.trim();
  return {
    teks,
    sudut,
    skor: kiraKpOcr(teks),
    keyakinan: Number.isFinite(hasil.data.confidence) ? hasil.data.confidence : 0,
  };
}

async function pilihOrientasi(
  worker: PekerjaOcr,
  imej: File | Blob | HTMLCanvasElement,
  kemajuan?: (teks: string) => void,
  petunjuk?: number,
): Promise<HasilKenalOcr> {
  // 0° dahulu: PDF.js sudah menghormati metadata /Rotate. Bagi fail yang
  // menyimpan imej mengiring tanpa metadata, cuba kedua-dua arah dan 180°.
  // Dalam satu ZIP, semua fail biasanya diimbas dengan arah yang SAMA —
  // arah fail sebelumnya dicuba dahulu, menjimatkan sehingga tiga bacaan
  // OCR penuh bagi setiap fail pada telefon.
  const asas = [0, Math.PI / 2, -Math.PI / 2, Math.PI];
  const sudut = petunjuk === undefined ? asas : [petunjuk, ...asas.filter((x) => x !== petunjuk)];
  let terbaik: HasilKenalOcr | null = null;
  for (const s of sudut) {
    kemajuan?.(`Mengesan arah ${darjah(s)}°…`);
    const calon = await kenalSatu(worker, imej, s);
    if (!terbaik || calon.skor > terbaik.skor ||
      (calon.skor === terbaik.skor && calon.keyakinan > terbaik.keyakinan)) {
      terbaik = calon;
    }
    // Tiga No. KP sah sudah cukup untuk membuktikan arah; elakkan tiga OCR
    // tambahan pada setiap fail yang memang telah tegak.
    if (calon.skor >= 3) break;
  }
  if (!terbaik) throw new Error("OCR tidak menghasilkan sebarang bacaan.");
  return terbaik;
}

async function kanvasMuka(
  pdf: Awaited<ReturnType<(typeof import("unpdf"))["getDocumentProxy"]>>,
  nombor: number,
) {
  const muka = await pdf.getPage(nombor);
  const asas = muka.getViewport({ scale: 1 });
  const skala = Math.min(2.4, 2200 / Math.max(asas.width, asas.height));
  const viewport = muka.getViewport({ scale: skala });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Pelayar tidak dapat menyediakan kanvas OCR.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await muka.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function bacaDenganWorker(
  worker: PekerjaOcr,
  fail: File,
  kemajuan?: (teks: string) => void,
  hadMuka = 20,
  ingat: { sudut?: number } = {},
): Promise<string> {
  if (!/\.pdf$/i.test(fail.name) && fail.type !== "application/pdf") {
    const arah = await pilihOrientasi(worker, fail, kemajuan, ingat.sudut);
    if (arah.skor > 0) ingat.sudut = arah.sudut;
    const canvas = await kanvasImej(fail);
    let hasil = arah;
    try {
      const potong = putarDanPotongMurid(canvas, arah.sudut);
      try {
        const jadual = await kenalSatu(worker, potong, 0);
        if (jadual.skor >= arah.skor) hasil = { ...jadual, sudut: arah.sudut };
      } finally {
        potong.width = 1;
        potong.height = 1;
      }
    } finally {
      canvas.width = 1;
      canvas.height = 1;
    }
    kemajuan?.(`Arah ${darjah(hasil.sudut)}° dipilih · ${hasil.skor} No. KP dikesan.`);
    return hasil.teks.trim();
  }

  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()));
  const jumlah = Math.min(pdf.numPages, hadMuka);
  if (pdf.numPages > hadMuka) {
    await pdf.loadingTask.destroy();
    throw new Error(`PDF ini mempunyai ${pdf.numPages} muka. OCR dihadkan kepada ${hadMuka} muka setiap fail.`);
  }

  const teks: string[] = [];
  let sudut = 0;
  try {
    for (let nombor = 1; nombor <= jumlah; nombor++) {
      kemajuan?.(`Menyediakan muka ${nombor}/${jumlah}…`);
      const canvas = await kanvasMuka(pdf, nombor);
      try {
        if (nombor === 1) {
          const arah = await pilihOrientasi(worker, canvas, kemajuan, ingat.sudut);
          sudut = arah.sudut;
          if (arah.skor > 0) ingat.sudut = sudut;
          const potong = putarDanPotongMurid(canvas, sudut);
          try {
            const jadual = await kenalSatu(worker, potong, 0);
            const hasil = jadual.skor >= arah.skor ? jadual : arah;
            if (hasil.teks.trim()) teks.push(hasil.teks.trim());
            kemajuan?.(`Arah ${darjah(sudut)}° dipilih · ${hasil.skor} No. KP pada muka pertama.`);
          } finally {
            potong.width = 1;
            potong.height = 1;
          }
        } else {
          kemajuan?.(`Membaca muka ${nombor}/${jumlah}…`);
          const potong = putarDanPotongMurid(canvas, sudut);
          let hasil: HasilKenalOcr;
          try {
            hasil = await kenalSatu(worker, potong, 0);
          } finally {
            potong.width = 1;
            potong.height = 1;
          }
          // Format luar jangka mungkin tidak meletakkan ID di kiri. Hanya
          // dalam kes itu, baca semula seluruh muka sebagai jalan selamat.
          if (hasil.skor === 0) hasil = await kenalSatu(worker, canvas, sudut);
          if (hasil.teks.trim()) teks.push(hasil.teks.trim());
        }
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    }
  } finally {
    await pdf.loadingTask.destroy();
  }
  return teks.join("\n").trim();
}

/**
 * Buka satu sesi OCR. Muat naik ZIP menggunakan satu worker bagi semua fail,
 * mengelakkan model bahasa dimuat dan dimusnahkan 57 kali pada telefon.
 */
export async function ciptaPembacaImbasan(
  kemajuanAsal?: (teks: string) => void,
): Promise<PembacaImbasan> {
  const modul = await import("tesseract.js");
  let kemajuanAktif = kemajuanAsal;
  let sudahTutup = false;
  const worker = await modul.createWorker("eng", modul.OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        kemajuanAktif?.(`OCR ${Math.round(m.progress * 100)}%…`);
      }
    },
  });
  await worker.setParameters({
    tessedit_pageseg_mode: modul.PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
    user_defined_dpi: "240",
  });

  const ingat: { sudut?: number } = {};
  return {
    async baca(fail, kemajuan = kemajuanAsal, hadMuka = 20) {
      if (sudahTutup) throw new Error("Sesi OCR sudah ditutup.");
      kemajuanAktif = kemajuan;
      return bacaDenganWorker(worker, fail, kemajuan, hadMuka, ingat);
    },
    async tutup() {
      if (sudahTutup) return;
      sudahTutup = true;
      kemajuanAktif = undefined;
      await worker.terminate();
    },
  };
}

/** OCR satu fail; komponen pukal menggunakan `ciptaPembacaImbasan` terus. */
export async function bacaImbasan(
  fail: File,
  kemajuan?: (teks: string) => void,
  hadMuka = 20,
): Promise<string> {
  const pembaca = await ciptaPembacaImbasan(kemajuan);
  try {
    return await pembaca.baca(fail, kemajuan, hadMuka);
  } finally {
    await pembaca.tutup();
  }
}

export function failTeksOcr(fail: File, teks: string): File {
  const nama = fail.name.replace(/\.[^.]+$/, "") || "imbasan";
  return new File([teks], `${nama}.ocr.txt`, { type: "text/plain" });
}

/**
 * PDF imbasan? Semak lapisan teks DI PELAYAR sebelum memuat naik.
 *
 * Dahulu setiap PDF dihantar ke pelayan dahulu (≈1 MB setiap satu, 30 MB
 * bagi satu ZIP Tahap 1) hanya untuk mendapat jawapan "tiada No. KP", baru
 * OCR dijalankan di peranti. Pada data mudah alih itu minit-minit yang
 * sia-sia dan punca utama ZIP "tidak dapat dibaca" di telefon.
 */
export async function pdfTanpaTeks(fail: File): Promise<boolean> {
  try {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()));
    try {
      const { text } = await extractText(pdf, { mergePages: true });
      return kiraKpOcr(text) === 0 && text.replace(/\s+/g, "").length < 200 * Math.max(1, pdf.numPages);
    } finally {
      await pdf.loadingTask.destroy();
    }
  } catch {
    return false; // biar pelayan yang memutuskan
  }
}

/** Kekalkan skrin telefon hidup semasa OCR panjang; gagal secara senyap jika tidak disokong. */
export async function kunciSkrin(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(j: "screen"): Promise<{ release(): Promise<void> }> } };
    const kunci = await nav.wakeLock?.request("screen");
    return () => { void kunci?.release().catch(() => {}); };
  } catch {
    return () => {};
  }
}

/* ======================================================== OCR JADUAL WAKTU */

/**
 * Item teks berkoordinat — bentuk SAMA dengan `ItemTeks` PDF di pelayan
 * (x kiri, y dari BAWAH seperti PDF, w lebar), dalam unit titik A4.
 */
export interface ItemOcr { str: string; x: number; y: number; w: number }

const HARI_RE = /\b(ISNIN|SELASA|RABU|KHAMIS|JUMAAT|SABTU|AHAD)\b/gi;

/** Skor arah jadual: nama hari (kuat) + corak masa 7:30 / 7.30 (sokongan). */
function skorJadual(teks: string): number {
  // aSc mencetak singkatan Inggeris sebaris sendiri: Mo, Tu, We, Th, Fr.
  const singkat = teks.match(/^\s*(Mo|Tu|We|Th|Fr)\s*$/gm) ?? [];
  const hari = new Set([...(teks.match(HARI_RE) ?? []), ...singkat].map((h) => h.trim().toUpperCase())).size;
  const masa = (teks.match(/\b\d{1,2}[.:]\d{2}\b/g) ?? []).length;
  return hari * 10 + Math.min(masa, 30);
}

/**
 * Perkataan TSV → frasa berkoordinat. Perkataan pada baris sama yang
 * dekat (jurang < 0.9 × tinggi huruf) dicantum — seperti item teks PDF,
 * supaya "Bahasa Melayu" kekal satu sel dan bukan dua.
 */
function itemDariTsv(tsv: string | null): ItemOcr[] {
  const kata = kataDariTsv(tsv);
  if (kata.length === 0) return [];
  const H = Math.max(...kata.map((k) => k.atas + k.tinggi));
  const W = Math.max(...kata.map((k) => k.kiri + k.lebar));
  const s = 842 / Math.max(H, W);
  const susun = [...kata].sort((a, b) => a.tengahY - b.tengahY || a.kiri - b.kiri);
  const frasa: { kiri: number; kanan: number; atas: number; bawah: number; teks: string[] }[] = [];
  for (const k of susun) {
    const f = frasa.find((x) =>
      Math.abs((x.atas + x.bawah) / 2 - k.tengahY) < k.tinggi * 0.5 &&
      k.kiri - x.kanan >= -2 && k.kiri - x.kanan < k.tinggi * 0.9);
    if (f) { f.teks.push(k.teks); f.kanan = k.kiri + k.lebar; f.atas = Math.min(f.atas, k.atas); f.bawah = Math.max(f.bawah, k.atas + k.tinggi); }
    else frasa.push({ kiri: k.kiri, kanan: k.kiri + k.lebar, atas: k.atas, bawah: k.atas + k.tinggi, teks: [k.teks] });
  }
  // Julat masa aSc "01:00 - 01:30": OCR kerap kehilangan sengkang, jadi dua
  // masa bersebelahan pada baris sama dicantum semula menjadi satu julat —
  // pembaca kedudukan mengenal lajur waktu daripada JULAT, bukan satu masa.
  const MASA = /^\d{1,2}[:.]\d{2}$/;
  frasa.sort((a, b) => (a.atas + a.bawah) / 2 - (b.atas + b.bawah) / 2 || a.kiri - b.kiri);
  for (let i = 0; i < frasa.length - 1; i++) {
    const a = frasa[i], b = frasa[i + 1];
    const t = a.bawah - a.atas;
    const sama = Math.abs((a.atas + a.bawah) / 2 - (b.atas + b.bawah) / 2) < t * 0.6;
    const ta = a.teks.join(" ").replace(/\s*[-–—]\s*$/, "");
    if (sama && MASA.test(ta) && MASA.test(b.teks.join(" ")) && b.kiri - a.kanan < t * 3) {
      a.teks = [`${ta} - ${b.teks.join(" ")}`];
      a.kanan = b.kanan;
      frasa.splice(i + 1, 1);
    }
  }
  return frasa.map((f) => ({ str: betulkanHurufJadual(f.teks.join(" ")), x: f.kiri * s, y: (H - f.bawah) * s, w: (f.kanan - f.kiri) * s }));
}

/**
 * Jadual aSc ditaip HURUF BESAR. Tesseract kerap membaca "I" sebagai "l",
 * "1" atau "|" ("Bl", "P.lSLAM"), dan "O" sebagai "0". Dalam perkataan yang
 * selebihnya huruf besar, gantikan semula — tanpa menyentuh nombor masa.
 */
export function betulkanHurufJadual(teks: string): string {
  return teks.split(" ").map((k) => {
    if (/^\d{1,2}[:.]\d{2}$/.test(k) || /^\d+$/.test(k)) return k;
    const huruf = k.replace(/[^A-Za-z]/g, "");
    const besar = huruf.replace(/[^A-Z]/g, "").length;
    if (huruf.length === 0 || besar < Math.max(1, huruf.length - 1)) return k;
    return k.replace(/[l|]/g, "I").replace(/(?<=[A-Z.])1(?=[A-Z.]|$)/g, "I").replace(/(?<=[A-Z])0(?=[A-Z]|$)/g, "O");
  }).join(" ");
}

/**
 * OCR JADUAL WAKTU — foto atau imbasan jadual dari telefon.
 *
 * Berbeza daripada OCR senarai murid: TIADA pemotongan lajur kiri (jadual
 * memenuhi seluruh muka), dan arah dipilih mengikut bilangan NAMA HARI,
 * bukan No. KP. Hasilnya ialah item berkoordinat, jadi pelayan membaca
 * foto dengan pembaca kedudukan yang sama seperti PDF aSc.
 */
export async function bacaImbasanJadual(
  fail: File,
  kemajuan?: (teks: string) => void,
  hadMuka = 3,
): Promise<{ teks: string; item: ItemOcr[][] }> {
  const modul = await import("tesseract.js");
  const worker = await modul.createWorker("eng", modul.OEM.LSTM_ONLY, {
    logger: (m) => { if (m.status === "recognizing text") kemajuan?.(`OCR ${Math.round(m.progress * 100)}%…`); },
  });
  await worker.setParameters({ tessedit_pageseg_mode: modul.PSM.SPARSE_TEXT, preserve_interword_spaces: "1", user_defined_dpi: "240" });

  // Putar kanvas SENDIRI dengan saiz dibesarkan. `rotateRadians` Tesseract
  // memutar di dalam bingkai asal — foto landskap yang dipusing 90° terpotong
  // di kedua-dua hujung (lajur hari dan dua waktu terakhir hilang).
  // Foto kecil/kabur dibesarkan ke ±3600 px pada sisi panjang — huruf
  // jadual yang kecil (nama guru) perlu ±20 px tinggi untuk dibaca.
  function putar(kanvas: HTMLCanvasElement, sudut: number): HTMLCanvasElement {
    const skala = Math.min(2, Math.max(1, 3600 / Math.max(kanvas.width, kanvas.height)));
    if (sudut === 0 && skala === 1) return kanvas;
    const suku = Math.abs(Math.round(sudut / (Math.PI / 2))) % 2 === 1;
    const k = document.createElement("canvas");
    k.width = Math.round((suku ? kanvas.height : kanvas.width) * skala);
    k.height = Math.round((suku ? kanvas.width : kanvas.height) * skala);
    const ctx = k.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Pelayar tidak dapat memutar imej OCR.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, k.width, k.height);
    ctx.translate(k.width / 2, k.height / 2);
    ctx.rotate(sudut);
    ctx.scale(skala, skala);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(kanvas, -kanvas.width / 2, -kanvas.height / 2);
    return k;
  }

  async function satuMuka(kanvas: HTMLCanvasElement): Promise<{ teks: string; item: ItemOcr[] }> {
    let terbaik: { teks: string; item: ItemOcr[]; skor: number } | null = null;
    for (const sudut of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      kemajuan?.(`Mengesan arah ${darjah(sudut)}°…`);
      const imej = putar(kanvas, sudut);
      let r;
      try {
        r = await worker.recognize(imej, {}, { text: true, tsv: true, blocks: false });
      } finally {
        if (imej !== kanvas) { imej.width = 1; imej.height = 1; }
      }
      const skor = skorJadual(r.data.text);
      if (!terbaik || skor > terbaik.skor) terbaik = { teks: r.data.text, item: itemDariTsv(r.data.tsv), skor };
      if (skor >= 40) break; // ≥ 4 nama hari: arah sudah pasti
    }
    return terbaik ?? { teks: "", item: [] };
  }

  try {
    if (!/\.pdf$/i.test(fail.name) && fail.type !== "application/pdf") {
      const kanvas = await kanvasImej(fail);
      try {
        const r = await satuMuka(kanvas);
        return { teks: r.teks, item: r.item.length ? [r.item] : [] };
      } finally { kanvas.width = 1; kanvas.height = 1; }
    }
    const { getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()));
    const teks: string[] = [];
    const item: ItemOcr[][] = [];
    try {
      for (let n = 1; n <= Math.min(pdf.numPages, hadMuka); n++) {
        kemajuan?.(`Menyediakan muka ${n}…`);
        const kanvas = await kanvasMuka(pdf, n);
        try {
          const r = await satuMuka(kanvas);
          teks.push(r.teks);
          if (r.item.length) item.push(r.item);
        } finally { kanvas.width = 1; kanvas.height = 1; }
      }
    } finally { await pdf.loadingTask.destroy(); }
    return { teks: teks.join("\n"), item };
  } finally {
    await worker.terminate();
  }
}

/** Bungkus hasil OCR jadual sebagai fail kecil untuk Server Action. */
export function failOcrJadual(fail: File, hasil: { teks: string; item: ItemOcr[][] }): File {
  const nama = fail.name.replace(/\.[^.]+$/, "") || "jadual";
  return new File([JSON.stringify(hasil)], `${nama}.ocrjadual.txt`, { type: "text/plain" });
}
