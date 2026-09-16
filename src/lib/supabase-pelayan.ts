import "server-only";

/**
 * Klien Supabase untuk TULIS — hanya di pelayan.
 *
 * KENAPA KUNCI RAHSIA DIPERLUKAN DI SINI:
 * `migrasi-sktd.sql` menghidupkan RLS pada web_pos dengan SATU dasar sahaja —
 * awam boleh BACA pos terbit. Tiada dasar INSERT/UPDATE, jadi kunci publishable
 * tidak boleh menulis apa-apa. Itu memang disengajakan: laman awam tidak
 * sepatutnya boleh menulis.
 *
 * CMS pula perlu menulis, jadi ia guna kunci rahsia yang memintas RLS —
 * TETAPI hanya selepas Clerk mengesahkan pengguna, dan hanya di pelayan.
 *
 * `server-only`: kalau fail ini tersilap ditarik ke bundle klien, BINAAN GAGAL.
 * Itu menghalang kunci rahsia daripada sampai ke pelayar — kunci itu memintas
 * RLS sepenuhnya, jadi satu kebocoran mendedahkan No. KP dan gred semua murid.
 *
 * Peraturan keras #9: klien dicipta DALAM fungsi, bukan pada skop modul —
 * env hanya wujud masa request.
 */
export function klienTulis() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rahsia = process.env.SUPABASE_SECRET_KEY;
  if (!url || !rahsia) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SECRET_KEY tiada. " +
        "CMS tidak boleh menulis tanpa kedua-duanya.",
    );
  }
  return {
    async minta(laluan: string, init?: RequestInit) {
      const res = await fetch(`${url}/rest/v1/${laluan}`, {
        ...init,
        headers: {
          apikey: rahsia,
          Authorization: `Bearer ${rahsia}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        // Peraturan #4: jangan telan. Admin mesti nampak kegagalan sebenar.
        throw new Error(`[supabase] ${res.status} ${await res.text()}`);
      }
      // BADAN KOSONG BUKAN JSON.
      //
      // `Prefer: return=minimal` menyebabkan PostgREST memulangkan 201
      // dengan badan KOSONG — bukan 204. Memanggil `res.json()` ke atasnya
      // melontar "SyntaxError: Unexpected end of JSON input", dan ralat itu
      // sampai kepada pengguna sebagai kegagalan menyimpan sedangkan
      // tulisan itu BERJAYA. Diukur pada muat naik Buku Pengurusan:
      // seksyen tersimpan, tetapi skrin berkata gagal.
      if (res.status === 204) return null;
      const teks = await res.text();
      if (teks.trim() === "") return null;
      try {
        return JSON.parse(teks);
      } catch {
        // Badan yang bukan JSON dan bukan kosong bermakna sesuatu di
        // hadapan Supabase menjawab (WAF, proksi). Laporkan seadanya.
        throw new Error(`[supabase] jawapan bukan JSON: ${teks.slice(0, 200)}`);
      }
    },
  };
}
