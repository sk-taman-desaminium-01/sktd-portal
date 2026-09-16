/**
 * Ujian enjin bacaan muka surat.
 *
 * Dua jenis ujian di sini, dan kedua-duanya perlu:
 *
 *  · UJIAN UNIT — matriks, baris, sel, koridor lajur. Pantas, tiada fail.
 *  · UJIAN PUTARAN PADA DATA SEBENAR — muka surat sebenar dari buku sekolah
 *    diputar 90°, 180° dan 270°, kemudian dibaca semula. Kalau teks yang
 *    keluar tidak SAMA dengan bacaan asal, pembetulan putaran tidak berfungsi.
 *
 *    Ujian kedua wujud kerana buku 2025 tiada satu pun muka yang teksnya
 *    diputar — diukur: 0 daripada 14,240 item. Maka kod putaran TIDAK PERNAH
 *    dijalankan oleh fail itu, dan tanpa ujian ini ia akan kekal tidak diuji
 *    sehingga buku tahun depan tiba dengan jadual bertugas yang dicetak
 *    mengiring. Ketika itu ia gagal senyap, bukan dengan ralat.
 *
 * Jalankan: npm run uji:muka  (tambah laluan PDF untuk ujian putaran sebenar)
 */

import {
  darab, sudutMatriks, normalkanMuka, kumpulBaris, barisKeSel,
  koridorLajur, jadualMuka, buangGandaan, median, lajurBacaan,
  type Matriks, type ItemMentah, type ItemMuka,
} from "../src/lib/muka-teks.ts";

let lulus = 0;
const gagal: string[] = [];

function uji(nama: string, syarat: boolean, nota = "") {
  if (syarat) lulus++;
  else gagal.push(`${nama}${nota ? ` — ${nota}` : ""}`);
}
function sama(nama: string, dapat: unknown, jangka: unknown) {
  const a = JSON.stringify(dapat);
  const b = JSON.stringify(jangka);
  uji(nama, a === b, `dapat ${a}, jangka ${b}`);
}

/* ------------------------------------------------------------- matriks */

sama("darab identiti", darab([1,0,0,1,0,0], [2,0,0,2,5,7]), [2,0,0,2,5,7]);
sama("sudut mendatar", sudutMatriks([10,0,0,10,0,0]), 0);
sama("sudut 90", sudutMatriks([0,10,-10,0,0,0]), 90);
sama("sudut 180", sudutMatriks([-10,0,0,-10,0,0]), 180);
sama("sudut 270", sudutMatriks([0,-10,10,0,0,0]), 270);

/* --------------------------------------------------------------- baris */

/** Item ujian: saiz huruf `h`, garis dasar `y`. */
const it = (teks: string, x: number, y: number, lebar: number, h = 10): ItemMuka =>
  ({ teks, x, y, lebar, tinggi: h, sudut: 0 });

sama("baris: dua item sebaris",
  kumpulBaris([it("A",0,100,10), it("B",50,101,10)]).length, 1);
sama("baris: dua baris berasingan",
  kumpulBaris([it("A",0,100,10), it("B",0,140,10)]).length, 2);
sama("baris: saiz huruf berbeza kekal sebaris",
  kumpulBaris([it("Tajuk",0,100,40,20), it("kecil",60,98,20,8)]).length, 1);

// Baris yang diimbas sedikit condong mesti kekal SATU baris, dan baris
// seterusnya mesti kekal BERASINGAN. Kedua-duanya diuji bersama kerana
// melonggarkan satu memecahkan yang lain.
{
  const condong = Array.from({ length: 40 }, (_, i) => it(`x${i}`, i * 12, 100 + i * 0.12, 10));
  sama("baris: condong halus kekal satu baris", kumpulBaris(condong).length, 1);
  const bawah = it("BAWAH", 0, 100 + 40 * 0.12 + 28, 30);
  sama("baris: baris di bawah kekal berasingan",
    kumpulBaris([...condong, bawah]).length, 2);
}

/* ----------------------------------------------------------------- sel */

sama("sel: perkataan berpecah disambung tanpa ruang",
  barisKeSel([it("PENG",0,100,24), it("ETUA",24,100,24)]).map((s) => s.teks),
  ["PENGETUA"]);
sama("sel: ruang antara perkataan dikekalkan",
  barisKeSel([it("GURU",0,100,24), it("BESAR",28,100,30)]).map((s) => s.teks),
  ["GURU BESAR"]);
sama("sel: jurang lebar memisahkan sel",
  barisKeSel([it("1",0,100,6), it("DEDIKASI",60,100,48), it("SUHAILA",200,100,42)])
    .map((s) => s.teks),
  ["1", "DEDIKASI", "SUHAILA"]);

/* -------------------------------------------------------------- lajur */

{
  // Tiga lajur pada x = 0, 100, 200 — koridor pada 60-100 dan 160-200.
  const baris = Array.from({ length: 10 }, (_, r) => [
    { teks: "a", x0: 0, x1: 50 },
    { teks: "b", x0: 100, x1: 150 },
    { teks: "c", x0: 200, x1: 250 },
  ]);
  const k = koridorLajur(baris, 300, 10);
  sama("koridor: dua sempadan dikesan", k.length, 2);
  uji("koridor: sempadan pertama antara 50 dan 100",
    k[0] > 50 && k[0] < 100, `dapat ${k[0]}`);
}

{
  // Satu tajuk merentang penuh tidak boleh memusnahkan lajur 10 baris lain.
  const baris = [
    [{ teks: "TAJUK PENUH", x0: 0, x1: 250 }],
    ...Array.from({ length: 10 }, () => [
      { teks: "a", x0: 0, x1: 50 },
      { teks: "b", x0: 100, x1: 150 },
    ]),
  ];
  uji("koridor: tajuk merentang tidak memusnahkan lajur",
    koridorLajur(baris, 300, 10).length >= 1);
}

/* ------------------------------------------------------------ gandaan */

sama("gandaan: tajuk dua lapis dicantas",
  buangGandaan("CARTA ORGANISASICARTA ORGANISASI"), "CARTA ORGANISASI");
sama("gandaan: teks biasa tidak diusik",
  buangGandaan("MESYUARAT PENGURUSAN BIL 1"), "MESYUARAT PENGURUSAN BIL 1");
sama("gandaan: nama berulang yang SAH tidak dicantas",
  buangGandaan("ABU ABU"), "ABU ABU");

/* ------------------------------------------------------- putaran sintetik */

/** Viewport pdf.js untuk kotak w x h pada putaran r. */
function viewport(w: number, h: number, r: number): { m: Matriks; w: number; h: number } {
  const [a, b, c, d] =
    r === 90 ? [0, 1, 1, 0] : r === 180 ? [-1, 0, 0, 1] : r === 270 ? [0, -1, -1, 0] : [1, 0, 0, -1];
  const px = w / 2, py = h / 2;
  const [ox, oy] = a === 0 ? [h / 2, w / 2] : [w / 2, h / 2];
  const [lw, lh] = a === 0 ? [h, w] : [w, h];
  return { m: [a, b, c, d, ox - a * px - c * py, oy - b * px - d * py], w: lw, h: lh };
}

{
  // Muka /Rotate 90: disimpan potret, dipapar landskap.
  const vp = viewport(595, 842, 90);
  sama("viewport 90: lebar dan tinggi bertukar", [vp.w, vp.h], [842, 595]);
  const mentah: ItemMentah[] = [
    { str: "KIRI",  transform: [0, 10, -10, 0, 100, 100], width: 40, height: 10 },
    { str: "KANAN", transform: [0, 10, -10, 0, 100, 200], width: 40, height: 10 },
  ];
  const muka = normalkanMuka(mentah, vp.m, vp.w, vp.h);
  sama("muka /Rotate 90: putaran dibetulkan kepada 0", muka.putaran, 0);
  sama("muka /Rotate 90: satu baris, dua sel", muka.sel, [["KIRI", "KANAN"]]);
}

{
  // Teks diputar 90° DI DALAM muka yang tidak diputar — jadual landskap
  // yang dicetak pada kertas potret.
  const vp = viewport(595, 842, 0);
  const mentah: ItemMentah[] = [
    { str: "SATU", transform: [0, 10, -10, 0, 100, 100], width: 40, height: 10 },
    { str: "DUA",  transform: [0, 10, -10, 0, 100, 200], width: 30, height: 10 },
  ];
  const muka = normalkanMuka(mentah, vp.m, vp.w, vp.h);
  // 270, bukan 90: dalam ruang PAPARAN paksi y menurun, jadi teks yang
  // dilukis ke atas dalam ruang PDF berjalan ke atas skrin — iaitu 270°.
  // Nombor itu tidak penting kepada pengguna; yang penting ialah baris
  // seterusnya, iaitu teks itu akhirnya dibaca kiri ke kanan.
  sama("teks mengiring: sudut paparan dikesan", muka.putaran, 270);
  sama("teks mengiring: dibaca kiri ke kanan", muka.baris, ["SATU DUA"]);
}

/* ----------------------------- bentuk fail yang ditulis manusia, bukan mesin */

/**
 * Setiap ujian di bawah mewakili satu cara fail SEBENAR boleh berbeza daripada
 * fail yang bagus. Buku pengurusan disusun manusia dengan alat yang berbeza
 * setiap tahun, jadi "edisi tahun ini berjaya dibaca" bukan bukti edisi tahun
 * depan akan berjaya.
 */
{
  const vp = viewport(595, 842, 0);

  // LEBAR SIFAR — sesetengah penjana tidak memberi `width`. Tanpa anggaran,
  // setiap jurang kelihatan besar dan setiap perkataan menjadi selnya sendiri.
  const tanpaLebar: ItemMentah[] = [
    { str: "GURU", transform: [10, 0, 0, 10, 100, 700], width: 0, height: 10 },
    { str: "BESAR", transform: [10, 0, 0, 10, 124, 700], width: 0, height: 10 },
  ];
  sama("lebar sifar: perkataan tidak pecah menjadi sel berasingan",
    normalkanMuka(tanpaLebar, vp.m, vp.w, vp.h).sel, [["GURU BESAR"]]);

  // TINGGI SIFAR — setiap toleransi berskala padanya, jadi sifar meruntuhkan
  // pengumpulan baris sepenuhnya.
  const tanpaTinggi: ItemMentah[] = [
    { str: "A", transform: [0, 0, 0, 0, 100, 700], width: 8, height: 0 },
    { str: "B", transform: [0, 0, 0, 0, 112, 700], width: 8, height: 0 },
    { str: "C", transform: [10, 0, 0, 10, 100, 660], width: 8, height: 10 },
  ];
  const hasilTinggi = normalkanMuka(tanpaTinggi, vp.m, vp.w, vp.h);
  sama("tinggi sifar: masih dua baris, bukan tiga", hasilTinggi.baris.length, 2);
  uji("tinggi sifar: dilaporkan sebagai amaran",
    hasilTinggi.amaran.some((a) => a.includes("saiz huruf")));

  // PUTARAN BERCAMPUR — jadual mendatar dengan tajuk lajur menegak.
  const bercampur: ItemMentah[] = [
    { str: "NAMA", transform: [10, 0, 0, 10, 100, 700], width: 30, height: 10 },
    { str: "KELAS", transform: [10, 0, 0, 10, 200, 700], width: 32, height: 10 },
    { str: "AHMAD", transform: [10, 0, 0, 10, 100, 680], width: 34, height: 10 },
    // Tajuk menegak di tepi.
    { str: "SENARAI", transform: [0, 10, -10, 0, 60, 640], width: 44, height: 10 },
  ];
  const campur = normalkanMuka(bercampur, vp.m, vp.w, vp.h);
  uji("putaran bercampur: teks mengiring TIDAK hilang",
    campur.baris.join(" ").includes("SENARAI"),
    campur.baris.join(" | "));
  uji("putaran bercampur: aliran mendatar kekal betul",
    campur.baris[0] === "NAMA KELAS", campur.baris[0]);
  uji("putaran bercampur: dilaporkan sebagai amaran",
    campur.amaran.some((a) => a.includes("mengiring")));
}

{
  // KANAN-KE-KIRI — Jawi dan Arab. Serpihan kanan mesti dibaca dahulu.
  const kanan = [
    { teks: "الثاني", x: 100, y: 100, lebar: 40, tinggi: 10, sudut: 0, rtl: true },
    { teks: "الأول", x: 144, y: 100, lebar: 40, tinggi: 10, sudut: 0, rtl: true },
  ];
  sama("kanan-ke-kiri: serpihan kanan dibaca dahulu",
    barisKeSel(kanan).map((s) => s.teks), ["الأول الثاني"]);
  // Teks Latin pada baris yang sama tidak boleh terjejas.
  sama("kiri-ke-kanan tidak terjejas",
    barisKeSel([it("SATU", 100, 100, 30), it("DUA", 134, 100, 24)]).map((s) => s.teks),
    ["SATU DUA"]);
}

{
  // PROSA DUA LAJUR — baris kiri dan kanan berada pada ketinggian sama tetapi
  // BUKAN sepasang. Dibaca melintang, ia menjadi ayat bercampur.
  const prosa: ItemMuka[] = [];
  for (let n = 0; n < 20; n++) prosa.push(it(`kiri${n}`, 50, 100 + n * 14, 180));
  // Lajur kanan: garis dasar dianjak supaya TIDAK sejajar dengan kiri.
  for (let n = 0; n < 20; n++) prosa.push(it(`kanan${n}`, 320, 107 + n * 14, 180));
  const pecah = lajurBacaan(prosa, 595);
  uji("prosa dua lajur: dikesan", pecah !== null);
  uji("prosa dua lajur: kiri dibaca sepenuhnya dahulu",
    pecah !== null && pecah.kiri.length === 20 && pecah.kanan.length === 20);

  // JADUAL dua lajur: garis dasar SEJAJAR — ia mesti dibaca melintang.
  const jadual: ItemMuka[] = [];
  for (let n = 0; n < 20; n++) {
    jadual.push(it(`a${n}`, 50, 100 + n * 14, 180));
    jadual.push(it(`b${n}`, 320, 100 + n * 14, 180));
  }
  uji("jadual dua lajur: TIDAK disangka prosa", lajurBacaan(jadual, 595) === null);
}

/* -------------------------------------------- putaran pada DATA SEBENAR */

const failPdf = process.argv[2];
if (failPdf) {
  const { readFileSync } = await import("node:fs");
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(failPdf)));

  /** Putar matriks item sebanyak `r` darjah dalam ruang PDF (y ke atas). */
  const putarItem = (t: number[], r: number, w: number, h: number): number[] => {
    const rad = (r * Math.PI) / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const R: Matriks = [c, s, -s, c, 0, 0];
    const m = darab(R, t as unknown as Matriks);
    // Anjak supaya kotak muka kekal bermula di (0,0).
    const sudut4 = [[0,0],[w,0],[0,h],[w,h]].map(([x,y]) => [x*c - y*s, x*s + y*c]);
    return [m[0], m[1], m[2], m[3],
            m[4] - Math.min(...sudut4.map((p) => p[0])),
            m[5] - Math.min(...sudut4.map((p) => p[1]))];
  };

  /** Condongkan matriks sebanyak `d` darjah — meniru muka yang diimbas senget. */
  const condongItem = (t: number[], d: number): number[] => {
    const r = (d * Math.PI) / 180;
    const c = Math.cos(r), sn = Math.sin(r);
    return darab([c, sn, -sn, c, 0, 0], t as unknown as Matriks) as unknown as number[];
  };

  for (const n of [47, 73, 136, 122]) {
    if (n > pdf.numPages) continue;
    const p = await pdf.getPage(n);
    const vp = p.getViewport({ scale: 1 });
    const isi = (await p.getTextContent()).items as unknown as ItemMentah[];
    const asal = normalkanMuka(isi, vp.transform, vp.width, vp.height);

    for (const r of [90, 180, 270]) {
      const w = vp.width, h = vp.height;
      const diputar = isi.map((i) => ({ ...i, transform: putarItem(i.transform, r, w, h) }));
      const kotak = r === 180 ? [w, h] : [h, w];
      const vpBaru = viewport(kotak[0], kotak[1], 0);
      const hasil = normalkanMuka(diputar, vpBaru.m, kotak[0], kotak[1]);
      uji(
        `m.${n} diputar ${r}°: teks sama seperti asal`,
        hasil.baris.join("\n") === asal.baris.join("\n"),
        `${asal.baris.length} baris asal vs ${hasil.baris.length} baris selepas putaran`,
      );
    }

    // MUKA CONDONG — imbasan yang senget 1.5°. Bilangan baris mesti kekal;
    // kalau pengumpulan baris merangkak, ia akan bercantum atau berpecah.
    const senget = isi.map((i) => ({ ...i, transform: condongItem(i.transform, 1.5) }));
    const hasilSenget = normalkanMuka(senget, vp.transform, vp.width, vp.height);
    uji(
      `m.${n} condong 1.5°: bilangan baris kekal`,
      Math.abs(hasilSenget.baris.length - asal.baris.length) <= 1,
      `${asal.baris.length} → ${hasilSenget.baris.length}`,
    );
  }
} else {
  console.log("  (ujian putaran data sebenar dilangkau — beri laluan PDF)");
}

/* ------------------------------------------------------------- keputusan */

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
