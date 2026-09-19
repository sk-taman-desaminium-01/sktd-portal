# Skema Supabase

Fail SQL dalam folder ini ialah kontrak pangkalan data portal. Jangan salin
potongan SQL daripada perbualan atau ubah jadual terus tanpa menyimpan fail
yang sepadan di sini.

Untuk setiap modul baharu atau pindaan skema:

1. Tambah SQL idempoten dalam fail bertarikh di `supabase/migrations/`.
2. Tambah semakan kod ↔ SQL dalam `scripts/uji-kontrak-modul.mts` apabila ia
   menggunakan kolum, kekangan unik, atau RPC baharu.
3. Jalankan `npm run uji:kontrak-modul` dan `npm run uji:kuasa` sebelum commit.
4. Commit kod dan SQL bersama, kemudian jalankan fail SQL itu sekali di
   Supabase sebelum menerbitkan kod yang memerlukannya.

`pembaikan-disiplin.sql` ialah patch serasi untuk pemasangan awal yang dibuat
melalui SQL Editor. Ia boleh dijalankan berulang kali; jika ia melaporkan
murid RMT pendua, baiki pendua itu dahulu supaya rekod kehadiran tidak hilang.
