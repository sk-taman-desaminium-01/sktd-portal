import { kelasBerisi, sesiSemasa } from "@/lib/pbd";

export const dynamic = "force-dynamic";

/** Hanya satu angka awam; nama, kelas dan No. KP tidak pernah dihantar. */
export async function GET() {
  try {
    const sesi = await sesiSemasa();
    const kelas = sesi ? await kelasBerisi(sesi.tahun_sesi) : [];
    const murid = kelas.reduce((jumlah, k) => jumlah + k.bil, 0);
    return Response.json(
      { murid, sesi: sesi?.tahun_sesi ?? null },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return Response.json({ ralat: "Statistik belum tersedia." }, { status: 503 });
  }
}
