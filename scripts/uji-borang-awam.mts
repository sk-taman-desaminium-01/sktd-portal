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
const pratontonCetak = baca("src/app/borang/pratonton-cetak/PratontonCetak.tsx");
const cetakMedia = baca("src/components/CetakMedia.tsx");

for (const laluan of ["/borang", "/borang/aktiviti", "/borang/kebenaran-gambar", "/borang/pratonton-cetak"]) {
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
perlu("Tindakan awam mengehadkan tandatangan", tindakanGambar.includes("150_000"));
perlu("Ralat pangkalan data tidak bocor kepada orang awam", tindakanGambar.includes("RalatBorangAwam") && !tindakanGambar.includes('return mesej.startsWith("[supabase]")'));
perlu("Borang awam hanya dua keputusan", borangGambar.includes("Bersetuju") && borangGambar.includes("Tidak bersetuju") && !borangGambar.includes("Tidak pasti"));
perlu("Tandatangan awam kekal dalam borang", tandatangan.includes("tempatan") && tandatangan.includes("blobKeDataUrl"));
perlu("Laluan pemeriksaan sementara sudah dibuang", !existsSync(resolve(akar, "src/app/kebenaran/semak-cetak/[jenis]/page.tsx")));
perlu("Laptop dan telefon menggunakan halaman pratonton yang sama", cetak.includes("/borang/pratonton-cetak") && cetak.includes("sessionStorage"));
perlu("Pratonton tidak bergantung pada popup atau skrip sebaris", !cetak.includes("window.open") && !cetak.includes("<script>"));
perlu("Kandungan cetak dibersihkan sebelum dipratonton", cetak.includes("script,iframe,object,embed") && cetak.includes("/^on/i"));
perlu("Telefon dan PWA menjana PDF sebenar dengan sandaran simpan", pratontonCetak.includes("onClick={cetak}") && pratontonCetak.includes('import("jspdf")') && pratontonCetak.includes('import("html2canvas-pro")') && pratontonCetak.includes('pdf.output("blob")') && pratontonCetak.includes("Buka / Simpan PDF"));
perlu("Nama guru kelas dipaut dan ditukar huruf besar", cetakMedia.includes("guruKelasNama?.toUpperCase()") && tindakanGambar.includes("guruKelasNama: guru.nama"));
perlu("Arahan HURUF BESAR tidak dicetak", !cetakMedia.includes("HURUF BESAR"));

if (gagal.length) {
  console.error(`Kontrak Borang Sekolah awam gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak Borang Sekolah awam: 24 semakan lulus.");
