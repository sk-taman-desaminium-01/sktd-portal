import Link from "next/link";
import type { KadPortal } from "@/data/bahagian";
import type { StatusApp } from "@/data/sekolah";
import { aset } from "@/lib/laluan";

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

/**
 * Ke mana kad ini pergi — app sebenar, atau tapak pembinaannya.
 *
 * Laluan DALAMAN dipulangkan TANPA awalan, kerana `<Link>` menambahnya
 * sendiri. Laluan luar dipulangkan seadanya.
 *
 * (Sejarah: kad dahulu menggunakan `<a>` untuk semua, dan `<a>` TIDAK
 * mendapat basePath — setiap kad memberi 404. Awalan ditambah dengan tangan
 * untuk membaikinya. Kini laluan dalaman guna `<Link>`, yang membetulkan
 * awalan DAN memberi navigasi dalam app tanpa memuat semula halaman.)
 */
export function tujuKad(app: KadPortal): string {
  return app.pautan ?? `/bina/${app.id}`;
}

/** Laluan dalam portal ini, berbanding laman luar. */
function dalaman(tuju: string): boolean {
  return tuju.startsWith("/");
}

export default function KadApp({ app }: { app: KadPortal }) {
  // Tiada lagi keadaan "terkunci": kad yang pengguna tidak boleh guna
  // tidak sampai ke sini langsung — ia ditapis di `kadIkutBahagian()`.
  const lencana = LABEL[app.status];

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
            <img src={aset(app.logo)} alt="" className="h-full w-full object-cover" />
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
        {app.luaran && <span title="Laman luar" className="ml-1.5 text-slate-500">↗</span>}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{app.fungsi}</p>
      {app.catatan && <p className="mt-2 text-xs leading-relaxed text-slate-500">{app.catatan}</p>}
      {app.akses && <p className="mt-2 text-xs text-slate-500">🔒 {app.akses}</p>}

      <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-xs">
        {/* Domain untuk modul yang BELUM hidup ialah cadangan, dan
            menuliskannya "(cadangan)" dalam kurungan pada setiap kad
            mengulang perkara yang lencana status sudah katakan. Alamat itu
            dikelabukan sebaliknya — nampak belum hidup tanpa satu perkataan
            tambahan. */}
        <span
          className={`min-w-0 truncate ${app.domainCadangan ? "text-slate-500" : "text-slate-500"}`}
          title={app.domainCadangan ? "Alamat cadangan — modul ini belum hidup" : undefined}
        >
          {app.domain}
        </span>
        <span className="shrink-0 font-semibold text-navy-700">
          {app.luaran ? "Buka laman ↗" : app.pautan ? "Buka →" : "Lihat status →"}
        </span>
      </div>
    </>
  );

  const kelas = "flex h-full flex-col rounded-2xl bg-white p-5 text-left";
  const tuju = tujuKad(app);
  const gaya = `${kelas} shadow-sm transition hover:ring-2 hover:ring-emas`;

  // `<Link>` untuk laluan dalaman: Next memuat dahulu halaman itu semasa kad
  // kelihatan di skrin, dan menukar halaman TANPA memuat semula seluruh app.
  // Dengan `<a>`, setiap ketukan kad ialah perjalanan penuh ke pelayan —
  // itulah lengah 2–3 saat yang guru rasa setiap kali mereka buka satu app.
  if (dalaman(tuju)) {
    return (
      <Link href={tuju} className={gaya}>
        {isi}
      </Link>
    );
  }

  return (
    <a href={tuju} target="_blank" rel="noreferrer" className={gaya}>
      {isi}
    </a>
  );
}
