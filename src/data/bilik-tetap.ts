import { HARI, NAMA_HARI, type Hari, type Jadual } from "./jadual-jenis.ts";
import { keMinit, type Tempahan } from "./bilik.ts";

/**
 * TEMPAHAN TETAP — waktu yang sudah "dimiliki" sebelum sesiapa menempah.
 *
 * DUA MASALAH, SATU BENTUK.
 *
 * 1. Pentadbir mahu menanda waktu secara pukal: "Makmal 2 tidak boleh
 *    ditempah setiap Selasa 8–10 pagi." Mencipta empat puluh baris tempahan
 *    untuk setahun ialah cara yang salah — ia menjadi lapuk, ia menyusahkan
 *    untuk dibatalkan, dan ia mengaburkan sebab waktu itu tertutup.
 *
 * 2. Kelas Pendidikan Moral menggunakan Makmal 2. Waktu itu SUDAH tertulis
 *    dalam jadual waktu sekolah; menaipnya semula sebagai tempahan bermakna
 *    dua sumber kebenaran yang akan berselisih pada hari jadual berubah.
 *
 * Kedua-duanya ialah perkara yang sama: satu PERATURAN BERULANG, bukan satu
 * peristiwa. Yang dari jadual waktu dijana semula setiap kali jadual dimuat
 * naik; yang ditulis pentadbir kekal sehingga mereka membuangnya.
 *
 * SUBJEK → BILIK ialah PEMETAAN, bukan kod tetap. Pengguna menyebutnya
 * terus: "jika suatu hari nanti moral diminta ubah pula tempat belajar di
 * kelas lain, maka admin boleh adjust tempat." Menanam "PM → Makmal 2" ke
 * dalam kod bermakna permintaan itu menjadi kerja pengaturcara.
 */

export type SumberTetap = "manual" | "jadual";

export interface Tetap {
  id: string;
  bilik_id: string;
  /** Hari minggu: "isnin" … "jumaat". */
  hari: Hari;
  mula: string;
  tamat: string;
  sebab: string;
  sumber: SumberTetap;
  /** Kod subjek, bila ia datang dari jadual waktu. */
  subjek: string | null;
  /** Kelas yang menggunakannya, bila diketahui. */
  kelas: string | null;
  /** Julat tarikh. Kosong bermakna sepanjang tahun. */
  dari_tarikh: string | null;
  hingga_tarikh: string | null;
  aktif: boolean;
}

/** "2026-09-17" → "khamis". Null untuk Sabtu dan Ahad. */
export function hariTarikh(iso: string): Hari | null {
  const [y, b, h] = iso.split("-").map(Number);
  if (!y || !b || !h) return null;
  const n = new Date(Date.UTC(y, b - 1, h)).getUTCDay(); // 0 = Ahad
  // HARI bermula pada Isnin (indeks 0), jadi Ahad (0) dan Sabtu (6) tiada.
  if (n === 0 || n === 6) return null;
  return HARI[n - 1];
}

/** Adakah peraturan tetap ini terpakai pada tarikh tersebut? */
export function terpakaiPada(t: Tetap, tarikh: string): boolean {
  if (!t.aktif) return false;
  if (hariTarikh(tarikh) !== t.hari) return false;
  if (t.dari_tarikh && tarikh < t.dari_tarikh) return false;
  if (t.hingga_tarikh && tarikh > t.hingga_tarikh) return false;
  return true;
}

/**
 * Peraturan tetap yang berlanggar dengan satu permohonan tempahan.
 *
 * Sempadan bersentuhan BUKAN pertindihan, sama seperti tempahan biasa:
 * 09:00–10:00 dan 10:00–11:00 hidup bersama.
 */
export function tetapBerlanggar(
  minta: { bilik_id: string; tarikh: string; mula: string; tamat: string },
  senarai: Tetap[],
): Tetap | null {
  const m = keMinit(minta.mula);
  const t = keMinit(minta.tamat);
  if (m === null || t === null) return null;

  for (const x of senarai) {
    if (x.bilik_id !== minta.bilik_id) continue;
    if (!terpakaiPada(x, minta.tarikh)) continue;
    const xm = keMinit(x.mula);
    const xt = keMinit(x.tamat);
    if (xm === null || xt === null) continue;
    if (m < xt && t > xm) return x;
  }
  return null;
}

/** Ayat yang memberitahu KENAPA waktu itu tertutup, bukan sekadar bahawa ia tertutup. */
export function sebabTetap(t: Tetap): string {
  const bila = `${NAMA_HARI[t.hari]} ${t.mula}–${t.tamat}`;
  if (t.sumber === "jadual") {
    return (
      `${bila} sudah digunakan oleh kelas ${t.subjek ?? ""}` +
      (t.kelas ? ` (${t.kelas})` : "") +
      " mengikut jadual waktu sekolah."
    );
  }
  return `${bila} ditutup oleh pentadbir — ${t.sebab}`;
}

/* ------------------------------------------------- dijana dari jadual waktu */

export interface TetapDijana {
  bilik_id: string;
  hari: Hari;
  mula: string;
  tamat: string;
  subjek: string;
  kelas: string;
  sebab: string;
}

/**
 * Baca jadual waktu dan hasilkan waktu tertutup bagi subjek yang dipetakan.
 *
 * SLOT BERTURUTAN DIGABUNG. Pendidikan Moral selalunya dua waktu berturut;
 * menghasilkan dua sekatan 30 minit yang bersentuhan dan bukan satu sekatan
 * sejam bermakna skrin memapar dua baris untuk satu kelas, dan guru
 * tertanya sama ada ada jurang di antaranya.
 */
export function daripadaJadual(
  jadual: Jadual,
  peta: Record<string, string>,
): TetapDijana[] {
  const subjekDipeta = new Set(Object.keys(peta));
  if (subjekDipeta.size === 0) return [];

  // Setiap kelas mempunyai SET WAKTUnya sendiri — rehat berperingkat
  // bermakna waktu ke-3 Tahun 1 bukan waktu ke-3 Tahun 5. Jadi waktu
  // sebenar dicari melalui set kelas itu, bukan melalui satu senarai am.
  const setIkutId = new Map(jadual.set.map((s) => [s.id, s]));

  const kasar: TetapDijana[] = [];

  for (const [namaKelas, kelas] of Object.entries(jadual.kelas)) {
    const tahun = Number(namaKelas.split(" ")[0]);
    const set = setIkutId.get(jadual.tahunSet[tahun] ?? "");
    if (!set) continue;
    const waktuIkutId = new Map(set.senarai.map((w) => [w.id, w]));

    for (const hari of HARI) {
      const slotHari = kelas.hari[hari];
      if (!slotHari) continue;

      for (const [idWaktu, slot] of Object.entries(slotHari)) {
        const kod = (slot?.subjek ?? "").toUpperCase();
        if (!subjekDipeta.has(kod)) continue;
        const w = waktuIkutId.get(idWaktu);
        if (!w || w.rehat) continue;

        kasar.push({
          bilik_id: peta[kod],
          hari,
          mula: w.mula,
          tamat: w.tamat,
          subjek: kod,
          kelas: namaKelas,
          sebab: `Kelas ${kod} — ${namaKelas}`,
        });
      }
    }
  }

  return gabungBersebelahan(kasar);
}

/** Gabungkan blok yang bersentuhan bagi bilik, hari, subjek dan kelas yang sama. */
function gabungBersebelahan(senarai: TetapDijana[]): TetapDijana[] {
  const kunci = (x: TetapDijana) => `${x.bilik_id}|${x.hari}|${x.subjek}|${x.kelas}`;
  const peta = new Map<string, TetapDijana[]>();
  for (const x of senarai) {
    const a = peta.get(kunci(x)) ?? [];
    a.push(x);
    peta.set(kunci(x), a);
  }

  const keluar: TetapDijana[] = [];
  for (const kumpulan of peta.values()) {
    const susun = [...kumpulan].sort((a, b) => a.mula.localeCompare(b.mula));
    let semasa = { ...susun[0] };
    for (let i = 1; i < susun.length; i++) {
      if (susun[i].mula <= semasa.tamat) {
        // Bersentuhan atau bertindih — panjangkan.
        if (susun[i].tamat > semasa.tamat) semasa.tamat = susun[i].tamat;
      } else {
        keluar.push(semasa);
        semasa = { ...susun[i] };
      }
    }
    keluar.push(semasa);
  }
  return keluar.sort(
    (a, b) =>
      HARI.indexOf(a.hari) - HARI.indexOf(b.hari) ||
      a.mula.localeCompare(b.mula) ||
      a.kelas.localeCompare(b.kelas),
  );
}

/**
 * Tempahan sedia ada yang BERLANGGAR dengan peraturan tetap baharu.
 *
 * Dipapar sebelum peraturan itu disimpan. Menutup waktu yang sudah ditempah
 * orang lain tanpa memberitahu sesiapa bermakna dua kumpulan tiba di bilik
 * yang sama — tepat masalah yang modul ini wujud untuk hapuskan.
 */
export function tempahanTerjejas(
  dijana: { bilik_id: string; hari: Hari; mula: string; tamat: string }[],
  tempahan: Tempahan[],
): Tempahan[] {
  return tempahan.filter((t) => {
    if (t.dibatalkan) return false;
    const hari = hariTarikh(t.tarikh);
    if (!hari) return false;
    const tm = keMinit(t.mula);
    const tt = keMinit(t.tamat);
    if (tm === null || tt === null) return false;
    return dijana.some((d) => {
      if (d.bilik_id !== t.bilik_id || d.hari !== hari) return false;
      const dm = keMinit(d.mula);
      const dt = keMinit(d.tamat);
      return dm !== null && dt !== null && tm < dt && tt > dm;
    });
  });
}
