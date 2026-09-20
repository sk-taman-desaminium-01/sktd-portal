"use server";

import { revalidatePath } from "next/cache";
import { pastikanBoleh } from "./akses";
import { klienTulis } from "./supabase-pelayan";
import { sesiSemasa } from "./pbd";
import { bacaSenaraiMurid, type MuridDikenal } from "./kenal-murid";
import { hantar } from "./notifikasi";

/**
 * Import senarai murid.
 *
 * ⚠️ LARIAN KERING WAJIB (peraturan keras #5). Import yang terus menulis
 * pernah menghasilkan 978 gred salah dalam projek lain — sel format Peratus
 * (0.88 berbanding "88%") diterima tanpa sesiapa melihat taburannya dahulu.
 * Di sini `simpan: false` ialah lalai, dan pentadbir mesti melihat ringkasan
 * sebelum apa-apa ditulis.
 *
 * NO. KP IALAH KUNCI IDENTITI, bukan nama. Nama ada variasi ejaan
 * (BINTI/BT, A/L, ruang ganda); No. KP tidak. Murid yang sama yang kembali
 * selepas berpindah akan dipadankan semula kepada rekod asalnya, dan
 * keputusan lamanya kekal.
 *
 * MURID TANPA No. KP tetap diterima — sekolah sebenar ada kesnya — tetapi
 * dipadankan mengikut nama+tahun+kelas, dan itu dilaporkan sebagai risiko
 * dalam ringkasan, bukan disembunyikan.
 */

export interface BarisImport {
  nama: string;
  no_kp: string | null;
  tahun: number;
  kelas: string;
  jantina: string | null;
}

export interface HasilImport {
  ok: boolean;
  mesej: string;
  /** Benar bila tiada apa ditulis — larian kering. */
  kering: boolean;
  jumlah?: number;
  baharu?: number;
  sedia?: number;
  tanpaKp?: number;
  ralat?: string[];
  contoh?: BarisImport[];
}

/** Pecah CSV, hormati petikan berganda. */
function pecahBaris(baris: string): string[] {
  const sel: string[] = [];
  let semasa = "";
  let dalam = false;
  for (let i = 0; i < baris.length; i++) {
    const c = baris[i];
    if (c === '"') {
      if (dalam && baris[i + 1] === '"') { semasa += '"'; i++; }
      else dalam = !dalam;
    } else if ((c === "," || c === ";" || c === "\t") && !dalam) {
      sel.push(semasa.trim());
      semasa = "";
    } else semasa += c;
  }
  sel.push(semasa.trim());
  return sel;
}

/** Cari indeks lajur dari kepala, terima beberapa ejaan. */
function cariLajur(kepala: string[], ...nama: string[]): number {
  const n = kepala.map((k) => k.toLowerCase().replace(/[^a-z]/g, ""));
  for (const cari of nama) {
    const c = cari.toLowerCase().replace(/[^a-z]/g, "");
    const i = n.findIndex((k) => k === c || k.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

export async function huraiCsvMurid(teks: string): Promise<{
  baris: BarisImport[];
  ralat: string[];
}> {
  const semua = teks.split(/\r?\n/).filter((b) => b.trim() !== "");
  const ralat: string[] = [];
  if (semua.length < 2) return { baris: [], ralat: ["Fail kosong atau tiada baris data."] };

  const kepala = pecahBaris(semua[0]);
  const iNama = cariLajur(kepala, "nama", "namamurid");
  const iKp = cariLajur(kepala, "nokp", "kp", "nokadpengenalan", "ic");
  const iTahun = cariLajur(kepala, "tahun", "darjah");
  const iKelas = cariLajur(kepala, "kelas");
  const iJantina = cariLajur(kepala, "jantina");

  if (iNama < 0) ralat.push('Lajur "Nama" tidak dijumpai dalam baris kepala.');
  if (iTahun < 0) ralat.push('Lajur "Tahun" tidak dijumpai.');
  if (iKelas < 0) ralat.push('Lajur "Kelas" tidak dijumpai.');
  if (ralat.length > 0) return { baris: [], ralat };

  const baris: BarisImport[] = [];
  for (let n = 1; n < semua.length; n++) {
    const sel = pecahBaris(semua[n]);
    const nama = (sel[iNama] ?? "").trim();
    if (!nama) continue;

    const tahunMentah = (sel[iTahun] ?? "").trim();
    // "3 AMANAH" dalam lajur tahun, atau "3" — kedua-duanya berlaku.
    const tahun = Number(tahunMentah.match(/\d/)?.[0] ?? 0);
    if (!Number.isInteger(tahun) || tahun < 1 || tahun > 6) {
      ralat.push(`Baris ${n + 1}: tahun "${tahunMentah}" tidak sah.`);
      continue;
    }

    // Nombor tahun dibuang dari nama kelas. Ini punca asal masalah model
    // lama: tahun dikorek dari nama kelas, jadi menaikkan murid memusnahkan
    // rekodnya.
    const kelas = (sel[iKelas] ?? "").trim().replace(/^\d+\s*/, "").toUpperCase();
    if (!kelas) {
      ralat.push(`Baris ${n + 1}: kelas kosong.`);
      continue;
    }

    const kpMentah = iKp >= 0 ? (sel[iKp] ?? "").replace(/[^0-9]/g, "") : "";
    baris.push({
      nama: nama.replace(/\s+/g, " ").toUpperCase(),
      no_kp: kpMentah.length >= 6 ? kpMentah : null,
      tahun,
      kelas,
      jantina: iJantina >= 0 ? (sel[iJantina] ?? "").trim().toUpperCase() || null : null,
    });
  }
  return { baris, ralat };
}

export interface HasilImportKelas extends HasilImport {
  murid?: MuridDikenal[];
}

type KlienDb = ReturnType<typeof klienTulis>;

function namaKunci(nama: string): string {
  return nama.normalize("NFKC").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

/**
 * Cari murid sedia ada tanpa RPC khas.
 *
 * RPC `import_murid_kelas` pernah dipanggil oleh UI walaupun fungsinya tidak
 * wujud dalam migrasi pangkalan data. Import kini menggunakan REST jadual
 * yang sama seperti import CSV, jadi pemasangan baharu tidak bergantung pada
 * fungsi tersembunyi dalam schema cache Supabase.
 */
async function padanMuridKelas(
  db: KlienDb,
  sesi: number,
  tahun: number,
  kelas: string,
  murid: MuridDikenal[],
): Promise<{ ikutKp: Map<string, string>; tanpaKp: Map<string, string> }> {
  const ikutKp = new Map<string, string>();
  const semuaKp = [...new Set(murid.map((m) => m.no_kp).filter((x): x is string => !!x))];

  for (let i = 0; i < semuaKp.length; i += 100) {
    const senarai = semuaKp.slice(i, i + 100).map((kp) => `"${kp}"`).join(",");
    const jumpa = (await db.minta(
      `pbd_murid?select=id,no_kp&no_kp=in.(${senarai})`,
    )) as { id: string; no_kp: string }[];
    for (const baris of jumpa) ikutKp.set(baris.no_kp, baris.id);
  }

  // Murid tanpa No. KP hanya dipadankan dalam kelas dan sesi yang sama.
  // Ini mengelakkan dua murid senama dari kelas berlainan disatukan.
  const tanpaKp = new Map<string, string>();
  if (murid.some((m) => !m.no_kp)) {
    const kelasKod = encodeURIComponent(kelas);
    const daftar = (await db.minta(
      `pbd_pendaftaran?select=murid_id,pbd_murid!inner(nama,no_kp)` +
        `&tahun_sesi=eq.${sesi}&tahun=eq.${tahun}&kelas=eq.${kelasKod}` +
        "&status=in.(aktif,pindah_masuk,ulang)",
    )) as { murid_id: string; pbd_murid: { nama: string; no_kp: string | null } }[];
    for (const baris of daftar) {
      if (!baris.pbd_murid?.no_kp) tanpaKp.set(namaKunci(baris.pbd_murid.nama), baris.murid_id);
    }
  }

  return { ikutKp, tanpaKp };
}

async function simpanMuridKelasTerus(
  db: KlienDb,
  sesi: number,
  tahun: number,
  kelas: string,
  murid: MuridDikenal[],
  padanan: { ikutKp: Map<string, string>; tanpaKp: Map<string, string> },
): Promise<void> {
  const idIkutBaris = new Map<number, string>();
  const baharuDenganKp = murid
    .map((m, indeks) => ({ m, indeks }))
    .filter(({ m }) => m.no_kp && !padanan.ikutKp.has(m.no_kp));

  // Satu permintaan bagi sehingga 100 murid, bukan dua permintaan bagi
  // setiap murid. Ini ketara apabila satu ZIP mengandungi semua 57 kelas.
  for (let i = 0; i < baharuDenganKp.length; i += 100) {
    const keping = baharuDenganKp.slice(i, i + 100);
    const cipta = (await db.minta("pbd_murid", {
      method: "POST",
      body: JSON.stringify(keping.map(({ m }) => ({
        no_kp: m.no_kp,
        nama: m.nama,
        jantina: m.jantina,
      }))),
    })) as { id: string; no_kp: string }[];
    for (const baris of cipta) padanan.ikutKp.set(baris.no_kp, baris.id);
  }

  for (let indeks = 0; indeks < murid.length; indeks++) {
    const m = murid[indeks];
    const sedia = m.no_kp
      ? padanan.ikutKp.get(m.no_kp)
      : padanan.tanpaKp.get(namaKunci(m.nama));
    if (sedia) {
      idIkutBaris.set(indeks, sedia);
      continue;
    }

    // Kes tanpa No. KP jarang berlaku dan tidak mempunyai kunci unik untuk
    // dipadankan selepas sisipan pukal, maka ia dicipta satu demi satu.
    const [cipta] = (await db.minta("pbd_murid", {
      method: "POST",
      body: JSON.stringify({ no_kp: null, nama: m.nama, jantina: m.jantina }),
    })) as { id: string }[];
    idIkutBaris.set(indeks, cipta.id);
    padanan.tanpaKp.set(namaKunci(m.nama), cipta.id);
  }

  const pendaftaran = murid.map((m, indeks) => ({
    murid_id: idIkutBaris.get(indeks) ?? (m.no_kp ? padanan.ikutKp.get(m.no_kp) : undefined),
    tahun_sesi: sesi,
    tahun,
    kelas,
    status: "aktif",
  }));
  if (pendaftaran.some((p) => !p.murid_id)) {
    throw new Error("Padanan murid tidak lengkap selepas sisipan.");
  }
  for (let i = 0; i < pendaftaran.length; i += 100) {
    await db.minta("pbd_pendaftaran?on_conflict=murid_id,tahun_sesi", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(pendaftaran.slice(i, i + 100)),
    });
  }
}

/**
 * Import satu KELAS: kelas dipilih dari dropdown, nama dan No. KP ditampal.
 *
 * Ini menggantikan CSV sebagai cara utama. CSV menuntut pentadbir menyusun
 * lajur dengan betul sebelum apa-apa boleh dimasukkan, dan senarai murid
 * sebenar tidak pernah datang begitu — ia datang dari WhatsApp dan dari
 * salinan skrin. Kelas pula sudah ada dalam sistem; menaipnya semula hanya
 * mencipta peluang salah eja.
 *
 * Jantina tidak ditaip langsung — ia dikira dari digit terakhir No. KP.
 */
export async function importMuridKelas(
  tahun: number, kelas: string, teks: string, simpan = false,
): Promise<HasilImportKelas> {
  let oleh: string | null = null;
  try {
    oleh = (await pastikanBoleh("urus_guru_kelas")).emel;
  } catch {
    return { ok: false, kering: true, mesej: "Tiada kebenaran." };
  }
  try {
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, kering: true, mesej: "Tiada sesi aktif." };
    if (sesi.status === "tutup") {
      return { ok: false, kering: true, mesej: `Sesi ${sesi.tahun_sesi} sudah ditutup.` };
    }
    if (!Number.isInteger(tahun) || tahun < 1 || tahun > 6 || !kelas.trim()) {
      return { ok: false, kering: true, mesej: "Pilih kelas dahulu." };
    }

    const { murid, ditolak, berulang } = bacaSenaraiMurid(teks);
    if (murid.length === 0) {
      return { ok: false, kering: true, mesej: "Tiada nama dapat dibaca dari tampalan itu." };
    }

    const ralat: string[] = [];
    for (const b of ditolak) ralat.push(`Tidak difahami: "${b.slice(0, 60)}"`);
    for (const kp of berulang) ralat.push(`No. KP ${kp} muncul lebih sekali dalam tampalan ini.`);
    for (const m of murid) for (const a of m.amaran) ralat.push(`${m.nama}: ${a}`);

    if (berulang.length) return { ok: false, kering: true, mesej: "No. KP berulang. Betulkan senarai sebelum import.", ralat, murid };
    const kelasBersih = kelas.trim().toUpperCase();
    const db = klienTulis();
    const padanan = await padanMuridKelas(db, sesi.tahun_sesi, tahun, kelasBersih, murid);
    const sedia = murid.filter((m) => m.no_kp
      ? padanan.ikutKp.has(m.no_kp)
      : padanan.tanpaKp.has(namaKunci(m.nama))).length;
    const baharu = murid.length - sedia;

    if (simpan) {
      await simpanMuridKelasTerus(db, sesi.tahun_sesi, tahun, kelasBersih, murid, padanan);
      const label = `${tahun} ${kelasBersih}`;
      await hantar({
        penerima: [], tugasan: [{ peranan: "guru_kelas", skop: label }], jenis: "pbd",
        tajuk: `Daftar murid ePBD · ${label}`,
        teks: `${murid.length} murid disahkan dalam daftar ePBD ${label}.`,
        pautan: "/pbd", oleh,
      });
    }
    if (simpan) { revalidatePath("/admin/pbd"); revalidatePath("/pbd"); }
    return { ok: true, kering: !simpan, murid, ralat, jumlah: murid.length,
      baharu, sedia, tanpaKp: murid.filter((m) => !m.no_kp).length,
      mesej: `${simpan ? "Disimpan" : "Semakan tanpa menyimpan"}: ${murid.length} murid, ${baharu} baharu, ${sedia} sedia ada.`,
    };
  } catch (e) {
    console.error("[importMuridKelas]", e);
    return { ok: false, kering: !simpan,
      mesej: "Import gagal diproses. Cuba semula; rekod sedia ada akan dipadankan dan tidak digandakan." +
        (simpan ? " Muat semula halaman untuk menyemak hasil semasa." : ""),
    };
  }
}

export async function importMurid(teks: string, simpan = false): Promise<HasilImport> {
  try {
    await pastikanBoleh("urus_guru_kelas");
  } catch {
    return { ok: false, kering: true, mesej: "Tiada kebenaran." };
  }
  try {
    const sesi = await sesiSemasa();
    if (!sesi) return { ok: false, kering: true, mesej: "Tiada sesi aktif." };
    if (sesi.status === "tutup") {
      return { ok: false, kering: true, mesej: `Sesi ${sesi.tahun_sesi} sudah ditutup.` };
    }

    const { baris, ralat } = await huraiCsvMurid(teks);
    if (baris.length === 0) {
      return { ok: false, kering: true, mesej: "Tiada baris boleh dibaca.", ralat };
    }

    // No. KP berulang dalam fail yang sama ialah tanda fail itu sendiri
    // bermasalah — dan ia akan menghasilkan murid pendua senyap.
    const kira = new Map<string, number>();
    for (const b of baris) if (b.no_kp) kira.set(b.no_kp, (kira.get(b.no_kp) ?? 0) + 1);
    for (const [kp, n] of kira) {
      if (n > 1) ralat.push(`No. KP ${kp} muncul ${n} kali dalam fail ini.`);
    }

    const db = klienTulis();
    const kpAda = baris.map((b) => b.no_kp).filter((k): k is string => !!k);
    const sedia = new Map<string, string>();
    const KEPING = 100;
    for (let i = 0; i < kpAda.length; i += KEPING) {
      const senarai = kpAda.slice(i, i + KEPING).map((k) => `"${k}"`).join(",");
      const jumpa = (await db.minta(
        `pbd_murid?select=id,no_kp&no_kp=in.(${senarai})`,
      )) as { id: string; no_kp: string }[];
      for (const m of jumpa) sedia.set(m.no_kp, m.id);
    }

    const tanpaKp = baris.filter((b) => !b.no_kp).length;
    const baharu = baris.filter((b) => !b.no_kp || !sedia.has(b.no_kp)).length;

    const ringkas =
      `${baris.length} baris · ${baharu} murid baharu · ${baris.length - baharu} sudah ada` +
      (tanpaKp > 0 ? ` · ${tanpaKp} TIADA No. KP` : "") +
      (ralat.length > 0 ? ` · ${ralat.length} amaran` : "");

    if (!simpan) {
      return {
        ok: true, kering: true,
        mesej: `Larian kering — TIADA apa ditulis. ${ringkas}. Semak sebelum menyimpan.`,
        jumlah: baris.length, baharu, sedia: baris.length - baharu, tanpaKp,
        ralat, contoh: baris.slice(0, 8),
      };
    }

    // ---- Tulis sebenar ----
    let ditulis = 0;
    for (const b of baris) {
      let muridId = b.no_kp ? sedia.get(b.no_kp) : undefined;

      if (!muridId) {
        const [cipta] = (await db.minta("pbd_murid", {
          method: "POST",
          body: JSON.stringify({ no_kp: b.no_kp, nama: b.nama, jantina: b.jantina }),
        })) as { id: string }[];
        muridId = cipta.id;
        if (b.no_kp) sedia.set(b.no_kp, muridId);
      }

      // `merge-duplicates` pada (murid_id, tahun_sesi): import yang dijalankan
      // dua kali tidak mencipta pendaftaran pendua, dan kelas yang dibetulkan
      // dalam fail kedua menggantikan yang pertama.
      await db.minta("pbd_pendaftaran?on_conflict=murid_id,tahun_sesi", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          murid_id: muridId, tahun_sesi: sesi.tahun_sesi,
          tahun: b.tahun, kelas: b.kelas, status: "aktif",
        }),
      });
      ditulis++;
    }

    revalidatePath("/admin/pbd");
    revalidatePath("/pbd");
    return {
      ok: true, kering: false,
      mesej: `${ditulis} murid disimpan untuk sesi ${sesi.tahun_sesi}. ${ringkas}`,
      jumlah: baris.length, baharu, sedia: baris.length - baharu, tanpaKp, ralat,
    };
  } catch (e) {
    return {
      ok: false, kering: true,
      mesej: "Import gagal: " + (e instanceof Error ? `${e.name}: ${e.message}` : String(e)),
    };
  }
}
