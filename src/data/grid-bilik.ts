import { HARI, JADUAL_KOSONG, type Hari, type Jadual, type SetWaktu, type Waktu } from "./jadual-jenis.ts";
import { keMinit, type Bilik, type Tempahan } from "./bilik.ts";
import { terpakaiPada, type Tetap } from "./bilik-tetap.ts";

/**
 * GRID TEMPAHAN — hari melintang, waktu menegak, sesi pagi dan petang.
 *
 * Bentuk lama ialah borang: pilih bilik, taip jam mula, taip jam tamat.
 * Ia berfungsi, tetapi ia menjawab soalan yang SALAH. Guru tidak bertanya
 * "adakah Makmal 2 bebas pada 10:30?" — mereka bertanya "bila saya boleh
 * dapat bilik?", dan borang tidak pernah menjawab itu tanpa mencuba
 * berkali-kali.
 *
 * Keputusan pengguna (17 Sep 2026): grid Isnin–Jumaat mengikut waktu, konsep
 * pagi dan petang seperti jadual harian. Hijau bermakna kosong, merah
 * bermakna sudah ditempah. Kerana sekolah ada LAPAN bilik, satu slot hampir
 * selalu ada sekurang-kurangnya satu bilik kosong — jadi slot kekal BIRU
 * sampai ia ditekan, dan barulah bilik mana hijau dan mana merah kelihatan.
 *
 * Fail ini logik tulen: tiada pangkalan data, tiada React. Itu disengajakan —
 * pengiraan "slot mana penuh" ialah bahagian yang paling mudah silap, jadi
 * ia mesti berada di tempat yang ujian boleh capai.
 */

/** Satu blok waktu dalam grid. Sama bentuk dengan `Waktu` jadual. */
export interface BlokGrid {
  id: string;
  mula: string;
  tamat: string;
  rehat?: boolean;
  label?: string;
}

export interface SesiGrid {
  sesi: "pagi" | "petang";
  nama: string;
  blok: BlokGrid[];
}

/**
 * Blok waktu untuk grid, dari SET WAKTU jadual sekolah.
 *
 * Kenapa bukan satu senarai am: rehat sekolah ini berperingkat, jadi setiap
 * tahun ada senarai waktunya sendiri. Untuk tempahan bilik, yang diperlukan
 * hanya SEMPADAN blok — dan sempadan itu sama bagi semua set dalam sesi yang
 * sama. Jadi blok dikumpul mengikut (mula, tamat) dan dinyahdua.
 *
 * Waktu REHAT dikekalkan sebagai blok biasa yang boleh ditempah: mesyuarat
 * dan majlis memang berlaku pada waktu rehat, dan menyembunyikan blok itu
 * bermakna satu jam setiap hari hilang dari papan tanpa sebab.
 */
export function sesiGrid(jadual: Jadual): SesiGrid[] {
  const kumpul = (sesi: "pagi" | "petang"): BlokGrid[] => {
    const peta = new Map<string, BlokGrid>();
    for (const s of jadual.set.filter((x: SetWaktu) => x.sesi === sesi)) {
      for (const w of s.senarai as Waktu[]) {
        const kunci = `${w.mula}-${w.tamat}`;
        if (peta.has(kunci)) continue;
        peta.set(kunci, { id: kunci, mula: w.mula, tamat: w.tamat });
      }
    }
    return [...peta.values()].sort((a, b) => a.mula.localeCompare(b.mula));
  };

  return [
    { sesi: "pagi", nama: "Sesi Pagi", blok: kumpul("pagi") },
    { sesi: "petang", nama: "Sesi Petang", blok: kumpul("petang") },
  ].filter((s) => s.blok.length > 0) as SesiGrid[];
}

/**
 * Jadual tempahan mesti kekal kelihatan walaupun seseorang pernah menyimpan
 * konfigurasi Jadual Waktu yang kosong. Ini menggunakan waktu rasmi lalai
 * sekolah, bukan mengembalikan pengguna kepada borang atau skrin kosong.
 */
export const SESI_GRID_LALAI: SesiGrid[] = sesiGrid(JADUAL_KOSONG);

/* ------------------------------------------------------------- tarikh */

/** Isnin bagi minggu yang mengandungi `iso`. */
export function isninMinggu(iso: string): string {
  const [y, b, h] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, b - 1, h));
  const n = d.getUTCDay();               // 0 = Ahad
  const anjak = n === 0 ? -6 : 1 - n;    // Ahad milik minggu SEBELUMNYA
  d.setUTCDate(d.getUTCDate() + anjak);
  return d.toISOString().slice(0, 10);
}

export function tambahHari(iso: string, n: number): string {
  const [y, b, h] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, b - 1, h + n)).toISOString().slice(0, 10);
}

/** Tujuh tarikh bermula Isnin. Ambil lima untuk Isnin–Jumaat. */
export function tarikhMinggu(isnin: string, bilHari = 5): string[] {
  return Array.from({ length: bilHari }, (_, i) => tambahHari(isnin, i));
}

export function hujungMinggu(iso: string): boolean {
  const [y, b, h] = iso.split("-").map(Number);
  const n = new Date(Date.UTC(y, b - 1, h)).getUTCDay();
  return n === 0 || n === 6;
}

/**
 * Program takwim yang bermakna SEKOLAH TIDAK BERSESI pada hari itu.
 *
 * Bukan setiap acara takwim ialah cuti: "MESYUARAT PANITIA" dan "UJIAN
 * SUMATIF" berlaku pada hari sekolah biasa. Hanya cuti dan perayaan yang
 * menutup sekolah, dan corak ini sengaja lebih ketat daripada kategori
 * "cuti" dalam pengumuman umum — di sana "HARI RAYA" yang disambut di
 * sekolah tetap dikira; di sini yang penting hanya sama ada sekolah buka.
 */
const RE_CUTI = /\b(CUTI|HARI RAYA|DEEPAVALI|THAIPUSAM|WESAK|KRISMAS|MAULIDUR|TAHUN BARU CINA|AWAL MUHARRAM|HARI KEBANGSAAN|HARI MALAYSIA|HARI PEKERJA|NUZUL)\b/i;

export function tarikhCuti(
  acara: { tarikh: string | null; program: string }[],
): string[] {
  const set = new Set<string>();
  for (const a of acara) {
    if (!a.tarikh) continue;
    if (!RE_CUTI.test(a.program ?? "")) continue;
    set.add(a.tarikh);
  }
  return [...set].sort();
}

/**
 * Hari ini bukan hari sekolah?
 *
 * Hujung minggu ATAU tarikh bertanda cuti dalam takwim. Tempahan pada hari
 * begini PERLU KELULUSAN pentadbir — keputusan pengguna: "untuk harian, ia
 * akan kira siapa dapat dahulu dia menang. untuk hari cuti, ia perlu
 * kelulusan pentadbir." Sebabnya bukan birokrasi: membuka sekolah pada hari
 * cuti bermakna seseorang perlu membuka pintu, dan itu bukan keputusan
 * guru yang menempah.
 */
export function perluKelulusan(tarikh: string, cuti: string[]): boolean {
  return hujungMinggu(tarikh) || cuti.includes(tarikh);
}

/* -------------------------------------------------------- status slot */

export type StatusBilik = "kosong" | "ditempah" | "tetap";

export interface SelGrid {
  tarikh: string;
  blok: BlokGrid;
  /** Bilangan bilik yang masih kosong sepenuhnya dalam blok ini. */
  kosong: number;
  jumlah: number;
  /** Sudah berlalu — tidak boleh ditempah. */
  lalu: boolean;
}

/** Tempahan yang MENGUNCI slot: bukan dibatalkan, dan bukan menunggu. */
export function tempahanAktif(senarai: Tempahan[]): Tempahan[] {
  return senarai.filter((t) => !t.dibatalkan && (t.status ?? "lulus") === "lulus");
}

function bertindihMinit(
  a: { mula: string; tamat: string },
  b: { mula: string; tamat: string },
): boolean {
  const am = keMinit(a.mula), at = keMinit(a.tamat);
  const bm = keMinit(b.mula), bt = keMinit(b.tamat);
  if (am === null || at === null || bm === null || bt === null) return false;
  return am < bt && at > bm;
}

/**
 * Status satu bilik pada satu tarikh dan satu blok.
 *
 * `tetap` didahulukan daripada `ditempah` kerana sebabnya berbeza dan guru
 * perlu tahu yang mana: waktu tetap bermakna "kelas menggunakannya setiap
 * minggu", manakala ditempah bermakna "cuba waktu lain hari ini".
 */
export function statusBilik(
  bilikId: string,
  tarikh: string,
  blok: { mula: string; tamat: string },
  tempahan: Tempahan[],
  tetap: Tetap[],
): { status: StatusBilik; tempahan?: Tempahan; tetap?: Tetap } {
  const t = tetap.find(
    (x) => x.bilik_id === bilikId && terpakaiPada(x, tarikh) && bertindihMinit(blok, x),
  );
  if (t) return { status: "tetap", tetap: t };

  const b = tempahanAktif(tempahan).find(
    (x) => x.bilik_id === bilikId && x.tarikh === tarikh && bertindihMinit(blok, x),
  );
  if (b) return { status: "ditempah", tempahan: b };

  return { status: "kosong" };
}

/** Satu sel grid: berapa bilik kosong daripada jumlah. */
export function selGrid(
  tarikh: string,
  blok: BlokGrid,
  bilik: Bilik[],
  tempahan: Tempahan[],
  tetap: Tetap[],
  hariIni: string,
): SelGrid {
  const aktif = bilik.filter((b) => b.aktif);
  let kosong = 0;
  for (const b of aktif) {
    if (statusBilik(b.id, tarikh, blok, tempahan, tetap).status === "kosong") kosong++;
  }
  return { tarikh, blok, kosong, jumlah: aktif.length, lalu: tarikh < hariIni };
}

/* ------------------------------------------------- gabung waktu dipilih */

export interface JulatWaktu {
  mula: string;
  tamat: string;
}

/**
 * Blok BERTURUTAN yang dipilih menjadi SATU tempahan.
 *
 * Guru yang memilih tiga waktu berturut mahu bilik itu untuk satu jam
 * setengah, bukan tiga tempahan bersebelahan. Tiga baris untuk satu majlis
 * menjadikan papan sukar dibaca, dan membatalkannya bermakna menekan Batal
 * tiga kali — yang bermakna seseorang akan terlupa satu.
 *
 * Blok yang TIDAK bersentuhan kekal berasingan: memilih waktu pertama dan
 * waktu terakhir hari itu bukan permintaan untuk seluruh hari.
 */
export function gabungJulat(blok: BlokGrid[]): JulatWaktu[] {
  const susun = [...blok].sort((a, b) => a.mula.localeCompare(b.mula));
  const keluar: JulatWaktu[] = [];
  for (const b of susun) {
    const akhir = keluar[keluar.length - 1];
    if (akhir && akhir.tamat === b.mula) akhir.tamat = b.tamat;
    else keluar.push({ mula: b.mula, tamat: b.tamat });
  }
  return keluar;
}

/** Kunci sel: satu rentetan supaya pemilihan boleh disimpan dalam Set. */
export function kunciSel(tarikh: string, blokId: string): string {
  return `${tarikh}|${blokId}`;
}

export function huraiKunci(kunci: string): { tarikh: string; blokId: string } {
  const [tarikh, blokId] = kunci.split("|");
  return { tarikh, blokId };
}

/** Nama hari pendek untuk kepala lajur: "Isnin 22/9". */
const PENDEK: Record<Hari, string> = {
  isnin: "Isnin", selasa: "Selasa", rabu: "Rabu", khamis: "Khamis", jumaat: "Jumaat",
};

export function labelLajur(iso: string): string {
  const [y, b, h] = iso.split("-").map(Number);
  const n = new Date(Date.UTC(y, b - 1, h)).getUTCDay();
  const nama = n === 0 ? "Ahad" : n === 6 ? "Sabtu" : PENDEK[HARI[n - 1]];
  return `${nama} ${h}/${b}`;
}
