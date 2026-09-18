import BorangPos from "./BorangPos";
import DrafTakwim from "./DrafTakwim";
import { senaraiPos, ambilPos } from "@/lib/cms";

export const metadata = { title: "Pos" };

export default async function HalamanPos({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [senarai, pos] = await Promise.all([
    senaraiPos(),
    id ? ambilPos(id) : Promise.resolve(null),
  ]);
  const draf = senarai.filter((p) => p.status === "draf");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold text-navy-800">Pos</h1>
      {/* Draf dari takwim didahulukan: kebanyakan pengumuman sekolah ialah
          tarikh yang sudah tertulis dalam takwim, dan menaipnya semula satu
          demi satu ialah kerja yang tidak perlu wujud. */}
      <DrafTakwim />
      <BorangPos draf={draf} pos={pos} />
    </main>
  );
}
