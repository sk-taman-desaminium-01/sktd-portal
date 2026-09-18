import type { BarisKawalanKelas } from "./kawalan-kelas";

/** Carta kehadiran harian bagi SATU kelas (permintaan G.3). */
export function cartaKehadiranHarian(senarai: BarisKawalanKelas[], kelas: string) {
  return senarai
    .filter((b) => b.kelas === kelas && b.bil_murid !== null)
    .sort((a, b) => a.tarikh.localeCompare(b.tarikh))
    .map((b) => ({
      tarikh: b.tarikh,
      hadir: b.bil_hadir ?? 0,
      murid: b.bil_murid ?? 0,
      peratus: b.bil_murid ? Math.round(((b.bil_hadir ?? 0) / b.bil_murid) * 100) : 0,
    }));
}
