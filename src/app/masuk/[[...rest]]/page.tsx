import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { SEKOLAH } from "@/data/sekolah";
import { AWALAN, aset } from "@/lib/laluan";

export const metadata = { title: "Log Masuk" };

/**
 * Pintu masuk portal — padanan `skrinPintuMasuk()` dalam mockup.
 *
 * INILAH muka depan sebenar portal bagi kebanyakan orang: sesiapa yang belum
 * log masuk akan dialih ke sini, jadi ia mesti kelihatan seperti sebahagian
 * sekolah, bukan borang Clerk kosong pada latar putih.
 *
 * Reka bentuk sama dengan hab: gradien navy, logo 72px, tajuk dengan
 * perkataan kedua emas, pembahagi emas.
 */
export default function Masuk() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-navy-900 bg-[radial-gradient(120%_70%_at_50%_0%,#17406f,var(--color-navy-900)_60%)] px-5 py-14 text-white">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <Image src={aset("/logo-sktd.png")} alt="" width={72} height={72} priority className="w-16 sm:w-[72px]" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Portal <span className="text-emas-muda">Kakitangan</span>
        </h1>
        <div className="my-4 h-0.5 w-36 bg-gradient-to-r from-transparent via-emas to-transparent" />
        <p className="text-sm leading-relaxed text-white/75">
          Bahagian ini untuk guru dan kakitangan {SEKOLAH.nama} sahaja. Sila log
          masuk dengan emel rasmi <b>@moe-dl.edu.my</b>.
        </p>
      </div>

      <div className="mt-8 w-full max-w-md">
        {/* `path` dan `routing` MESTI dinyatakan secara eksplisit apabila
            `basePath` digunakan.
            Tanpa ia, Clerk menyimpulkan laluannya daripada router Next — yang
            melaporkan "/masuk" TANPA basePath — sedangkan URL pelayar ialah
            "/portal/masuk". Ketidakpadanan itu menyebabkan komponen berhenti
            secara SENYAP: kotak akarnya dirender, tetapi kosong. Skrin log
            masuk kelihatan normal kecuali tiada borang langsung, dan tiada
            ralat konsol untuk menunjukkan sebabnya.
            Semua URL di sini ialah URL PELAYAR, jadi setiap satu membawa
            awalan. */}
        <SignIn
          routing="path"
          path={`${AWALAN}/masuk`}
          signUpUrl={`${AWALAN}/masuk`}
          fallbackRedirectUrl={`${AWALAN}/`}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-xl",
            },
          }}
        />
      </div>

      <p className="mt-8 max-w-md text-center text-xs leading-relaxed text-white/45">
        Seluruh portal dilindungi di lapisan pelayan — menaip URL terus tanpa
        log masuk tetap ditolak.
      </p>

      <a
        href="https://sktd.edu.my"
        className="mt-6 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
      >
        ← Laman Sekolah
      </a>
    </main>
  );
}
