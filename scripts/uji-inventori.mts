/**
 * Ujian inventori unit dan permohonan barang.
 *
 * Peraturan yang paling mudah dilanggar di sini ialah BAKI: permohonan yang
 * MENUNGGU tidak boleh menolak baki, hanya yang DILULUSKAN. Kalau tidak,
 * seorang guru yang meminta lima papan putih memaparkan kekurangan yang
 * tidak wujud, dan guru kedua berhenti memohon.
 */
import { baki, semakPermohonan, ikutKategori, NAMA_STATUS, type Barang } from "../src/data/inventori.ts";

let lulus = 0;
const gagal: string[] = [];
const uji = (n: string, syarat: boolean, nota = "") => {
  if (syarat) lulus++; else gagal.push(`${n}${nota ? ` — ${nota}` : ""}`);
};
const sama = (n: string, a: unknown, b: unknown) =>
  uji(n, JSON.stringify(a) === JSON.stringify(b), `dapat ${JSON.stringify(a)}, jangka ${JSON.stringify(b)}`);

// `kategori` guna `in` dan bukan `??`, supaya null yang SENGAJA diberi
// tidak diganti dengan nilai lalai — itulah kes yang sedang diuji.
const B = (x: Partial<Barang> = {}): Barang => ({
  id: x.id ?? "b1", unit: "ICT", nama: x.nama ?? "Laptop",
  kategori: "kategori" in x ? (x.kategori ?? null) : "Komputer",
  kuantiti: x.kuantiti ?? 10,
  dipinjam: x.dipinjam ?? 0, lokasi: null, nota: null,
  aktif: x.aktif ?? true,
});

/* ------------------------------------------------------------------ baki */

sama("baki penuh bila tiada dipinjam", baki(B({ kuantiti: 10 })), 10);
sama("baki ditolak yang dipinjam", baki(B({ kuantiti: 10, dipinjam: 3 })), 7);
sama("baki tidak pernah negatif", baki(B({ kuantiti: 2, dipinjam: 5 })), 0);
sama("dipinjam tiada dianggap sifar", baki({ ...B({ kuantiti: 4 }), dipinjam: undefined }), 4);

/* ------------------------------------------------------------- permohonan */

uji("permohonan biasa diterima",
  semakPermohonan({ kuantiti: 2, tujuan: "Kelas TMK Tahun 5" }, B()).ok);
uji("barang tiada ditolak",
  !semakPermohonan({ kuantiti: 1, tujuan: "Kelas TMK" }, undefined).ok);
uji("barang tidak aktif ditolak",
  !semakPermohonan({ kuantiti: 1, tujuan: "Kelas TMK" }, B({ aktif: false })).ok);
uji("kuantiti sifar ditolak",
  !semakPermohonan({ kuantiti: 0, tujuan: "Kelas TMK" }, B()).ok);
uji("kuantiti negatif ditolak",
  !semakPermohonan({ kuantiti: -3, tujuan: "Kelas TMK" }, B()).ok);
uji("kuantiti pecahan ditolak",
  !semakPermohonan({ kuantiti: 1.5, tujuan: "Kelas TMK" }, B()).ok);
uji("tujuan kosong ditolak",
  !semakPermohonan({ kuantiti: 1, tujuan: "  " }, B()).ok);
uji("tujuan terlalu pendek ditolak",
  !semakPermohonan({ kuantiti: 1, tujuan: "ab" }, B()).ok);

/* Melebihi baki ialah AMARAN, bukan penolakan. Unit mungkin ada stok yang
   belum direkodkan, atau boleh meminjam dari unit lain — unit yang
   memutuskan, bukan borang. */
const lebih = semakPermohonan({ kuantiti: 20, tujuan: "Bengkel guru" }, B({ kuantiti: 10, dipinjam: 4 }));
uji("melebihi baki TIDAK ditolak", lebih.ok);
uji("melebihi baki memberi amaran", (lebih.sebab ?? "").includes("6"));
uji("amaran menyebut jumlah dimiliki", (lebih.sebab ?? "").includes("10"));
uji("tepat pada baki tiada amaran",
  semakPermohonan({ kuantiti: 6, tujuan: "Bengkel guru" }, B({ kuantiti: 10, dipinjam: 4 })).sebab === undefined);

/* --------------------------------------------------------------- kategori */

const senarai = [
  B({ id: "1", nama: "Tetikus", kategori: "Aksesori" }),
  B({ id: "2", nama: "Laptop", kategori: "Komputer" }),
  B({ id: "3", nama: "Kabel HDMI", kategori: null }),
  B({ id: "4", nama: "Adapter", kategori: "  " }),
  B({ id: "5", nama: "Komputer meja", kategori: "Komputer" }),
];
const kum = ikutKategori(senarai);
sama("tiga kategori", kum.map((k) => k.kategori), ["Aksesori", "Komputer", "Lain-lain"]);
uji("Lain-lain di hujung", kum[kum.length - 1].kategori === "Lain-lain");
sama("kategori tanpa nama dikumpul bersama",
  kum.find((k) => k.kategori === "Lain-lain")?.barang.length, 2);
sama("barang disusun ikut nama dalam kategori",
  kum.find((k) => k.kategori === "Komputer")?.barang.map((b) => b.nama),
  ["Komputer meja", "Laptop"]);
sama("senarai kosong tiada kategori", ikutKategori([]).length, 0);

sama("setiap status ada namanya", Object.keys(NAMA_STATUS).length, 4);

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
for (const g of gagal) console.log(`  ✗ ${g}`);
process.exit(gagal.length === 0 ? 0 : 1);
