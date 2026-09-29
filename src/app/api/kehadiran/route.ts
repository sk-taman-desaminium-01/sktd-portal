import { pengguna } from "@/lib/akses";
import { kelasBolehSunting } from "@/lib/guru-kelas";
import { statusKehadiran } from "@/lib/kehadiran-murid";

export const dynamic = "force-dynamic";

/**
 * Jambatan ke extension iSPEL (`~/Projects/ispel-kehadiran`).
 *
 * Extension memanggil laluan INI dari Chrome dengan `credentials: "include"`
 * — Clerk membaca sesi guru daripada kuki `sktd.edu.my` yang SUDAH ADA dalam
 * pelayar (guru log masuk Portal di tab lain), sama seperti mana-mana
 * halaman lain di app ini. Tiada token/API key berasingan.
 *
 * HANYA memulangkan hari yang SUDAH DISAHKAN guru kelas (`sahkanKehadiran`
 * dalam `/kawalan-kelas`) — draf yang belum disahkan tidak pernah sampai ke
 * sini, supaya iSPEL tidak diisi separuh jalan semasa seseorang masih
 * menyunting.
 */
export async function GET(req: Request) {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return Response.json(
      { ralat: "Tiada sesi log masuk. Buka portal.sktd.edu.my di tab lain dan log masuk dahulu." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const kelas = (searchParams.get("kelas") ?? "").trim();
  const tarikh = (searchParams.get("tarikh") ?? "").trim();
  if (!kelas || !/^\d{4}-\d{2}-\d{2}$/.test(tarikh)) {
    return Response.json({ ralat: "Parameter kelas/tarikh tidak sah." }, { status: 400 });
  }

  const kelasSaya = await kelasBolehSunting();
  const dibenarkan = kelasSaya === null || kelasSaya.includes(kelas.toUpperCase()) || kelasSaya.includes(kelas);
  if (!dibenarkan) {
    return Response.json({ ralat: `Anda bukan guru kelas ${kelas}.` }, { status: 403 });
  }

  const status = await statusKehadiran(tarikh, kelas);
  if (status.belumSedia) {
    return Response.json({ ralat: "Ciri Kehadiran Murid belum dipasang di portal." }, { status: 503 });
  }
  if (!status.disahkanPada) {
    return Response.json({ disahkan: false, tidakHadir: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(
    {
      disahkan: true,
      disahkanPada: status.disahkanPada,
      tidakHadir: status.tidakHadir.map((t) => ({ nama: t.nama_murid, kategori: t.kategori, sebab: t.sebab })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
