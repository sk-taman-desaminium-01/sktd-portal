import BorangPos from "./BorangPos";
import DrafTakwim from "./DrafTakwim";

export const metadata = { title: "Pos" };

export default function HalamanPos() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold text-navy-800">Pos</h1>
      {/* Draf dari takwim didahulukan: kebanyakan pengumuman sekolah ialah
          tarikh yang sudah tertulis dalam takwim, dan menaipnya semula satu
          demi satu ialah kerja yang tidak perlu wujud. */}
      <DrafTakwim />
      <BorangPos />
    </main>
  );
}
