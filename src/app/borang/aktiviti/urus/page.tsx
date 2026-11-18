import Link from "@/components/Pautan";
import { modulAktivitiSedia, senaraiAktivitiSaya, skopAktivitiSaya } from "@/lib/borang-aktiviti";
import Panel from "../Panel";
import { pengguna } from "@/lib/akses";
import { tahunSesiAktif } from "@/lib/sesi-aktif";

export const metadata = { title: "Urus Surat Akuan Penyertaan Aktiviti" };

export default async function UrusAktiviti() {
  const sedia = await modulAktivitiSedia();
  if (!sedia) {
    return <main className="mx-auto max-w-4xl p-6"><Link href="/borang/urus" className="text-sm underline">← Urus Borang Sekolah</Link><h1 className="mt-4 text-2xl font-bold">Urus Surat Akuan Penyertaan Aktiviti</h1><p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm text-[#7a5a12]">Modul borang aktiviti belum dipasang sepenuhnya. Jalankan SQL Borang Aktiviti, kemudian muat semula halaman.</p></main>;
  }
  const [senarai, skop, saya, sesi] = await Promise.all([senaraiAktivitiSaya(), skopAktivitiSaya(), pengguna(), tahunSesiAktif()]);
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:p-6"><Link href="/borang/urus" className="text-sm underline">← Urus Borang Sekolah</Link><h1 className="mt-4 text-2xl font-bold">Urus Surat Akuan Penyertaan Aktiviti</h1>{!skop.length ? (
    <div className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
      <p className="font-semibold">Akaun ini belum dilantik sebagai Pengurus Pasukan untuk sesi {sesi}.</p>
      <p className="mt-1">Log masuk sebagai: <b>{saya?.emel ?? "tidak diketahui"}</b>. Minta admin melantik akaun INI di Admin → Guru Kelas → Pengurus Pasukan (sesi {sesi}). Selepas dilantik, semua aktiviti akan kelihatan di sini.</p>
    </div>
  ) : <Panel senarai={senarai} skop={skop} />}</main>;
}
