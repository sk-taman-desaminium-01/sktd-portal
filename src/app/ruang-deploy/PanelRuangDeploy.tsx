"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { unzipSync } from "fflate";
import {
  HAD_FAIL, HAD_KOD_BAIT, HAD_LAMAN_BAIT, HAD_LAMAN_BULAN, HAD_LAMAN_MB,
  JENIS_LAMAN, SUBJEK_LAMAN, SUMBER_LAMAN,
  cadangSubdomain, laluanSah, perkataan, semakPautan, semakSubdomain, semakTajuk,
  type JenisLaman, type LamanInteraktif, type SumberLaman,
} from "@/data/interaktif";
import { ambilKod, gantungLaman, padamLaman, sahkanLaman, sediaLaman } from "@/lib/interaktif";

/**
 * Borang Ruang Deploy + kad laman yang dikemas kini serta-merta.
 *
 * Fail dibuka DALAM PELAYAR (zip dinyahmampat di sini) dan dihantar terus ke
 * storan — Server Action hanya menerima senarai laluan dan saiz, jadi had
 * badan 4.5 MB Vercel tidak pernah terlibat.
 */

type FailLaman = { laluan: string; data: Blob };

const JENIS_MIME: Record<string, string> = {
  html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript",
  json: "application/json", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", mp3: "audio/mpeg", wav: "audio/wav",
  ogg: "audio/ogg", mp4: "video/mp4", webm: "video/webm", woff: "font/woff", woff2: "font/woff2",
  ttf: "font/ttf", otf: "font/otf", txt: "text/plain", wasm: "application/wasm", glb: "model/gltf-binary",
};
const mimeOf = (l: string) => JENIS_MIME[(/\.([a-z0-9]+)$/i.exec(l)?.[1] ?? "").toLowerCase()] ?? "application/octet-stream";
const mb = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);
const namaJenis = (k: string) => JENIS_LAMAN.find((j) => j.kod === k)?.nama ?? k;

/** Tukar fail pilihan guru kepada senarai fail laman, dengan index.html di akar. */
async function bacaFail(f: File): Promise<{ fail: FailLaman[]; html: string | null }> {
  if (/\.html?$/i.test(f.name)) {
    if (f.size > HAD_LAMAN_BAIT) throw new Error(`Fail ini ${mb(f.size)}. Had ialah ${HAD_LAMAN_MB} MB.`);
    return { fail: [{ laluan: "index.html", data: f }], html: await f.text() };
  }
  if (!/\.zip$/i.test(f.name)) throw new Error("Fail mesti .html atau .zip.");
  if (f.size > 50 * 1048576) throw new Error("Fail zip terlalu besar.");

  let jumlah = 0;
  let bil = 0;
  const isi = unzipSync(new Uint8Array(await f.arrayBuffer()), {
    filter: (z) => {
      if (z.name.endsWith("/") || z.name.includes("__MACOSX") || z.name.split("/").some((b) => b.startsWith("."))) return false;
      jumlah += z.originalSize; bil++;
      if (jumlah > HAD_LAMAN_BAIT) throw new Error(`Selepas dibuka, laman ini melebihi ${HAD_LAMAN_MB} MB.`);
      if (bil > HAD_FAIL) throw new Error(`Zip mengandungi lebih daripada ${HAD_FAIL} fail.`);
      return true;
    },
  });
  let nama = Object.keys(isi);
  if (nama.length === 0) throw new Error("Zip ini kosong.");

  // Zip yang dibuat dengan "Compress folder" membungkus semuanya dalam satu folder.
  const akar = nama[0].split("/")[0];
  if (!nama.includes("index.html") && nama.every((n) => n.startsWith(`${akar}/`))) {
    nama = nama.map((n) => n.slice(akar.length + 1));
    for (const [lama, baru] of Object.keys(isi).map((n, i) => [n, nama[i]] as const)) {
      isi[baru] = isi[lama];
      delete isi[lama];
    }
  }
  if (!nama.includes("index.html")) {
    const html = nama.filter((n) => /\.html?$/i.test(n));
    if (html.length === 1 && !html[0].includes("/")) {
      isi["index.html"] = isi[html[0]];
      delete isi[html[0]];
      nama = Object.keys(isi);
    } else {
      throw new Error("Zip mesti ada fail index.html di bahagian paling luar.");
    }
  }
  const salah = nama.find((n) => !laluanSah(n));
  if (salah) throw new Error(`Nama fail tidak sesuai: ${salah}. Guna huruf, nombor, - dan _ sahaja.`);

  return {
    fail: nama.map((n) => ({ laluan: n, data: new Blob([isi[n] as BlobPart], { type: mimeOf(n) }) })),
    html: null,
  };
}

/** Muka depan: skrin pertama laman, dikecilkan dari 1280×800. */
function MukaDepan({ html, src, tajuk }: { html?: string | null; src?: string; tajuk: string }) {
  const kotak = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.25);
  useEffect(() => {
    const el = kotak.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSkala(e.contentRect.width / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={kotak} className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-navy-800">
      {html || src ? (
        <iframe
          title={`Muka depan ${tajuk}`}
          {...(html ? { srcDoc: html } : { src })}
          sandbox="allow-scripts"
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
          style={{ width: 1280, height: 800, transform: `scale(${skala})` }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-xs text-white/60">
          Muka depan diambil daripada skrin pertama laman anda.
        </div>
      )}
    </div>
  );
}

const KOSONG = { tajuk: "", subjek: "", jenis: "" as JenisLaman | "", subdomain: "", sumber: "fail" as SumberLaman, pautan: "" };

export default function PanelRuangDeploy({
  namaAwal, saya, semua, bulanIni,
}: {
  namaAwal: string;
  saya: LamanInteraktif[];
  semua: LamanInteraktif[] | null;
  /** Laman baharu yang guru ini terbitkan bulan ini. */
  bulanIni: number;
}) {
  const router = useRouter();
  const [nama, setNama] = useState(namaAwal);
  const [b, setB] = useState(KOSONG);
  const [subDisentuh, setSubDisentuh] = useState(false);
  const [sunting, setSunting] = useState<LamanInteraktif | null>(null);
  const [fail, setFail] = useState<{ nama: string; saiz: number; senarai: FailLaman[]; html: string | null } | null>(null);
  const [salahFail, setSalahFail] = useState("");
  const [kod, setKod] = useState("");
  const [atas, setAtas] = useState(false);
  const [langkah, setLangkah] = useState<{ teks: string; siap: boolean }[] | null>(null);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string; sub?: string } | null>(null);
  const [kerja, setKerja] = useState(false);
  const [sahPadam, setSahPadam] = useState<string | null>(null);
  const [mesejSenarai, setMesejSenarai] = useState("");
  const borang = useRef<HTMLFormElement>(null);

  const ubah = (k: Partial<typeof KOSONG>) => setB((x) => ({ ...x, ...k }));

  const sTajuk = b.tajuk ? semakTajuk(b.tajuk) : null;
  const sSub = sunting ? null : b.subdomain ? semakSubdomain(b.subdomain) : null;
  const sPautan = b.sumber !== "fail" && b.pautan ? semakPautan(b.sumber, b.pautan) : null;
  const perluFail = b.sumber === "fail" && !(sunting && sunting.sumber === "fail");
  const saizKod = new Blob([kod]).size;
  const sKod = b.sumber === "kod" && kod.trim()
    ? (saizKod > HAD_KOD_BAIT ? `Kod ini ${mb(saizKod)}. Had ialah ${HAD_KOD_BAIT / 1048576} MB.`
      : !/<[a-z!]/i.test(kod) ? "Ini bukan kod HTML. Salin seluruh kod bermula dengan <!DOCTYPE html> atau <html>." : null)
    : null;
  const sedia = !kerja && nama.trim().length >= 2 && !!b.tajuk && !sTajuk && !!b.subjek && !!b.jenis
    && (!!sunting || (!!b.subdomain && !sSub))
    && (b.sumber === "fail" ? (!perluFail || !!fail) && !salahFail
      : b.sumber === "kod" ? !!kod.trim() && !sKod
      : !!b.pautan && !sPautan);

  const kuotaPenuh = !sunting && bulanIni >= HAD_LAMAN_BULAN;
  const alamat = `${(sunting?.subdomain ?? b.subdomain) || "nama"}.sktd.edu.my`;

  async function pilihFail(f: File | undefined) {
    if (!f) return;
    setSalahFail("");
    setFail(null);
    try {
      const r = await bacaFail(f);
      setFail({ nama: f.name, saiz: r.fail.reduce((j, x) => j + x.data.size, 0), senarai: r.fail, html: r.html });
    } catch (e) {
      setSalahFail(e instanceof Error ? e.message : "Fail tidak dapat dibaca.");
    }
  }

  function mulaSunting(l: LamanInteraktif) {
    setSunting(l);
    setHasil(null);
    setLangkah(null);
    setFail(null);
    setSalahFail("");
    setNama(l.pemilik_nama);
    setB({ tajuk: l.tajuk, subjek: l.subjek, jenis: l.jenis, subdomain: l.subdomain, sumber: l.sumber, pautan: l.pautan ?? "" });
    setKod("");
    if (l.sumber === "kod") {
      void ambilKod(l.id).then((r) => (r.ok && r.kod !== undefined ? setKod(r.kod) : setSalahFail(r.mesej)));
    }
    borang.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function kosongkan() {
    setSunting(null);
    setB(KOSONG);
    setSubDisentuh(false);
    setFail(null);
    setSalahFail("");
    setKod("");
    setLangkah(null);
  }

  async function terbit(e: React.FormEvent) {
    e.preventDefault();
    if (!sedia) return;
    setKerja(true);
    setHasil(null);
    const failBaru = b.sumber === "fail" && fail ? fail.senarai
      : b.sumber === "kod" ? [{ laluan: "index.html", data: new Blob([kod], { type: "text/html" }) }]
      : null;
    const senarai = [
      { teks: failBaru ? (b.sumber === "kod" ? "Semak kod" : "Semak fail") : b.sumber === "fail" ? "Simpan maklumat" : "Semak pautan", siap: false },
      ...(failBaru ? [{ teks: b.sumber === "kod" ? "Simpan kod HTML" : `Muat naik ${failBaru.length} fail`, siap: false }] : []),
      { teks: "Laman dalam talian", siap: false },
    ];
    setLangkah(senarai);
    const tanda = (i: number) => setLangkah((s) => s && s.map((x, j) => (j <= i ? { ...x, siap: true } : x)));
    const sub = sunting?.subdomain ?? b.subdomain;
    try {
      const r = await sediaLaman({
        id: sunting?.id, nama, tajuk: b.tajuk, subjek: b.subjek, jenis: b.jenis as JenisLaman,
        subdomain: sub, sumber: b.sumber, pautan: b.pautan,
        fail: failBaru?.map((f) => ({ laluan: f.laluan, saiz: f.data.size })),
      });
      if (!r.ok) throw new Error(r.mesej);
      tanda(0);

      if (!r.selesai && r.slot && r.id && failBaru) {
        const ikut = new Map(failBaru.map((f) => [f.laluan, f.data]));
        let i = 0;
        const pekerja = async () => {
          while (i < r.slot!.length) {
            const s = r.slot![i++];
            const res = await fetch(s.url, {
              method: "PUT",
              headers: {
                "Content-Type": mimeOf(s.laluan),
                "x-upsert": "false",
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
              },
              body: ikut.get(s.laluan),
            });
            if (!res.ok) throw new Error(`Muat naik ${s.laluan} gagal (${res.status}). Semak internet dan cuba lagi.`);
          }
        };
        await Promise.all([pekerja(), pekerja(), pekerja(), pekerja()]);
        tanda(1);
        const s = await sahkanLaman(r.id, b.sumber);
        if (!s.ok) throw new Error(s.mesej);
      }
      tanda(senarai.length - 1);
      setHasil({ ok: true, mesej: sunting ? "Laman dikemas kini." : "Laman diterbitkan.", sub });
      setSunting(null);
      setB(KOSONG);
      setSubDisentuh(false);
      setFail(null);
      setKod("");
      router.refresh();
    } catch (err) {
      setHasil({ ok: false, mesej: err instanceof Error ? err.message : "Gagal menerbitkan laman." });
      setLangkah(null);
    } finally {
      setKerja(false);
    }
  }

  async function padam(id: string) {
    setKerja(true);
    const r = await padamLaman(id);
    setMesejSenarai(r.mesej);
    setSahPadam(null);
    if (sunting?.id === id) kosongkan();
    setKerja(false);
    router.refresh();
  }

  async function gantung(l: LamanInteraktif) {
    setKerja(true);
    const r = await gantungLaman(l.id, l.status !== "gantung");
    setMesejSenarai(r.mesej);
    setKerja(false);
    router.refresh();
  }

  const huruf = useMemo(
    () => perkataan(nama.replace(/^(cikgu|cg|ustaz|ustazah|puan|encik|tuan|teacher)\s+/i, "")).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?",
    [nama],
  );

  const medan = "w-full rounded-lg border border-garis bg-white px-3 py-2.5 text-[15px] text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-100";
  const label = "text-sm font-semibold text-navy-800";
  const mesej = (m: string | null, baik?: string) =>
    m ? <p className="text-xs font-medium text-[#b42318]">{m}</p> : baik ? <p className="text-xs font-medium text-[#167a4b]">✓ {baik}</p> : null;

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* ---------------- Borang ---------------- */}
      <form ref={borang} onSubmit={terbit} className="grid min-w-0 scroll-mt-6 gap-5 rounded-2xl border border-garis bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-800">{sunting ? `Sunting ${sunting.subdomain}.sktd.edu.my` : "Terbitkan laman baharu"}</h2>
          {sunting && (
            <button type="button" onClick={kosongkan} className="rounded-lg border border-garis px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Batal sunting
            </button>
          )}
        </div>

        {kuotaPenuh && (
          <p className="rounded-lg bg-[#fdf3dc] px-3 py-2 text-sm text-[#7a5a12]">
            Kuota {HAD_LAMAN_BULAN} laman baharu bulan ini sudah penuh. Anda masih boleh menyunting laman sedia ada; kuota dibuka semula awal bulan depan.
          </p>
        )}

        <label className="grid gap-1.5">
          <span className={label}>Nama cikgu</span>
          <input id="rd-nama" className={medan} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Cikgu Siti Aminah" autoComplete="name" />
        </label>

        <label className="grid gap-1.5">
          <span className={label}>Nama projek</span>
          <input
            id="rd-tajuk" className={medan} value={b.tajuk} placeholder="Contoh: Kuiz Sains Empat"
            onChange={(e) => {
              const tajuk = e.target.value;
              ubah({ tajuk, ...(!sunting && !subDisentuh ? { subdomain: cadangSubdomain(tajuk) } : {}) });
            }}
          />
          {b.tajuk ? mesej(sTajuk, `${perkataan(b.tajuk).length} perkataan`) : <p className="text-xs text-slate-500">2 atau 3 perkataan sahaja.</p>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={label}>Mata pelajaran</span>
            <select id="rd-subjek" className={medan} value={b.subjek} onChange={(e) => ubah({ subjek: e.target.value })}>
              <option value="">Pilih mata pelajaran</option>
              {SUBJEK_LAMAN.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className={label}>Jenis laman</span>
            <select id="rd-jenis" className={medan} value={b.jenis} onChange={(e) => ubah({ jenis: e.target.value as JenisLaman })}>
              <option value="">Pilih jenis</option>
              {JENIS_LAMAN.map((j) => <option key={j.kod} value={j.kod}>{j.nama}</option>)}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={label}>Alamat laman</span>
          <div className={`flex overflow-hidden rounded-lg border border-garis focus-within:border-navy-700 ${sunting ? "bg-slate-50" : "bg-white"}`}>
            <input
              id="rd-sub" disabled={!!sunting} value={sunting?.subdomain ?? b.subdomain} placeholder="kuizsainsempat"
              autoCapitalize="off" spellCheck={false}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[15px] text-navy-900 outline-none"
              onChange={(e) => { setSubDisentuh(true); ubah({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }); }}
            />
            <span className="flex items-center border-l border-garis px-3 font-mono text-sm text-slate-500">.sktd.edu.my</span>
          </div>
          {sunting ? <p className="text-xs text-slate-500">Alamat kekal sama semasa sunting.</p>
            : b.subdomain ? mesej(sSub, "Alamat boleh digunakan (disemak sekali lagi semasa terbit)") : null}
        </label>

        <fieldset className="grid gap-1.5">
          <legend className={`${label} mb-1.5`}>Sumber laman</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUMBER_LAMAN.map((s) => (
              <label key={s.kod} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-100 ${b.sumber === s.kod ? "border-navy-700 bg-navy-50" : "border-garis"}`}>
                <input type="radio" name="rd-sumber" value={s.kod} checked={b.sumber === s.kod} className="sr-only"
                  onChange={() => { ubah({ sumber: s.kod, pautan: s.kod === sunting?.sumber ? sunting.pautan ?? "" : "" }); setFail(null); setSalahFail(""); }} />
                <span className="block font-semibold text-navy-800">{s.nama}</span>
                <span className="block text-xs text-slate-500">{s.ringkas}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {b.sumber === "fail" ? (
          <div className="grid gap-1.5">
            <label
              onDragOver={(e) => { e.preventDefault(); setAtas(true); }}
              onDragLeave={() => setAtas(false)}
              onDrop={(e) => { e.preventDefault(); setAtas(false); void pilihFail(e.dataTransfer.files[0]); }}
              className={`relative grid cursor-pointer place-items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center ${atas ? "border-navy-700 bg-navy-50" : "border-garis bg-slate-50"}`}
            >
              <input id="rd-fail" type="file" accept=".html,.htm,.zip" className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => void pilihFail(e.target.files?.[0])} />
              <span className="font-semibold text-navy-800">{fail ? fail.nama : sunting?.sumber === "fail" ? "Seret fail baharu ke sini untuk menggantikan laman" : "Seret fail ke sini atau tekan untuk pilih"}</span>
              <span className="text-xs text-slate-500">
                {fail ? `${fail.senarai.length} fail · ${mb(fail.saiz)}` : `Fail .html, atau .zip yang ada index.html · maksimum ${HAD_LAMAN_MB} MB`}
              </span>
            </label>
            {salahFail ? mesej(salahFail) : fail ? mesej(null, "Fail sedia dimuat naik") : sunting?.sumber === "fail" ? <p className="text-xs text-slate-500">Biarkan kosong jika hanya menukar maklumat.</p> : null}
          </div>
        ) : b.sumber === "kod" ? (
          <label className="grid gap-1.5">
            <span className={label}>Kod HTML</span>
            <textarea
              id="rd-kod" value={kod} onChange={(e) => setKod(e.target.value)} rows={10} spellCheck={false}
              placeholder={"<!DOCTYPE html>\n<html>\n  …tampal seluruh kod laman di sini…\n</html>"}
              className={`${medan} min-h-48 font-mono text-[13px] leading-relaxed`}
            />
            {kod.trim() ? mesej(sKod ?? (salahFail || null), `Kod sedia · ${mb(saizKod)}`)
              : <p className="text-xs text-slate-500">Satu halaman HTML lengkap, maksimum {HAD_KOD_BAIT / 1048576} MB. Gambar mesti dari pautan atau tertanam dalam kod.</p>}
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className={label}>{b.sumber === "cloudflare" ? "Pautan workers.dev atau pages.dev" : "Pautan Canva"}</span>
            <input id="rd-pautan" type="url" className={medan} value={b.pautan} onChange={(e) => ubah({ pautan: e.target.value })}
              placeholder={b.sumber === "cloudflare" ? "https://namaprojek.akaun.workers.dev" : "https://namaprojek.my.canva.site"} />
            {b.pautan ? mesej(sPautan, b.sumber === "cloudflare" ? "Pautan sah. Pautan lama terus berfungsi." : "Pautan Canva sah.") : null}
          </label>
        )}

        <button type="submit" disabled={!sedia || kuotaPenuh}
          className="rounded-xl bg-navy-800 px-4 py-3.5 text-base font-bold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40">
          {kerja ? "Sedang diterbitkan…" : sunting ? "Simpan perubahan" : "Terbitkan laman"}
        </button>
        {hasil && !hasil.ok && <p className="rounded-lg bg-[#fbeaea] px-3 py-2 text-sm text-[#8f2424]">{hasil.mesej}</p>}
        <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-500">
          <li>Muka depan di laman sekolah diambil terus daripada skrin pertama laman anda.</li>
          <li>Jangan muat naik data peribadi murid (nama penuh, No. KP, markah) — laman ini terbuka kepada umum.</li>
        </ul>
      </form>

      {/* ---------------- Kad laman + Laman saya ---------------- */}
      <aside className="grid min-w-0 gap-5">
        <div aria-live="polite" className="grid gap-4 rounded-2xl bg-navy-900 bg-[radial-gradient(120%_70%_at_100%_0%,#17406f,var(--color-navy-900)_60%)] p-5 text-white shadow-lg">
          <span className="inline-flex w-max items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
            <i className={`h-2 w-2 rounded-full ${hasil?.ok ? "bg-[#4ade80]" : kerja ? "animate-pulse bg-emas" : "bg-white/40"}`} />
            {hasil?.ok ? "Dalam talian" : kerja ? "Sedang diterbitkan" : sunting ? "Sunting" : "Draf"}
          </span>
          {hasil?.ok ? null : (
            <MukaDepan
              tajuk={b.tajuk}
              html={b.sumber === "fail" ? fail?.html : b.sumber === "kod" ? kod || null : null}
              src={!fail && !(b.sumber === "kod" && kod) && sunting && b.sumber === sunting.sumber ? `https://${sunting.subdomain}.sktd.edu.my/` : undefined}
            />
          )}
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emas font-bold text-navy-900">{huruf}</span>
            <div className="min-w-0">
              <p className={`break-words font-semibold ${nama ? "" : "text-white/40"}`}>{nama || "Nama Cikgu"}</p>
              <p className="text-xs text-white/55">Guru · SK Taman Desaminium</p>
            </div>
          </div>
          {hasil?.ok ? (
            <p className="text-xl font-bold">{hasil.mesej}</p>
          ) : (
            <p className={`break-words text-2xl font-bold leading-tight ${b.tajuk ? "" : "text-white/40"}`}>{b.tajuk || "Nama projek anda"}</p>
          )}
          {!hasil?.ok && (
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              <span className={`rounded-full bg-white/10 px-2.5 py-1 ${b.subjek ? "" : "text-white/40"}`}>{b.subjek || "Mata pelajaran"}</span>
              <span className={`rounded-full px-2.5 py-1 ${b.jenis === "game" ? "bg-emas text-navy-900" : "bg-white/10"} ${b.jenis ? "" : "text-white/40"}`}>{b.jenis ? namaJenis(b.jenis) : "Jenis"}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2.5 font-mono text-sm">
            <span className="min-w-0 break-all">{hasil?.ok && hasil.sub ? `${hasil.sub}.sktd.edu.my` : alamat}</span>
            {hasil?.ok && hasil.sub && (
              <a href={`https://${hasil.sub}.sktd.edu.my/`} target="_blank" rel="noreferrer" className="shrink-0 rounded-md bg-emas px-2.5 py-1 font-sans text-xs font-bold text-navy-900">
                Buka
              </a>
            )}
          </div>
          {langkah && (
            <ol className="grid gap-1.5 text-sm">
              {langkah.map((l, i) => (
                <li key={i} className={`flex items-center gap-2 ${l.siap ? "text-white" : "text-white/50"}`}>
                  <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${l.siap ? "border-[#4ade80] bg-[#4ade80]" : "border-current"}`} />
                  {l.teks}
                </li>
              ))}
            </ol>
          )}
          {hasil?.ok && (
            <div className="flex flex-wrap gap-2">
              <a href="https://sktd.edu.my/interaktif/" target="_blank" rel="noreferrer" className="rounded-lg bg-emas px-3 py-2 text-sm font-bold text-navy-900">
                Lihat di laman sekolah
              </a>
              <button type="button" onClick={() => { setHasil(null); setLangkah(null); }} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">
                Terbitkan laman lain
              </button>
            </div>
          )}
        </div>

        <SenaraiLaman
          tajuk="Laman saya" laman={saya} kuota={bulanIni} kerja={kerja} sahPadam={sahPadam} mesej={mesejSenarai}
          onSunting={mulaSunting} onPadam={setSahPadam} onSahPadam={padam}
        />
        {semua && (
          <SenaraiLaman
            tajuk="Semua laman guru (pentadbir)" laman={semua} kerja={kerja} sahPadam={sahPadam}
            onPadam={setSahPadam} onSahPadam={padam} onGantung={gantung}
          />
        )}
      </aside>
    </div>
  );
}

function SenaraiLaman({
  tajuk, laman, kuota, kerja, sahPadam, mesej, onSunting, onPadam, onSahPadam, onGantung,
}: {
  tajuk: string;
  laman: LamanInteraktif[];
  /** Laman baharu bulan ini — ada hanya pada senarai guru sendiri. */
  kuota?: number;
  kerja: boolean;
  sahPadam: string | null;
  mesej?: string;
  onSunting?: (l: LamanInteraktif) => void;
  onPadam: (id: string | null) => void;
  onSahPadam: (id: string) => void;
  onGantung?: (l: LamanInteraktif) => void;
}) {
  const butang = "rounded-lg border border-garis px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-slate-50 disabled:opacity-40";
  return (
    <section className="grid gap-3 rounded-2xl border border-garis bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-navy-800">{tajuk}</h2>
        {kuota !== undefined && <span className="text-sm tabular-nums text-slate-500">{kuota} / {HAD_LAMAN_BULAN} laman baharu bulan ini</span>}
      </div>
      {kuota !== undefined && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.min(100, (kuota / HAD_LAMAN_BULAN) * 100)}%` }} />
        </div>
      )}
      {mesej && kuota !== undefined && <p className="text-xs font-medium text-[#167a4b]">{mesej}</p>}
      {laman.length === 0 ? (
        <p className="text-sm text-slate-500">{kuota !== undefined ? "Belum ada laman. Terbitkan laman pertama anda menggunakan borang." : "Tiada laman."}</p>
      ) : (
        <ul className="divide-y divide-garis">
          {laman.map((l) => (
            <li key={l.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">
                  {l.tajuk}
                  {l.status === "gantung" && <span className="ml-2 rounded-full bg-[#fbeaea] px-2 py-0.5 text-[11px] font-bold text-[#8f2424]">Digantung</span>}
                </p>
                <a href={`https://${l.subdomain}.sktd.edu.my/`} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-navy-700 underline">
                  {l.subdomain}.sktd.edu.my
                </a>
                <p className="text-xs text-slate-500">
                  {l.subjek} · {namaJenis(l.jenis)}{onGantung ? ` · ${l.pemilik_nama}` : ""}{l.saiz ? ` · ${mb(l.saiz)}` : ""}
                </p>
              </div>
              {sahPadam === l.id ? (
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="text-xs font-semibold text-[#b42318]">Padam laman ini?</span>
                  <button type="button" disabled={kerja} onClick={() => onSahPadam(l.id)} className="rounded-lg bg-[#b42318] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Ya, padam</button>
                  <button type="button" onClick={() => onPadam(null)} className={butang}>Batal</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {onSunting && <button type="button" disabled={kerja} onClick={() => onSunting(l)} className={butang}>Sunting</button>}
                  {onGantung && (
                    <button type="button" disabled={kerja} onClick={() => onGantung(l)} className={butang}>
                      {l.status === "gantung" ? "Aktifkan" : "Gantung"}
                    </button>
                  )}
                  <button type="button" disabled={kerja} onClick={() => onPadam(l.id)} className={`${butang} text-[#b42318]`}>Padam</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
