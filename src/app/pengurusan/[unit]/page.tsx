import { notFound } from "next/navigation";
import Link from "@/components/Pautan";
import { pengguna } from "@/lib/akses";
import { lamanPengurusan } from "@/lib/interaktif";
import { UNIT_PENGURUSAN, namaTahun, type LamanInteraktif } from "@/data/interaktif";

export const metadata = { title: "Pengurusan" };

/**
 * Kad "Pengurusan" setiap bahagian hab — laman Ruang Deploy berjenis
 * `pengurusan` bagi satu unit (cth. OPR yang diisi guru). Laman ini dalaman:
 * ia tidak disenaraikan di sktd.edu.my/interaktif.
 */
export default async function Pengurusan({ params }: { params: Promise<{ unit: string }> }) {
  const { unit } = await params;
  const u = UNIT_PENGURUSAN.find((x) => x.kod === unit);
  if (!u) notFound();

  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  let laman: LamanInteraktif[] | null = null;
  let ralat = "";
  try {
    laman = await lamanPengurusan(u.kod);
  } catch (e) {
    // Peraturan #4: jangan papar senarai kosong seolah-olah tiada laman.
    ralat = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Pengurusan · {u.nama}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
        Laman dalaman unit {u.nama}. Untuk menambah laman, terbitkan di{" "}
        <Link href="/ruang-deploy" className="font-medium text-navy-700 underline">Ruang Deploy</Link>{" "}
        dengan jenis laman <b>Pengurusan</b> dan unit <b>{u.nama}</b>.
      </p>

      {ralat || !laman ? (
        <div className="mt-6 rounded-xl border border-[#f0caca] bg-[#fbeaea] p-5 text-sm leading-relaxed text-[#8f2424]">
          <p className="font-semibold">Senarai laman tidak dapat dibaca.</p>
          <p className="mt-2 break-words font-mono text-xs">{ralat}</p>
        </div>
      ) : laman.length === 0 ? (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm text-slate-500">Belum ada laman untuk unit ini.</p>
      ) : (
        <ul className="mt-6 divide-y divide-garis rounded-2xl border border-garis bg-white">
          {laman.map((l) => (
            <li key={l.id}>
              <a
                href={`https://${l.subdomain}.sktd.edu.my/`} target="_blank" rel="noreferrer"
                className="grid gap-0.5 px-5 py-3.5 hover:bg-slate-50"
              >
                <span className="font-semibold text-navy-900">{l.tajuk}</span>
                <span className="text-xs text-slate-500">
                  {l.subjek}{l.tahun ? ` · ${namaTahun(l.tahun)}` : ""} · {l.pemilik_nama} · {l.subdomain}.sktd.edu.my
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
