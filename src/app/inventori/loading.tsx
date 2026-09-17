/**
 * Rangka sementara semasa halaman ini dibaca dari pangkalan data.
 *
 * KENAPA SETIAP LALUAN BERAT PERLU SATU. Tanpa `loading.tsx`, Next menahan
 * navigasi sehingga data siap — jadi menekan kad kelihatan seperti tiada
 * apa berlaku selama beberapa saat, dan pengguna menyangka sistem rosak.
 * Pengguna melaporkannya dengan tepat: "delay ini membuatkan kita rasa
 * sistem atau server bermasalah."
 *
 * Rangka ini menukar diam itu kepada maklum balas serta-merta. Ia tidak
 * menjadikan data lebih pantas — pertanyaan berkelompok yang melakukannya —
 * tetapi ia menjadikan sistem jujur tentang apa yang sedang berlaku.
 */
export default function Memuat() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </main>
  );
}
