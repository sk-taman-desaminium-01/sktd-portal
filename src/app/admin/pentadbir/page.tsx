import Link from "next/link";
import { senaraiPentadbir } from "@/lib/pentadbir";
import PanelPentadbir from "./PanelPentadbir";

export const metadata = { title: "Barisan Pentadbir" };

/** Padanan `webAdminPentadbir()` dalam mockup yang dibekukan. */
export default async function Pentadbir() {
  const senarai = await senaraiPentadbir();
  const tanpaGambar = senarai.filter((o) => !o.gambar).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Barisan Pentadbir</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Nama dan gambar yang dipapar di halaman <b>Tentang Sekolah</b> laman awam.
      </p>

      <p className="mt-5 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        {tanpaGambar > 0 ? (
          <>
            <b>{tanpaGambar} daripada {senarai.length} belum ada gambar</b> — huruf
            awal nama dipapar sementara. Ia kemas, jadi laman tetap boleh terbit
            sebelum gambar siap.
          </>
        ) : (
          <>Semua pentadbir sudah ada gambar.</>
        )}
      </p>

      {/* Ini bukan nota hiasan. Seorang Guru Besar yang menukar namanya di
          sini perlu tahu bahawa jawatankuasa menyusul sendiri — kalau tidak
          mereka akan pergi membetulkannya dengan tangan, atau lebih teruk,
          tertanya-tanya kenapa ia berubah. */}
      <p className="mt-3 rounded-xl border border-[#c6e2d1] bg-[#eef8f2] p-4 text-sm leading-relaxed text-[#167a4b]">
        <b>Menukar nama di sini mengemas kini Buku Pengurusan sendiri.</b>{" "}
        Apabila seorang Guru Besar atau Penolong Kanan bertukar, setiap baris
        jawatankuasa yang menamakan orang lama akan menyusul secara automatik —
        tiada butang untuk ditekan, dan tiada senarai untuk disemak satu demi
        satu.
        <span className="mt-1.5 block text-[13px] text-[#2f7d57]">
          Nama khas kekal utuh: <i>Bilik i-Shabariah</i> tidak dinamakan semula
          apabila Guru Besar yang menamakannya bertukar. Padanan ialah seluruh
          nama, bukan sebahagian perkataan.
        </span>
      </p>

      <PanelPentadbir awal={senarai} />

      <p className="mt-8 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        <b>Sebelum muat naik gambar orang:</b> dapatkan kebenaran mereka. Gambar
        pentadbir biasanya tiada masalah kerana ia jawatan awam — tetapi gambar{" "}
        <b>murid</b> memerlukan Surat Akuan Ibu Bapa (SS KPM Bil. 9/2024).
        Bucket media ini boleh dibaca sesiapa yang tahu URLnya; tiada
        &ldquo;separa awam&rdquo;.
      </p>
    </main>
  );
}
