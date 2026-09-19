import { notFound } from "next/navigation";
import CetakAkuan from "@/components/CetakAkuan";
import CetakSurat from "@/components/CetakSurat";
import { SEKOLAH } from "@/data/sekolah";

// Laluan sementara untuk pemeriksaan visual setempat sahaja. Fail ini dibuang
// sebelum commit; ia memberi data contoh tanpa menyentuh murid atau Supabase.
const aktiviti = { nama: "KEJOHANAN HOKI ANTARA SEKOLAH", tarikh: "2026-09-26", masa: "8.00 pagi - 11.00 pagi", tempat: "Stadium Hoki KPM", anjuran: "SK Taman Desaminium" };
const akuan = { muridNama: "AHMAD BIN CONTOH", muridKp: "160101101234", kelas: "4 BESTARI", penjagaNama: "ALI BIN CONTOH", penjagaKp: "800101101234", alamat: "No. 1, Jalan Contoh, Lestari Perdana, 43300 Seri Kembangan", telefon: "012-345 6789", bersetuju: true, penyakit: [
  { ada: false, catatan: "" }, { ada: true, catatan: "Inhaler dibawa" }, { ada: false, catatan: "" }, { ada: false, catatan: "" },
  { ada: false, catatan: "" }, { ada: false, catatan: "" }, { ada: false, catatan: "" }, { ada: false, catatan: "" },
] };

export default async function Page({ params }: { params: Promise<{ jenis: string }> }) {
  const { jenis } = await params;
  if (jenis === "akuan") return <main className="mx-auto max-w-6xl p-4"><CetakAkuan aktiviti={aktiviti} data={akuan} /></main>;
  if (jenis === "surat") return <main className="p-4"><CetakSurat surat={{ id: "11111111-1111-4111-8111-111111111111", jenis: "rasmi", status: "selesai", tajuk: "TEMPAHAN STADIUM HOKI KEMENTERIAN PENDIDIKAN MALAYSIA", rujukan_kami: "SKTD 600-3/5/14", pemohon_nama: "Contoh", pemohon_emel: "contoh@sktd.edu.my", tandatangan_url: null, data: { alamat: "Pengarah, Bahagian Sukan, Kokurikulum dan Kesenian (BSKK), Kementerian Pendidikan Malaysia, Aras 1, 2 & 7, Blok E 13, Kompleks E, 62604 Putrajaya, Malaysia.", tarikh: "2026-09-09", isi: "Dengan hormatnya perkara di atas adalah dirujuk.\n\n1. Sukacita dimaklumkan bahawa Sekolah Kebangsaan Taman Desaminium ingin mengadakan latihan intensif sebagai persediaan kejohanan.\n\n2. Bersama-sama ini disertakan butiran latihan hoki sekolah bagi perhatian pihak tuan/puan.\n\n3. Pihak sekolah berharap bayaran sewaan padang bagi premis ini dapat dipertimbangkan.", wakilGbNama: "SAUDAH BINTI OSMAN", wakilGbJawatan: "Guru Besar" }, dicipta: "2026-09-09T00:00:00.000Z" }} data={{ alamat: "Pengarah,\nBahagian Sukan, Kokurikulum dan Kesenian (BSKK),\nKementerian Pendidikan Malaysia,\nAras 1, 2 & 7, Blok E 13, Kompleks E,\n62604 Putrajaya, Malaysia.", tarikh: "2026-09-09", isi: "Dengan hormatnya perkara di atas adalah dirujuk.\n\n1. Sukacita dimaklumkan bahawa Sekolah Kebangsaan Taman Desaminium ingin mengadakan latihan intensif sebagai persediaan kejohanan.\n\n2. Bersama-sama ini disertakan butiran latihan hoki sekolah bagi perhatian pihak tuan/puan.\n\n3. Pihak sekolah berharap bayaran sewaan padang bagi premis ini dapat dipertimbangkan.", wakilGbNama: "SAUDAH BINTI OSMAN", wakilGbJawatan: "Guru Besar" }} kepala={{ nama: SEKOLAH.namaPenuh, kod: SEKOLAH.kod, alamat: SEKOLAH.hubungi.alamat, telefon: SEKOLAH.hubungi.telefon, faks: "", emel: SEKOLAH.hubungi.emel }} /></main>;

  notFound();
}
