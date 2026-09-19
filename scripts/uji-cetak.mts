/**
 * Kontrak cetakan. Ia mengunci tiga punca kegagalan yang pernah berlaku:
 * margin berbeza mengikut borang, tiada jalan kembali di telefon, dan
 * borang baharu terlupa mengisytiharkan orientasi A4.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const gagal: string[] = [];
const perlu = (nama: string, ada: boolean) => { if (!ada) gagal.push(nama); };

const enjin = baca("src/components/cetak-mudah-alih.ts");
const pratonton = baca("src/app/borang/pratonton-cetak/PratontonCetak.tsx");
const surat = baca("src/components/CetakSurat.tsx");
const akuan = baca("src/components/CetakAkuan.tsx");
const media = baca("src/components/CetakMedia.tsx");
const disiplin = baca("src/app/disiplin/PanelDisiplin.tsx");
const slip = baca("src/app/pbd/slip/PanelSlip.tsx");
const carta = baca("src/app/admin/carta/PanelCarta.tsx");

perlu("Pratonton telefon mempunyai Kembali", pratonton.includes("← Kembali") && pratonton.includes("onClick={kembali}"));
perlu("Pratonton telefon mempunyai Cetak", pratonton.includes("Cetak / Simpan PDF") && pratonton.includes("onClick={cetak}"));
perlu("Butang telefon mempunyai sasaran sentuh 44px", pratonton.includes("min-h-11") && pratonton.includes("touch-action: manipulation"));
perlu("Laptop dan telefon berkongsi pratonton React", enjin.includes("/borang/pratonton-cetak") && enjin.includes("sessionStorage"));
perlu("Pratonton tidak menggunakan popup atau blob", !enjin.includes("window.open") && !enjin.includes("URL.createObjectURL"));
perlu("Pratonton menetapkan margin A4 terakhir", /@page \{ size: A4/.test(pratonton));
perlu("Enjin menghidupkan kandungan print:block", enjin.includes('kelas.startsWith("print:")'));
perlu("Surat rasmi isytihar A4 potret", surat.includes('data-cetak-kertas="portrait"'));
perlu("Surat rasmi menormalkan perenggan", surat.includes('.split(/\\n+/)'));
perlu("Surat rasmi menghadkan satu muka", /HAD_ISI_SATU_MUKA = 1_200/.test(surat));
perlu("Surat rasmi panjang dipadatkan dalam satu A4", surat.includes("surat-padat") && surat.includes("data.isi.replace"));
perlu("Surat rasmi memakai Jata Negara, SKTD dan TS25", surat.includes("logo-jata-negara.png") && surat.includes("logo-sktd.png") && surat.includes("logo-ts25.png"));
perlu("Surat rasmi meninggalkan tandatangan hidup kosong", surat.includes("Ruang tandatangan hidup Guru Besar") && !surat.includes("surat.tandatangan_url"));
perlu("Akuan waris isytihar A4 landskap", akuan.includes('data-cetak-kertas="landscape"'));
perlu("Akuan waris kekal dua panel semasa cetak", /grid-template-columns: repeat\(2/.test(akuan));
for (const [nama, fail] of [["Media", media], ["Disiplin", disiplin], ["Slip PBD", slip], ["Carta", carta]] as const) {
  perlu(`${nama} isytihar A4 potret`, fail.includes('data-cetak-kertas="portrait"'));
}

if (gagal.length) {
  console.error(`Kontrak cetakan gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak cetakan: 19 semakan lulus.");
