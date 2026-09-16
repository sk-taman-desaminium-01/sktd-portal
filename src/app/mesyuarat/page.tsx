import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { barisIkutKod, dokumenTerkini } from "@/lib/pengurusan";

export const metadata = { title: "Mesyuarat" };

/**
 * Takwim mesyuarat — dibaca terus dari Buku Pengurusan.
 *
 * Kad Mesyuarat dahulu ialah tapak pembinaan kosong. Ia kosong bukan kerana
 * datanya tiada: takwim mesyuarat setahun penuh SUDAH ada dalam Buku
 * Pengurusan, cuma tiada apa yang membacanya.
 *
 * SKOPNYA SENGAJA PENDEK (keputusan pengguna, 17 Sep 2026): senarai panggilan
 * mesyuarat sahaja. TIADA minit curai, TIADA nama orang yang bertindak.
 * Minit mengandungi perbincangan dalaman, dan menyimpannya dalam portal
 * ialah keputusan berasingan yang belum dibuat — jadi kad ini menjawab satu
 * soalan yang jelas dan berhenti di situ.
 *
 * Hanya seksyen yang admin SAHKAN dipapar. Seksyen draf duduk dalam pangkalan
 * data tanpa memberi kesan — jadi buku yang tersalah baca tidak pernah sampai
 * ke skrin guru sehingga seseorang membacanya dan menekan Sahkan.
 */
export default async function Mesyuarat() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const [data, dok] = await Promise.all([barisIkutKod("mesyuarat"), dokumenTerkini()]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Mesyuarat</h1>

      {!data || data.baris.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Takwim mesyuarat belum ada.</p>
          <p className="mt-1.5">
            Ia datang dari Buku Pengurusan. Pentadbir perlu memuat naik buku
            tahunan dan <b>mengesahkan</b> seksyen takwim mesyuarat di skrin
            Buku Pengurusan.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            {data.baris.length.toLocaleString("ms-MY")} baris dari Buku Pengurusan
            {dok ? ` edisi ${dok.tahun}` : ""}.
          </p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-garis bg-white">
            <table className="w-full min-w-[40rem] text-sm">
              {data.lajur.length > 0 && (
                <thead className="bg-navy-50 text-left">
                  <tr>
                    {data.lajur.map((l, i) => (
                      <th key={i} className="px-3 py-2 font-semibold text-navy-800">{l}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-garis">
                {data.baris.map((b, r) => (
                  <tr key={r} className="align-top">
                    {b.map((c, n) => <td key={n} className="px-3 py-2">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        Halaman ini menyenaraikan <b>panggilan mesyuarat</b> sahaja, terus dari
        takwim Buku Pengurusan — jadi ia berubah sendiri apabila edisi baharu
        disahkan. Minit curai dan senarai tindakan tidak disimpan di sini.
      </p>
    </main>
  );
}
