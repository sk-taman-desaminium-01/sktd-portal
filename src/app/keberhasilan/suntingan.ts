"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bukaBorang, simpanBorang, tindakanPeringkat, type Bukti, type BorangPenuh, type Ulasan } from "@/lib/keberhasilan";
import {
  sasaranKosong, bidangTetap,
  type Bidang, type Borang, type MaklumatPyd, type Sasaran, type StatusSasaran, type Tindakan,
} from "@/data/keberhasilan";

/**
 * Keadaan suntingan SATU borang: salinan pelayan (`penuh`) + draf setempat.
 *
 * Draf ialah kebenaran semasa menaip. Pelayan tidak pernah menimpa draf —
 * selepas simpan, hanya `id` sasaran baharu dan `m*_asal` disalin balik
 * (`padan`), supaya pengguna yang sedang menaip tidak kehilangan aksara dan
 * sasaran kosong yang baru ditambah tidak lenyap sebelum sempat diisi.
 */

export interface Draf { bidang: Bidang[]; pyd: MaklumatPyd }
export type StatusSimpan = {
  jenis: "senyap" | "belum" | "simpan" | "ok" | "gagal" | "konflik";
  mesej?: string;
};

const klon = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const dariPenuh = (p: BorangPenuh): Draf => ({ bidang: klon(p.borang.bidang), pyd: { ...p.borang.pyd } });
const idBaru = () => crypto.randomUUID().slice(0, 8);

/** Pelayan mengisi `m*_asal` bila PP1 mengubah markah — salin ke draf tanpa menyentuh teks yang sedang ditaip. */
function salinAsal(draf: Draf, pelayan: Bidang[]): Bidang[] {
  const sv = new Map(pelayan.flatMap((b) => b.sasaran.map((s) => [s.id, s] as const)));
  return draf.bidang.map((b) => ({
    ...b,
    sasaran: b.sasaran.map((s): Sasaran => {
      const ada = sv.get(s.id);
      return ada ? { ...s, m1_asal: ada.m1_asal, m2_asal: ada.m2_asal } : s;
    }),
  }));
}

export function useSuntingan(awal: BorangPenuh | null) {
  const [penuh, setPenuhS] = useState<BorangPenuh | null>(awal);
  const [draf, setDrafS] = useState<Draf | null>(awal ? dariPenuh(awal) : null);
  const [status, setStatus] = useState<StatusSimpan>({ jenis: "senyap" });

  const penuhR = useRef<BorangPenuh | null>(penuh);
  const drafR = useRef<Draf | null>(draf);
  const kotor = useRef(false);
  const konflik = useRef(false);
  const lastOk = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const terbang = useRef<Promise<void> | null>(null);
  const kunciTindak = useRef(false);
  const [sibukTindak, setSibukTindak] = useState(false);

  const setPenuh = (p: BorangPenuh | null) => { penuhR.current = p; setPenuhS(p); };
  const setDraf = (d: Draf | null) => { drafR.current = d; setDrafS(d); };

  const muat = useCallback((p: BorangPenuh) => {
    clearTimeout(timer.current);
    kotor.current = false; konflik.current = false; lastOk.current = true;
    penuhR.current = p; setPenuhS(p);
    const d = dariPenuh(p);
    drafR.current = d; setDrafS(d);
    setStatus({ jenis: "senyap" });
  }, []);

  /** Hantar draf ke pelayan; ulang selagi ada suntingan baharu. true = tiada apa tertunggak. */
  const simpan = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    for (;;) {
      while (terbang.current) await terbang.current;
      if (!kotor.current) return lastOk.current;
      if (konflik.current) return false;
      const p = penuhR.current, d = drafR.current;
      if (!p || !d) return false;
      kotor.current = false;
      setStatus({ jenis: "simpan" });
      const kerja = (async () => {
        try {
          const r = await simpanBorang({
            borangId: p.borang.id, versi: p.borang.versi,
            pyd: p.peranan === "PYD" ? d.pyd : undefined, bidang: d.bidang,
          });
          if (r.ok) {
            lastOk.current = true;
            const terkini = drafR.current ?? d;
            const bidang = salinAsal(terkini, r.data.borang.bidang);
            setPenuh(r.data);
            setDraf({ ...terkini, bidang });
            setStatus({ jenis: kotor.current ? "belum" : "ok" });
          } else {
            lastOk.current = false; kotor.current = true;
            if (r.konflik) { konflik.current = true; setStatus({ jenis: "konflik", mesej: r.mesej }); }
            else setStatus({ jenis: "gagal", mesej: r.mesej });
          }
        } catch (e) {
          lastOk.current = false; kotor.current = true;
          setStatus({ jenis: "gagal", mesej: e instanceof Error ? e.message : "Sambungan terputus." });
        }
      })();
      terbang.current = kerja;
      await kerja;
      terbang.current = null;
      if (!lastOk.current) return false;
    }
  }, []);

  const jadual = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void simpan(); }, 1200);
  };

  const boleh = !!penuh && (penuh.peranan === "PYD" || penuh.peranan === "PP1");

  /** Satu-satunya pintu suntingan draf. */
  const ubah = (fn: (d: Draf) => Draf) => {
    const d = drafR.current;
    if (!d || !boleh || kunciTindak.current) return;
    setDraf(fn(d));
    kotor.current = true;
    if (!konflik.current) { setStatus({ jenis: "belum" }); jadual(); }
  };

  const simpanSegera = () => { if (kotor.current && !konflik.current) void simpan(); };

  useEffect(() => {
    const f = () => { if (document.visibilityState === "hidden" && kotor.current && !konflik.current) void simpan(); };
    document.addEventListener("visibilitychange", f);
    window.addEventListener("pagehide", f);
    // Amaran tutup tab selagi ada suntingan belum disimpan atau simpanan sedang berjalan.
    const amaran = (e: BeforeUnloadEvent) => { if (kotor.current || terbang.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", amaran);
    return () => {
      document.removeEventListener("visibilitychange", f);
      window.removeEventListener("pagehide", f);
      window.removeEventListener("beforeunload", amaran);
      clearTimeout(timer.current);
      if (kotor.current && !konflik.current) void simpan(); // komponen dibuang: simpan draf tertunggak
    };
  }, [simpan]);

  /** Operasi yang menaikkan versi borang (bukti) beratur dalam rantai yang sama dengan simpanan. */
  const serentak = async <T,>(fn: () => Promise<T>): Promise<T> => {
    while (terbang.current) await terbang.current;
    const k = fn();
    const iring = k.then(() => undefined, () => undefined);
    terbang.current = iring;
    await iring;
    terbang.current = null;
    return k;
  };

  /** Draf bersih dan tiada simpanan berjalan? */
  const bersih = () => !kotor.current && !terbang.current;

  const muatSemula = async () => {
    const p = penuhR.current;
    if (!p) return;
    try {
      const r = await bukaBorang(p.borang.id);
      if (r.ok) muat(r.data);
      else setStatus({ jenis: "gagal", mesej: r.mesej });
    } catch (e) {
      setStatus({ jenis: "gagal", mesej: e instanceof Error ? e.message : "Sambungan terputus." });
    }
  };

  /** Hantar / tarik / sahkan / pulang / perakui — simpan draf dahulu. */
  const tindak = async (i: number, tindakan: Tindakan, sebab?: string): Promise<{ ok: boolean; mesej?: string }> => {
    kunciTindak.current = true; setSibukTindak(true);
    try {
      return await tindakDalam(i, tindakan, sebab);
    } finally {
      kunciTindak.current = false; setSibukTindak(false);
    }
  };

  const tindakDalam = async (i: number, tindakan: Tindakan, sebab?: string): Promise<{ ok: boolean; mesej?: string }> => {
    if (!(await simpan())) return { ok: false, mesej: "Perubahan anda belum berjaya disimpan — semak status simpanan di atas." };
    const p = penuhR.current;
    if (!p) return { ok: false, mesej: "Borang belum dimuatkan." };
    try {
      const r = await tindakanPeringkat({ borangId: p.borang.id, versi: p.borang.versi, i, tindakan, sebab });
      if (!r.ok) {
        if (r.konflik) { konflik.current = true; setStatus({ jenis: "konflik", mesej: r.mesej }); }
        return { ok: false, mesej: r.mesej };
      }
      setPenuh(r.data);
      return { ok: true };
    } catch (e) {
      return { ok: false, mesej: e instanceof Error ? e.message : "Sambungan terputus." };
    }
  };

  /* ---- pengubah bidang/sasaran/PYD (semuanya melalui `ubah`) ---- */
  const peta = (id: string, tampung: Partial<Sasaran>) => (d: Draf): Draf => ({
    ...d, bidang: d.bidang.map((b) => ({ ...b, sasaran: b.sasaran.map((s) => (s.id === id ? { ...s, ...tampung } : s)) })),
  });
  const mutasi = {
    ubahSasaran: (id: string, tampung: Partial<Sasaran>) => ubah(peta(id, tampung)),
    ubahPyd: (k: keyof MaklumatPyd, v: string) => ubah((d) => ({ ...d, pyd: { ...d.pyd, [k]: v } })),
    namaBidang: (id: string, nama: string) => ubah((d) => ({ ...d, bidang: d.bidang.map((b) => (b.id === id && !bidangTetap(id) ? { ...b, nama } : b)) })),
    tambahSasaran: (bidangId: string, status: StatusSasaran, teks = ""): string => {
      const id = idBaru();
      ubah((d) => ({ ...d, bidang: d.bidang.map((b) => (b.id === bidangId ? { ...b, sasaran: [...b.sasaran, { ...sasaranKosong(id, status), teks }] } : b)) }));
      return id;
    },
    padamSasaran: (id: string) => ubah((d) => ({ ...d, bidang: d.bidang.map((b) => ({ ...b, sasaran: b.sasaran.filter((s) => s.id !== id) })) })),
    alihSasaran: (id: string, arah: -1 | 1) => ubah((d) => ({
      ...d,
      bidang: d.bidang.map((b) => {
        const k = b.sasaran.findIndex((s) => s.id === id), j = k + arah;
        if (k < 0 || j < 0 || j >= b.sasaran.length) return b;
        const sasaran = [...b.sasaran];
        [sasaran[k], sasaran[j]] = [sasaran[j], sasaran[k]];
        return { ...b, sasaran };
      }),
    })),
    tambahBidang: () => ubah((d) => ({ ...d, bidang: [...d.bidang, { id: idBaru(), nama: "BIDANG TUGAS BAHARU", sasaran: [] }] })),
    padamBidang: (id: string) => ubah((d) => ({ ...d, bidang: d.bidang.filter((b) => b.id !== id || bidangTetap(id)) })),
  };

  /* ---- senarai pelayan yang berubah tanpa melalui simpan ---- */
  const tambahUlasanLokal = (u: Ulasan) => { const p = penuhR.current; if (p) setPenuh({ ...p, ulasan: [...p.ulasan, u] }); };
  // Daftar/buang bukti menaikkan versi borang di pelayan — ikut, jika tidak simpanan seterusnya bercanggah.
  const tambahBuktiLokal = (b: Bukti, versi: number) => { const p = penuhR.current; if (p) setPenuh({ ...p, borang: { ...p.borang, versi: Math.max(p.borang.versi, versi) }, bukti: [...p.bukti, b] }); };
  const buangBuktiLokal = (id: string, versi: number) => { const p = penuhR.current; if (p) setPenuh({ ...p, borang: { ...p.borang, versi: Math.max(p.borang.versi, versi) }, bukti: p.bukti.filter((x) => x.id !== id) }); };

  /** Borang dengan draf ditindih — untuk kuasa, skor dan pratonton. */
  const borangLihat: Borang | null = useMemo(
    () => (penuh && draf ? { ...penuh.borang, bidang: draf.bidang, pyd: penuh.peranan === "PYD" ? draf.pyd : penuh.borang.pyd } : null),
    [penuh, draf],
  );

  return {
    penuh, draf, borangLihat, status, boleh, sibukTindak, serentak, bersih, muat, muatSemula, simpan, simpanSegera, tindak,
    tambahUlasanLokal, tambahBuktiLokal, buangBuktiLokal,
    ...mutasi,
  };
}

export type Suntingan = ReturnType<typeof useSuntingan>;
