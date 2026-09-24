# Memori kesinambungan SKTD

Kemas kini terakhir: **22 September 2026** (audit Claude selepas sesi Codex/Copilot/Gemini). Fail ini ialah rekod bersama untuk
Claude dan Codex. Baca sebelum mengubah portal atau laman awam supaya keputusan
yang sudah dimuktamadkan tidak diperkenalkan semula sebagai pepijat.

## Kedudukan produksi

- Portal: `/Users/syaifulizhan/Projects/sktd/sktd-portal`, GitHub `main`, Vercel.
  Commit fungsi terkini: `7f612ef`.
- Laman awam: `/Users/syaifulizhan/Projects/sktd/sktd-web`, GitHub `main`,
  Cloudflare Worker. Commit fungsi terkini: `0166ac0`.
- `sktd.edu.my`, `/tentang`, tiga laluan Borang Sekolah awam dan API jumlah
  murid memberi HTTP 200 pada audit akhir.
- Audit akhir: TypeScript lulus dan **710 semakan kontrak lulus, 0 gagal**.

## Keputusan yang tidak boleh diregresikan

- Laman utama `sktd.edu.my` menggunakan Cloudflare. Vercel hanya untuk portal.
- Admin, pentadbir dan admin mutlak mempunyai kuasa operasi penuh. Hanya admin
  mutlak boleh mengubah akaun berperanan admin.
- Guru/pengguna biasa hanya melihat hantaran Borang Sekolah dan Disiplin yang
  mereka sendiri buat. Guru Disiplin melihat semua disiplin. Pada kad Guru
  Kelas, guru kelas mendapat paparan baca sahaja bagi Kebenaran Gambar dan
  disiplin murid kelasnya. Pentadbir melihat semua kelas.
- Perkara yang membawa label kelas mesti memberitahu guru kelas kelas itu.
  Pentadbir, admin dan admin mutlak menerima semua kejadian sistem.
- Kad ujian notifikasi sudah dibuang; status aktif ringkas dikekalkan.
- Semua konsep hantaran yang sesuai mempunyai sunting/padam dengan semakan
  kuasa di pelayan, bukan sekadar menyembunyikan butang.

## Modul yang siap

- **ePBD:** import satu fail dan ZIP pukal, OCR dalam pelayar/PWA, putaran
  0/90/180/270 darjah, fail PDF/gambar/Office/CSV/TXT, kad kelas akordion,
  pemilih kelas/subjek boleh cari dan perlindungan import serentak.
- **ePBD-Guru:** admin/pentadbir/admin mutlak boleh membuka semua kelas dan
  subjek walaupun bukan guru kelas. Guru biasa kekal mengikut tugasan.
- **Slip PBD:** jadual hanya Mata Pelajaran, TP dan Sumatif; tafsiran TP di
  bawah; tiada tandatangan guru kelas atau ibu bapa.
- **UASA:** Tahun 6 sahaja, suis per sesi, gred A/B/C dan slip berasingan yang
  hanya mengandungi TP + UASA. Slip hanya muncul selepas suis aktif dan ada
  gred. Migrasi: `supabase/migrations/20260920_uasa_berasingan.sql`.
- **Guru Kelas:** tambah murid, apung, masukkan semula dan pindah keluar.
  Sumber pusat `pbd_murid`/`pbd_pendaftaran` mengemas kini ePBD, disiplin,
  borang, RMT dan statistik awam.
- **RMT, Kawalan Kelas, Disiplin & Sahsiah:** berfungsi, responsif dan
  mempunyai pengurusan kuasa, sunting/padam serta paparan kelas yang padat.
- **Borang Sekolah:** hanya Kebenaran Gambar dan Surat Akuan Penyertaan
  Aktiviti dipapar kepada orang awam. Aktiviti awam hanya yang aktif; orang
  awam tidak boleh mencipta aktiviti. Surat rasmi satu halaman dan ruang
  tandatangan Guru Besar/wakil dibiarkan kosong.
- **Cetakan:** halaman pratonton mempunyai Kembali. iPhone, Android dan PWA
  menjana fail PDF sebenar menggunakan `jspdf` + `html2canvas-pro`, kemudian
  kongsi/simpan dengan pautan sandaran. Desktop menggunakan dialog cetak.
- **Tempahan bilik:** grid Isnin–Jumaat, pagi/petang, slot biru; selepas klik,
  bilik kosong hijau dan ditempah merah. Boleh pilih banyak bilik/waktu.
  Tempahan biasa siapa dahulu mendapat slot; cuti/hujung minggu menunggu
  kelulusan pentadbir dan disemak semula ketika diluluskan.
- **Carta organisasi:** rekod GAB/GAG dan kakitangan boleh disunting/dipadam;
  pembetulan manual kekal apabila Buku Pengurusan baharu dimuat naik.
- **Buku Pengurusan/Jadual/Takwim:** penghurai berdasarkan tajuk/koordinat,
  bukan nombor muka; pembetulan tersimpan digunakan semula. PPKI disokong.
- **Laman awam:** kad pembinaan dibuang. Jumlah murid laman utama dan Tentang
  menggunakan API agregat yang sama tanpa polling 30 saat; cache pelayar lima
  minit dan edge sepuluh minit.
- **Notifikasi:** loceng + Web Push sebenar, penerima disasarkan mengikut guru
  kelas, guru disiplin, RMT, pengurus pasukan, Unit ICT dan kerani; admin penuh
  menerima semuanya.

## Pepijat utama yang telah ditutup

- RPC `import_murid_kelas` tiada: import kini menggunakan operasi jadual
  idempoten (`c3d2081`).
- ZIP ePBD membaca `.ocr.txt` sebagai fail tidak disokong: teks OCR dihantar
  terus kepada penghurai yang sama dengan import solo (`8b732ac`).
- Kebenaran Gambar menjadi 22 halaman: kandungan cetak diasingkan daripada
  portal dan pratonton React dibina (`3cb0a86`, `648e189`).
- `window.print()` senyap dalam PWA/telefon: PDF sebenar dijana (`f4c821a`).
- Push hanya tersimpan pada loceng dan tidak sampai ke peranti: penghantaran
  Web Push serta pembersihan langganan mati ditambah (`7612c84`).
- Disiplin gagal akibat skema/kuasa lama: kontrak skema, pemilikan dan kuasa
  admin disatukan (`5c6cafc`, `6273dec`, `7f612ef`).
- Statistik murid Tentang dan halaman utama tidak sama serta polling kerap:
  kedua-duanya disatukan kepada API bercache (`0e35088`, `0166ac0`).
- UASA bercampur dalam slip biasa: dipisahkan sepenuhnya (`c9d8e9e`).
- Ujian Borang Sekolah lama masih menuntut `window.print()` mudah alih; kontrak
  dikemas kini supaya mengunci PDF sebenar pada audit akhir.

## Had yang masih perlu dipantau

- Aliran PDF mudah alih lulus kontrak kod, TypeScript dan build Vercel, tetapi
  penerimaan akhir pada setiap versi iOS/Android tetap perlu dibuat pada
  peranti sebenar kerana helaian kongsi dikawal sistem operasi.
- Web Push memerlukan pengguna memberi izin dan PWA/pelayar mengekalkan
  langganan. Langganan 404/410 dibuang automatik.
- OCR ZIP besar menggunakan CPU/RAM peranti. Worker OCR digunakan semula dan
  fail diproses berurutan untuk mengurangkan penggunaan; jangan pindahkan fail
  murid mentah ke storan pelayan tanpa keperluan.
- Tandatangan kini boleh mencapai 350 KB setiap borang dalam pangkalan data.
  Apabila jumlah borang meningkat besar, pindahkan imej tandatangan ke Supabase
  Storage dan simpan URL sahaja.
- Wrangler kadang-kadang memberi amaran semasa cuba melampirkan semula domain
  `sktd.edu.my`, tetapi aset/Worker berjaya dimuat naik dan domain hidup memberi
  HTTP 200. Betulkan `zone_id` Wrangler jika konfigurasi domain perlu diubah.

## Cara bekerja yang diminta pengguna

- Teruskan kerja tanpa soalan rutin; uji sendiri, commit, push dan deploy.
- Jika SQL baharu diperlukan, kumpulkan semuanya sekali di hujung laporan
  untuk pengguna jalankan secara manual.
- Utamakan telefon/PWA serta laptop, medan tidak boleh melimpah keluar kad.
- Kepala surat dan borang mesti meniru dokumen sekolah, A4 dengan orientasi
  yang betul. Jangan tambah teks teknikal ke UI pengguna.
- Simpan laporan ringkas dan kemas kini fail ini selepas perubahan besar.


## Audit 22 Sep 2026 (Claude) — keputusan yang JANGAN diregresikan

- **Cetakan borang meniru PDF asal sebijik** (`rujukan-borang/`):
  `CetakAkuan` = Surat Akuan Waris + Perakuan Kesihatan, A4 landskap satu
  helaian (Jata kiri, lencana kanan; logo MSS Selangor DIBUANG atas arahan
  pengguna 22 Sep — kepala kanan Jata + KPM/JPN Selangor sahaja; ayat & ejaan asal termasuk "mengidap",
  "Insuran", "Hemophillia"; ADA/TIDAK ADA dan membenarkan/tidak dicoret).
  `CetakMedia` = lampiran SS KPM 9/2024 dua muka bernombor 4 & 5, garis
  isian berasingan. `CetakSurat` = format surat 09.09.2026: tarikh
  `dd.mm.yyyy`, "Dengan hormatnya…" + perenggan bernombor, "Sekian.",
  nama GB tidak tebal. Kepala surat: `kepalaSurat()` (alamat 3 baris,
  011-3181 6558, BBA8284@moe.edu.my).
- **Borang Aktiviti:** jurulatih/pengurus memilih peserta melalui carian
  murid di pelayan (`cariMuridAktiviti`, nama/kelas/MyKid) — MyKid diisi
  automatik. Ibu bapa hanya menaip nama + MyKid; kelas diambil daripada
  senarai peserta. Murid yang tidak dipilih ditolak. Padanan nama longgar
  (`namaSepadan`: BT/BINTI, A/L). Tandatangan penjaga wajib, dicetak pada
  kedua-dua muka. Had cubaan dikunci **IP + MyKid** (CGNAT telco).
- **Senarai panjang = `PilihCari`** (carian berbilang perkataan, anak
  panah + Enter): guru kelas (57×130), tugasan lain, kelas di Borang,
  Kebenaran Gambar, Disiplin (nama murid juga — `<datalist>` tidak
  berfungsi di iPhone), Kawalan Kelas, RMT, Jadual, bilik subjek.
  Borang awam: kelas bermula KOSONG dan wajib dipilih.
- **Notifikasi:** push TTL 24 jam + `urgency: high` (TTL 300 dahulu
  membuang push bila telefon tidur). Halaman Notifikasi mengikat semula
  langganan peranti kepada akaun yang sedang log masuk setiap kali dibuka
  (dua akaun satu pelayar). iPhone dalam Safari biasa mendapat arahan
  "Tambah ke Skrin Utama" (push iOS hanya untuk app dipasang). Kunci VAPID
  bertukar → langganan lama dibuang & dilanggan semula. Butang "Matikan".
- **ZIP ePBD:** PDF imbasan dikesan DI PELAYAR (`pdfTanpaTeks`) dan terus
  ke OCR — tiada muat naik 30 MB ke pelayan. Wake Lock menahan skrin
  hidup; arah fail sebelumnya dicuba dahulu. Diuji pada ZIP sebenar:
  Tahap 1 30 fail/1,166 murid, Tahap 2 27 fail, 0 ditolak, ±8–10 s/fail
  (desktop). `betulkanNamaOcr`: "ZZ…"→"IZZ…", "BINT"→"BINTI".
- **Isi Surat Rasmi (keputusan pengguna 22 Sep 2026):** format gaya WhatsApp
  `*tebal*` `_italik_` `~coret~` (butang B/I/S di `EditorIsiSurat`, mesra
  telefon). **Nombor perenggan DITAIP guru** — sistem tidak menomborkan;
  baris bernombor diberi inden tergantung, baris di bawahnya sejajar teks,
  baris "Label : nilai" berturutan dijajar titik bertindihnya. "Dengan
  hormatnya perkara di atas adalah dirujuk." dicetak oleh templat. Surat
  lama (sebelum 22 Sep, tanpa `formatIsi: 2`) kekal bernombor automatik
  bermula 2. Logik: `src/data/isi-surat.ts`, paparan: `src/components/IsiSurat.tsx`.
- **Tandatangan (22 Sep 2026):** foto telefon diproses di pelayar dengan
  ambang SETEMPAT (latar kertas per blok) — ambang tetap RGB>235 lama gagal
  pada kertas kelabu/cahaya tidak sekata dan menghasilkan PNG 1–3 MB yang
  ditolak. Output: dakwat biru tua lut sinar ≤ 600×200 px (±10–20 KB).
  Butang muat naik = kotak besar berbingkai `[ Tekan di sini … ]`, bukan
  "Choose File" pelayar. Kod: `src/data/tandatangan-imej.ts`.
- **Carian pepijat 22 Sep (lewat malam):** tarikh "hari ini" WAJIB
  `hariIniMY()` (`src/data/tarikh-my.ts`) — UTC memberi semalam sebelum
  8 pagi. Naik tahun membawa status `ulang`; setiap bacaan berhalaman
  mesti ada `order=`; patah balik membaca sesi sasaran berhalaman.
  Server Action yang memasukkan nombor/tarikh/ID ke URL PostgREST guna
  `sahInt/sahTarikh/sahUuid` (`src/lib/sah.ts`). Jumlah murid awam:
  `count=exact`, dicache Worker 5 minit, dibakar ke HTML semasa binaan
  `sktd-web` (`src/lib/jumlah-murid.ts`). Borang aktiviti ada
  `tarikh_tamat` (migrasi `20260922_aktiviti_tarikh_tamat.sql`), paparan
  `julatTarikh()`.
- **Pautan luar dalam app (22 Sep):** bila portal/laman dipasang sebagai
  app di laptop, pautan `target="_blank"` (portal KPM, eRPM) dibuka dalam
  tetingkap app yang sama — `src/components/PautanDalamApp.tsx` (kedua-dua
  repo). Pelayar biasa tidak berubah. Safari macOS mungkin tetap membuka
  pelayar (had sistem, bukan pepijat).

## Arahan untuk SEMUA AI (22 Sep 2026)

Pengguna menggunakan Claude Code, Codex, GitHub Copilot dan Gemini Code
secara bergilir. Fail ini ialah SATU sumber memori bersama. Setiap repo
(`sktd`, `sktd-portal`, `sktd-web`) ada:
`CLAUDE.md` (Claude) · `AGENTS.md` (Codex) · `.github/copilot-instructions.md`
(Copilot) · `GEMINI.md` (Gemini). Bila keputusan baharu dibuat, kemas kini
FAIL INI dahulu, kemudian peraturan ringkas dalam fail arahan jika ia
peraturan keras.

## Tindakan tertunggak (pengguna)

- Clerk → Configure → Sessions → Customize session token: tambah
  `{"emel": "{{user.primary_email_address}}", "nama": "{{user.full_name}}"}`
  (belum disahkan dibuat).
- Uji pada telefon sebenar: tandatangan dari foto, jadual waktu > 4 MB dari
  telefon (laluan storan terus), PDF cetakan, push iPhone (app dipasang).
- Web Push perlu `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` di Vercel.
- **Tandatangan LUT SINAR (23 Sep):** kanvas Lukis tidak lagi diisi putih
  (latar putih yang dilihat datang dari CSS). Cetakan guna
  `mix-blend-mode: multiply` supaya tandatangan LAMA yang tersimpan
  berlatar putih tidak menutup garisan borang.
- **Notifikasi akses (23 Sep):** mesej "Akses portal diluluskan" ialah
  `peribadi: true` — pentadbir TIDAK lagi menerimanya. Sebaliknya, log
  masuk pertama pengguna baharu menghantar "Pengguna baharu menunggu
  kelulusan — NAMA (emel)" kepada pentadbir, berpaut ke `/admin/akses`.
  Halaman Notifikasi: tab Semua/Belum dibaca, penapis jenis, ikon bulat,
  titik merah belum dibaca, rangka semasa memuat.

## Audit forensik 24 Sep 2026 (Claude) — pembaikan yang JANGAN diregresikan

- `src/app/error.tsx` + `global-error.tsx` + `not-found.tsx`: sebelum ini hanya
  `/admin` ada sempadan ralat; kegagalan di laluan lain memberi skrin
  "Application error" kosong.
- `loading.tsx` untuk 25 laluan tambahan (`RangkaMuat`), peraturan keras #32.
- 25 pengendali klien dibungkus try/catch/finally + 4 kemas kini optimistik
  (Pindaan, Notifikasi, Disiplin) kini BERPATAH BALIK bila pelayan gagal.
  Sebelum ini butang kekal "Menyimpan…" selama-lamanya tanpa mesej.
- Kontras WCAG: `text-slate-400` (2.56:1, 100 tempat) dan `text-slate-300`
  → `text-slate-500` (4.76:1); tajuk kecil `text-emas` pada latar cerah
  (2.4:1) → `text-emas-gelap` #8a6a1f (5.05:1); bar bawah `text-white/45`
  (3.76:1) → `white/70` (6.83:1).
- `pecahFormat` kini BERULANG, bukan rekursif (tindanan pelayar telefon).
- `julatTarikh` tidak lagi menghempas bila nilai bukan teks.
- Keadaan KOSONG ditambah: Disiplin, Kawalan Kelas, Pindaan Buku Pengurusan.

## Supabase: geran Data API (30 Okt 2026)

Supabase berhenti memberi akses Data API secara automatik kepada jadual
BAHARU dalam `public`. Jadual sedia ada tidak terjejas — tiada apa yang
rosak pada 30 Okt. Tetapi setiap migrasi baharu MESTI menyertakan
`grant ... to service_role` (dan `grant select ... to anon` hanya untuk
jadual `web_*` awam), jika tidak modul baharu akan gagal dengan
"permission denied" walaupun SQL berjaya dijalankan. Jaring keselamatan
untuk pembinaan semula projek: `sktd/supabase/geran-data-api.sql` —
**sudah dijalankan pada pangkalan data pengeluaran, 24 Sep 2026, tanpa ralat**
(versi 2; versi 1 gagal 42P01 kerana cuba menggeran objek milik sambungan).
