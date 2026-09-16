import Link from "next/link";
import { senaraiPos } from "@/lib/cms";
import { pengguna } from "@/lib/akses";
import { boleh } from "@/lib/peranan";

export const metadata = { title: "Urus Laman Web" };

/**
 * Tapak urus laman — padanan `webAdminSenarai()` dalam mockup.
 *
 * Aduan pengguna (16 Sep 2026): skrin ini dahulu hanya senarai POS. Mockup
 * sentiasa mempunyai lebih daripada itu — barisan pentadbir, pustaka media
 * dan Buku Pengurusan — tetapi skrin-skrin itu tiada jalan masuk, jadi
 * seolah-olah ia tidak wujud. Baris alat di bawah ialah jalan masuk itu.
 *
 * Draf ditunjukkan dengan JELAS supaya tiada silap terbit.
 */
export default async function Admin() {
  const [pos, saya] = await Promise.all([senaraiPos(), pengguna()]);
  const draf = pos.filter((p) => p.status === "draf").length;
  const bolehAkses = boleh(saya?.peranan ?? null, "urus_akses");
  const bolehGuruKelas = boleh(saya?.peranan ?? null, "urus_guru_kelas");
  const bolehPengurusan = boleh(saya?.peranan ?? null, "urus_pengurusan");

  const ALAT: { href: string; nama: string; ringkas: string; ikon: string }[] = [
    { href: "/admin/pos", nama: "Pos baharu", ikon: "✎",
      ringkas: "Tulis pengumuman atau aktiviti." },
    { href: "/admin/pentadbir", nama: "Barisan Pentadbir", ikon: "👤",
      ringkas: "Nama, jawatan, urutan dan gambar di halaman Tentang." },
    { href: "/admin/media", nama: "Pustaka Media", ikon: "🖼️",
      ringkas: "Muat naik gambar dan PDF, salin URLnya." },
    { href: "/admin/jadual", nama: "Jadual Waktu", ikon: "🗓️",
      ringkas: "Jadual setiap kelas. Ibu bapa melihatnya di laman sekolah." },
    ...(bolehGuruKelas
      ? [{ href: "/admin/guru-kelas", nama: "Guru Kelas", ikon: "🧑‍🏫",
           ringkas: "Tetapkan siapa guru kelas. Mereka menyunting jadual kelas itu." }]
      : []),
    ...(bolehPengurusan
      ? [{ href: "/admin/pengurusan", nama: "Buku Pengurusan", ikon: "📕",
           ringkas: "Muat naik buku tahunan; sistem membaca dan menyenaraikan isinya." },
         { href: "/admin/carta", nama: "Carta Organisasi", ikon: "🗂️",
           ringkas: "Dari Guru Besar hingga guru dan kakitangan. Boleh disunting dan dimuat turun." }]
      : []),
    ...(bolehGuruKelas
      ? [{ href: "/admin/pbd", nama: "Urus ePBD", ikon: "📊",
           ringkas: "Import murid dan tetapkan guru subjek yang mengisi TP." }]
      : []),
    ...(bolehAkses
      ? [{ href: "/admin/akses", nama: "Senarai Akses", ikon: "🔑",
           ringkas: "Siapa boleh masuk portal, dan apa peranan mereka." }]
      : []),
  ];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Urus Laman Web</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pos.length} pos · {draf} draf
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-navy-700"
        >
          ← Portal
        </Link>
      </div>

      {/* Baris alat — semua tapak urus laman, bukan pos sahaja. */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {ALAT.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className="flex h-full gap-3 rounded-xl border border-garis bg-white p-4 hover:border-navy-700"
            >
              <span aria-hidden="true" className="text-lg leading-none">{a.ikon}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-navy-800">{a.nama}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">
                  {a.ringkas}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-base font-bold text-navy-800">Pos</h2>

      {pos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">
          Belum ada pos. Tekan “Pos baharu” untuk mula.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
          {pos.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/pos?id=${p.id}`} className="flex items-start gap-3 p-4 hover:bg-navy-50">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-800">{p.tajuk}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {p.jenis} · /{p.slug}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {p.keutamaan === "segera" && (
                    <span className="rounded bg-[#fbeaea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a32a2a]">
                      Segera
                    </span>
                  )}
                  {/* Draf mesti kelihatan sangat berbeza — silap di sini
                      bermakna sesuatu terbit sebelum masanya. */}
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "terbit"
                        ? "bg-[#e5f4ec] text-[#167a4b]"
                        : "bg-[#fdf3dc] text-[#9a6b06]"
                    }`}
                  >
                    {p.status}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Pos <b>draf</b> tidak kelihatan di laman awam — pelawat mendapat 404.
        Pos <b>terbit</b> mencetuskan binaan semula laman awam; ia muncul dalam 1–2 minit.
      </p>
    </main>
  );
}
