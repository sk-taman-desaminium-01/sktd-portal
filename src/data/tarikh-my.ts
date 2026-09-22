/**
 * "Hari ini" mengikut waktu MALAYSIA — pelayan (Vercel, UTC) dan pelayar.
 * `new Date().toISOString().slice(0, 10)` ialah tarikh UTC: dari 12 tengah
 * malam hingga 8 pagi waktu Malaysia ia masih SEMALAM — tepat pada waktu
 * kawalan kelas pagi direkodkan (peraturan keras #25).
 */
export function hariIniMY(anjakHari = 0): string {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  if (!anjakHari) return iso;
  const [y, b, h] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, b - 1, h + anjakHari)).toISOString().slice(0, 10);
}
