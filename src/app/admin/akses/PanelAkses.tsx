"use client";

import { useEffect, useState } from "react";
import { tambahAkses, tukarPeranan, tarikAkses, tolakAkses, type BarisAkses, type Hasil } from "@/lib/akses-urus";
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
  // Salinan tempatan supaya skrin boleh dikemas kini serta-merta daripada
  // hasil tindakan. Ia disegerakkan semula bila pelayan menghantar prop baharu.
  const [senarai, setSenarai] = useState<BarisAkses[]>(baris);
  useEffect(() => setSenarai(baris), [baris]);

  const [hasil, setHasil] = useState<Hasil | null>(null);
  // SATU baris yang sibuk, bukan seluruh skrin.
  // Versi sebelum ini menggunakan satu boolean `sibuk` untuk semua butang,
  // jadi menekan "Benarkan" membuatkan "Tambah" berdetik serentak — dan
  // kalau tindakan pelayan melontar, `sibuk` tidak pernah dimatikan dan
  // SETIAP butang tersekat selama-lamanya.
  const [sibukId, setSibukId] = useState<string | null>(null);
  const [berjaya, setBerjaya] = useState<string | null>(null);
  // Menu tiga titik yang sedang terbuka, jika ada.
  const [menuId, setMenuId] = useState<string | null>(null);

  async function jalan(id: string, f: () => Promise<Hasil>) {
    setSibukId(id);
    setBerjaya(null);
    try {
      const r = await f();
      setHasil(r);
      if (r.ok) {
        setBerjaya(id);
        // Senarai datang BERSAMA hasil, jadi skrin dikemas kini daripada data
        // itu sendiri. Versi sebelum ini memanggil router.refresh(), yang
        // mencetuskan render semula kedua serentak dengan penyegaran yang
        // revalidatePath sudah mulakan — dan kegagalan dalam render itu
        // memantul balik sebagai "Minified React error #441" di dalam kotak
        // mesej ini, iaitu ralat yang tidak bermakna kepada sesiapa.
        if (r.senarai) setSenarai(r.senarai);
        window.setTimeout(() => setBerjaya((b) => (b === id ? null : b)), 2500);
      }
    } catch (e) {
      // Tindakan pelayan boleh melontar (rangkaian putus, ralat tidak
      // dijangka). Tanpa tangkapan ini, skrin membeku tanpa memberitahu
      // apa-apa — itu yang berlaku sebelum ini.
      setHasil({
        ok: false,
        mesej: e instanceof Error ? e.message : "Tindakan gagal. Cuba muat semula halaman.",
      });
    } finally {
      // `finally` supaya keadaan sibuk SENTIASA dimatikan, walau apa pun.
      setSibukId(null);
    }
  }

  const sibuk = sibukId !== null;

  const aktif = senarai.filter((b) => b.dibenarkan);
  // Dua jenis orang berkumpul di sini, dan kita SENGAJA tidak membezakannya:
  // mereka yang baru log masuk dan belum diluluskan, dan mereka yang aksesnya
  // ditarik. Dari sudut sistem kedua-duanya sama — tiada akses — dan skema
  // tidak menyimpan perbezaan itu. Tajuknya jujur tentang perkara itu.
  const ditarik = senarai.filter((b) => !b.dibenarkan);

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
          action={(d) => jalan("tambah", () => tambahAkses(d))}
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
          <button disabled={sibukId === "tambah"}
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
                  disabled={sibukId === b.id}
                  onChange={(e) => jalan(b.id, () => tukarPeranan(b.id, e.target.value as Peranan))}
                  className="rounded-lg border border-garis px-2.5 py-2 text-sm"
                >
                  {perananPilihan.map((p) => (
                    <option key={p} value={p}>{NAMA_PERANAN[p]}</option>
                  ))}
                </select>
                <button
                  disabled={sibukId === b.id}
                  onClick={() => jalan(b.id, () => tarikAkses(b.id, false))}
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
                  disabled={sibukId === b.id}
                  onChange={(e) => jalan(b.id, () => tukarPeranan(b.id, e.target.value as Peranan))}
                  className="rounded-lg border border-garis px-2.5 py-2 text-sm"
                >
                  {perananPilihan.map((p) => (
                    <option key={p} value={p}>{NAMA_PERANAN[p]}</option>
                  ))}
                </select>
                <button
                  disabled={sibukId === b.id}
                  onClick={() => jalan(b.id, () => tarikAkses(b.id, true))}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                    berjaya === b.id ? "bg-[#167a4b]" : "bg-navy-800 hover:bg-navy-700"
                  }`}
                >
                  {sibukId === b.id
                    ? "Sekejap…"
                    : berjaya === b.id
                      ? "✓ Dibenarkan"
                      : "Benarkan"}
                </button>

                {/* Tindakan yang jarang dan tidak boleh diundur disorok di
                    balik tiga titik — bukan diletak bersebelahan "Benarkan".
                    Dua butang bersebelahan yang melakukan perkara bertentangan
                    ialah cara paling mudah seseorang menolak orang yang
                    sepatutnya diluluskan. */}
                <span className="relative">
                  <button
                    type="button"
                    aria-label={`Tindakan lain untuk ${b.nama}`}
                    aria-expanded={menuId === b.id}
                    disabled={sibukId === b.id}
                    onClick={() => setMenuId((m) => (m === b.id ? null : b.id))}
                    className="rounded-lg border border-garis px-2.5 py-2 text-sm leading-none text-slate-500 hover:border-navy-700 hover:text-navy-700 disabled:opacity-50"
                  >
                    ⋮
                  </button>

                  {menuId === b.id && (
                    <>
                      {/* Lapisan penutup: satu ketikan di luar menutup menu. */}
                      <span
                        className="fixed inset-0 z-10"
                        aria-hidden="true"
                        onClick={() => setMenuId(null)}
                      />
                      <span className="absolute right-0 z-20 mt-1 block w-56 overflow-hidden rounded-xl border border-garis bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuId(null);
                            jalan(b.id, () => tolakAkses(b.id));
                          }}
                          className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#8f2424] hover:bg-[#fbeaea]"
                        >
                          Tolak permohonan
                          <span className="mt-0.5 block text-xs font-normal leading-snug text-slate-500">
                            Buang terus dari senarai. Kalau mereka log masuk
                            semula, permohonan baharu akan muncul.
                          </span>
                        </button>
                      </span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
