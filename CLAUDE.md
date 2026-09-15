@AGENTS.md

# sktd-portal — Portal Kakitangan SKTD (hab + CMS)

Repo: `sk-taman-desaminium-01/sktd-portal` · Hos: **Vercel** · Domain: `portal.sktd.edu.my` *(cadangan)*
Tugasan rasmi: `../docs/tugasan-sktd.md`. Peraturan keras: `../CLAUDE.md`.

Commit: `git config user.email 286102471+syaifulizhan@users.noreply.github.com`

## Kenapa repo & hos BERASINGAN dari laman awam

Laman awam (`sktd-web`) ialah **eksport statik** di Cloudflare — laju, percuma,
0 bacaan DB setiap lawatan. Ia TIDAK boleh menjalankan middleware, jadi ia tidak
boleh melindungi laluan.

Portal perlu Clerk + perlindungan sisi pelayan, jadi ia perlu SSR. Adapter
OpenNext masih tidak serasi dengan seni bina Proxy Next 16
(cloudflare/workers-sdk#13755), jadi portal duduk di **Vercel** yang menjalankan
Next secara asli.

Satu Clerk instance pada domain akar → log masuk sekali, guna semua subdomain.

## Peraturan yang paling mudah dilanggar di sini

1. **Lalai TERTUTUP.** `src/proxy.ts` melindungi SEMUA kecuali senarai pendek
   laluan awam. Halaman baharu yang kita lupa fikirkan adalah tertutup, bukan
   terdedah. Jangan tukar kepada senarai-hitam.
2. **Next 16 guna `proxy.ts`, bukan `middleware.ts`.** Disahkan dalam
   `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
3. **Terbit MESTI mencetuskan binaan semula laman awam.** Lihat
   `src/lib/bina-semula.ts`. Tanpa panggilan itu, pos tersimpan dalam Supabase
   tetapi TIDAK PERNAH muncul di sktd.edu.my — dan admin tidak akan tahu.
4. **`CLERK_SECRET_KEY` dan `CLOUDFLARE_DEPLOY_HOOK` ialah RAHSIA.** Hanya dalam
   env Vercel dan `.env.local` (diabaikan git). Jangan sekali-kali dalam kod.
5. Istilah **"pentadbir"**, bukan "PKP". Peranan: `guru` | `kakitangan` |
   `pentadbir` | `admin`.

## Toolchain
Next 16.3.5 · React 19.2 · Clerk 7.9.3 (+ `@clerk/localizations` ms-MY) ·
Tailwind v4 · `src/` · alias `@/*` · Node 22.
