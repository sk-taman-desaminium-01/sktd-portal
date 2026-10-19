import Link from "@/components/Pautan";
import { pengguna } from "@/lib/akses";
import { senaraiLaman } from "@/lib/interaktif";
import PanelRuangDeploy from "./PanelRuangDeploy";

export const metadata = { title: "Ruang Deploy" };

/**
 * Ruang Deploy — guru menerbitkan game atau nota interaktif HTML ke
 * `<nama>.sktd.edu.my`, dan ia dipapar kepada umum di sktd.edu.my/interaktif.
 *
 * Log masuk portal SUDAH memastikan emel MOE; halaman ini tidak bertanya lagi.
 */
export default async function RuangDeploy() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof senaraiLaman>> | null = null;
  let ralat = "";
  try {
    data = await senaraiLaman();
  } catch (e) {
    // Peraturan #4: jangan papar senarai kosong seolah-olah tiada laman.
    ralat = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Ruang Deploy</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
        Terbitkan game atau nota interaktif anda ke alamat sendiri di
        sktd.edu.my. Laman yang diterbitkan dipapar kepada umum di{" "}
        <a href="https://sktd.edu.my/interaktif/" target="_blank" rel="noreferrer" className="font-medium text-navy-700 underline">
          Ruang Pembelajaran Interaktif
        </a>.
      </p>

      {ralat || !data ? (
        <div className="mt-6 rounded-xl border border-[#f0caca] bg-[#fbeaea] p-5 text-sm leading-relaxed text-[#8f2424]">
          <p className="font-semibold">Senarai laman tidak dapat dibaca.</p>
          <p className="mt-1.5">
            Jika ini kali pertama, pentadbir perlu menjalankan
            <code className="mx-1 rounded bg-white/70 px-1">supabase/ruang-deploy.sql</code>
            dalam Supabase dahulu.
          </p>
          <p className="mt-2 break-words font-mono text-xs">{ralat}</p>
        </div>
      ) : (
        <PanelRuangDeploy namaAwal={saya.nama ?? ""} saya={data.saya} semua={data.semua} bulanIni={data.bulanIni} />
      )}
    </main>
  );
}
