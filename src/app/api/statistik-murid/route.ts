import { sesiSemasa } from "@/lib/pbd";

export const dynamic = "force-dynamic";

/**
 * Hanya satu angka awam; nama, kelas dan No. KP tidak pernah dihantar.
 *
 * Dikira DI PANGKALAN DATA (`count=exact`, tiada baris dipindah). Dahulu
 * setiap panggilan membaca semua ±2,250 baris pendaftaran dalam 3 halaman
 * hanya untuk mengira — pada fungsi Vercel yang sejuk ia mengambil beberapa
 * saat, dan laman utama memaparkan angka binaan lama (2,176) sepanjang masa itu.
 */
export async function GET() {
  try {
    const sesi = await sesiSemasa();
    let murid = 0;
    if (sesi) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const kunci = process.env.SUPABASE_SECRET_KEY;
      const res = await fetch(
        `${url}/rest/v1/pbd_pendaftaran?select=murid_id&tahun_sesi=eq.${sesi.tahun_sesi}&status=in.(aktif,pindah_masuk,ulang)&limit=1`,
        { headers: { apikey: kunci!, Authorization: `Bearer ${kunci}`, Prefer: "count=exact" }, cache: "no-store" },
      );
      const julat = res.headers.get("content-range"); // "0-0/2252"
      const jumlah = Number(julat?.split("/")[1]);
      if (!res.ok || !Number.isInteger(jumlah)) throw new Error(`kiraan gagal ${res.status}`);
      murid = jumlah;
    }
    return Response.json(
      { murid, sesi: sesi?.tahun_sesi ?? null },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ ralat: "Statistik belum tersedia." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
