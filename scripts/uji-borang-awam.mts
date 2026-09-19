/** Kontrak laluan, privasi dan simpanan Borang Sekolah awam. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const gagal: string[] = [];
const perlu = (nama: string, syarat: boolean) => { if (!syarat) gagal.push(nama); };

const proxy = baca("src/proxy.ts");
const hab = baca("src/app/borang/page.tsx");
const aktivitiAwam = baca("src/app/borang/aktiviti/page.tsx");
const aktivitiUrus = baca("src/app/borang/aktiviti/urus/page.tsx");
const borangGambar = baca("src/app/borang/kebenaran-gambar/BorangKebenaranGambar.tsx");
const tindakanGambar = baca("src/lib/surat-awam.ts");
const tandatangan = baca("src/components/TandaTangan.tsx");
const cetak = baca("src/components/cetak-mudah-alih.ts");

for (const laluan of ["/borang", "/borang/aktiviti", "/borang/kebenaran-gambar"]) {
  perlu(`${laluan} diisytihar awam secara tepat`, proxy.includes(`"${laluan}"`));
}
perlu("Laluan urus tidak dibuka secara wildcard", !proxy.includes('"/borang/(.*)"'));
perlu("Hab awam memaparkan tepat dua kad", (hab.match(/href: "\/borang\//g) ?? []).length === 2);
perlu("Nama aktiviti awam tepat", hab.includes("Surat Akuan Penyertaan Aktiviti") && !hab.includes("dan Kesihatan"));
perlu("Senarai awam mengambil aktiviti aktif dari pelayan", aktivitiAwam.includes("aktivitiAwam()"));
perlu("Senarai awam tiada Panel pengurus", !aktivitiAwam.includes("<Panel") && !aktivitiAwam.includes("ciptaAktiviti"));
perlu("Panel pengurus hanya di laluan urus", aktivitiUrus.includes('import Panel from "../Panel"'));
perlu("Tindakan awam mempunyai honeypot", tindakanGambar.includes("lamanPerangkap"));
perlu("Tindakan awam mempunyai had kadar", tindakanGambar.includes('rpc/borang_ambil_giliran'));
perlu("Tindakan awam memadan daftar murid", tindakanGambar.includes("pbd_pendaftaran") && tindakanGambar.includes("pbd_murid.no_kp"));
perlu("Tindakan awam mengehadkan tandatangan", tindakanGambar.includes("350_000"));
perlu("Ralat pangkalan data tidak bocor kepada orang awam", tindakanGambar.includes("RalatBorangAwam") && !tindakanGambar.includes('return mesej.startsWith("[supabase]")'));
perlu("Borang awam hanya dua keputusan", borangGambar.includes("Bersetuju") && borangGambar.includes("Tidak bersetuju") && !borangGambar.includes("Tidak pasti"));
perlu("Tandatangan awam kekal dalam borang", tandatangan.includes("tempatan") && tandatangan.includes("blobKeDataUrl"));
perlu("Laluan pemeriksaan sementara sudah dibuang", !existsSync(resolve(akar, "src/app/kebenaran/semak-cetak/[jenis]/page.tsx")));
perlu("Laptop dan telefon menggunakan dokumen cetak terpencil", !cetak.includes("if (!mudahAlih())") && cetak.includes('window.open("", "_blank")'));
perlu("Pratonton tidak menyalin skrip aplikasi", cetak.includes("style,link[rel='stylesheet']") && !cetak.includes("document.head.cloneNode"));
perlu("Cetakan meneutralkan susun atur halaman portal", cetak.includes("position: static !important") && cetak.includes("overflow: visible !important"));
perlu("Cetakan menunggu fon dan gambar", cetak.includes("document.fonts.ready") && cetak.includes("document.images"));

if (gagal.length) {
  console.error(`Kontrak Borang Sekolah awam gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak Borang Sekolah awam: 21 semakan lulus.");
