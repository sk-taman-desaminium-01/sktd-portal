import { tokenNama } from "./borang-aktiviti.ts";

/**
 * PADANAN NAMA GURU — buku sekolah lawan senarai akses portal.
 *
 * KENAPA PADANAN TEPAT TIDAK MENCUKUPI
 * Nama dalam portal datang daripada akaun e-mel sekolah, dan akaun itu
 * menambah penanda pada hujung nama:
 *
 *   portal : "SUHAILA BINTI SUHAIMI KPM-Guru"
 *   buku   : "SUHAILA BINTI SUHAIMI"
 *
 * Membandingkan dua rentetan itu memberi "tiada padanan" untuk SETIAP guru —
 * itulah sebab senarai lantikan kekal kosong walaupun nama mereka jelas ada
 * dalam senarai pilihan. Pentadbir terpaksa menetapkan 57 kelas dengan
 * tangan daripada senarai yang sistem sendiri sudah ada.
 *
 * DUA PERBEZAAN LAGI yang berlaku pada buku sebenar:
 *  · singkatan — buku menulis "M. SYAIFUL IZHAN", jadual menulis
 *    "MUHAMMAD SYAIFUL IZHAN"; begitu juga MOHD / MUHD / MD
 *  · penanda dalam kurungan — "(GB)", "(PK HEM)", "A.H"
 *
 * APA YANG SENGAJA TIDAK DILAKUKAN
 * Tiada padanan separa yang longgar. "NOR" tidak padan dengan "NORAINI", dan
 * dua nama berbeza yang berkongsi perkataan pertama TIDAK dianggap sama.
 * Padanan yang salah di sini memberi seorang guru kuasa menyunting jadual
 * dan rekod kelas orang lain — lebih buruk daripada tidak padan langsung.
 */

/** Penanda akaun dan jawatan yang bukan sebahagian nama. */
const BUANG = new Set([
  "KPM", "GURU", "KPMGURU", "PPM", "SK", "SKTD",
  "GB", "PK", "PKP", "HEM", "KOKURIKULUM", "PENTADBIRAN",
  "AH", "CIKGU", "CG", "EN", "PN", "TN", "USTAZ", "USTAZAH",
]);

/** Singkatan yang merujuk nama yang sama. */
const SERUPA: Record<string, string> = {
  M: "MUHAMMAD", MD: "MUHAMMAD", MOHD: "MUHAMMAD", MUHD: "MUHAMMAD",
  MOHAMAD: "MUHAMMAD", MOHAMMAD: "MUHAMMAD", MUHAMAD: "MUHAMMAD",
  NOR: "NUR", NOOR: "NUR",
  ABD: "ABDUL", ABDULLAH: "ABDULLAH",
};

/**
 * Nama → senarai perkataan yang boleh dibandingkan.
 *
 * Kurungan dibuang DAHULU: "(PK HEM)" mengandungi perkataan yang kelihatan
 * seperti nama kalau ia dipecahkan sebelum dibuang.
 */
export function kataNama(nama: string): string[] {
  const tanpaKurungan = (nama ?? "").replace(/\([^)]*\)/g, " ");
  return tokenNama(tanpaKurungan)
    .filter((t) => !BUANG.has(t))
    .map((t) => SERUPA[t] ?? t)
    // "BIN"/"BINTI" sudah disatukan oleh tokenNama; ia dikekalkan kerana ia
    // membezakan dua orang yang namanya serupa.
    .filter(Boolean);
}

/**
 * Adakah dua nama merujuk orang yang SAMA?
 *
 * Dua peraturan sahaja, kedua-duanya boleh dipertahankan:
 *  1. Sama persis selepas dinormalkan.
 *  2. Satu ialah AWALAN yang satu lagi, dan yang lebih pendek mempunyai
 *     sekurang-kurangnya tiga perkataan. Itu meliputi nama portal yang
 *     membawa penanda tambahan di hujung, dan nama buku yang terpotong —
 *     tanpa membenarkan "NOR ASHIKIN" padan dengan "NOR ASHIKIN BINTI HARUN"
 *     yang berbeza orang (kerana tiga perkataan pertama mesti sama).
 */
export function samaOrang(a: string, b: string): boolean {
  const x = kataNama(a);
  const y = kataNama(b);
  if (x.length === 0 || y.length === 0) return false;
  if (x.join(" ") === y.join(" ")) return true;

  const [pendek, panjang] = x.length <= y.length ? [x, y] : [y, x];
  if (pendek.length < 3) return false;
  return pendek.every((t, i) => panjang[i] === t);
}

/**
 * Nama portal yang PALING HAMPIR, untuk ditunjukkan bila tiada padanan.
 *
 * "Tiada padanan" tanpa maklumat lain menghantar pentadbir mencari sendiri
 * antara 130 nama. Menunjukkan yang paling hampir menjawab soalan sebenar
 * mereka: adakah orang ini tiada dalam senarai akses, atau namanya dieja
 * berbeza?
 *
 * Ia CADANGAN sahaja — tidak pernah digunakan untuk menetapkan sesiapa.
 */
export function palingHampir(nama: string, senarai: string[]): string | null {
  const x = kataNama(nama);
  if (x.length === 0) return null;
  let terbaik: { nama: string; kongsi: number } | null = null;
  for (const calon of senarai) {
    const y = new Set(kataNama(calon));
    const kongsi = x.filter((t) => y.has(t)).length;
    if (kongsi >= 2 && (!terbaik || kongsi > terbaik.kongsi)) terbaik = { nama: calon, kongsi };
  }
  return terbaik?.nama ?? null;
}
