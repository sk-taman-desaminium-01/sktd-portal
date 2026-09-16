/**
 * Skrin sementara semasa halaman portal dimuat.
 *
 * KENAPA PENTING: portal dirender di pelayan, jadi ada jeda antara ketukan
 * dan halaman baharu. Tanpa skrin ini, skrin lama kekal membeku dan pengguna
 * menyangka ketukan mereka tidak berkesan — lalu mereka menekannya lagi.
 * Rangka ini muncul SERTA-MERTA, jadi jeda yang sama terasa seperti sesuatu
 * sedang berlaku dan bukan seperti sesuatu yang rosak.
 */
export default function Memuat() {
  return (
    <main className="min-h-screen bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="mx-auto mt-4 h-8 w-64 animate-pulse rounded-lg bg-white/10" />
        <div className="mx-auto mt-4 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat…</span>
    </main>
  );
}
