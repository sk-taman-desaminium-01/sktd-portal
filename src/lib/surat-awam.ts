"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import { klienTulis } from "./supabase-pelayan";
import { tahunSesiAktif } from "./sesi-aktif";
import { hantar, emelIkutPeranan } from "./notifikasi";
import type { DataSuratGambar } from "./surat";

export interface InputKebenaranGambarAwam {
  penjagaNama: string;
  penjagaKp: string;
  alamat: string;
  telefon: string;
  muridNama: string;
  muridKp: string;
  muridKelas: string;
  bersetuju: boolean;
  catatan?: string;
  tandatangan_url: string | null;
  lamanPerangkap?: string;
}

export type HasilKebenaranGambarAwam = {
  ok: boolean;
  mesej: string;
  id?: string;
  dicipta?: string;
  guruKelasNama?: string;
};

const EMEL_AWAM = "borang-awam@sktd.invalid";
const kelasSah = new Set([...semuaKelas(), ...semuaKelasPPKI()]);
const hash = (nilai: string) => createHash("sha256").update(nilai).digest("hex");
const sama = (nilai: string) => nilai.toUpperCase().replace(/[^A-Z0-9]/g, "");

class RalatBorangAwam extends Error {}
function gagal(mesej: string): never { throw new RalatBorangAwam(mesej); }

function pecahKelas(label: string): { tahun: number; kelas: string } | null {
  const bersih = label.trim().toUpperCase();
  if (bersih.startsWith("PPKI ")) return { tahun: 0, kelas: bersih };
  const padan = /^([1-6])\s+(.+)$/.exec(bersih);
  return padan ? { tahun: Number(padan[1]), kelas: padan[2] } : null;
}

function teks(nilai: string, minimum: number, maksimum: number, label: string) {
  const bersih = nilai.trim().replace(/\s+/g, " ");
  if (bersih.length < minimum || bersih.length > maksimum) gagal(`${label} tidak lengkap atau terlalu panjang.`);
  return bersih;
}

function mesejAwam(error: unknown) {
  return error instanceof RalatBorangAwam
    ? error.message
    : "Borang tidak dapat disimpan buat masa ini. Cuba lagi atau hubungi pihak sekolah.";
}

async function guruKelasBagi(label: string): Promise<{ nama?: string; emel: string[] }> {
  const bahagian = pecahKelas(label);
  if (!bahagian || !kelasSah.has(label.trim().toUpperCase())) return { emel: [] };
  const sesi = await tahunSesiAktif();
  const baris = (await klienTulis().minta(
    `pbd_guru_kelas?select=pbd_guru(nama,email)&tahun_sesi=eq.${sesi}&peranan=eq.guru_kelas` +
    `&tahun=eq.${bahagian.tahun}&kelas=eq.${encodeURIComponent(bahagian.kelas)}`,
  )) as { pbd_guru: { nama: string | null; email: string | null } | null }[];
  return {
    nama: baris.map((b) => b.pbd_guru?.nama?.trim()).find(Boolean),
    emel: [...new Set(baris.map((b) => b.pbd_guru?.email?.toLowerCase() ?? "").filter(Boolean))],
  };
}

/** Nama sahaja untuk pratonton awam; label dihadkan kepada senarai kelas sah. */
export async function namaGuruKelasBorangAwam(label: string): Promise<string> {
  return (await guruKelasBagi(label)).nama ?? "";
}

/**
 * Tindakan awam yang sengaja berdiri sendiri daripada tindakan kakitangan.
 * Semua kuasa, kadar dan padanan murid disemak semula di pelayan kerana
 * Server Action ialah endpoint awam walaupun butangnya hanya wujud di UI.
 */
export async function hantarKebenaranGambarAwam(input: InputKebenaranGambarAwam): Promise<HasilKebenaranGambarAwam> {
  try {
    if (input.lamanPerangkap) gagal("Borang tidak dapat dihantar.");
    const penjagaNama = teks(input.penjagaNama, 2, 150, "Nama ibu bapa atau penjaga");
    const alamat = teks(input.alamat, 5, 500, "Alamat");
    const telefon = teks(input.telefon, 7, 30, "Nombor telefon");
    const muridNama = teks(input.muridNama, 2, 150, "Nama murid");
    const catatan = input.catatan?.trim().slice(0, 300) || undefined;
    const penjagaKp = input.penjagaKp.replace(/[- ]/g, "");
    const muridKp = input.muridKp.replace(/[- ]/g, "");
    const muridKelas = input.muridKelas.trim().toUpperCase();
    if (!/^\d{12}$/.test(penjagaKp) || !/^\d{12}$/.test(muridKp)) gagal("No. KP dan MyKid mesti mengandungi 12 digit.");
    if (!kelasSah.has(muridKelas) || !pecahKelas(muridKelas)) gagal("Kelas murid tidak sah.");
    if (typeof input.bersetuju !== "boolean") gagal("Pilih Bersetuju atau Tidak bersetuju.");
    if (!input.tandatangan_url || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(input.tandatangan_url) || input.tandatangan_url.length > 350_000) {
      gagal("Tandatangan ibu bapa atau penjaga diperlukan.");
    }

    const kepala = await headers();
    const ip = kepala.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || kepala.get("x-real-ip") || "tidak-diketahui";
    const db = klienTulis();
    const dibenar = await db.minta("rpc/borang_ambil_giliran", {
      method: "POST",
      body: JSON.stringify({ p_kunci: hash(`${ip}:kebenaran-gambar`) }),
    });
    if (!dibenar) gagal("Had penghantaran hari ini dicapai. Hubungi pihak sekolah jika anda perlu membuat pembetulan.");

    const sesi = await tahunSesiAktif();
    const pendaftaran = (await db.minta(
      `pbd_pendaftaran?select=murid_id,tahun,kelas,pbd_murid!inner(nama,no_kp)` +
      `&tahun_sesi=eq.${sesi}&status=in.(aktif,pindah_masuk,ulang)&pbd_murid.no_kp=eq.${muridKp}&limit=2`,
    )) as { murid_id: string; tahun: number; kelas: string; pbd_murid: { nama: string; no_kp: string } }[];
    const murid = pendaftaran.find((baris) => {
      const label = baris.tahun === 0 ? baris.kelas : `${baris.tahun} ${baris.kelas}`;
      return sama(baris.pbd_murid.nama) === sama(muridNama) && sama(label) === sama(muridKelas);
    });
    if (!murid) gagal("Butiran murid tidak sepadan dengan daftar sekolah. Semak nama, kelas dan MyKid atau hubungi guru kelas.");

    const guru = await guruKelasBagi(muridKelas);
    const emelGuru = guru.emel;
    const pemilik = emelGuru[0] ?? EMEL_AWAM;
    const data: DataSuratGambar = {
      penjagaNama, penjagaKp, alamat, telefon, muridKp,
      muridNama, muridKelas, bersetuju: input.bersetuju, catatan, sumber: "awam", guruKelasNama: guru.nama,
    };
    const disimpan = (await db.minta("pbd_surat", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        jenis: "gambar", status: "selesai", tajuk: `Kebenaran Gambar — ${muridNama}`,
        pemohon_id: null, pemohon_nama: penjagaNama, pemohon_emel: pemilik,
        tandatangan_url: input.tandatangan_url, data,
      }),
    })) as { id: string; dicipta: string }[];
    if (!disimpan[0]?.id) gagal("Borang telah diterima tetapi nombor rekod tidak dapat disahkan. Hubungi pihak sekolah.");

    const penerima = emelGuru.length ? emelGuru : await emelIkutPeranan(["pentadbir", "admin"]).catch(() => [] as string[]);
    await hantar({
      penerima, jenis: "borang", tajuk: "Kebenaran Gambar diterima",
      teks: `${muridNama} (${muridKelas}): ibu bapa atau penjaga ${input.bersetuju ? "BERSETUJU" : "TIDAK BERSETUJU"}.`,
      pautan: "/borang/urus",
    });

    revalidatePath("/borang/urus");
    return { ok: true, mesej: "Keputusan berjaya disimpan. Pratonton dan simpan salinan PDF di bawah.", id: disimpan[0].id, dicipta: disimpan[0].dicipta, guruKelasNama: guru.nama };
  } catch (error) {
    return { ok: false, mesej: mesejAwam(error) };
  }
}
