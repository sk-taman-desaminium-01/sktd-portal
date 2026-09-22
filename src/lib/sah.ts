/**
 * PENGAWAL INPUT SERVER ACTION.
 *
 * Jenis TypeScript TIDAK wujud semasa larian: Server Action boleh dipanggil
 * dengan apa-apa JSON. Nilai yang dimasukkan terus ke URL PostgREST
 * (`tahun_sesi=eq.${x}`) mesti disahkan, kalau tidak `"2026&guru_id=neq.x"`
 * menyelitkan penapis tambahan. Pengawal ini MELONTAR — Server Action yang
 * dipanggil dengan input palsu bukan aliran pengguna biasa.
 */
export function sahInt(v: unknown, nama: string, min = 0, maks = 9999): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > maks) throw new Error(`Nilai ${nama} tidak sah.`);
  return v;
}

export function sahTarikh(v: unknown, nama = "tarikh"): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`Nilai ${nama} tidak sah.`);
  return v;
}

export function sahUuid(v: unknown, nama = "id"): string {
  if (typeof v !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new Error(`${nama} tidak sah.`);
  return v;
}
