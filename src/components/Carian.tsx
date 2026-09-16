"use client";

/**
 * Kotak carian ringkas untuk menapis senarai panjang.
 *
 * Sekolah ini ada 57 kelas dan lebih 100 guru. Menatal senarai sepanjang itu
 * untuk mencari satu baris ialah kerja yang tidak perlu, dan ia juga punca
 * tersilap pilih baris jiran.
 *
 * `type="search"` supaya pelayar mudah alih memberi butang kosongkan dan
 * papan kekunci yang betul.
 */
export default function Carian({
  nilai, setNilai, label, jumlah, ditapis,
}: {
  nilai: string;
  setNilai: (n: string) => void;
  label: string;
  /** Jumlah keseluruhan sebelum ditapis. */
  jumlah: number;
  /** Berapa yang tinggal selepas ditapis. */
  ditapis: number;
}) {
  return (
    <div className="mt-4">
      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
        <input
          type="search"
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          placeholder="Taip untuk menapis…"
          className="mt-1 block w-full rounded-lg border border-garis px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 sm:w-72"
        />
      </label>
      {nilai.trim() !== "" && (
        <p className="mt-1.5 text-xs text-slate-500" role="status">
          {ditapis} daripada {jumlah} dipapar
          {ditapis === 0 && " — tiada yang sepadan"}
        </p>
      )}
    </div>
  );
}

/** Padanan longgar: huruf besar/kecil diabaikan, ruang tambahan diabaikan. */
export function padan(teks: string | null | undefined, carian: string): boolean {
  const c = carian.trim().toLowerCase();
  if (c === "") return true;
  return (teks ?? "").toLowerCase().includes(c);
}
