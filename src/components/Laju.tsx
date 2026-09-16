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
const PERATURAN = {
  prerender: [
    { where: { href_matches: "/portal/*" }, eagerness: "moderate" },
  ],
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
