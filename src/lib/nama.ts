/**
 * Memadankan nama orang antara SUMBER yang menulisnya berlainan cara.
 *
 * Tiga sumber, tiga gaya, dan tiada satu pun boleh diubah:
 *
 *   · Buku Pengurusan  — "AHMAD RAFLI NOOR BIN SHAHARDIN"
 *   · Akaun KPM (Clerk) — "KPM-Guru Ahmad Rafli Noor Bin Shahardin"
 *   · Senarai akses     — apa sahaja yang guru taip sendiri
 *
 * Awalan "KPM-Guru" itu bukan tekaan: ia ditetapkan oleh akaun Google KPM dan
 * TIADA dalam buku pengurusan. Tanpa membuangnya, setiap guru yang log masuk
 * gagal dipadankan dengan namanya dalam buku — dan kegagalan itu SENYAP:
 * senarai nampak betul, cuma tiada apa yang bersambung.
 *
 * ⚠️ PADANAN INI TIDAK PERNAH AUTOMATIK-SAHKAN. Ia mencadangkan; manusia
 * mengesahkan. Nama Melayu berkongsi banyak komponen ("MOHD", "BINTI",
 * "NUR"), jadi padanan yang yakin 90% masih boleh silap orang — dan silap
 * orang dalam senarai jawatan sekolah ialah kesilapan yang memalukan.
 */

/**
 * Awalan dan akhiran yang dilekatkan sistem, bukan sebahagian nama.
 *
 * Ditulis sebagai corak supaya "KPM-Guru", "KPM Guru" dan "KPMGuru" semuanya
 * ditangkap — tiga ejaan yang sama munasabah, dan kita tidak mengawal mana
 * satu yang datang.
 */
const TEMPELAN = [
  /^kpm[\s\-_]*guru\b/i,
  /^kpm[\s\-_]*(murid|staf|staff|admin)\b/i,
  /\bkpm[\s\-_]*guru$/i,
  /^(cikgu|cg|ustaz|ustazah|tn|pn|en|encik|puan|tuan|dr|dato'?|datin|haji|hajjah|hj|hjh)\b\.?\s+/i,
];

/** Gelaran yang sah SEBAHAGIAN nama Melayu — JANGAN buang. */
const KEKAL = /\b(bin|binti|bt|a\/l|a\/p|al|tuan|nik|wan|syed|sharifah|raja|megat)\b/i;

/**
 * Bersihkan nama untuk PAPARAN — buang tempelan sistem, kekalkan nama.
 *
 * "tuan" muncul dalam kedua-dua senarai di atas, dan itu disengajakan:
 * "Tuan Rohadi bin Tuan Kechik" ialah nama sebenar, manakala "Tuan Ahmad"
 * sebagai gelaran hormat bukan. Tempelan hanya dibuang dari HADAPAN, dan
 * hanya sekali — jadi "Tuan Rohadi bin Tuan Kechik" kehilangan sebanyak-
 * banyaknya gelaran hadapannya, bukan nama keluarganya.
 */
export function namaBersih(mentah: string): string {
  let t = (mentah ?? "").replace(/\s+/g, " ").trim();
  for (const corak of TEMPELAN) {
    const sebelum = t;
    t = t.replace(corak, "").trim();
    // Kalau membuangnya meninggalkan hampir tiada apa, ia bukan tempelan.
    if (t.length < 3) { t = sebelum; break; }
  }
  return t.trim();
}

/**
 * Kunci padanan: huruf dan nombor sahaja, huruf besar, tanpa gelaran.
 *
 * Kurungan dibuang kerana buku sebenar menulis "IRNAWATI BINTI JOHAR (AKP)" —
 * catatan jawatan yang melekat pada nama.
 *
 * PENANDA NASAB DISERAGAMKAN. Orang yang sama ditulis "BINTI" dalam buku,
 * "BT" dalam senarai eOperasi, dan "BTE" dalam e-mel — dan tanpa
 * penyeragaman ini, ketiga-tiganya menjadi tiga orang berlainan. Itu bukan
 * andaian: ia muncul dalam Buku Pengurusan sekolah ini sendiri.
 */
export function kunciNama(mentah: string): string {
  return namaBersih(mentah)
    .replace(/\([^)]*\)/g, " ")
    .toUpperCase()
    // TANDA KOMA ATAS DIBUANG, BUKAN DITUKAR JADI RUANG.
    //
    // Buku yang sama menulis "MAT SO'OD" dalam senarai jawatankuasa dan
    // "MAT SOOD" dalam senarai nama guru — orang yang SAMA. Menukar koma
    // atas menjadi ruang memecahkannya menjadi "SO OD": dua perkataan yang
    // tidak sepadan dengan apa-apa, dan guru itu berakhir dalam "Guru &
    // Kakitangan Lain" walaupun dia Ketua Panitia. Aksara koma atas ada
    // tiga bentuk dalam PDF (' ’ `) dan ketiga-tiganya dibuang di sini.
    .replace(/['\u2018\u2019\u02BC`]+/g, "")
    .replace(/[^A-Z0-9\/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w === "BT" || w === "BTE" || w === "BINTE" ? "BINTI" : w === "B" ? "BIN" : w))
    .join(" ");
}

/**
 * Perkataan bermakna dalam satu nama — gelaran dan huruf tunggal dibuang.
 *
 * HJ/HJH/HAJI/HAJJAH dibuang di sini walaupun ia dikekalkan untuk paparan.
 * Sebabnya khusus dan nyata: senarai nama guru menulis "NOOR RUWAIDA BINTI
 * HJ MOHD ARIFIN" sedangkan setiap jawatankuasa menulisnya tanpa "HJ".
 * Gelaran itu bukan penanda identiti — dua ejaan itu orang yang sama, dan
 * mengiranya sebagai perkataan bermakna menjatuhkan skor padanan di bawah
 * ambang.
 */
function kata(nama: string): string[] {
  return kunciNama(nama)
    .split(" ")
    .filter(
      (w) => w.length > 1 && !/^(BIN|BINTI|BT|AL|A\/L|A\/P|HJ|HJH|HAJI|HAJJAH)$/.test(w),
    );
}

export interface Padanan {
  /** 0–100. */
  skor: number;
  /** Cukup yakin untuk DICADANGKAN kepada manusia? Bukan untuk auto-sahkan. */
  cadang: boolean;
}

/**
 * Bandingkan dua nama.
 *
 * Kaedah: berapa banyak perkataan bermakna yang dikongsi, dibahagi dengan
 * nama yang lebih PENDEK. Membahagi dengan yang lebih panjang menghukum nama
 * penuh yang dipadankan dengan nama pendek dalam buku ("NOR HASFARADZI BIN
 * HASHIM A.H" vs "NOR HASFARADZI BIN HASHIM AMER HAMZAH") — dan itu padanan
 * yang BETUL.
 */
export function bandingNama(a: string, b: string): Padanan {
  const ka = kunciNama(a);
  const kb = kunciNama(b);
  if (!ka || !kb) return { skor: 0, cadang: false };
  if (ka === kb) return { skor: 100, cadang: true };

  const wa = kata(a);
  const wb = kata(b);
  if (wa.length === 0 || wb.length === 0) return { skor: 0, cadang: false };

  const setB = new Set(wb);
  const kongsi = wa.filter((w) => setB.has(w)).length;
  const skor = Math.round((kongsi / Math.min(wa.length, wb.length)) * 100);

  // Dua perkataan dikongsi ialah ambang minimum. Satu sahaja bermakna
  // "MOHD" atau "NUR" — perkataan yang dikongsi ratusan guru.
  return { skor, cadang: kongsi >= 2 && skor >= 80 };
}

/** Calon terbaik dari satu senarai. Null bila tiada yang cukup yakin. */
export function cariPadanan<T>(
  nama: string,
  senarai: T[],
  ambilNama: (x: T) => string,
): { item: T; skor: number } | null {
  let terbaik: { item: T; skor: number } | null = null;
  let keduaTerbaik = 0;
  for (const x of senarai) {
    const { skor, cadang } = bandingNama(nama, ambilNama(x));
    if (!cadang) continue;
    if (!terbaik || skor > terbaik.skor) {
      keduaTerbaik = terbaik?.skor ?? 0;
      terbaik = { item: x, skor };
    } else if (skor > keduaTerbaik) keduaTerbaik = skor;
  }
  // SERI = TIDAK PASTI. Dua guru yang sama-sama padan 100% bermakna nama itu
  // berulang dalam sekolah; memilih salah satu secara senyap ialah cara
  // seorang guru mewarisi jawatan orang lain.
  if (terbaik && keduaTerbaik === terbaik.skor) return null;
  return terbaik;
}
