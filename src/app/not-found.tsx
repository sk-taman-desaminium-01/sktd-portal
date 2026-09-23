import Link from "next/link";

/** Halaman tidak wujud — pautan lama, resit tamat tempoh, atau salah taip. */
export default function TidakJumpa() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 py-12 text-center">
      <p className="text-5xl font-bold text-navy-800/20">404</p>
      <h1 className="mt-3 text-xl font-bold text-navy-800">Halaman ini tidak dijumpai</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Pautan mungkin sudah lapuk, borang sudah ditutup, atau resit sudah melebihi
        90 hari. Semak pautan dengan orang yang menghantarnya.
      </p>
      <Link
        href="/"
        className="mx-auto mt-6 inline-flex min-h-11 items-center rounded-lg bg-navy-800 px-5 text-sm font-semibold text-white"
      >
        Kembali ke Portal
      </Link>
    </main>
  );
}
