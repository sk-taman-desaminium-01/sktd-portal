import { redirect } from "next/navigation";
import { kuasaPbd } from "@/lib/pbd";

/**
 * `/pbd` kini hanya pengalih.
 *
 * ePBD dipecah kepada DUA kad — ePBD-Guru dan ePBD-Slip — jadi tiada lagi
 * satu halaman yang memapar kedua-duanya. Pautan lama tetap berfungsi, dan
 * ia menghantar setiap orang ke tempat yang paling mungkin mereka tuju:
 * guru subjek ke skrin pengisian, yang lain ke slip.
 */
export default async function Pbd() {
  const k = await kuasaPbd();
  redirect(k && k.tugas.length > 0 ? "/pbd/guru" : "/pbd/slip");
}
