import { redirect } from "next/navigation";

/**
 * Inventori ICT kini hidup DI DALAM kad Tempahan Bilik Khas.
 *
 * Laluan ini dikekalkan sebagai lencongan dan bukan dipadam: pautan lama
 * mungkin sudah dikongsi, dan pautan yang mati memberitahu pengguna bahawa
 * sesuatu rosak sedangkan ia cuma berpindah.
 */
export default function Inventori() {
  redirect("/bilik");
}
