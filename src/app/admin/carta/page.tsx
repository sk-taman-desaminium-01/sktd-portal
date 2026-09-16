import Link from "next/link";
import { SEKOLAH } from "@/data/sekolah";
import { ambilCarta } from "@/lib/tindakan-carta";
import PanelCarta from "./PanelCarta";
import PokokCarta from "./PokokCarta";

export const metadata = { title: "Carta Organisasi" };

/**
 * Carta organisasi sekolah — dari Guru Besar hingga guru dan kakitangan.
 *
 * ⚠️ Carta TIDAK dibaca dari muka "CARTA ORGANISASI" dalam buku. Muka itu
 * GAMBAR — carta induk edisi 2025 membawa dua serpihan teks sahaja, dan
 * tiada penghurai boleh membaca teks yang tidak wujud. Carta ini dibina
 * semula daripada senarai yang memang teks: senarai nama guru dengan kod
 * jawatan, dan senarai jawatankuasa setiap unit.
 */
export default async function Carta() {
  const hasil = await ambilCarta();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="tiada-cetak text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <div className="tiada-cetak mt-3">
        <h1 className="text-2xl font-bold text-navy-800">Carta Organisasi</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {hasil.ok
            ? `${hasil.bilOrang} orang · ${hasil.bilPenempatan} jawatan · edisi ${hasil.tahun}`
            : "Dibina dari Buku Pengurusan."}
        </p>
      </div>

      {!hasil.ok || !hasil.punca ? (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          {hasil.mesej}{" "}
          <Link href="/admin/pengurusan" className="font-semibold underline">
            Buku Pengurusan
          </Link>
        </p>
      ) : (
        <>
          {!hasil.semuaDisahkan && (
            <p className="tiada-cetak mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
              Sebahagian seksyen Buku Pengurusan masih <b>draf</b>. Carta ini
              boleh dilihat dan dibetulkan sekarang, tetapi sahkan seksyennya
              sebelum mengedarkan carta ini.
            </p>
          )}

          {hasil.tidakDitempatkan && hasil.tidakDitempatkan.length > 0 && (
            <p className="tiada-cetak mt-4 rounded-xl border border-garis bg-white p-4 text-xs leading-relaxed text-slate-600">
              <b>{hasil.tidakDitempatkan.length} orang</b> tiada dalam mana-mana
              jawatankuasa yang dibaca, jadi mereka dikumpulkan di bawah
              “Guru &amp; Kakitangan Lain”. Itu mungkin betul — atau mungkin
              jawatankuasa mereka berada pada muka yang berupa gambar.
            </p>
          )}

          <PokokCarta
            punca={hasil.punca}
            tahun={hasil.tahun ?? new Date().getFullYear()}
            namaSekolah={SEKOLAH.namaPenuh}
          />

          <PanelCarta
            punca={hasil.punca}
            tahun={hasil.tahun ?? new Date().getFullYear()}
            namaSekolah={SEKOLAH.namaPenuh}
            semuaDisahkan={hasil.semuaDisahkan ?? false}
          />
        </>
      )}
    </main>
  );
}
