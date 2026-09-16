/** Rangka putih untuk skrin pentadbiran — lihat nota dalam ../loading.tsx. */
export default function MemuatAdmin() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-xl bg-slate-100" />
      <span className="sr-only">Memuat…</span>
    </main>
  );
}
