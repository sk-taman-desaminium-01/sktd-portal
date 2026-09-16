import Link from "next/link";
import { kuasaPbd, sesiSemasa, labelKelas } from "@/lib/pbd";
import { namaSubjek } from "@/data/subjek";

export const metadata = { title: "ePBD" };

/**
 * Halaman masuk ePBD — apa yang SAYA perlu buat.
 *
 * Bukan senarai semua kelas sekolah. Guru subjek membuka skrin ini untuk
 * mencari kelasnya sendiri antara 57; memaparkan semuanya bermakna mereka
 * mengimbas senarai panjang setiap kali, dan memilih kelas yang salah
 * sekurang-kurangnya sekali.
 *
 * Dua bahagian, kerana seorang guru boleh jadi kedua-duanya:
 *   · Subjek saya  — kelas yang saya ajar, untuk mengisi TP
 *   · Kelas saya   — kelas yang saya jadi guru kelas, untuk slip
 */
export default async function Pbd() {
  const [k, sesi] = await Promise.all([kuasaPbd(), sesiSemasa()]);

  if (!k) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">
          ← Portal
        </Link>
      </main>
    );
  }

  const kelasSaya = k.kelasSendiri;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">
        ← Portal
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-navy-800">ePBD</h1>
        {sesi && (
          <p className="text-sm text-slate-500">
            Sesi {sesi.tahun_sesi}
            {sesi.status === "tutup" && (
              <span className="ml-2 rounded bg-[#fdf3dc] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6b06]">
                Ditutup
              </span>
            )}
          </p>
        )}
      </div>

      {!sesi && (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada sesi persekolahan dibuka. Pentadbir perlu membuka sesi dan
          mengimport senarai murid dahulu.
        </p>
      )}

      {/* ---------- Subjek yang saya ajar ---------- */}
      <h2 className="mt-8 text-base font-bold text-navy-800">Subjek saya</h2>
      {k.tugas.length === 0 ? (
        <p className="mt-3 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-600">
          Anda belum ditugaskan mengajar mana-mana subjek untuk sesi ini.
          Pentadbir menetapkannya di skrin <b>Urus ePBD</b>.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {k.tugas.map((t) => (
            <li key={`${t.subjek}-${t.tahun}-${t.kelas}`}>
              <Link
                href={`/pbd/isi?tahun=${t.tahun}&kelas=${encodeURIComponent(t.kelas)}&subjek=${encodeURIComponent(t.subjek)}`}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-garis bg-white p-4 hover:border-navy-700"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-navy-800">
                    {namaSubjek(t.subjek)}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    {labelKelas(t.tahun, t.kelas)}
                  </span>
                </span>
                <span aria-hidden="true" className="shrink-0 text-slate-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Kelas saya ---------- */}
      <h2 className="mt-10 text-base font-bold text-navy-800">Kelas saya</h2>
      <p className="mt-1 text-sm text-slate-500">
        Semak slip, tulis ulasan, dan cetak untuk diedarkan.
      </p>

      {kelasSaya !== null && kelasSaya.length === 0 ? (
        <p className="mt-3 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-600">
          Anda bukan guru kelas mana-mana kelas untuk sesi ini.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {(kelasSaya ?? []).map((label) => {
            const [tahun, ...sisa] = label.split(" ");
            const kelas = sisa.join(" ");
            return (
              <li key={label}>
                <Link
                  href={`/pbd/slip?tahun=${encodeURIComponent(tahun)}&kelas=${encodeURIComponent(kelas)}`}
                  className="flex h-full items-center justify-between gap-3 rounded-xl border border-garis bg-white p-4 hover:border-navy-700"
                >
                  <span className="font-semibold text-navy-800">{label}</span>
                  <span aria-hidden="true" className="shrink-0 text-slate-300">→</span>
                </Link>
              </li>
            );
          })}
          {kelasSaya === null && (
            <li className="rounded-xl border border-garis bg-white p-4 text-sm text-slate-600">
              Anda pentadbir — buka mana-mana kelas dari{" "}
              <Link href="/admin/pbd" className="font-semibold underline">Urus ePBD</Link>.
            </li>
          )}
        </ul>
      )}

      <p className="mt-8 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        <b>TP ditaip guru sendiri.</b> Sistem memaparkan bilangan SP yang
        dikuasai sebagai panduan, tetapi tidak pernah menetapkan TP secara
        automatik — tahap penguasaan ialah pertimbangan profesional guru,
        bukan purata.
      </p>
    </main>
  );
}
