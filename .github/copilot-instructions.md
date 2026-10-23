# Arahan GitHub Copilot

## Peraturan bersama SEMUA AI (Claude · Codex · Copilot · Gemini) — SKTD

Projek sekolah **SK Taman Desaminium**. Pengguna ialah guru (bukan pengaturcara
sepenuh masa) — jawab dalam **Bahasa Melayu**, ringkas, laporkan pepijat sendiri
secara jujur. Memori bersama (WAJIB baca dahulu):
`sktd-portal/docs/PROJECT_MEMORY.md` — https://github.com/sk-taman-desaminium-01/sktd-portal/blob/main/docs/PROJECT_MEMORY.md

### Repo & hos
| Repo | Hos | Identiti commit |
|---|---|---|
| `sktd-portal` (portal kakitangan, Next 16, Clerk, Supabase) | Vercel akaun sekolah, auto-deploy dari `main` | `SK-Taman-Desaminium` / `328302342+SK-Taman-Desaminium@users.noreply.github.com` |
| `sktd-web` (laman awam statik + Worker) | Cloudflare Workers, bina dari `main` | `syaifulizhan` / `286102471+syaifulizhan@users.noreply.github.com` |
| `sktd` (dokumen, SQL, transkrip) | — | sama seperti `sktd-web` |
Repo `gpi`/`erpm` (eGPI) TIDAK BOLEH disentuh. `sktd-mockup` dibekukan.

### Cara kerja yang pengguna minta
- e-Keberhasilan: automatic per-target marks from numeric target/achievement
  (capped at 100); preserve valid zero and legacy marks until measured.
- e-Keberhasilan: only trusted admin mutlak manages all forms/PP settings and
  confirms/approves any form (including own). Every other PP sees only own
  form plus assigned PYDs. Ordinary admin is not Pentadbir or Admin Mutlak.
- Borang Keberhasilan print/preview: KPM logo only; no school crest (owner, 23 Oct).
- e-Keberhasilan: five fixed bidang = Pentadbiran, Kurikulum, Hal Ehwal Murid,
  Kokurikulum, Tugas Sampingan (in order). Preserve existing sasaran;
  extra bidang remain user-editable.
- Commit = push, terus, tanpa tanya. Semak/uji SEBELUM commit — jangan push bila ujian gagal.
- SQL baharu: beri **kod SQL penuh** di hujung laporan (idempoten), jangan suruh buka fail.
- Jangan baca `.env.local` atau rahsia. Repo `sktd-portal` AWAM — tiada rahsia dalam kod.
- Selepas ubah CSS/cetakan: tangkap skrin & banding (telefon DAN laptop).
- Next.js 16: baca `node_modules/next/dist/docs/` dahulu; `proxy.ts` bukan `middleware.ts`.
- Istilah "pentadbir" (bukan PKP). Peranan: guru, kakitangan, kerani, unit_ict, pentadbir, admin (+ admin mutlak dari env).

### Peraturan keras yang paling kerap dilanggar
1. Jadual > 1,000 baris: baca berhalaman (`bacaSemua`) DENGAN `order=` tetap.
2. "Hari ini" = `hariIniMY()` (Asia/Kuala_Lumpur). UTC = semalam sebelum 8 pagi.
3. Server Action: sahkan input (`sahInt/sahTarikh/sahUuid`) sebelum masuk URL PostgREST.
4. Apa yang sampai ke pelayar = awam (K8): jangan hantar No. KP/emel yang tidak perlu ke Client Component.
5. Senarai > 8 pilihan WAJIB boleh dicari (`PilihCari`). Borang awam: kelas bermula kosong.
6. `catch` jangan pulangkan senarai kosong secara senyap.
7. Fail ke Server Action: guna `sediaMuatan()` (≤3 MB base64, lebih besar terus ke storan) — had badan Vercel 4.5 MB.
8. Cetakan borang meniru PDF asal dalam `sktd-portal/rujukan-borang/` SEBIJIK (ayat, ejaan, susunan, A4). Borang kesihatan TANPA logo MSS.
9. Isi surat rasmi: gaya WhatsApp `*tebal*` `_italik_` `~coret~`; nombor perenggan DITAIP guru.
10. Naik tahun (1 Jan) mesti membawa status `ulang` dan boleh dipatah balik sepenuhnya.
11. Fungsi baca yang menyokong borang SEMUA guru jangan disekat senyap dengan semakan guru kelas (`kelasBolehSunting`/`bolehUrusKelas`) — kawal pada tindakan TULIS/SAHKAN, bukan pada senarai. Bila senarai kosong, paparkan sebabnya; jangan biar panel kosong.

### Khusus repo ini (sktd-portal)
- Ujian: `npx tsc --noEmit && npx eslint src --quiet` dan semua `npm run uji:*` (16 suite) — kesemuanya mesti lulus.
- Build: `npm run build`. Push ke `main` = deploy Vercel.
- Lalai TERTUTUP: laluan baharu dilindungi `src/proxy.ts` kecuali disenaraikan awam.

### Geran Data API (Supabase, berkuat kuasa 30 Okt 2026)
Setiap migrasi yang MENCIPTA jadual dalam `public` MESTI menyertakan geran
dalam migrasi yang sama, jika tidak jadual itu tidak dapat dibaca melalui
Data API (termasuk oleh kunci rahsia portal):

    grant select, insert, update, delete on public.nama_jadual to service_role;
    -- anon hanya untuk kandungan awam (web_*), dan RLS tetap menapis baris:
    -- grant select on public.web_sesuatu to anon;

Jaring keselamatan sedia ada: `supabase/geran-data-api.sql` (repo `sktd`).

## Jadual Waktu: kiraan slot BUKAN bukti betul (11 Okt 2026)

Penghurai jadual PDF (`src/lib/jadual-huraian.ts`) pernah melapor "48/50 slot"
untuk jadual yang 353 waktunya salah — Moral hilang, guru bertukar antara petak.

- Tahap 1 (petang) dan Tahap 2 (pagi, berhimpit) BERBEZA rupa. Sebarang
  perubahan penghurai mesti lulus `npm run uji:jadual` (mengunci kedua-duanya)
  DAN `npm run sahih:jadual -- fail.pdf` pada fail sebenar kedua-dua tahap.
- Jangan buang `h`/`f` daripada `ItemTeks`, jangan senyapkan
  `HasilHuraian.amaran`, jangan padan nama guru ikut pusat teks (ikut TEPI
  KANAN petak). Butiran: `docs/PROJECT_MEMORY.md`.

## e-Keberhasilan (23 Okt 2026)
Kuasa ditentukan per borang di `src/lib/keberhasilan.ts` dan `gabungIkutKuasa()` dalam `src/data/keberhasilan.ts` — satu-satunya pintu tulisan jadual `ekb_*`. Pemerhati hanya ringkasan; No. K/P hanya kepada PYD; markah 0 sah. Butiran: `docs/PROJECT_MEMORY.md`.
