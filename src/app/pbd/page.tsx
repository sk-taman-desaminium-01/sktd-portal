import Link from "next/link";
import { kuasaPbd, sesiSemasa, kelasBerisi } from "@/lib/pbd";

export const metadata = { title: "ePBD" };

/**
 * ePBD — satu pintu, dua kerja.
 *
 * Hab memaparkan SATU kad ePBD (keputusan pengguna, 17 Sep 2026). Ia pernah
 * dipecah kepada dua kad, dan itu menjadikan hab serabut: dua kad yang
 * namanya hampir sama memaksa guru membaca kedua-duanya sebelum memilih.
 *
 * Pembahagian kerja tetap wujud — ia cuma berlaku DI SINI, satu skrin ke
 * dalam, di mana guru sudah tahu mereka berada di ePBD:
 *
 *   · ePBD-Guru — guru SUBJEK mengisi TP dan gred, berkali-kali sepanjang
 *     penggal, satu subjek satu kelas pada satu masa
 *   · ePBD-Slip — guru KELAS mencetak slip, sekali dua setahun, satu kelas
 *
 * Setiap pilihan membawa kiraannya sendiri, jadi guru nampak sekali pandang
 * mana yang berkenaan dengan mereka — dan yang tidak berkenaan berkata
 * dengan jujur kenapa ia kosong.
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

  const semua = sesi ? await kelasBerisi(sesi.tahun_sesi) : [];
  const nampakSemua = k.kelasSendiri === null;
  const kelasSaya = nampakSemua
    ? semua
    : semua.filter((x) =>
        k.kelasSendiri!.some((label) => ringkas(label) === ringkas(`${x.tahun} ${x.kelas}`)),
      );

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Pilihan
          href="/pbd/guru"
          tajuk="ePBD-Guru"
          ringkasan={k.penuh ? "Pilih mana-mana kelas dan subjek untuk semak atau isi." : "Isi Tahap Penguasaan dan gred sumatif bagi subjek yang anda ajar."}
          bilangan={k.penuh ? semua.length : k.tugas.length}
          unit={k.penuh ? "kelas (semua)" : "subjek"}
          kosong="Anda belum ditugaskan mengajar mana-mana subjek untuk sesi ini."
        />
        <Pilihan
          href="/pbd/slip"
          tajuk="ePBD-Slip"
          ringkasan="Semak slip kelas, tulis ulasan, dan cetak untuk diedarkan."
          bilangan={kelasSaya.length}
          unit={nampakSemua ? "kelas (semua)" : "kelas"}
          kosong="Anda bukan guru kelas mana-mana kelas untuk sesi ini."
        />
      </div>

      <p className="mt-8 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        <b>Dua perkara sahaja yang masuk ke slip:</b> Tahap Penguasaan (TP 1–6)
        dan gred sumatif (A–E). Kedua-duanya ditaip guru subjek sendiri —
        sistem tidak pernah mengiranya automatik, kerana tahap penguasaan
        ialah pertimbangan profesional guru.
      </p>
    </main>
  );
}

function Pilihan({
  href, tajuk, ringkasan, bilangan, unit, kosong,
}: {
  href: string;
  tajuk: string;
  ringkasan: string;
  bilangan: number;
  unit: string;
  kosong: string;
}) {
  const ada = bilangan > 0;
  return (
    <Link
      href={href}
      className={`flex h-full flex-col rounded-xl border bg-white p-5 transition hover:border-navy-700 ${
        ada ? "border-garis" : "border-dashed border-slate-300"
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-base font-bold text-navy-800">{tajuk}</span>
        {ada && (
          <span className="rounded bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-700">
            {bilangan} {unit}
          </span>
        )}
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{ringkasan}</span>
      {/* Bahagian yang kosong berkata KENAPA ia kosong. Kad kosong tanpa
          sebab menjadikan guru menyangka sistem rosak. */}
      {!ada && <span className="mt-2 block text-xs leading-relaxed text-slate-400">{kosong}</span>}
      <span aria-hidden="true" className="mt-3 block text-sm font-semibold text-navy-700">
        Buka →
      </span>
    </Link>
  );
}

function ringkas(t: string): string {
  return t.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}
