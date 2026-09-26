/**
 * Kontrak kod ↔ SQL untuk modul yang bermigrasi selepas kod utama dibina.
 * Ia tidak memerlukan pangkalan data atau data murid, jadi pantas dijalankan
 * sebelum commit. Tambah satu semakan di sini setiap kali modul baharu
 * menggunakan kolum, kekangan unik atau RPC baharu.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const akar = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baca = (laluan: string) => readFileSync(resolve(akar, laluan), "utf8");
const disiplin = baca("src/lib/disiplin.ts");
const rmt = baca("src/lib/rmt.ts");
const tugasan = baca("src/lib/tugasan.ts");
const sql = baca("supabase/pembaikan-disiplin.sql");
const aktivitiKod = baca("src/lib/borang-aktiviti.ts");
const aktivitiSql = baca("supabase/migrations/20260919_borang_aktiviti.sql");
const kawalan = baca("src/lib/kawalan-kelas.ts");
const panelRmt = baca("src/app/rmt/PanelRmt.tsx");
const surat = baca("src/lib/surat.ts");
const cetakSurat = baca("src/components/CetakSurat.tsx");
const bahagian = baca("src/data/bahagian.ts");
const guruKelas = baca("src/app/guru-kelas/page.tsx");
const notifikasi = baca("src/app/notifikasi/PanelNotifikasi.tsx");
const gagal: string[] = [];
const perlu = (nama: string, ada: boolean) => { if (!ada) gagal.push(nama); };

perlu("Disiplin menggunakan murid_id", /murid_id/.test(disiplin));
perlu("SQL menyediakan murid_id Disiplin", /pbd_disiplin[\s\S]*add column if not exists murid_id/i.test(sql));
perlu("RMT menggunakan konflik sesi dan murid", /on_conflict=tahun_sesi,murid_id/.test(rmt));
perlu("SQL menyediakan kekangan unik RMT", /add constraint pbd_rmt_murid_tahun_sesi_murid_id_key[\s\S]*unique \(tahun_sesi, murid_id\)/i.test(sql));
perlu("Tugasan menggunakan RPC", /rpc\/tetap_tugasan_sekolah/.test(tugasan));
perlu("SQL menyediakan RPC tugasan", /create or replace function public\.tetap_tugasan_sekolah/i.test(sql));
perlu("Aktiviti menggunakan jadual aktiviti", /borang_aktiviti/.test(aktivitiKod));
perlu("SQL menyediakan jadual aktiviti", /create table if not exists public\.borang_aktiviti/i.test(aktivitiSql));
perlu("Aktiviti menggunakan senarai peserta", /borang_peserta/.test(aktivitiKod));
perlu("SQL menyediakan peserta dengan konflik aktiviti-murid", /primary key \(aktiviti_id, murid_id\)/i.test(aktivitiSql));
perlu("Aktiviti menggunakan jawapan", /borang_jawapan/.test(aktivitiKod));
perlu("SQL menghalang jawapan murid berganda", /unique \(aktiviti_id, murid_id\)/i.test(aktivitiSql));
perlu("Aktiviti menggunakan RPC had cubaan", /rpc\/borang_ambil_giliran/.test(aktivitiKod));
perlu("SQL menyediakan RPC had cubaan", /create or replace function public\.borang_ambil_giliran/i.test(aktivitiSql));
perlu("Disiplin boleh disunting", /export async function suntingDisiplin/.test(disiplin));
perlu("Disiplin boleh dipadam", /export async function padamDisiplin/.test(disiplin));
perlu("Kawalan kelas boleh disunting", /export async function suntingKawalanKelas/.test(kawalan));
perlu("Kawalan kelas boleh dipadam", /export async function padamKawalanKelas/.test(kawalan));
perlu("RMT dipapar sebagai kad kelas buka tutup", panelRmt.includes("<details") && panelRmt.includes("No. KP:"));
perlu("Kerani boleh menolak surat dengan komen", /export async function tolakSuratRasmi/.test(surat) && surat.includes("komenPejabat"));
perlu("Pemohon atau pejabat boleh menyunting surat", /export async function suntingSuratRasmi/.test(surat));
perlu("Tandatangan surat rasmi sentiasa kosong", surat.includes("tandatangan_url: null") && !cetakSurat.includes("surat.tandatangan_url"));
perlu("Guru biasa hanya membaca disiplin yang dilaporkan sendiri", disiplin.includes('`&guru_id=eq.${saya.id}`'));
perlu("Pelapor hanya boleh mengubah rekod disiplin miliknya", disiplin.includes("bolehUbahRekod(id)"));
perlu("Paparan disiplin Guru Kelas disahkan semula di pelayan", disiplin.includes("senaraiDisiplinKelas") && disiplin.includes("kelasBolehSunting()"));
perlu("Borang awam ibu bapa tidak disalahanggap sebagai hantaran guru", surat.includes('sumber !== "awam"'));
perlu("Kad Guru Kelas memaparkan rekod kelas secara baca sahaja", guruKelas.includes("senaraiKebenaranGambarKelas") && guruKelas.includes("senaraiDisiplinKelas") && guruKelas.includes("Paparan baca sahaja"));
perlu("Kad ujian push sudah dibuang", !notifikasi.includes("Hantar notifikasi ujian") && !notifikasi.includes("ujiPushTindakan"));
for (const id of ["guru-kelas-portal", "kawalan-kelas", "rmt", "disiplin"]) {
  perlu(`Kad ${id} berstatus sedia`, new RegExp(`id: "${id}"[\\s\\S]{0,350}status: "sedia"`).test(bahagian));
}


const carta = baca("src/lib/tindakan-carta.ts");
perlu("Sunting nama carta mencipta pindaan ganti_nama",
  carta.includes('jenis: "ganti_nama"') && carta.includes("namaSelDalamBaris"));
perlu("Pembetulan seluruh edisi TIDAK menahan permintaan sunting",
  /after\(jalankan\)/.test(carta) && carta.includes("kenakanPindaanEdisi"));
perlu("Carta mengenakan pindaan semasa baca",
  carta.includes("kenakanPindaan(b.sel, pindaanAktif)"));
const pindaanLib = baca("src/lib/pindaan.ts");
perlu("RPC pinda_baris_kekal yang tiada memberi arahan pemasangan",
  pindaanLib.includes("pindaan-baris-transaksi.sql") && pindaanLib.includes("PGRST202"));
const pengurusan = baca("src/lib/pengurusan.ts");
perlu("Pembetulan edisi guna tulisan berkelompok",
  pengurusan.includes("export async function suntingBarisBanyak"));

/* ------------------------------------------------------------------ *
 * BORANG LAPORAN — dokumen yang diserahkan kepada unit & jawatankuasa
 *
 * Semakan 24 Sep 2026 mendapati lima modul merekod data tetapi tiada
 * dokumen akhir untuk diserahkan: inventori, RMT, tempahan bilik, senarai
 * lantikan. Rekod dalam skrin bukan rekod yang boleh difailkan — bila
 * auditor bertanya "mana rekod pinjaman", skrin bukan jawapan.
 *
 * Semua borang berkongsi SATU susun atur (CetakLaporan) supaya kepala surat
 * sekolah hanya wujud di satu tempat.
 * ------------------------------------------------------------------ */
const cetakLaporan = baca("src/components/CetakLaporan.tsx");
perlu("Borang laporan membawa logo jata negara", cetakLaporan.includes("logo-jata-negara.png"));
perlu("Borang laporan membawa lencana sekolah", cetakLaporan.includes("logo-sktd.png"));
perlu("Borang laporan ada ruang tandatangan", cetakLaporan.includes("tandatangan"));
perlu("Baris jadual tidak dipotong antara muka surat", cetakLaporan.includes("break-inside: avoid"));
perlu("Tajuk lajur diulang pada setiap muka", cetakLaporan.includes("table-header-group"));

for (const [nama, fail, id] of [
  ["Inventori", "src/app/inventori/PanelInventori.tsx", "inventori-cetak"],
  ["RMT", "src/app/rmt/PanelRmt.tsx", "rmt-cetak"],
  ["Tempahan bilik", "src/app/bilik/GridBilik.tsx", "bilik-cetak"],
  ["Jawatankuasa", "src/app/admin/guru-kelas/CetakJawatankuasa.tsx", "jk-cetak"],
] as const) {
  const isi = baca(fail);
  perlu(`${nama} ada borang laporan`, isi.includes("CetakLaporan") && isi.includes(id));
  perlu(`${nama} boleh dicetak dari telefon`, isi.includes("mulaCetak"));
}

// Rekod bulanan RMT memerlukan bacaan sebulan, bukan satu tarikh.
const rmtLib = baca("src/lib/rmt.ts");
perlu("RMT boleh membaca kehadiran SEBULAN", rmtLib.includes("export async function hadirRmtBulan"));
perlu("Bacaan bulanan RMT disahkan bentuk bulannya", rmtLib.includes("Bulan tidak sah"));

// Medan sempit yang pernah diadukan DUA KALI: pengurus pasukan, kemudian
// nombor rujukan disiplin. Kedua-duanya kini label kelihatan, satu lajur.
const tugasanUi = baca("src/app/admin/guru-kelas/PanelTugasanLain.tsx");
perlu("Medan nama pasukan ada label kelihatan", tugasanUi.includes("labelSkop") && tugasanUi.includes("htmlFor"));
perlu("Medan nama pasukan tidak berkongsi baris di telefon", tugasanUi.includes("grid gap-3 sm:grid-cols-2"));
const disiplinUi = baca("src/app/disiplin/PanelDisiplin.tsx");
perlu("Medan rujukan disiplin ada label kelihatan", disiplinUi.includes('htmlFor={`ruj-'));
perlu("Medan rujukan disiplin penuh lebar", disiplinUi.includes('id={`ruj-${b.id}`}') && disiplinUi.includes("block w-full"));

/* Kawalan Kelas & Kehadiran — DUA borang, bukan satu.
   Pembetulan pengguna 25 Sep 2026: yang ada di DELIMa ialah rekod KEHADIRAN
   (dan borangnya tidak kemas); Kawalan Kelas tidak pernah ada di sana. */
const kawalanUi = baca("src/app/kawalan-kelas/PanelKawalanKelas.tsx");
perlu("Borang rekod kehadiran wujud", kawalanUi.includes("kehadiran-cetak"));
perlu("Borang rekod kawalan kelas wujud", kawalanUi.includes("kawalan-cetak"));
// Kedua-dua borang modul ini pergi kepada PK HEM (disahkan pengguna 25 Sep).
perlu("Kedua-dua borang kawalan kelas ditujukan kepada PK HEM",
  (kawalanUi.match(/Penolong Kanan HEM/g) ?? []).length === 2 &&
  !kawalanUi.includes("Penolong Kanan Pentadbiran"));
perlu("Nama guru relief dipilih, bukan ditaip bebas",
  kawalanUi.includes("kawalan-relief") && kawalanUi.includes("PilihCari"));
const guruKelasLib = baca("src/lib/guru-kelas.ts");
perlu("Senarai nama guru untuk pilihan wujud", guruKelasLib.includes("namaGuruUntukPilihan"));
perlu("Senarai itu memulangkan NAMA sahaja, bukan emel",
  /pbd_guru\?select=nama&dibenarkan=eq\.true/.test(guruKelasLib));

/* Murid berpindah kelas atau dipadam — rekod disiplin mesti ikut. */
const disiplinLib = baca("src/lib/disiplin.ts");
perlu("Rekod disiplin diselaraskan dengan pendaftaran semasa",
  disiplinLib.includes("async function selaraskanMurid"));
perlu("Penyelarasan membaca pendaftaran aktif sahaja",
  disiplinLib.includes("status=in.(aktif,pindah_masuk,ulang)"));
perlu("Murid tanpa pendaftaran ditanda, BUKAN dibuang",
  disiplinLib.includes("murid_tiada") && !disiplinLib.includes("senarai.filter((b) => !b.murid_tiada)"));
perlu("Penyelarasan tidak menulis semula rekod sejarah",
  !/selaraskanMurid[\s\S]{0,1200}method: "PATCH"/.test(disiplinLib));
perlu("Kegagalan penyelarasan tidak mengosongkan skrin",
  /catch \{[\s\S]{0,260}return senarai;/.test(disiplinLib));
perlu("Perubahan kelas ditunjukkan kepada guru",
  disiplinUi.includes("pindah dari") && disiplinUi.includes("tiada pendaftaran aktif"));

/* Roster RMT: murid berpindah kelas mesti muncul di bawah kelas barunya. */
perlu("Roster RMT diselaraskan dengan pendaftaran semasa",
  rmtLib.includes("async function selaraskanRoster"));
perlu("Roster RMT dipadankan melalui No. KP, bukan murid_id",
  rmtLib.includes("pbd_murid.no_kp=in."));
perlu("Baris tanpa No. KP tidak dituduh hilang",
  rmtLib.includes("if (!m.no_kp) return m;"));
perlu("Roster diisih SEMULA selepas diselaraskan",
  /selaraskanRoster\(senarai, tahun_sesi\)\)\.sort/.test(rmtLib));
// Badan fungsi SAHAJA — tetingkap aksara tetap akan melepasi hujungnya dan
// menangkap DELETE milik buangRosterRmt, iaitu amaran palsu.
const badanSelaras = rmtLib.slice(
  rmtLib.indexOf("async function selaraskanRoster"),
  rmtLib.indexOf("export async function senaraiRosterRmt"),
);
perlu("Penyelarasan roster tidak menulis semula senarai",
  badanSelaras.length > 200 && !/method: "(PATCH|POST|DELETE|PUT)"/.test(badanSelaras));
const rmtUi = baca("src/app/rmt/PanelRmt.tsx");
perlu("Perpindahan kelas ditunjukkan dalam roster RMT",
  rmtUi.includes("pindah dari") && rmtUi.includes("tiada pendaftaran aktif"));
perlu("Borang RMT ditujukan kepada PK HEM",
  rmtUi.includes('jawatan: "Penolong Kanan HEM"') && !rmtUi.includes('jawatan: "Guru Besar"'));

/* TAG GURU KELAS DARI BUKU PENGURUSAN — guru sedang log masuk, jadi tiada
   ruang untuk "baiki kemudian". Tiga sifat dikunci di sini. */
const tagLib = baca("src/lib/tag-guru-kelas.ts");
const bukuLib = baca("src/data/guru-kelas-buku.ts");
perlu("Tag guru kelas TIDAK menimpa tugasan sedia ada",
  tagLib.includes('keputusan: "sudah-ada"') && tagLib.includes("adaGuru.has(p.kelas)"));
perlu("Tag guru kelas tidak memadam apa-apa",
  !/method: "DELETE"/.test(tagLib) && !tagLib.includes("buangGuruKelas"));
perlu("Larian kering ialah lalai (peraturan keras #5)",
  /export async function tagGuruKelas\(tulis = false\)/.test(tagLib));
perlu("Larian kering tidak menulis", /if \(!tulis\) \{[\s\S]{0,400}ditulis: false/.test(tagLib));
perlu("Nama kabur DILANGKAU, bukan diteka",
  tagLib.includes('keputusan: "kabur"') && tagLib.includes("padan.length > 1"));
perlu("Hanya guru yang dibenarkan masuk portal dipadankan",
  tagLib.includes("dibenarkan=eq.true"));
perlu("Kelas dipadan dengan senarai rasmi, bukan teks bebas",
  bukuLib.includes("semuaKelas()") && bukuLib.includes("semuaKelasPPKI()"));
const padanLib = baca("src/data/padan-nama.ts");
perlu("Penanda akaun sekolah (KPM-Guru) dibuang sebelum padan",
  padanLib.includes('"KPM"') && padanLib.includes('"GURU"'));
perlu("Singkatan MOHD/MUHD/M. dianggap nama sama", padanLib.includes("SERUPA"));
perlu("Kurungan dibuang sebelum nama dipecah", padanLib.includes('replace(/\\([^)]*\\)/g'));
perlu("Awalan hanya diterima bila tiga perkataan pertama sama",
  padanLib.includes("pendek.length < 3") && padanLib.includes("panjang[i] === t"));
perlu("Nama terdekat ialah cadangan, bukan padanan",
  padanLib.includes("export function palingHampir") && tagLib.includes("palingHampir"));
const tagUi = baca("src/app/admin/guru-kelas/TagDariBuku.tsx");
perlu("Pentadbir melihat senarai sebelum menulis",
  tagUi.includes("Semak dahulu") && tagUi.includes("jalan(false)"));

/* PAUTAN KPM — satu tingkah laku, dipasang atau tidak.
   Aduan pengguna 26 Sep: di Windows dengan pelayar biasa, pautan KPM masih
   membuka tetingkap baharu kerana pintasan dahulu menuntut display-mode
   standalone. */
const pautanApp = baca("src/components/PautanDalamApp.tsx");
perlu("Pintasan tidak lagi menuntut app DIPASANG",
  !pautanApp.includes("!apl.matches") && !pautanApp.includes("display-mode: standalone"));
perlu("Pintasan kekal pada skrin besar sahaja",
  pautanApp.includes('matchMedia("(min-width: 1024px)")') && pautanApp.includes("!luas.matches"));
perlu("Kerja yang belum disimpan tidak dimusnahkan",
  pautanApp.includes("adaKerjaBelumSimpan") && /if \(adaKerjaBelumSimpan\(\)\) return;/.test(pautanApp));
perlu("Kotak semak dan radio turut dikesan",
  pautanApp.includes("defaultChecked") && pautanApp.includes("textarea"));
perlu("Klik Ctrl/Shift masih membuka tab sengaja",
  pautanApp.includes("e.metaKey") && pautanApp.includes("e.shiftKey"));

/* Larian kering pertama memulangkan SIFAR pada setiap lajur — dan sifar tidak
   memberitahu apa-apa. Penghurai kini mencari kelas merentas SELURUH baris
   (buku memecahkan tahun dan nama kelas ke lajur berasingan), dan larian
   kering menunjukkan bentuk sebenar buku bila tiada apa dikenali. */
perlu("Tahun diambil dari baris TAJUK, bukan dari baris data",
  bukuLib.includes("function tahunDariTajuk") && bukuLib.includes("labelRasmi"));
perlu("Sel bercantum (\"BIL KELAS\") turut diterima",
  bukuLib.includes('b === "BIL KELAS"'));
perlu("Guru PEMBANTU tidak boleh terpilih sebagai guru kelas",
  bukuLib.includes('b === "GURU KELAS"') && bukuLib.includes("PEMBANTU"));
perlu("PPKI dikenali walau ditulis tanpa awalan",
  bukuLib.includes("semuaKelasPPKI") && bukuLib.includes("PPKI ${bersih}"));
perlu("Larian kering menunjukkan bentuk buku bila sifar",
  tagLib.includes("diagnostik") && tagLib.includes("semuaBaris.slice"));

perlu("Guru ditag automatik sebaik akses diluluskan",
  tagLib.includes("export async function tagSatuGuru") &&
  baca("src/lib/akses-urus.ts").includes("tagSatuGuru"));
perlu("Tag automatik tidak boleh menggagalkan kelulusan",
  /after\(async \(\) => \{[\s\S]{0,200}tagSatuGuru/.test(baca("src/lib/akses-urus.ts")));
perlu("Dua kelas untuk orang sama TIDAK dipilih sendiri",
  tagLib.includes("padan.length !== 1"));

/* GURU KELAS DARIPADA JADUAL WAKTU — sumber yang pasti.
   Padanan daripada Buku Pengurusan memulangkan sifar kerana bentuk lajurnya
   berbeza setiap edisi. Jadual waktu mencetak "Guru kelas : NAMA" pada kepala
   SETIAP muka; disahkan pada 30 muka JW KELAS PETANG 31.7.2026. */
const bacaJadualLib = baca("src/lib/baca-jadual.ts");
perlu("Guru kelas dibaca dari kepala muka jadual",
  bacaJadualLib.includes("function guruKelasDariKepala") && /Guru\\s\*kelas/.test(bacaJadualLib));
perlu("Nama KEDUA ialah pembantu, bukan guru kelas",
  bacaJadualLib.includes("split(/[/&,]/)[0]") && bacaJadualLib.includes("PEMBANTU"));
perlu("Kaki muka tidak tersalah ambil sebagai nama",
  bacaJadualLib.includes("Jadual|aSc|Tarikh|Kelas"));
perlu("Tag daripada jadual menghormati tugasan sedia ada",
  tagLib.includes("export async function tagDariJadual") && tagLib.includes('keputusan: "sudah-ada"'));
const pukalUi = baca("src/app/admin/jadual/PukalJadual.tsx");
perlu("Guru kelas ditetapkan semasa jadual disimpan", pukalUi.includes("tagDariJadual"));
perlu("Kegagalan tag tidak menyembunyikan jadual yang tersimpan",
  pukalUi.includes("guru kelas gagal ditetapkan"));
perlu("Nama guru kelas dipapar sebelum simpan", pukalUi.includes("Guru kelas: {b.guruKelas}"));

/* BORANG KAWALAN BILIK DARJAH — tiruan borang kertas sekolah (gambar
   pengguna, 25 Sep 2026). Guru sudah kenal borang ini; yang "hampir sama"
   memaksa mereka membacanya semula setiap kali. */
const borangUi = baca("src/components/CetakKawalanBilikDarjah.tsx");
perlu("Tajuk borang sama seperti kertas",
  borangUi.includes("BORANG KAWALAN BILIK DARJAH"));
for (const medan of [
  "NAMA GURU KELAS", "BILANGAN MURID HADIR", "BIL TIDAK HADIR", "JUMLAH MURID",
  "Mata Pelajaran", "T/T Guru", "Bil Murid",
  "Senarai Nama Murid Tidak Hadir", "Catatan Salah Laku Murid",
]) perlu(`Borang ada medan "${medan}"`, borangUi.includes(medan));
// Ruang tandatangan DIBUANG: tandatangan sebenar dibuat dalam buku fizikal
// (keputusan pengguna). Ruang yang tidak pernah diisi hanya menimbulkan
// soalan kenapa ia kosong.
perlu("Tiada ruang tandatangan di bawah borang",
  !borangUi.includes('className="ttd"') && !borangUi.includes("garis-ttd"));
perlu("Semua nama dicetak huruf besar",
  borangUi.includes("text-transform: uppercase") && borangUi.includes('className="isi lebar nama"'));
perlu("Margin A4 15mm, tiada kandungan terpotong",
  borangUi.includes("margin: 15mm") && borangUi.includes("max-width: 100%"));
perlu("Senarai tidak hadir 20 baris dalam dua lajur",
  borangUi.includes("length: 10") && borangUi.includes("[0, 1].map"));
perlu("Catatan salah laku 5 baris", borangUi.includes("length: 5"));
// Tiga pepijat susun atur yang ditemui semasa render, bukan diandaikan.
perlu("Lajur tetap supaya Catatan tidak tertolak keluar halaman",
  borangUi.includes("table-layout: fixed"));
perlu("box-sizing border-box supaya padding tidak menambah lebar",
  borangUi.includes("box-sizing: border-box"));
perlu("Tajuk lajur boleh membalut", /th[^{]*\{[\s\S]{0,80}overflow-wrap/.test(borangUi));
perlu("Waktu ditulis jam 12 seperti borang kertas",
  borangUi.includes("j > 12 ? j - 12 : j"));
perlu("Waktu diambil dari set kelas, bukan disenaraikan tetap",
  baca("src/app/kawalan-kelas/PanelKawalanKelas.tsx").includes("setUntukKelas(jadual, kelasPilih)"));
perlu("Mata pelajaran dipilih, bukan ditaip bebas",
  baca("src/app/kawalan-kelas/PanelKawalanKelas.tsx").includes("kawalan-subjek"));

if (gagal.length) {
  console.error(`Kontrak modul gagal:\n${gagal.map((x) => `- ${x}`).join("\n")}`);
  process.exit(1);
}
console.log(`Kontrak modul: semua semakan lulus.`);
