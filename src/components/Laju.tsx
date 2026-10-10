/**
 * Mulakan pemuatan halaman portal SEBELUM klik selesai.
 *
 * Portal ialah app SSR: setiap halaman ialah satu perjalanan penuh ke
 * pelayan. Diukur pada rangkaian pengguna sebenar (16 Sep 2026), perjalanan
 * itu sendiri memakan 0.5–1.5 saat sebelum sebarang kerja bermula — jaraknya,
 * bukan pelayannya.
 *
 * `moderate` memulakan kerja apabila kursor berlegar (~200ms sebelum klik).
 * Semua halaman portal selamat dipramuat: tiada satu pun mengubah data
 * dengan GET. Borang dan tindakan menggunakan Server Action (POST), yang
 * TIDAK pernah dicetuskan oleh pramuat.
 *
 * Laluan keluar ke laman awam disenaraikan berasingan. Apabila portal dibuka
 * melalui `sktd.edu.my/portal`, laman awam itu sama-asal, jadi ia benar-benar
 * dipraterjemah; apabila dibuka melalui `portal.sktd.edu.my`, pelayar
 * menurunkannya menjadi pramuat sahaja. Kedua-duanya lebih baik daripada
 * bermula dari sifar selepas klik.
 */
/*
 * `prerender` untuk "/portal/*" DIBUANG pada 11 Okt 2026.
 *
 * Diukur dalam Chrome berlog masuk: setiap klik pautan dalam portal ialah
 * navigasi DALAM-APP — Next memintas klik itu dan mengambil RSC sendiri.
 * Pelayar tidak pernah melakukan navigasi dokumen, jadi halaman yang
 * dipraterjemah TIDAK PERNAH diaktifkan (`activationStart` kekal 0 pada
 * kedua-dua ujian: /admin dan /pejabat). Peraturan itu hanya boleh
 * menghasilkan SSR penuh yang dibuang bagi setiap kursor yang berlegar —
 * terhadap had Vercel 1,000,000 permintaan dan 4 jam CPU sebulan. Tiada
 * `<a>` biasa ke halaman portal dalam kod; kelajuan kini datang daripada
 * `Pautan` (pramuat RSC bila kursor atau jari menyentuh pautan).
 *
 * Yang tinggal ialah pautan KELUAR ke laman awam: itu memang navigasi
 * dokumen, jadi pramuat pelayar benar-benar dipakai.
 */
const PERATURAN = {
  prefetch: [
    { where: { href_matches: "https://sktd.edu.my/*" }, eagerness: "moderate" },
  ],
};

export default function Laju() {
  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(PERATURAN) }}
    />
  );
}
