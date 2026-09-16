import Link from "next/link";
import { SEKOLAH } from "@/data/sekolah";
import { slipKelas } from "@/lib/tindakan-pbd";
import { kuasaPbd, kelasBerisi, sesiSemasa } from "@/lib/pbd";
import PanelSlip from "./PanelSlip";

export const metadata = { title: "ePBD-Slip" };

/**
 * Slip PBD satu kelas — untuk guru kelas menyemak, menulis ulasan, mencetak.
 *
 * 🔴 Kebenaran per kelas dikuatkuasakan dalam `slipKelas`, bukan di sini.
 * Ini pembetulan terus kepada lubang yang tercatat dalam repo gpi:
 * `/api/slip/*` di sana tiada semakan per-kelas, dan selamat hanya kerana
 * tersembunyi dalam tab admin. Menukar `?kelas=` dalam bar alamat di sini
 * tidak membuka kelas orang lain.
 */
export default async function Slip({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; kelas?: string }>;
}) {
  const q = await searchParams;
  const tahun = Number(q.tahun ?? 0);
  const kelas = (q.kelas ?? "").trim();

  // TANPA PARAMETER, halaman ini ialah PEMILIH KELAS.
  //
  // Guru kelas membuka ePBD-Slip untuk satu sebab: mencetak slip kelasnya.
  // Menghantar mereka ke skrin "pautan tidak lengkap" bermakna mereka perlu
  // tahu URLnya dahulu — dan tiada sesiapa tahu.
  if (!Number.isInteger(tahun) || tahun < 1 || tahun > 6 || !kelas) {
    return <PilihKelas />;
  }

  const hasil = await slipKelas(tahun, kelas);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/pbd/slip" className="tiada-cetak text-sm text-slate-500 hover:text-navy-700">
        ← Pilih kelas
      </Link>

      <div className="tiada-cetak mt-3">
        <h1 className="text-2xl font-bold text-navy-800">Slip PBD {tahun} {kelas}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {hasil.ok ? `Sesi ${hasil.tahunSesi} · ${hasil.mesej}` : "Laporan pentaksiran bilik darjah."}
        </p>
      </div>

      {!hasil.ok || !hasil.baris ? (
        <p className="mt-6 rounded-xl border border-[#e9c4c4] bg-[#fdf1f1] p-5 text-sm leading-relaxed text-[#8f2b2b]">
          {hasil.mesej}
        </p>
      ) : (
        <PanelSlip
          tahun={tahun}
          kelas={kelas}
          tahunSesi={hasil.tahunSesi ?? new Date().getFullYear()}
          namaSekolah={SEKOLAH.namaPenuh}
          baris={hasil.baris}
          subjekAda={hasil.subjekAda ?? []}
        />
      )}
    </main>
  );
}


/**
 * Pemilih kelas: kelas SAYA sahaja bagi guru kelas, semua kelas bagi
 * pentadbir.
 *
 * `kelasBolehSunting()` memulangkan null bagi pentadbir — bermakna "semua
 * kelas". Nilai null itu sengaja BUKAN senarai kosong: senarai kosong
 * bermaksud "tiada kelas", dan dua keadaan itu memerlukan skrin yang
 * berbeza sama sekali.
 */
async function PilihKelas() {
  const [k, sesi] = await Promise.all([kuasaPbd(), sesiSemasa()]);
  if (!k) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const semua = sesi ? await kelasBerisi(sesi.tahun_sesi) : [];
  const milik =
    k.kelasSendiri === null
      ? semua
      : semua.filter((x) =>
          k.kelasSendiri!.some(
            (label) =>
              label.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim() ===
              `${x.tahun} ${x.kelas}`.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim(),
          ),
        );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">ePBD-Slip</h1>
      <p className="mt-1 text-sm text-slate-500">
        Semak slip kelas, tulis ulasan, dan cetak untuk diedarkan.
      </p>

      {!sesi && (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada sesi persekolahan dibuka.
        </p>
      )}

      {sesi && milik.length === 0 && (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-600">
          {k.kelasSendiri === null
            ? "Belum ada murid diimport untuk sesi ini."
            : "Anda bukan guru kelas mana-mana kelas untuk sesi ini. Pentadbir menetapkannya di skrin Guru Kelas."}
        </p>
      )}

      {milik.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {milik.map((x) => (
            <li key={`${x.tahun}-${x.kelas}`}>
              <Link
                href={`/pbd/slip?tahun=${x.tahun}&kelas=${encodeURIComponent(x.kelas)}`}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-garis bg-white p-4 hover:border-navy-700"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-navy-800">
                    {x.tahun} {x.kelas}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">{x.bil} murid</span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
