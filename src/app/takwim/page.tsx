import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { barisIkutKod, dokumenTerkini } from "@/lib/pengurusan";
import { leraiTakwim } from "@/lib/takwim";
import PanelTakwim from "./PanelTakwim";

export const metadata = { title: "Takwim" };

/**
 * Takwim sekolah — dibaca terus dari Buku Pengurusan.
 *
 * Kad ini dahulu bernama "Mesyuarat", dan ia memapar baris mentah buku:
 * empat lajur unit yang hampir semuanya kosong, tarikh bercantum dengan
 * nama hari, dan nombor minggu yang hanya muncul pada baris pertama setiap
 * minggu. Pengguna memanggilnya "berselerak", dan mereka betul.
 *
 * Sekarang baris itu DINORMALKAN dahulu (`lib/takwim.ts`): minggu · tarikh ·
 * hari · program, disusun ikut tarikh dan dikumpul ikut bulan. Sumbernya
 * tetap sama — bacaan PDF — cuma disusun mengikut cara orang membaca takwim.
 */
export default async function Takwim() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  // Takwim program DAN takwim mesyuarat digabungkan: kedua-duanya acara
  // bertarikh dalam kalendar yang sama, dan guru tidak membuka dua skrin
  // untuk bertanya "minggu ini ada apa".
  const [dok, program, mesyuarat] = await Promise.all([
    dokumenTerkini(),
    barisIkutKod("takwim"),
    barisIkutKod("mesyuarat"),
  ]);

  const acara = [
    ...(program ? leraiTakwim(program.lajur, program.baris) : []),
    ...(mesyuarat ? leraiTakwim(mesyuarat.lajur, mesyuarat.baris) : []),
  ].sort((a, b) => (a.tarikh ?? "z").localeCompare(b.tarikh ?? "z"));

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Takwim</h1>

      {acara.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          <p className="font-semibold">Takwim belum ada.</p>
          <p className="mt-1.5">
            Ia datang dari Buku Pengurusan. Pentadbir perlu memuat naik buku
            tahunan dan <b>mengesahkan</b> seksyen takwim di skrin Buku
            Pengurusan.
          </p>
        </div>
      ) : (
        <PanelTakwim acara={acara} dokTahun={dok?.tahun ?? null} />
      )}

      <p className="mt-8 text-xs leading-relaxed text-slate-500">
        Takwim ini dibaca terus dari Buku Pengurusan, jadi ia berubah sendiri
        apabila edisi baharu disahkan. Minit mesyuarat dan senarai tindakan
        tidak disimpan di sini.
      </p>
    </main>
  );
}
