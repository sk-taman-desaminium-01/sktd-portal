/**
 * e-Keberhasilan — logik TULEN Borang Keberhasilan PBPPP (dua hala PYD ↔ PP1 ↔ PP2).
 *
 * Dipindah daripada prototaip v1 (`docs/prototaip/e-keberhasilan-v1.html`,
 * artifact Cx6Ds6XCUrb2Jj7JMAY2kE). Fail ini TIADA I/O supaya pelayan,
 * pelayar dan `scripts/uji-keberhasilan.mts` mengira perkara yang SAMA —
 * satu nombor, satu tempat mengiranya (peraturan keras #3).
 *
 * KUASA DIKUATKUASAKAN DI PELAYAN melalui `gabungIkutKuasa()`: pelayar
 * menghantar seluruh senarai bidang, tetapi pelayan hanya menyalin medan
 * yang peranan itu boleh ubah pada peringkat yang terbuka. Menyembunyikan
 * butang bukan kawalan.
 */

export const STATUS_SASARAN = ["KEKAL", "PINDA", "GUGUR", "TAMBAH"] as const;
export type StatusSasaran = (typeof STATUS_SASARAN)[number];

export type PerananEkb = "PYD" | "PP1" | "PP2";
export type KeadaanPeringkat = "kunci" | "draf" | "dihantar" | "dipulang" | "sah1" | "sah2";
export type KodPeringkat = "penetapan" | "p1" | "semakan" | "akhir";

export interface Peringkat {
  s: Exclude<KeadaanPeringkat, "kunci">;
  hantar: string | null;
  sah1: string | null;
  sah2: string | null;
  pulang: { teks: string; tarikh: string } | null;
}

export interface Sasaran {
  id: string;
  teks: string;
  p1: string;
  m1: string;
  /** Cadangan asal PYD bila PP1 mengubah markah. */
  m1_asal?: string;
  status: StatusSasaran;
  p2: string;
  m2: string;
  m2_asal?: string;
  catatan: string;
  /** Angka ukuran berasingan daripada penerangan; markah lama kekal jika belum diisi. */
  ukuran?: { sasaran: string; sasaranAkhir?: string; p1?: string; p2?: string };
}

export interface Bidang {
  id: string;
  nama: string;
  sasaran: Sasaran[];
}

export const BIDANG_TETAP = [
  { id: "ekb-pentadbiran", nama: "Pentadbiran", lama: "PENTADBIRAN" },
  { id: "ekb-kurikulum", nama: "Kurikulum", lama: "PEMBELAJARAN DAN PEMUDAHCARAAN (PDPC)" },
  { id: "ekb-hem", nama: "Hal Ehwal Murid", lama: "PENGURUSAN KELAS" },
  { id: "ekb-kokurikulum", nama: "Kokurikulum", lama: "KOKURIKULUM" },
  { id: "ekb-sampingan", nama: "Tugas Sampingan", lama: "TUGAS SAMPINGAN" },
] as const;

export const bidangTetap = (id: string) => BIDANG_TETAP.some((x) => x.id === id);

/** Bidang tetap di hadapan; sasaran lama dan bidang tambahan tidak dibuang. */
export function susunBidangTetap(bidang: Bidang[], asal: Bidang[] = []): Bidang[] {
  const dipakai = new Set<Bidang>();
  const tetap = BIDANG_TETAP.map(({ id, nama, lama }) => {
    const ada = bidang.find((x) => x.id === id) ?? bidang.find((x) => {
      const n = x.nama.trim().toUpperCase();
      return !dipakai.has(x) && (n === nama.toUpperCase() || n === lama);
    });
    if (ada) dipakai.add(ada);
    // Jika klien memadam bidang tetap, pulihkan bersama sasarannya.
    const sumber = ada ?? asal.find((x) => x.id === id);
    return { id, nama, sasaran: sumber?.sasaran ?? [] };
  });
  return [...tetap, ...bidang.filter((x) => !dipakai.has(x))];
}

export interface MaklumatPyd {
  nama: string;
  kp: string;
  gred: string;
  jawatan: string;
  tempat: string;
}

/** Bentuk borang yang dikongsi pelayan ↔ pelayar. */
export interface Borang {
  id: string;
  tahun: number;
  pyd_id: string;
  versi: number;
  pyd: MaklumatPyd;
  bidang: Bidang[];
  peringkat: Record<KodPeringkat, Peringkat>;
}

export interface InfoPeringkat {
  k: KodPeringkat;
  t: string;
  /** Bulan-hari tarikh tutup; tahun ditambah oleh `tarikhTutup()`. */
  tutup: string;
  pyd: string;
  pp: string;
}

export const PERINGKAT: InfoPeringkat[] = [
  { k: "penetapan", t: "Penetapan sasaran", tutup: "01-31", pyd: "Tulis sekurang-kurangnya 5 sasaran yang boleh diukur.", pp: "Pastikan setiap sasaran ada kata kerja, ukuran dan tujuan." },
  { k: "p1", t: "Penilaian pertama", tutup: "07-31", pyd: "Isi angka pencapaian dan muat naik bukti. Markah dikira automatik.", pp: "Banding pencapaian dengan bukti. Betulkan angka pencapaian jika perlu sebelum sahkan." },
  { k: "semakan", t: "Semakan sasaran", tutup: "08-15", pyd: "Cadangkan status KEKAL, PINDA, GUGUR atau TAMBAH. Pinda teks sasaran jika perlu.", pp: "Muktamadkan status setiap sasaran." },
  { k: "akhir", t: "Penilaian akhir", tutup: "11-30", pyd: "Isi angka pencapaian akhir dan bukti. Markah dikira automatik.", pp: "Sahkan markah akhir. Skor dimasukkan ke e-Prestasi." },
];

export const tarikhTutup = (tahun: number, i: number) => `${tahun}-${PERINGKAT[i].tutup}`;

export const LABEL_KEADAAN: Record<KeadaanPeringkat, string> = {
  kunci: "Belum dibuka", draf: "Draf PYD", dihantar: "Menunggu PP1",
  dipulang: "Dipulangkan", sah1: "Disahkan PP1", sah2: "Diperakui PP2",
};

export const MIN_SASARAN = 5;
export const HAD_TEKS = 1000;
export const HAD_ULASAN = 1000;
export const HAD_SASARAN = 40;

const SKOR_JALUR: [number, number][] = [[81, 5], [61, 4], [41, 3], [21, 2], [0, 1]];
const KATA_KERJA = /^(memastikan|mencapai|menghasilkan|meningkatkan|mengurangkan|menyelesaikan|membangunkan|melaksanakan|menyediakan|melahirkan|mewujudkan)\b/i;
const RUTIN = /\b(menghadiri|memeriksa buku|menulis rancangan|mengemas kini hrmis|mencuci|menghias|bertugas sebagai)\b/i;

export const sah = (s: KeadaanPeringkat) => s === "sah1" || s === "sah2";

export function peringkatKosong(): Record<KodPeringkat, Peringkat> {
  const p = (): Peringkat => ({ s: "draf", hantar: null, sah1: null, sah2: null, pulang: null });
  return { penetapan: p(), p1: p(), semakan: p(), akhir: p() };
}

export function sasaranKosong(id: string, status: StatusSasaran = "KEKAL"): Sasaran {
  return { id, teks: "", p1: "", m1: "", status, p2: "", m2: "", catatan: "" };
}

/** Peringkat i terkunci selagi PP1 belum mengesahkan peringkat sebelumnya. */
export function keadaan(b: Pick<Borang, "peringkat">, i: number): KeadaanPeringkat {
  if (i > 0 && !sah(keadaan(b, i - 1))) return "kunci";
  return b.peringkat[PERINGKAT[i].k].s;
}

/** Indeks peringkat semasa (0–3), atau 4 bila semua sudah disahkan. */
export function peringkatSemasa(b: Pick<Borang, "peringkat">): number {
  for (let i = 0; i < 4; i++) if (!sah(keadaan(b, i))) return i;
  return 4;
}

export const semuaSasaran = (b: Pick<Borang, "bidang">) => b.bidang.flatMap((x) => x.sasaran);
export const teksBiasa = (t: string) => String(t || "").replace(/\*\*/g, "");

export function bacaMarkah(v: string | null | undefined): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  // Sifar ialah pencapaian SAH (jalur 0–20 → skor 1). Membuangnya menaikkan purata.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "15/20" → "75"; "88,5" → "88.5"; "0" → "0"; maksimum 100; tidak sah → "". */
export function normalMarkah(v: string): string {
  const t = String(v || "").trim();
  if (!t) return "";
  const f = t.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const n = f ? (Number(f[2]) ? (Number(f[1]) / Number(f[2])) * 100 : NaN) : Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.min(100, Math.round(n * 100) / 100));
}

/** Angka ukuran boleh melebihi 100; koma perpuluhan diterima, negatif ditolak. */
export function normalAngkaUkuran(v: unknown): string {
  const t = String(v ?? "").trim().replace(",", ".");
  return t.length <= 40 && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t) && Number.isFinite(Number(t)) ? t : "";
}

export function kiraMarkahUkuran(sasaran: string, pencapaian: string | undefined): string {
  const a = normalAngkaUkuran(sasaran), b = normalAngkaUkuran(pencapaian);
  if (!a || !b || Number(a) <= 0) return "";
  return normalMarkah(String(Math.min(100, Number(b) / Number(a) * 100)));
}

/** Kiraan yang sama digunakan oleh draf, pelayan, ringkasan dan cetakan. */
export function markahSasaran(s: Sasaran, which: 1 | 2): string {
  const f = which === 1 ? "p1" : "p2";
  if (s.ukuran?.[f] === undefined) return which === 1 ? s.m1 : s.m2;
  const sasaran = which === 1 ? s.ukuran.sasaran : s.ukuran.sasaranAkhir ?? s.ukuran.sasaran;
  return kiraMarkahUkuran(sasaran, s.ukuran[f]);
}

export function pencapaianSasaran(s: Sasaran, which: 1 | 2): string {
  const f = which === 1 ? "p1" : "p2";
  const teks = s[f].trim();
  const a = normalAngkaUkuran(which === 1 ? s.ukuran?.sasaran : s.ukuran?.sasaranAkhir ?? s.ukuran?.sasaran);
  const b = normalAngkaUkuran(s.ukuran?.[f]);
  const angka = a && b && Number(a) > 0 ? `${b} daripada ${a}` : "";
  return angka && teks && angka !== teks ? `${angka}. ${teks}` : angka || teks;
}

export interface Kiraan { bil: number; jumlah: number; purata: number | null; skor: number | null }

/** Markah = capai ÷ sasaran × 100; purata → skor 1–5. GUGUR tidak dikira pada akhir. */
export function kira(which: 1 | 2, b: Pick<Borang, "bidang">): Kiraan {
  const m: number[] = [];
  for (const s of semuaSasaran(b)) {
    if (which === 2 && s.status === "GUGUR") continue;
    const x = bacaMarkah(markahSasaran(s, which));
    if (x !== null) m.push(x);
  }
  const bil = m.length;
  const jumlah = Math.round(m.reduce((a, c) => a + c, 0) * 100) / 100;
  const purata = bil ? jumlah / bil : null;
  let skor: number | null = null;
  if (purata !== null) for (const [min, sk] of SKOR_JALUR) if (purata >= min) { skor = sk; break; }
  return { bil, jumlah, purata, skor };
}

export type JenisPetunjuk = "ok" | "warn" | "bad";
export function petunjuk(t: string): [JenisPetunjuk, string][] {
  const p = teksBiasa(t).trim();
  if (!p) return [["warn", "Tulis sasaran"]];
  const h: [JenisPetunjuk, string][] = [];
  if (!KATA_KERJA.test(p)) h.push(["warn", "Mulakan dengan kata kerja hasil"]);
  if (!/\d|%/.test(p)) h.push(["bad", "Tiada ukuran (nombor atau %)"]);
  if (RUTIN.test(p)) h.push(["warn", "Mungkin kerja rutin"]);
  if (!h.length) h.push(["ok", "Boleh diukur"]);
  return h;
}

export interface Kuasa {
  penetapan: boolean; semakan: boolean;
  p1: boolean; m1: boolean; status: boolean; p2: boolean; m2: boolean;
  bukti: { p1: boolean; akhir: boolean };
  pyd: boolean;
}

/** Siapa boleh ubah apa, ikut peringkat semasa. */
export function kuasa(b: Pick<Borang, "peringkat">, peranan: PerananEkb): Kuasa {
  const st = (i: number) => keadaan(b, i);
  const buka = (i: number) => st(i) === "draf" || st(i) === "dipulang";
  const hantar = (i: number) => st(i) === "dihantar";
  const pyd = peranan === "PYD", pp1 = peranan === "PP1";
  return {
    penetapan: pyd && buka(0), semakan: pyd && buka(2),
    p1: pyd && buka(1), m1: (pyd && buka(1)) || (pp1 && hantar(1)),
    status: (pyd && buka(2)) || (pp1 && hantar(2)),
    p2: pyd && buka(3), m2: (pyd && buka(3)) || (pp1 && hantar(3)),
    bukti: { p1: pyd && buka(1), akhir: pyd && buka(3) },
    pyd,
  };
}

export const bolehTeks = (k: Kuasa, s: Pick<Sasaran, "status">) =>
  k.penetapan || (k.semakan && (s.status === "PINDA" || s.status === "TAMBAH"));

/** Senarai semak peringkat i: [lulus, label]. */
export function semakan(b: Pick<Borang, "bidang">, i: number, adaBuktiP1 = true): [boolean, string][] {
  const ss = semuaSasaran(b).filter((s) => teksBiasa(s.teks).trim());
  if (i === 0) return [
    [ss.length >= MIN_SASARAN, `${ss.length} sasaran ditulis (minimum ${MIN_SASARAN})`],
    [ss.every((s) => petunjuk(s.teks)[0][0] === "ok"), "Semua sasaran boleh diukur"],
  ];
  if (i === 1) {
    const t = ss.filter((s) => s.status !== "TAMBAH");
    return [
      [t.every((s) => teksBiasa(pencapaianSasaran(s, 1)).trim()), `Pencapaian diisi: ${t.filter((s) => teksBiasa(pencapaianSasaran(s, 1)).trim()).length}/${t.length}`],
      [t.every((s) => bacaMarkah(markahSasaran(s, 1)) !== null), `Cadangan markah: ${t.filter((s) => bacaMarkah(markahSasaran(s, 1)) !== null).length}/${t.length}`],
      [adaBuktiP1, "Sekurang-kurangnya satu bukti dimuat naik"],
    ];
  }
  if (i === 2) {
    const aktif = ss.filter((s) => s.status !== "GUGUR").length;
    return [
      [ss.every((s) => (STATUS_SASARAN as readonly string[]).includes(s.status)), "Status setiap sasaran ditetapkan"],
      [aktif >= MIN_SASARAN, `${aktif} sasaran aktif (minimum ${MIN_SASARAN})`],
    ];
  }
  const t = ss.filter((s) => s.status !== "GUGUR");
  return [
    [t.every((s) => teksBiasa(pencapaianSasaran(s, 2)).trim()), `Pencapaian akhir diisi: ${t.filter((s) => teksBiasa(pencapaianSasaran(s, 2)).trim()).length}/${t.length}`],
    [t.every((s) => bacaMarkah(markahSasaran(s, 2)) !== null), `Cadangan markah: ${t.filter((s) => bacaMarkah(markahSasaran(s, 2)) !== null).length}/${t.length}`],
  ];
}

/** Item yang MENGHALANG hantar. "Boleh diukur" dan "bukti" hanya amaran. */
export const penghalang = (b: Pick<Borang, "bidang">, i: number) =>
  semakan(b, i).filter((c, k) => !c[0] && !(i === 0 && k === 1) && !(i === 1 && k === 2));

/* ------------------------------------------------------------ peralihan --- */

export type Tindakan = "hantar" | "tarik" | "sahkan" | "pulang" | "perakui";

export const LOG_TINDAKAN: Record<Tindakan, (t: string) => string> = {
  hantar: (t) => `Menghantar ${t} kepada PP1`,
  tarik: (t) => `Menarik balik ${t}`,
  sahkan: (t) => `Mengesahkan ${t}`,
  pulang: (t) => `Memulangkan ${t} untuk pindaan`,
  perakui: (t) => `Memperakui ${t}`,
};

/**
 * Peralihan keadaan satu peringkat. Memulangkan peringkat BAHARU atau mesej
 * ralat. Tulen — pelayan memanggilnya dengan peranan yang ia sendiri tentukan.
 */
export function peralihan(
  b: Pick<Borang, "peringkat" | "bidang">, i: number, t: Tindakan, peranan: PerananEkb,
  hariIni: string, sebab = "",
): { ok: true; peringkat: Peringkat } | { ok: false; mesej: string } {
  if (!Number.isInteger(i) || i < 0 || i > 3) return { ok: false, mesej: "Peringkat tidak sah." };
  const st = keadaan(b, i), pg = { ...b.peringkat[PERINGKAT[i].k] };
  const salah = (m: string) => ({ ok: false as const, mesej: m });
  switch (t) {
    case "hantar":
      if (peranan !== "PYD") return salah("Hanya PYD boleh menghantar.");
      if (st !== "draf" && st !== "dipulang") return salah("Peringkat ini tidak terbuka untuk dihantar.");
      if (penghalang(b, i).length) return salah("Lengkapkan senarai semak dahulu.");
      return { ok: true, peringkat: { ...pg, s: "dihantar", hantar: hariIni } };
    case "tarik":
      if (peranan !== "PYD") return salah("Hanya PYD boleh menarik balik.");
      if (st !== "dihantar") return salah("Hanya boleh ditarik balik sebelum PP1 mengesahkan.");
      return { ok: true, peringkat: { ...pg, s: "draf", hantar: null } };
    case "sahkan":
      if (peranan !== "PP1") return salah("Hanya PP1 boleh mengesahkan.");
      if (st !== "dihantar") return salah("Peringkat ini belum dihantar.");
      // Semak SEMULA: PP1 boleh mengubah markah/status selepas PYD menghantar.
      if (penghalang(b, i).length) return salah("Borang tidak lengkap selepas pindaan: " + penghalang(b, i).map((c) => c[1]).join("; "));
      return { ok: true, peringkat: { ...pg, s: "sah1", sah1: hariIni, pulang: null } };
    case "pulang": {
      if (peranan !== "PP1") return salah("Hanya PP1 boleh memulangkan.");
      if (st !== "dihantar") return salah("Peringkat ini belum dihantar.");
      const teks = sebab.trim().slice(0, HAD_ULASAN);
      if (!teks) return salah("Tulis sebab dipulangkan supaya PYD tahu apa perlu dipinda.");
      return { ok: true, peringkat: { ...pg, s: "dipulang", hantar: null, pulang: { teks, tarikh: hariIni } } };
    }
    case "perakui":
      if (peranan !== "PP2") return salah("Hanya PP2 boleh memperakui.");
      if (st !== "sah1") return salah("PP1 belum mengesahkan peringkat ini.");
      if (penghalang(b, i).length) return salah("Borang tidak lengkap: " + penghalang(b, i).map((c) => c[1]).join("; "));
      return { ok: true, peringkat: { ...pg, s: "sah2", sah2: hariIni } };
  }
}

/* ------------------------------------------------- gabung ikut kuasa ----- */

const potong = (v: unknown, n = HAD_TEKS) => String(v ?? "").slice(0, n);
const statusSah = (v: unknown): StatusSasaran =>
  (STATUS_SASARAN as readonly string[]).includes(String(v)) ? (v as StatusSasaran) : "KEKAL";

/**
 * Salin HANYA medan yang `peranan` boleh ubah daripada `baru` ke atas `lama`.
 *
 * Inilah satu-satunya pintu tulisan bidang/sasaran. Struktur (tambah, padam,
 * susun semula bidang & sasaran) hanya pada penetapan oleh PYD; semasa
 * semakan PYD boleh MENAMBAH sasaran berstatus TAMBAH tetapi tidak memadam.
 * Sasaran yang tidak dikenali dalam `lama` diabaikan kecuali struktur dibenarkan.
 *
 * PP1 yang mengubah markah: cadangan PYD dikekalkan dalam `m1_asal`/`m2_asal`
 * kali pertama sahaja, supaya jejak kekal walaupun PP1 menukar berulang kali.
 */
export function gabungIkutKuasa(
  lama: Bidang[], baru: Bidang[], k: Kuasa, peranan: PerananEkb, idBaru: () => string,
): { bidang: Bidang[]; perubahan: string[] } {
  const perubahan: string[] = [];
  const indeks = new Map<string, Sasaran>();
  // Id sasaran baharu daripada pelayar DIKEKALKAN jika bentuknya selamat dan
  // belum digunakan — supaya pelayar tidak perlu memadankan semula id.
  const dipakai = new Set<string>();
  const idUntuk = (cadang: unknown) => {
    const c = String(cadang ?? "");
    const id = /^[A-Za-z0-9_-]{4,40}$/.test(c) && !indeks.has(c) && !dipakai.has(c) ? c : idBaru();
    dipakai.add(id);
    return id;
  };
  for (const x of lama) for (const s of x.sasaran) indeks.set(s.id, s);

  const satu = (asal: Sasaran | undefined, n: Sasaran, struktur: boolean): Sasaran | null => {
    if (!asal && !struktur && !k.semakan) return null;
    const s: Sasaran = asal ? { ...asal } : sasaranKosong(idUntuk(n.id), k.penetapan ? "KEKAL" : "TAMBAH");
    const baharu = !asal;
    // Status DAHULU: menukar KEKAL→PINDA dan meminda teks dalam satu simpanan
    // mesti berjaya — kalau teks dinilai dahulu, pindaan itu hilang senyap.
    if (k.status && !baharu) {
      const st = statusSah(n.status);
      if (st !== s.status && (st !== "TAMBAH" || s.status === "TAMBAH")) {
        perubahan.push(`Menukar status sasaran daripada ${s.status} kepada ${st}`);
        s.status = st;
      }
    }
    if (bolehTeks(k, s) || baharu) s.teks = potong(n.teks);
    if (k.p1 && s.status !== "TAMBAH") s.p1 = potong(n.p1);
    if (k.p2 && s.status !== "GUGUR") s.p2 = potong(n.p2);
    if (n.ukuran && typeof n.ukuran === "object") {
      const u = { ...(s.ukuran ?? { sasaran: "" }) };
      const sebelum = JSON.stringify(u);
      const pertamaTerbuka = (k.p1 || k.m1) && s.status !== "TAMBAH";
      const akhirTerbuka = (k.p2 || k.m2) && s.status !== "GUGUR";
      // Sasaran pertama dibekukan selepas dinilai; pindaan akhir tidak mengubah P1.
      if (k.penetapan || (k.semakan && s.status === "TAMBAH") || (pertamaTerbuka && (k.p1 || !u.p1 || !(Number(u.sasaran) > 0)))) {
        u.sasaran = normalAngkaUkuran(n.ukuran.sasaran);
      }
      if (n.ukuran.sasaranAkhir !== undefined && (k.penetapan || (k.semakan && (s.status === "PINDA" || s.status === "TAMBAH"))
        || (akhirTerbuka && (k.p2 || !u.p2 || !(Number(u.sasaranAkhir ?? u.sasaran) > 0))))) {
        u.sasaranAkhir = normalAngkaUkuran(n.ukuran.sasaranAkhir);
      }
      if (pertamaTerbuka && n.ukuran.p1 !== undefined) u.p1 = normalAngkaUkuran(n.ukuran.p1);
      if (akhirTerbuka && n.ukuran.p2 !== undefined) u.p2 = normalAngkaUkuran(n.ukuran.p2);
      if (s.ukuran || sebelum !== JSON.stringify(u)) s.ukuran = u;
    }
    for (const f of ["m1", "m2"] as const) {
      const boleh = f === "m1" ? k.m1 && s.status !== "TAMBAH" : k.m2 && s.status !== "GUGUR";
      if (!boleh) continue;
      const which = f === "m1" ? 1 : 2;
      const automatik = s.ukuran?.[which === 1 ? "p1" : "p2"] !== undefined;
      const v = automatik ? markahSasaran(s, which) : normalMarkah(String(n[f] ?? ""));
      if (v === s[f]) continue;
      if (peranan === "PP1") {
        if (s[`${f}_asal`] === undefined) s[`${f}_asal`] = s[f];
        perubahan.push(`Mengubah markah ${f === "m1" ? "P1" : "akhir"} daripada ${s[f] || "–"} kepada ${v || "–"}`);
      }
      s[f] = v;
    }
    // Catatan PYD hanya bila ada peringkat terbuka untuknya — bukan selepas hantar/sah.
    if (k.penetapan || k.p1 || k.semakan || k.p2) s.catatan = potong(n.catatan, 300);
    return s;
  };

  // Struktur penuh hanya semasa penetapan.
  if (k.penetapan) {
    const tetap = lama.some((x) => bidangTetap(x.id));
    const cadangan = tetap ? susunBidangTetap(baru, lama) : baru;
    // Id datang dari pelayar: nyahdua, kalau tidak dua baris berkongsi id
    // dan ulasan/bukti melekat pada kedua-duanya.
    let kira = 0;
    const idBidang = new Set<string>(), idSasaran = new Set<string>();
    // Borang lama mungkin sudah ada 12 bidang sendiri sebelum bidang tetap ditambah.
    const bidang = cadangan.slice(0, Math.max(12, lama.length)).map((x) => {
      let id = String(x.id || "").slice(0, 40);
      if (!id || idBidang.has(id)) id = idBaru();
      idBidang.add(id);
      return {
        id,
        nama: bidangTetap(id) ? x.nama : potong(x.nama, 160).toUpperCase(),
        sasaran: (Array.isArray(x.sasaran) ? x.sasaran : [])
          .filter((n) => n && typeof n === "object" && !idSasaran.has(n.id) && (idSasaran.add(n.id), ++kira <= HAD_SASARAN))
          .map((n) => satu(indeks.get(n.id), n, true))
          .filter((s): s is Sasaran => !!s),
      };
    });
    return { bidang, perubahan };
  }

  // Selain penetapan: susunan & bidang kekal seperti `lama`.
  const ikutId = new Map<string, Sasaran>();
  for (const x of baru) for (const s of x.sasaran) ikutId.set(s.id, s);
  let jumlah = semuaSasaran({ bidang: lama }).length;
  const bidang = lama.map((x) => {
    const sasaran = x.sasaran.map((s) => {
      const n = ikutId.get(s.id);
      return n ? (satu(s, n, false) ?? s) : s;
    });
    if (k.semakan) {
      const bx = baru.find((y) => y.id === x.id);
      for (const n of bx?.sasaran ?? []) {
        if (indeks.has(n.id) || jumlah >= HAD_SASARAN) continue;
        const s = satu(undefined, n, false);
        if (s && teksBiasa(s.teks).trim()) { sasaran.push(s); jumlah++; perubahan.push("Menambah sasaran TAMBAH"); }
      }
    }
    return { ...x, sasaran };
  });
  return { bidang, perubahan };
}

/* ------------------------------------------------------------- ringkasan --- */

export interface RingkasanPyd {
  cur: number;
  st: KeadaanPeringkat | "selesai";
  lewat: boolean;
  tunggu1: number[];
  tunggu2: number[];
  k1: Kiraan;
  k2: Kiraan;
  bilSasaran: number;
}

export function ringkasan(b: Pick<Borang, "peringkat" | "bidang" | "tahun">, hariIni: string): RingkasanPyd {
  const cur = peringkatSemasa(b);
  const st = cur < 4 ? keadaan(b, cur) : "selesai";
  const lewat = cur < 4 && (st === "draf" || st === "dipulang") && hariIni > tarikhTutup(b.tahun, cur);
  const idx = [0, 1, 2, 3];
  return {
    cur, st, lewat,
    tunggu1: idx.filter((i) => keadaan(b, i) === "dihantar"),
    tunggu2: idx.filter((i) => keadaan(b, i) === "sah1"),
    k1: kira(1, b), k2: kira(2, b),
    bilSasaran: semuaSasaran(b).length,
  };
}

/** Pecah `**tebal**` kepada segmen; komponen memaparkannya tanpa HTML mentah. */
export function segmenTebal(t: string): { teks: string; tebal: boolean }[] {
  return String(t || "").split("**").map((teks, i) => ({ teks, tebal: i % 2 === 1 })).filter((x) => x.teks);
}
