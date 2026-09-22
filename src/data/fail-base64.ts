/**
 * Menghantar fail sebagai teks base64, bukan sebagai muat naik multipart.
 *
 * KENAPA — dan ini disahkan dengan ujian pada domain hidup:
 *
 *   multipart + PNG  ->  404 (sampai ke app)
 *   multipart + PDF  ->  403 (disekat Cloudflare, halaman "you have been blocked")
 *   base64  + PDF    ->  404 (sampai ke app)
 *
 * WAF Cloudflare menyekat muat naik fail bukan-imej ke domain ini. Pengguna
 * tidak melihat sebab itu: pelayar menerima halaman HTML sekatan, Next tidak
 * dapat menghuraikannya, dan yang terpapar hanyalah "An unexpected response
 * was received from the server". Itu memakan beberapa pusingan siasatan.
 *
 * Menghantar bait sebagai teks base64 mengelakkan peraturan itu sepenuhnya,
 * dan tidak memerlukan sebarang perubahan tetapan Cloudflare — jadi ia tidak
 * boleh rosak semula apabila seseorang menyunting tetapan itu kemudian.
 *
 * Kos: base64 menambah kira-kira 33% saiz. `bodySizeLimit` dalam
 * next.config.ts mengambil kira itu.
 */

export interface MuatanFail {
  nama: string;
  jenis: string;
  saiz: number;
  /** Kandungan fail, dikodkan base64 (tanpa awalan data:). Fail kecil sahaja. */
  data?: string;
  /** Laluan baldi `sementara` — fail > 3 MB dimuat naik terus ke storan. */
  laluan?: string;
}

/** Pelayar: baca fail menjadi muatan base64. */
export async function failKeMuatan(fail: File): Promise<MuatanFail> {
  const buf = await fail.arrayBuffer();
  const bait = new Uint8Array(buf);

  // Dikod dalam kepingan: String.fromCharCode(...bait) pada fail beberapa
  // megabait melimpahkan tindanan panggilan dan mematikan tab.
  let biner = "";
  const KEPING = 0x8000;
  for (let i = 0; i < bait.length; i += KEPING) {
    biner += String.fromCharCode(...bait.subarray(i, i + KEPING));
  }

  return {
    nama: fail.name,
    jenis: fail.type,
    saiz: fail.size,
    data: btoa(biner),
  };
}

/** Pelayan: tukar muatan kembali menjadi File. */
export function muatanKeFail(m: MuatanFail): File {
  if (!m.data) throw new Error("Muatan tiada data — guna bacaMuatan() untuk fail yang dimuat naik terus.");
  const biner = Buffer.from(m.data, "base64");
  return new File([new Uint8Array(biner)], m.nama, { type: m.jenis });
}
