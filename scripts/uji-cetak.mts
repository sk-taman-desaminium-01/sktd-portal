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
const surat = baca("src/components/CetakSurat.tsx");
const akuan = baca("src/components/CetakAkuan.tsx");
const media = baca("src/components/CetakMedia.tsx");
const disiplin = baca("src/app/disiplin/PanelDisiplin.tsx");
const slip = baca("src/app/pbd/slip/PanelSlip.tsx");
const carta = baca("src/app/admin/carta/PanelCarta.tsx");

perlu("Pratonton telefon mempunyai Kembali", enjin.includes('id="sktd-kembali"'));
perlu("Pratonton telefon mempunyai Cetak", enjin.includes('id="sktd-cetak"'));
perlu("Pelayar mudah alih tersamar dikesan melalui lebar skrin", enjin.includes("window.innerWidth <= 720"));
perlu("Pop-up disekat beralih ke pratonton tab semasa", enjin.includes("URL.createObjectURL(new Blob") && enjin.includes("window.location.assign(url)"));
perlu("Enjin menetapkan margin A4 terakhir", /@page \{ size: A4/.test(enjin));
perlu("Enjin menghidupkan kandungan print:block", enjin.includes('kelas.startsWith("print:")'));
perlu("Surat rasmi isytihar A4 potret", surat.includes('data-cetak-kertas="portrait"'));
perlu("Surat rasmi menormalkan perenggan", surat.includes('.split(/\\n+/)'));
perlu("Surat rasmi menghadkan satu muka", /HAD_ISI_SATU_MUKA = 1_200/.test(surat));
perlu("Akuan waris isytihar A4 landskap", akuan.includes('data-cetak-kertas="landscape"'));
perlu("Akuan waris kekal dua panel semasa cetak", /grid-template-columns: repeat\(2/.test(akuan));
for (const [nama, fail] of [["Media", media], ["Disiplin", disiplin], ["Slip PBD", slip], ["Carta", carta]] as const) {
  perlu(`${nama} isytihar A4 potret`, fail.includes('data-cetak-kertas="portrait"'));
}

if (gagal.length) {
  console.error(`Kontrak cetakan gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log("Kontrak cetakan: 15 semakan lulus.");
