import "server-only";
import { HAD_BAIT } from "@/data/had-fail";

/**
 * Muat naik fail ke Supabase Storage.
 *
 * Bucket `web-media` dicipta sendiri pada muat naik pertama supaya tiada
 * langkah persediaan manual yang boleh terlupa. Ia AWAM untuk dibaca —
 * gambar ini memang untuk dipapar di laman sekolah — tetapi hanya boleh
 * DITULIS dengan kunci rahsia, iaitu hanya dari pelayan ini.
 *
 * ⚠️ Jangan sekali-kali muat naik gambar MURID ke sini tanpa Surat Akuan
 * Ibu Bapa (SS KPM Bil. 9/2024). Bucket ini boleh dibaca sesiapa yang tahu
 * URLnya — tiada "separa awam".
 */

const BUCKET = "web-media";

/**
 * Had saiz. Diimport dari `@/data/had-fail` supaya pelayan, pelayar dan
 * `bodySizeLimit` dalam next.config.ts semuanya merujuk nombor yang SAMA.
 */
export const HAD_SAIZ = HAD_BAIT;

export const JENIS_DIBENARKAN = [
  "image/png", "image/jpeg", "image/webp", "image/avif", "application/pdf",
  // Dokumen yang boleh dibaca sistem — jadual waktu, Buku Pengurusan.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/vnd.ms-excel.sheet.macroEnabled.12",                          // .xlsm
  "text/csv",
  // Sesetengah pelayar menghantar CSV sebagai text/plain.
  "text/plain",
];

function tetapan() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rahsia = process.env.SUPABASE_SECRET_KEY;
  if (!url || !rahsia) {
    throw new Error("[storan] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SECRET_KEY tiada.");
  }
  return { url, rahsia };
}

/** Cipta bucket jika belum ada. Selamat dipanggil berulang kali. */
async function pastikanBucket() {
  const { url, rahsia } = tetapan();
  const kepala = { apikey: rahsia, Authorization: `Bearer ${rahsia}` };

  const semak = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: kepala, cache: "no-store" });
  if (semak.ok) return;

  const cipta = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...kepala, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: BUCKET, name: BUCKET, public: true,
      file_size_limit: HAD_SAIZ, allowed_mime_types: JENIS_DIBENARKAN,
    }),
  });
  // 409 = sudah wujud (perlumbaan antara dua muat naik serentak) — itu bukan ralat.
  if (!cipta.ok && cipta.status !== 409) {
    throw new Error(`[storan] gagal cipta bucket: ${cipta.status} ${await cipta.text()}`);
  }
}

/** Nama fail selamat: tiada laluan, tiada aksara pelik, tiada perlanggaran. */
export function namaSelamat(asal: string): string {
  const titik = asal.lastIndexOf(".");
  const sambungan = titik > 0 ? asal.slice(titik + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const nama = (titik > 0 ? asal.slice(0, titik) : asal)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "fail";
  // Cap masa + rawak: dua orang memuat naik "gambar.jpg" tidak boleh
  // menimpa kerja satu sama lain.
  const cap = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${nama}-${cap}.${sambungan}`;
}

/**
 * Semak jenis dan saiz tanpa menyimpan apa-apa.
 *
 * Diperlukan kerana bukan setiap fail yang dimuat naik disimpan: jadual
 * waktu dibaca dalam ingatan dan dilupakan, jadi ia tidak melalui
 * `muatNaik()` dan tidak akan mewarisi semakan di dalamnya.
 *
 * Pulangkan mesej ralat, atau null jika fail itu diterima.
 */
export function semakFail(fail: File): string | null {
  if (!JENIS_DIBENARKAN.includes(fail.type) && fail.type !== "") {
    return `Jenis fail tidak dibenarkan: ${fail.type}.`;
  }
  if (fail.size > HAD_SAIZ) {
    return `Fail terlalu besar (${(fail.size / 1048576).toFixed(1)} MB). Had ${HAD_SAIZ / 1048576} MB.`;
  }
  return null;
}

export interface HasilMuatNaik {
  url: string;
  laluan: string;
  saiz: number;
  nama: string;
}

export async function muatNaik(fail: File, folder = "am"): Promise<HasilMuatNaik> {
  if (!JENIS_DIBENARKAN.includes(fail.type)) {
    throw new Error(`Jenis fail tidak dibenarkan: ${fail.type || "tidak diketahui"}.`);
  }
  if (fail.size > HAD_SAIZ) {
    throw new Error(`Fail terlalu besar (${(fail.size / 1048576).toFixed(1)} MB). Had 10 MB.`);
  }

  await pastikanBucket();
  const { url, rahsia } = tetapan();
  const laluan = `${folder}/${namaSelamat(fail.name)}`;

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${laluan}`, {
    method: "POST",
    headers: {
      apikey: rahsia,
      Authorization: `Bearer ${rahsia}`,
      "Content-Type": fail.type,
      "x-upsert": "false",
    },
    body: new Uint8Array(await fail.arrayBuffer()),
  });
  if (!res.ok) {
    // Peraturan #4: jangan telan kegagalan.
    throw new Error(`[storan] muat naik gagal: ${res.status} ${await res.text()}`);
  }

  return {
    url: `${url}/storage/v1/object/public/${BUCKET}/${laluan}`,
    laluan,
    saiz: fail.size,
    nama: fail.name,
  };
}

export async function buangFail(laluan: string): Promise<void> {
  const { url, rahsia } = tetapan();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${laluan}`, {
    method: "DELETE",
    headers: { apikey: rahsia, Authorization: `Bearer ${rahsia}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`[storan] gagal buang: ${res.status} ${await res.text()}`);
  }
}
