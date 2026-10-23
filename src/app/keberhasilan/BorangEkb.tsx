"use client";

import { useEffect, useRef, useState } from "react";
import {
  kira, keadaan, kuasa, LABEL_KEADAAN, penghalang, peringkatSemasa, PERINGKAT, petunjuk, semakan, semuaSasaran,
  sah, tarikhTutup, STATUS_SASARAN, ringkasan, teksBiasa, MIN_SASARAN,
  type Borang, type Kiraan, type PerananEkb, type Tindakan,
} from "@/data/keberhasilan";
import type { DataHalaman } from "@/lib/keberhasilan";
import type { Suntingan } from "./suntingan";
import KadSasaran from "./KadSasaran";
import { BTN, BTN_BAHAYA, BTN_BAHAYA_PEKAT, BTN_SENYAP, BTN_UTAMA, Chip, INPUT, KAD, LABEL, VARIAN_KEADAAN, namaPendek, tarikh } from "./alat";

const MESEJ_TINDAKAN: Record<Tindakan, string> = {
  hantar: "Dihantar kepada PP1.",
  tarik: "Ditarik balik. Anda boleh menyunting semula.",
  sahkan: "Peringkat disahkan.",
  pulang: "Dipulangkan kepada PYD.",
  perakui: "Peringkat diperakui.",
};

function SelDaftar({ label, k, hasil }: { label: string; k: "P1" | "Akhir"; hasil: Kiraan }) {
  const skor = hasil.skor;
  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto] items-center gap-x-3.5 border-b border-white/10 p-3.5 sm:border-b-0 sm:border-r">
      <div className="col-span-2 text-xs uppercase tracking-wider text-[#9db3d1]">{label}</div>
      <div className={`text-5xl font-extrabold leading-none ${skor ? "text-emas" : "text-[#9db3d1]"}`} aria-label={`Skor ${k} ${skor ?? "belum ada"}`}>{skor ?? "–"}</div>
      <div className="min-w-0">
        <div className="flex gap-[3px]" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`grid h-[22px] flex-1 place-items-center rounded border font-mono text-[11px] ${!skor ? "border-white/10 bg-[#123561] text-[#9db3d1]" : i === skor ? "border-emas bg-emas font-bold text-[#1c1400]" : i < skor ? "border-white/10 bg-[#21406b] text-[#eaf1fb]" : "border-white/10 bg-[#123561] text-[#9db3d1]"}`}
            >{i}</span>
          ))}
        </div>
        <div className="mt-1.5 font-mono text-[12.5px] text-[#9db3d1]"><b className="text-[#eaf1fb]">{hasil.bil}</b> dinilai · purata <b className="text-[#eaf1fb]">{hasil.purata !== null ? hasil.purata.toFixed(2) : "–"}</b></div>
      </div>
    </div>
  );
}

/**
 * Pembina sasaran — menyusun ayat sasaran mengikut empat komponen KPM
 * (a kata kerja + b ukuran + c tujuan + d peringkat). Dibuka dari butang
 * "Bina dengan panduan" dalam SETIAP bidang (bidang itu dipilih terus):
 * pengguna tidak menjumpai butang tunggal di hujung borang (23 Okt 2026).
 */
function Pembina({ s, b, buka, bidangAwal, tutup, semakanSahaja, fokus }: {
  s: Suntingan; b: Borang; buka: boolean; bidangAwal: string; tutup: () => void; semakanSahaja: boolean; fokus: (id: string) => void;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [kata, setKata] = useState("Memastikan");
  const [ukur, setUkur] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [peringkat, setPeringkat] = useState("");
  const [bidangId, setBidangId] = useState("");
  const [ralat, setRalat] = useState("");

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);

  const teks = ([kata, ukur.trim(), tujuan.trim(), peringkat.trim()].filter(Boolean).join(" ").replace(/\s+/g, " ")) + (ukur.trim() || tujuan.trim() ? "." : "");
  const pilih = bidangId || bidangAwal;
  const sasaranBidang = pilih && b.bidang.some((x) => x.id === pilih) ? pilih : (b.bidang[0]?.id ?? "");
  const tutupBersih = () => { setBidangId(""); setRalat(""); tutup(); };

  function masuk() {
    if (!ukur.trim()) { setRalat("Isi penyata ukuran dahulu."); return; }
    if (!sasaranBidang) { setRalat("Tiada bidang untuk dimasukkan."); return; }
    const id = s.tambahSasaran(sasaranBidang, semakanSahaja ? "TAMBAH" : "KEKAL", teks);
    fokus(id);
    setUkur(""); setTujuan(""); setPeringkat("");
    tutupBersih();
  }

  return (
    <dialog ref={dlg} onClose={tutupBersih} className="m-auto w-[min(640px,calc(100vw-32px))] rounded-2xl border border-garis bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-navy-900/55">
      <div className="grid gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold text-navy-800">Bina sasaran dengan panduan</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Isi ruang <b>a</b>, <b>b</b> dan <b>c</b> (<b>d</b> jika sesuai). Ayat sasaran
            tersusun sendiri di bawah — semak, kemudian tekan <b>Masukkan sasaran</b>.
            Anda masih boleh menyuntingnya selepas itu.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="pb-kk" className={LABEL}>a. Kata kerja</label>
            <select id="pb-kk" value={kata} onChange={(e) => setKata(e.target.value)} className={`${INPUT} mt-1`}>
              {["Memastikan", "Mencapai", "Menghasilkan", "Meningkatkan", "Mengurangkan", "Menyelesaikan"].map((v) => <option key={v}>{v}</option>)}
            </select></div>
          <div><label htmlFor="pb-ukur" className={LABEL}>b. Penyata ukuran</label>
            <input id="pb-ukur" value={ukur} onChange={(e) => setUkur(e.target.value)} placeholder="28 daripada 35 orang murid 4 Bestari" className={`${INPUT} mt-1`} /></div>
          <div><label htmlFor="pb-tujuan" className={LABEL}>c. Tujuan sasaran</label>
            <input id="pb-tujuan" value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder="mencapai sekurang-kurangnya TP3 bagi Matematik" className={`${INPUT} mt-1`} /></div>
          <div><label htmlFor="pb-per" className={LABEL}>d. Peringkat (jika ada)</label>
            <input id="pb-per" value={peringkat} onChange={(e) => setPeringkat(e.target.value)} placeholder="dalam PBD akhir tahun" className={`${INPUT} mt-1`} /></div>
        </div>
        <div><span className={LABEL}>Sasaran</span>
          <div className="mt-1 min-h-12 break-words rounded-lg border border-dashed border-garis bg-slate-50 p-3 text-sm">{teks}</div></div>
        <div><label htmlFor="pb-bidang" className={LABEL}>Masukkan ke bidang</label>
          <select id="pb-bidang" value={sasaranBidang} onChange={(e) => setBidangId(e.target.value)} className={`${INPUT} mt-1`}>
            {b.bidang.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
          </select></div>
        {ralat && <p role="alert" className="text-sm font-medium text-red-700">{ralat}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={masuk} className={BTN_UTAMA}>Masukkan sasaran</button>
          <button type="button" onClick={tutupBersih} className={BTN}>Tutup</button>
        </div>
      </div>
    </dialog>
  );
}

export default function BorangEkb({ s, data, onKembali, onRefresh }: {
  s: Suntingan; data: DataHalaman; onKembali?: () => void; onRefresh: () => void;
}) {
  const [pend, setPend] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [pulang, setPulang] = useState(false);
  const [sebab, setSebab] = useState("");
  // null = tertutup; "" = dibuka tanpa bidang pilihan; id = bidang dipilih terus.
  const [pembina, setPembina] = useState<string | null>(null);
  const [fokusId, setFokusId] = useState<string | null>(null);

  const { penuh, borangLihat: b, draf } = s;
  if (!penuh || !b || !draf) return null;

  const peranan = penuh.peranan;
  const pe: PerananEkb = peranan === "PEMERHATI" ? "PP2" : peranan;
  const k = kuasa(b, pe);
  const cur = peringkatSemasa(b);
  const idPelayan = new Set(penuh.borang.bidang.flatMap((x) => x.sasaran.map((y) => y.id)));
  const adaBuktiP1 = penuh.bukti.some((x) => x.peringkat === "p1");
  const semuaS = semuaSasaran(b);
  const aktif = semuaS.filter((x) => teksBiasa(x.teks).trim() && x.status !== "GUGUR").length;
  const ring = ringkasan(b, data.hariIni);
  const lemah = semuaS.filter((x) => petunjuk(x.teks)[0][0] !== "ok").length;
  const bolehTambah = k.penetapan || k.semakan;
  const mula: number[] = [];
  let urut = 0;
  for (const x of b.bidang) { mula.push(urut); urut += x.sasaran.length; }

  async function jalan(i: number, t: Tindakan, alasan?: string) {
    setSibuk(true); setNota(null);
    const r = await s.tindak(i, t, alasan);
    setSibuk(false);
    if (r.ok) { setNota({ ok: true, teks: MESEJ_TINDAKAN[t] }); setPulang(false); setSebab(""); onRefresh(); }
    else setNota({ ok: false, teks: r.mesej ?? "Gagal." });
  }

  /* ---------------------------------------------------- panel tindakan ---- */
  function panel() {
    const st = cur < 4 ? keadaan(b!, cur) : null;
    const info = cur < 4 ? PERINGKAT[cur] : null;
    const pg = info ? b!.peringkat[info.k] : null;
    const tutup = cur < 4 ? tarikh(tarikhTutup(b!.tahun, cur)) : "";

    if (cur === 4 && peranan !== "PP2") {
      return <section className={`${KAD} p-4`}><h3 className="text-lg font-bold text-navy-800">Borang lengkap</h3>
        <p className="mt-1 text-sm text-slate-600">Keempat-empat peringkat telah disahkan. Skor akhir {kira(2, b!).skor ?? "–"} sedia dimasukkan ke e-Prestasi.</p></section>;
    }
    if (peranan === "PEMERHATI") {
      return <section className={`${KAD} p-4`}><h3 className="text-lg font-bold text-navy-800">Mod baca sahaja</h3>
        <p className="mt-1 text-sm text-slate-600">Anda melihat borang ini sebagai pemerhati. Hanya PYD, PP1 dan PP2 yang dilantik boleh menyunting, mengesah atau mengulas.</p></section>;
    }
    const senarai = cur < 4 ? semakan(b!, cur, adaBuktiP1) : [];
    const semak = senarai.length > 0 && (
      <ul className="mt-2.5 grid gap-1 text-sm">
        {senarai.map(([ok, t]) => (
          <li key={t} className="flex items-baseline gap-2"><span className={`font-bold ${ok ? "text-emerald-700" : "text-red-700"}`}>{ok ? "✓" : "•"}</span>{t}</li>
        ))}
      </ul>
    );

    if (peranan === "PYD" && info && pg && st) {
      if (st === "dihantar") {
        return <section className={`${KAD} grid gap-3 p-4 sm:grid-cols-[1fr_auto]`}>
          <div><h3 className="text-lg font-bold text-navy-800">{info.t}: menunggu PP1</h3>
            <p className="mt-1 text-sm text-slate-600">Dihantar pada {tarikh(pg.hantar)}. Anda boleh tarik balik untuk membuat pembetulan selagi PP1 belum mengesahkan.</p></div>
          <div><button type="button" disabled={sibuk} onClick={() => void jalan(cur, "tarik")} className={BTN}>Tarik balik</button></div>
        </section>;
      }
      const halang = penghalang(b!, cur);
      const dipulang = st === "dipulang";
      return <section className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] ${dipulang ? "border-red-300 bg-red-50" : "border-emas bg-[#fdf9f0]"}`}>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-navy-800">{dipulang ? "Dipulangkan untuk pindaan: " : "Peringkat semasa: "}{info.t}</h3>
          <p className="mt-1 text-sm text-slate-600">{info.pyd} Tarikh tutup {tutup}.</p>
          {dipulang && pg.pulang && <blockquote className="mt-2 break-words border-l-4 border-red-600 py-1 pl-3 italic">“{pg.pulang.teks}” — PP1, {tarikh(pg.pulang.tarikh)}</blockquote>}
          {semak}
        </div>
        <div className="grid content-start gap-2">
          {penuh!.pp1 ? (
            <>
              <button type="button" disabled={sibuk || halang.length > 0} onClick={() => void jalan(cur, "hantar")} className={BTN_UTAMA}>{sibuk ? "Menghantar…" : "Hantar kepada PP1"}</button>
              {halang.length > 0 && <small className="text-slate-500">Lengkapkan item bertanda • dahulu</small>}
            </>
          ) : (
            <p className="max-w-60 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">PP1 anda belum ditetapkan — hubungi pentadbir.</p>
          )}
        </div>
      </section>;
    }

    if (peranan === "PP1" && info && pg && st) {
      if (st === "dihantar") {
        return <section className="grid gap-3 rounded-xl border border-emas bg-[#fdf9f0] p-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0"><h3 className="text-lg font-bold text-navy-800">Tindakan anda: sahkan {info.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{info.pp} Dihantar {tarikh(pg.hantar)}.</p>{semak}</div>
          <div className="grid content-start gap-2">
            <button type="button" disabled={sibuk} onClick={() => void jalan(cur, "sahkan")} className={BTN_UTAMA}>Sahkan {info.t}</button>
            <button type="button" disabled={sibuk} onClick={() => setPulang((v) => !v)} className={BTN}>Pulangkan untuk pindaan</button>
          </div>
          {pulang && (
            <div className="grid gap-2 sm:col-span-2">
              <label htmlFor="sebab-pulang" className={LABEL}>Sebab dipulangkan (PYD akan nampak)</label>
              <textarea id="sebab-pulang" rows={2} maxLength={1000} autoFocus value={sebab} onChange={(e) => setSebab(e.target.value)}
                placeholder="Contoh: Markah sasaran 3 tidak selari dengan bukti." className={`${INPUT} resize-y`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={sibuk || !sebab.trim()} onClick={() => void jalan(cur, "pulang", sebab.trim())} className={BTN_BAHAYA_PEKAT}>Pulangkan</button>
                <button type="button" onClick={() => setPulang(false)} className={BTN_SENYAP}>Batal</button>
              </div>
            </div>
          )}
        </section>;
      }
      return <section className={`${KAD} p-4`}><h3 className="text-lg font-bold text-navy-800">Tiada tindakan diperlukan</h3>
        <p className="mt-1 text-sm text-slate-600">{st === "dipulang" ? `Borang dipulangkan pada ${tarikh(pg.pulang?.tarikh)}; menunggu pindaan PYD.` : `PYD sedang mengisi ${info.t} (tarikh tutup ${tutup}).`} Anda masih boleh memberi ulasan pada mana-mana sasaran.</p></section>;
    }

    // PP2
    const tunggu2 = [0, 1, 2, 3].filter((i) => keadaan(b!, i) === "sah1");
    if (tunggu2.length) {
      return <section className="grid gap-3 rounded-xl border border-emas bg-[#fdf9f0] p-4 sm:grid-cols-[1fr_auto]">
        <div><h3 className="text-lg font-bold text-navy-800">Tindakan anda: perakuan PP2</h3>
          <p className="mt-1 text-sm text-slate-600">PP1 telah mengesahkan peringkat berikut. Semak dan perakui.</p></div>
        <div className="grid content-start gap-2">
          {tunggu2.map((i) => <button key={i} type="button" disabled={sibuk} onClick={() => void jalan(i, "perakui")} className={BTN_UTAMA}>Perakui {PERINGKAT[i].t}</button>)}
        </div>
      </section>;
    }
    return <section className={`${KAD} p-4`}><h3 className="text-lg font-bold text-navy-800">Tiada tindakan diperlukan</h3>
      <p className="mt-1 text-sm text-slate-600">{info && st ? `Peringkat semasa: ${info.t} (${LABEL_KEADAAN[st]}).` : "Borang lengkap."} Anda boleh memantau dan memberi ulasan.</p></section>;
  }

  const st = s.status;
  return (
    <div className="mt-5 grid min-w-0 gap-4">
      {/* Semasa tindakan peringkat berjalan, semua medan dikunci. */}
      <fieldset disabled={s.sibukTindak} className="contents">
      {/* kepala */}
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onKembali && <button type="button" onClick={onKembali} className={BTN}>← Senarai PYD</button>}
        <div className="min-w-0">
          {peranan === "PYD" ? (
            <>
              <h2 className="text-xl font-bold text-navy-800">Borang Keberhasilan {b.tahun}</h2>
              <small className="block text-slate-500">{b.pyd.nama} · PP1 {penuh.pp1 ? namaPendek(penuh.pp1.nama) : "belum ditetapkan"} · PP2 {penuh.pp2 ? namaPendek(penuh.pp2.nama) : "belum ditetapkan"}</small>
            </>
          ) : (
            <>
              <h2 className="break-words text-xl font-bold text-navy-800">{b.pyd.nama}</h2>
              <small className="block text-slate-500">{[b.pyd.jawatan, b.pyd.gred].filter(Boolean).join(" · ")}{b.pyd.jawatan || b.pyd.gred ? " · " : ""}Anda {peranan === "PEMERHATI" ? "pemerhati" : peranan}</small>
            </>
          )}
        </div>
      </section>

      {(st.jenis === "konflik" || st.jenis === "gagal") && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="min-w-0 flex-1 font-semibold">{st.jenis === "konflik" ? st.mesej : `Gagal menyimpan: ${st.mesej}`}</p>
          {st.jenis === "konflik" ? (
            <button type="button" onClick={() => void s.muatSemula()} className={BTN_BAHAYA_PEKAT}>Muat semula</button>
          ) : (
            <button type="button" onClick={() => void s.simpan()} className={BTN}>Cuba lagi</button>
          )}
          {st.jenis === "konflik" && <p className="basis-full text-xs">Draf anda masih ada di skrin ini. “Muat semula” akan menggantikannya dengan versi terkini.</p>}
        </div>
      )}

      {/* rel peringkat */}
      <ol className="m-0 grid list-none grid-cols-1 overflow-hidden rounded-xl border border-garis bg-white p-0 sm:grid-cols-2 lg:grid-cols-4" aria-label="Peringkat borang">
        {PERINGKAT.map((p, i) => {
          const ke = keadaan(b, i), pg = b.peringkat[p.k];
          const lewat = ring.lewat && i === cur;
          const meta = ke === "sah2" ? `PP2 perakui ${tarikh(pg.sah2)}` : ke === "sah1" ? `PP1 sahkan ${tarikh(pg.sah1)} · tunggu PP2`
            : ke === "dihantar" ? `Dihantar ${tarikh(pg.hantar)}` : ke === "dipulang" ? `Dipulangkan ${tarikh(pg.pulang?.tarikh)}` : `Tarikh tutup ${tarikh(tarikhTutup(b.tahun, i))}`;
          return (
            <li key={p.k} className={`relative flex min-w-0 gap-2.5 border-b border-garis p-3 last:border-b-0 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0 ${i === cur ? "bg-navy-100" : ""} ${ke === "kunci" ? "opacity-60" : ""}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 font-mono text-[13px] font-semibold ${sah(ke) ? "border-emerald-600 bg-emerald-600 text-white" : ke === "dihantar" ? "border-violet-600 text-violet-700" : ke === "dipulang" ? "border-red-600 text-red-700" : "border-slate-300 text-slate-500"}`}>{sah(ke) ? "✓" : i + 1}</span>
              <div className="min-w-0">
                <b className="block text-sm leading-tight">{p.t}</b>
                <span className="mt-1 inline-flex flex-wrap gap-1"><Chip v={VARIAN_KEADAAN[ke]}>{LABEL_KEADAAN[ke]}</Chip>{lewat && <Chip v="bad">Lewat</Chip>}</span>
                <small className="mt-1 block text-xs text-slate-500">{meta}</small>
              </div>
              {i === cur && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-emas" />}
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="grid gap-3">
        {panel()}
        {nota && <p role={nota.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm font-medium ${nota.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{nota.teks}</p>}
      </div>

      {/* jalur skor */}
      <section className="grid overflow-hidden rounded-xl bg-navy-900 text-[#eaf1fb] sm:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1fr_1.3fr]" aria-live="polite">
        <SelDaftar label="Penilaian pertama" k="P1" hasil={kira(1, b)} />
        <SelDaftar label="Penilaian akhir" k="Akhir" hasil={kira(2, b)} />
        <div className="flex flex-wrap content-center gap-1.5 border-t border-white/10 p-3.5 sm:col-span-2 lg:col-span-1 lg:border-t-0">
          <Chip v={aktif >= MIN_SASARAN ? "ok" : "warn"}>{aktif} sasaran aktif{aktif < MIN_SASARAN ? ` · minimum ${MIN_SASARAN}` : ""}</Chip>
          {STATUS_SASARAN.filter((v) => semuaS.some((x) => x.status === v)).map((v) => <Chip key={v}>{v} {semuaS.filter((x) => x.status === v).length}</Chip>)}
          {lemah > 0 && <Chip v="warn">{lemah} perlu disemak</Chip>}
        </div>
      </section>

      {/* status simpanan */}
      {s.boleh && (
        <p aria-live="polite" className="sticky bottom-3 z-20 ml-auto w-fit rounded-full border border-garis bg-white/95 px-3 py-1 text-xs font-semibold text-slate-600 shadow">
          {st.jenis === "simpan" ? "Menyimpan…" : st.jenis === "belum" ? "Belum disimpan…" : st.jenis === "ok" ? "Disimpan" : st.jenis === "gagal" ? "Gagal menyimpan" : st.jenis === "konflik" ? "Versi bercanggah" : "Auto-simpan aktif"}
        </p>
      )}

      {/* maklumat PYD */}
      <fieldset className="min-w-0 rounded-xl border border-garis bg-white px-4 pb-4 pt-2">
        <legend className="px-1.5 text-sm font-bold uppercase tracking-wide text-slate-500">Maklumat PYD</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([["nama", "Nama PYD"], ["kp", "No. K/P"], ["gred", "Gred"], ["jawatan", "Jawatan"], ["tempat", "Tempat bertugas"]] as const).map(([f, l]) => (
            <div key={f} className="min-w-0">
              <label htmlFor={`pyd-${f}`} className={LABEL}>{l}</label>
              <input
                id={`pyd-${f}`}
                value={b.pyd[f]}
                disabled={!k.penetapan}
                inputMode={f === "kp" ? "numeric" : undefined}
                maxLength={f === "kp" ? 14 : 120}
                placeholder={f === "kp" ? (peranan === "PYD" ? "Diisi oleh PYD" : "Disembunyikan") : undefined}
                onChange={(e) => s.ubahPyd(f, e.target.value)}
                onBlur={s.simpanSegera}
                className={`${INPUT} mt-1`}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* bidang & sasaran */}
      {b.bidang.map((x, bi) => {
        const padamBidang = pend === `bdel-${x.id}`;
        return (
          <section key={x.id} className="min-w-0 overflow-hidden rounded-xl border border-garis bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-garis bg-slate-50 px-3.5 py-2.5">
              {k.penetapan ? (
                <input value={x.nama} maxLength={160} aria-label="Nama bidang tugas" onChange={(e) => s.namaBidang(x.id, e.target.value)} onBlur={s.simpanSegera}
                  className={`${INPUT} min-w-52 flex-1 font-bold uppercase`} />
              ) : (
                <h3 className="min-w-0 flex-1 break-words text-base font-bold uppercase text-navy-800">{x.nama}</h3>
              )}
              <Chip>{x.sasaran.length} sasaran</Chip>
              {k.penetapan && (padamBidang ? (
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-red-700">
                  Padam bidang dan semua sasarannya?
                  <button type="button" onClick={() => { s.padamBidang(x.id); setPend(null); }} className={BTN_BAHAYA_PEKAT}>Padam</button>
                  <button type="button" onClick={() => setPend(null)} className={BTN_SENYAP}>Batal</button>
                </span>
              ) : (
                <button type="button" onClick={() => setPend(`bdel-${x.id}`)} className={BTN_BAHAYA}>Padam bidang</button>
              ))}
            </div>
            {x.sasaran.length ? x.sasaran.map((y, si) => (
              <KadSasaran
                key={y.id}
                s={s} borang={b} k={k} peranan={peranan} sas={y}
                no={mula[bi] + si + 1} si={si} len={x.sasaran.length}
                adaPelayan={idPelayan.has(y.id)} pend={pend} setPend={setPend} fokusId={fokusId}
              />
            )) : (
              <div className="grid justify-items-center gap-1 px-4 py-6 text-center text-slate-500">
                <b>Belum ada sasaran</b>
                {bolehTambah && (
                  <span className="max-w-md text-sm">
                    Tekan <b className="text-navy-700">Bina dengan panduan</b> untuk menyusun sasaran
                    langkah demi langkah, atau <b className="text-navy-700">+ Tambah sasaran</b> untuk menulis sendiri.
                  </span>
                )}
              </div>
            )}
            {bolehTambah && (
              <div className="flex flex-wrap gap-2 bg-slate-50 px-3.5 py-2.5">
                <button type="button" className={BTN} onClick={() => setFokusId(s.tambahSasaran(x.id, k.semakan && !k.penetapan ? "TAMBAH" : "KEKAL"))}>
                  + Tambah sasaran{k.semakan && !k.penetapan ? " (TAMBAH)" : ""}
                </button>
                <button type="button" className={BTN_UTAMA} onClick={() => setPembina(x.id)}>
                  Bina dengan panduan
                </button>
              </div>
            )}
          </section>
        );
      })}

      {bolehTambah && (
        <div className="flex flex-wrap gap-2">
          {k.penetapan && <button type="button" onClick={s.tambahBidang} className={BTN}>+ Bidang tugas baharu</button>}
          <button type="button" onClick={() => setPembina("")} className={BTN}>Bina sasaran dengan panduan</button>
        </div>
      )}
      </fieldset>
      <Pembina s={s} b={b} buka={pembina !== null} bidangAwal={pembina ?? ""} tutup={() => setPembina(null)} semakanSahaja={k.semakan && !k.penetapan} fokus={setFokusId} />
    </div>
  );
}
