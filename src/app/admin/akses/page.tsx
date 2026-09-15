import Link from "next/link";
import { senaraiAkses } from "@/lib/akses-urus";
import { pengguna } from "@/lib/akses";
import { perananBolehDiberi } from "@/lib/peranan";
import PanelAkses from "./PanelAkses";

export const metadata = { title: "Senarai Akses" };

/**
 * KENAPA HALAMAN INI RINGKAS
 *
 * Dua blok pernah berada di sini dan sudah DIBUANG atas permintaan pengguna
 * (16 Sep 2026): kad emas "Admin Mutlak" dan senarai "Maksud setiap peranan".
 * Kedua-duanya memenuhkan skrin dengan teks yang dibaca sekali seumur hidup,
 * sedangkan kerja sebenar di sini ialah meluluskan orang.
 *
 * Kad mutlak itu juga membocorkan senarai emel admin mutlak kepada setiap
 * pentadbir sebelum ia dipagar. Membuangnya terus menutup kebocoran itu
 * selama-lamanya — tiada kod tinggal yang boleh tersilap dipapar semula.
 *
 * Penapisan pelayan kekal: baris peranan `admin` tidak pernah meninggalkan
 * `senaraiAkses()` untuk bukan-mutlak, jadi ia tiada dalam payload RSC.
 */
export default async function Akses() {
  const [baris, saya] = await Promise.all([senaraiAkses(), pengguna()]);

  const menunggu = baris.filter((b) => !b.dibenarkan).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman Web
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Senarai Akses</h1>
      <p className="mt-1 text-sm text-slate-500">
        Siapa boleh masuk portal, dan apa kuasa mereka.
      </p>

      {menunggu > 0 && (
        <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
          <b>{menunggu} orang tiada akses.</b> Sesiapa yang log masuk dengan emel
          rasmi sekolah muncul di sini secara automatik dan menunggu kelulusan
          anda — mereka tidak mendapat apa-apa akses sehingga anda benarkan.
        </p>
      )}

      <PanelAkses baris={baris} peranan={[...perananBolehDiberi(saya?.peranan ?? null)]} />
    </main>
  );
}
