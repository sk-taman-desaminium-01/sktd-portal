"use client";

import { useState } from "react";
import { tambahAkses, tukarPeranan, tarikAkses, type BarisAkses, type Hasil } from "@/lib/akses-urus";
import { NAMA_PERANAN, type Peranan } from "@/lib/peranan";

/**
 * Emel bukan MOE?
 *
 * Peraturannya sengaja SAMA dengan `domainRasmi()` dalam akses.ts — domain
 * mengandungi "moe" — tetapi ditulis semula di sini kerana fail ini komponen
 * klien dan akses.ts ialah `server-only`. Kalau peraturan itu berubah, ia
 * mesti berubah di kedua-dua tempat; ujian yang paling mudah ialah satu emel
 * yang sama mesti dilayan sama pada borang ini dan pada skrin log masuk.
 */
function luarDomain(emel: string | null): boolean {
  if (!emel) return true;
  const domain = emel.toLowerCase().split("@")[1] ?? "";
  return !domain.includes("moe");
}

export default function PanelAkses({ baris, peranan: perananPilihan }: {
  baris: BarisAkses[];
  /** Peranan yang pengguna INI dibenarkan berikan — ditentukan pelayan,
   *  supaya `admin` tidak pernah muncul sebagai pilihan kepada bukan-mutlak. */
  peranan: Peranan[];
}) {
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function jalan(f: () => Promise<Hasil>) {
    setSibuk(true);
    setHasil(await f());
    setSibuk(false);
  }

  const aktif = baris.filter((b) => b.dibenarkan);
  // Dua jenis orang berkumpul di sini, dan kita SENGAJA tidak membezakannya:
  // mereka yang baru log masuk dan belum diluluskan, dan mereka yang aksesnya
  // ditarik. Dari sudut sistem kedua-duanya sama — tiada akses — dan skema
  // tidak menyimpan perbezaan itu. Tajuknya jujur tentang perkara itu.
  const ditarik = baris.filter((b) => !b.dibenarkan);

  return (
    <>
      <section className="mt-8 rounded-xl border border-garis bg-white p-5">
        <h2 className="text-base font-bold text-navy-800">Tambah orang secara manual</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Biasanya <b>tidak perlu</b>. Sesiapa yang log masuk dengan emel MOE
          muncul sendiri di bawah, sedia untuk diluluskan. Guna borang ini
          hanya untuk menyediakan akses sebelum orang itu pernah log masuk.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
          action={(d) => jalan(() => tambahAkses(d))}
        >
          <input name="nama" required placeholder="Nama penuh"
            className="rounded-lg border border-garis px-3 py-2.5 text-sm" />
          <input name="email" required type="email" placeholder="nama@moe-dl.edu.my"
            className="rounded-lg border border-garis px-3 py-2.5 text-sm" />
          <select name="peranan" className="rounded-lg border border-garis px-3 py-2.5 text-sm">
            {perananPilihan.map((p) => (
              <option key={p} value={p}>{NAMA_PERANAN[p]}</option>
            ))}
          </select>
          <button disabled={sibuk}
            className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Tambah
          </button>
        </form>
      </section>

      {hasil && (
        <p className={`mt-4 rounded-xl p-4 text-sm ${hasil.ok ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fbeaea] text-[#a32a2a]"}`}>
          {hasil.mesej}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-base font-bold text-navy-800">Dibenarkan · {aktif.length}</h2>
        {aktif.length === 0 ? (
          <p className="mt-3 rounded-xl border border-garis bg-white p-5 text-center text-sm text-slate-500">
            Belum ada sesiapa. Admin mutlak tetap boleh masuk.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-white">
            {aktif.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-800">{b.nama}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {b.email}
                    {luarDomain(b.email) && (
                      <span className="ml-1.5 rounded bg-[#fdf3dc] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6b06]">
                        luar domain
                      </span>
                    )}
                  </span>
                </span>
                <select
                  defaultValue={b.peranan}
                  disabled={sibuk}
                  onChange={(e) => jalan(() => tukarPeranan(b.id, e.target.value as Peranan))}
                  className="rounded-lg border border-garis px-2.5 py-2 text-sm"
                >
                  {perananPilihan.map((p) => (
                    <option key={p} value={p}>{NAMA_PERANAN[p]}</option>
                  ))}
                </select>
                <button
                  disabled={sibuk}
                  onClick={() => jalan(() => tarikAkses(b.id, false))}
                  className="rounded-lg border border-[#a32a2a] px-3 py-2 text-xs font-semibold text-[#a32a2a] disabled:opacity-50"
                >
                  Tarik akses
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ditarik.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-navy-800">
            Menunggu kelulusan · {ditarik.length}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Orang yang sudah log masuk tetapi belum diberi akses, dan orang
            yang aksesnya pernah ditarik. Pilih peranan, kemudian tekan
            Benarkan. Rekod dikekalkan untuk audit — tidak pernah dipadam.
          </p>
          <ul className="mt-3 divide-y divide-garis overflow-hidden rounded-xl border border-garis bg-slate-50">
            {ditarik.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-800">{b.nama}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {b.email}
                    {luarDomain(b.email) && (
                      <span className="ml-1.5 rounded bg-[#fdf3dc] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9a6b06]">
                        luar domain
                      </span>
                    )}
                  </span>
                </span>
                {/* Peranan boleh ditetapkan SEBELUM membenarkan, jadi
                    meluluskan seorang guru ialah satu tindakan, bukan dua. */}
                <select
                  defaultValue={b.peranan}
                  disabled={sibuk}
                  onChange={(e) => jalan(() => tukarPeranan(b.id, e.target.value as Peranan))}
                  className="rounded-lg border border-garis px-2.5 py-2 text-sm"
                >
                  {perananPilihan.map((p) => (
                    <option key={p} value={p}>{NAMA_PERANAN[p]}</option>
                  ))}
                </select>
                <button
                  disabled={sibuk}
                  onClick={() => jalan(() => tarikAkses(b.id, true))}
                  className="rounded-lg bg-navy-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
                >
                  Benarkan
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
