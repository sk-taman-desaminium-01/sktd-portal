/**
 * Rangka (skeleton) sementara halaman dibaca dari pangkalan data.
 *
 * Peraturan keras #32: tanpa `loading.tsx`, Next menahan navigasi sehingga
 * data siap — menekan kad kelihatan seperti tiada apa berlaku, dan pengguna
 * menyangka sistem rosak ("delay ini membuatkan kita rasa server bermasalah").
 * Satu komponen dikongsi supaya setiap laluan hanya perlu tiga baris.
 */
export default function RangkaMuat({ baris = 5, lebar = "max-w-3xl" }: { baris?: number; lebar?: string }) {
  return (
    <main className={`mx-auto ${lebar} px-5 py-10`} aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: baris }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </main>
  );
}
