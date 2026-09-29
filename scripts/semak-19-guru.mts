import { klienTulis } from "../src/lib/supabase-pelayan.ts";
const db = klienTulis();
const semua = await db.minta("pbd_guru?select=nama,email,dibenarkan,peranan&order=nama.asc") as { nama: string | null; email: string; dibenarkan: boolean; peranan: string }[];
const nama19 = [
 "TN. MUHAMMAD AIMAN BIN TN. SEMBOK","NIK AHMAD HILMI BIN NIK MUSTAFA","WAN NURSYAZLIYANA BINTI WAN ROSLI",
 "NURUL KALAM BINTI ZAINUDIN","NURFAZRIN BINTI MOHD SUKKRI","HAWA NUR FARHANAN BINTI MUSTAPHA",
 "FARIZAH BEGUM BINTI MOHD YUSOFF","NOOR RUWAIDA BINTI MOHD ARIFIN","KALAIVANI A/P PADMANTHAN",
 "ABDUL MUIZZ BIN MOHD RAMZI","EZDIANI BINTI SELAMAT","SITI NORZAIDAH BINTI MD. SUKI",
 "SRINIMALAAN A/L LACHIMANAN","WAN KHAIRUL HAZWAN BIN WAN KASWADI","ZURAIZA BINTI CHE RAZAK",
 "IBRAHIM BIN AHMAD","SARINAH BINTI MOHAMED","SIVAGAMEE A/P ALAGU","NAJWA AIMAN BINTI MOHD NISHAM",
];
function norm(s: string) { return (s || "").toUpperCase().replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim(); }
function kataUtama(s: string) { return norm(s).split(" ").filter((w) => w.length > 2).slice(0, 2); }
for (const n of nama19) {
  const kata = kataUtama(n);
  const calon = semua.filter((g) => kata.some((k) => norm(g.nama ?? "").includes(k)));
  const persis = semua.some((g) => norm(g.nama ?? "") === norm(n));
  console.log(`"${n}"\n  sama persis: ${persis ? "YA" : "tiada"} · calon serupa: ${calon.map((c) => `${c.nama} [${c.dibenarkan ? "dibenarkan" : "MENUNGGU KELULUSAN"}]`).slice(0, 3).join(" | ") || "(tiada langsung dalam pbd_guru)"}`);
}
