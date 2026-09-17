import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { boleh } from "@/lib/peranan";
import { senaraiDokumen, seksyenDokumen } from "@/lib/pengurusan";
import { JENIS_SEKSYEN, VERSI_PENGHURAI } from "@/data/seksyen-pengurusan";
import NaikPengurusan from "./NaikPengurusan";
import SeksyenTersimpan from "./SeksyenTersimpan";

export const metadata = { title: "Buku Pengurusan" };

/**
 * Buku Pengurusan Tahunan — muat naik, semak, sahkan.
 *
 * INI SUMBER NAMA DAN TARIKH BAGI SELURUH PORTAL. Senarai guru kelas, ketua
 * panitia, takwim dan takwim mesyuarat semuanya sudah ada dalam buku ini;
 * tanpa skrin ini, setiap satunya perlu ditaip semula dan disegerakkan
 * dengan tangan setiap tahun.
 *
 * ⚠️ Edisi tahun depan TIDAK semestinya sama dengan tahun ini. Sistem
 * mengenal seksyen melalui TAJUKNYA, bukan nombor muka surat, dan admin boleh
 * membetulkan setiap jenis yang tersilap. Tiada satu pun laluan dalam skrin
 * ini yang mengandaikan "guru kelas ada di muka 73".
 */
export default async function BukuPengurusan() {
  const saya = await pengguna();
  if (!boleh(saya?.peranan ?? null, "urus_pengurusan")) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <p className="mt-2 text-sm text-slate-600">
          Buku Pengurusan diurus oleh pentadbir sekolah.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const dokumen = await senaraiDokumen();
  const dengan = await Promise.all(
    dokumen.map(async (d) => ({ dokumen: d, seksyen: await seksyenDokumen(d.id) })),
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Buku Pengurusan</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Muat naik buku pengurusan tahunan; sistem membacanya dan mengeluarkan
        senarai yang boleh disemak.
      </p>

      <div className="mt-5 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        <p>
          Sistem mengenal seksyen melalui <b>tajuknya</b>, bukan nombor muka
          surat — jadi buku tahun depan yang disusun semula tetap boleh dibaca.
          Kalau satu seksyen dikesan sebagai jenis yang salah, tukar jenisnya
          sendiri di bawah.
        </p>
        <ul className="mt-2.5 space-y-1 text-xs text-navy-800/80">
          {JENIS_SEKSYEN.map((j) => (
            <li key={j.kod}>
              <b>{j.nama}</b> — {j.suapan}
            </li>
          ))}
        </ul>
      </div>

      <NaikPengurusan />

      <h2 className="mt-10 text-base font-bold text-navy-800">Edisi tersimpan</h2>
      {dengan.length === 0 ? (
        <p className="mt-4 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">
          Belum ada edisi disimpan.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {dengan.map(({ dokumen: d, seksyen }) => (
            <li key={d.id} className="rounded-xl border border-garis bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold text-navy-800">
                  Edisi {d.tahun}
                  {d.versi > 1 && (
                    <span className="ml-2 rounded bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-700">
                      versi {d.versi}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {d.nama_fail} · {d.muka ?? "?"} muka · dimuat naik {tarikh(d.created_at)}
                  {d.oleh ? ` oleh ${d.oleh}` : ""}
                </p>
              </div>
              {d.versi_penghurai !== VERSI_PENGHURAI && (
                <p className="mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
                  <b>Edisi ini dibaca oleh versi penghurai yang lebih lama.</b>{" "}
                  Baris di bawah ialah hasil bacaan pada hari ia dimuat naik —
                  pembetulan yang dibuat selepas itu tidak menyentuhnya. Kalau
                  anda melihat baris yang pelik, <b>muat naik semula fail yang
                  sama</b>: edisi lama tidak dipadam, jadi anda boleh
                  membandingkan dan membuang yang lama selepas berpuas hati.
                </p>
              )}

              <div className="mt-3">
                <SeksyenTersimpan
                  dokumenId={d.id}
                  namaFail={d.nama_fail}
                  seksyen={seksyen.map((s) => ({
                    id: s.id, kod: s.kod, tajuk: s.tajuk, muka: s.muka,
                    keyakinan: s.keyakinan, paparan: s.paparan, status: s.status,
                    amaran: s.amaran, bilBaris: s.bil_baris ?? 0,
                  }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Edisi lama <b>tidak dipadam</b> apabila edisi baharu dimuat naik — buku
        pengurusan berubah sepanjang tahun, dan sekolah perlu boleh melihat apa
        yang berubah. Ini berbeza dengan jadual waktu, yang failnya tidak
        disimpan langsung.
      </p>
    </main>
  );
}

function tarikh(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}
