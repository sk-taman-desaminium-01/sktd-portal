import type { KadPortal } from "@/data/bahagian";
import type { StatusApp } from "@/data/sekolah";

/**
 * Satu kad app dalam hab — padanan `kad()` dalam `skrinPortal()` mockup:
 * kad PUTIH atas latar navy, ikon berwarna, lencana status, kaki domain.
 *
 * Kad yang appnya belum siap TIDAK dimatikan. Ia membuka tapak pembinaan
 * (`/bina/<id>`) yang menerangkan apa modul itu dan di peringkat mana ia
 * berada. Kad mati menimbulkan soalan; kad yang menjawab menghentikannya.
 */

const LABEL: Record<StatusApp, { teks: string; kelas: string }> = {
  sedia: { teks: "Sedia", kelas: "bg-[#e5f4ec] text-[#167a4b]" },
  bina: { teks: "Dalam pembinaan", kelas: "bg-[#fdf3dc] text-[#9a6b06]" },
  reka: { teks: "Peringkat reka bentuk", kelas: "bg-navy-100 text-navy-700" },
  akan: { teks: "Akan datang", kelas: "bg-[#eef1f5] text-slate-500" },
};

/** Ke mana kad ini pergi — app sebenar, atau tapak pembinaannya. */
export function tujuKad(app: KadPortal): string {
  return app.pautan ?? `/bina/${app.id}`;
}

export default function KadApp({
  app, terkunci,
}: { app: KadPortal; terkunci: boolean }) {
  const lencana = terkunci
    ? { teks: "Tiada akses", kelas: "bg-[#eef1f5] text-slate-500" }
    : LABEL[app.status];

  const isi = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-white"
          style={{ backgroundColor: app.warna }}
        >
          {app.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            app.ikon
          )}
        </span>
        <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${lencana.kelas}`}>
          {lencana.teks}
        </span>
      </div>

      <h3 className="mt-3.5 text-lg font-bold text-navy-900">
        {app.nama}
        {app.luaran && <span title="Laman luar" className="ml-1.5 text-slate-400">↗</span>}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{app.fungsi}</p>
      {app.catatan && <p className="mt-2 text-xs leading-relaxed text-slate-500">{app.catatan}</p>}
      {app.akses && <p className="mt-2 text-xs text-slate-500">🔒 {app.akses}</p>}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-xs">
        <span className="min-w-0 truncate text-slate-400">
          {app.domain}
          {app.domainCadangan && <i> (cadangan)</i>}
        </span>
        {!terkunci && (
          <span className="shrink-0 font-semibold text-navy-700">
            {app.luaran ? "Buka laman ↗" : app.pautan ? "Buka →" : "Lihat status →"}
          </span>
        )}
      </div>
    </>
  );

  const kelas = "flex h-full flex-col rounded-2xl bg-white p-5 text-left";
  if (terkunci) return <div className={`${kelas} opacity-70`}>{isi}</div>;

  return (
    <a
      href={tujuKad(app)}
      {...(app.luaran ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`${kelas} shadow-sm transition hover:ring-2 hover:ring-emas`}
    >
      {isi}
    </a>
  );
}
