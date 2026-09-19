"use client";

import { useEffect, useMemo, useState } from "react";
import {
  papanBilik, tempahBanyakTindakan, batalTindakan, putuskanTempahanTindakan,
  type PapanBilik,
} from "@/lib/tindakan-bilik";
import { sebabTetap } from "@/data/bilik-tetap";
import { labelTarikh, type Tempahan } from "@/data/bilik";
import {
  isninMinggu, tambahHari, tarikhMinggu, labelLajur, perluKelulusan, hujungMinggu,
  selGrid, statusBilik, gabungJulat, kunciSel, huraiKunci, tempahanAktif,
  type BlokGrid,
} from "@/data/grid-bilik";

/**
 * GRID TEMPAHAN — Isnin hingga Jumaat, waktu menegak, pagi dan petang.
 *
 * Keputusan pengguna (17 Sep 2026), disalin di sini kerana bentuk skrin ini
 * ialah keputusan itu: "letak kolumn jadual isnin hingga jumaat dan masa,
 * ikut konsep pagi petang seperti di jadual harian. hijau maksudnya bilik
 * kosong, merah maksudnya dah ditempah. disebabkan bilik banyak maka jadual
 * akan sentiasa biru, namun apabila klik pada jadual, barulah nampak bilik
 * mana yang available dan bilik mana yang telah ditempah."
 *
 * Itu pemerhatian yang tepat, dan ia yang menentukan warna: dengan lapan
 * bilik, hampir setiap slot ada sesuatu yang kosong. Mewarnakan slot hijau
 * bermakna seluruh grid hijau, yang tidak memberitahu apa-apa. Jadi slot
 * membawa BILANGAN bilik kosong dan kekal biru; hijau dan merah hanya
 * muncul pada senarai bilik, selepas slot ditekan.
 *
 * DUA PERATURAN BERBEZA UNTUK DUA JENIS HARI:
 *  · Hari sekolah — siapa dapat dahulu, dia menang. Tempahan terus mengunci.
 *  · Hari cuti dan hujung minggu — perlu kelulusan pentadbir, dan permohonan
 *    TIDAK mengunci slot sementara menunggu. Dua guru boleh memohon hari
 *    yang sama; pentadbir yang memilih.
 */
export default function GridBilik({ papan, barangIct }: {
  papan: PapanBilik;
  barangIct: { id: string; nama: string; baki: number }[];
}) {
  const [data, setData] = useState(papan);
  const [isnin, setIsnin] = useState(() => isninMinggu(papan.hariIni));
  const [tunjukHujung, setTunjukHujung] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [mingguSedia, setMingguSedia] = useState<string | null>(null);
  const belumSedia = memuat || mingguSedia !== isnin;

  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [bilikPilih, setBilikPilih] = useState<Set<string>>(new Set());
  const [tujuan, setTujuan] = useState("");
  const [perluAlat, setPerluAlat] = useState(false);
  const [alat, setAlat] = useState<Record<string, number>>({});

  const [sibuk, setSibuk] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [gagal, setGagal] = useState<string[]>([]);

  /**
   * Pada telefon, grid lebih lebar daripada skrin — jadi ia ditatal supaya
   * HARI INI kelihatan, bukan Isnin.
   *
   * Tanpa ini, guru yang membuka papan pada hari Khamis melihat Isnin dan
   * Selasa yang sudah berlalu, dan perlu meleret dua kali sebelum melihat
   * hari yang mereka mahu tempah. Diuji pada 390px: dua lajur pertama
   * memenuhi skrin.
   *
   * Hanya `scrollLeft` bekas yang ditetapkan — BUKAN `scrollIntoView`, yang
   * menatal setiap bekas nenek termasuk halaman, dan melompatkan pengguna
   * ke tengah skrin sebaik ia dibuka.
   */


  /**
   * Minggu yang dilihat dibaca semula dari pelayan.
   *
   * Papan awal hanya membawa 14 hari dari hari ini; menatal ke bulan depan
   * tanpa membaca semula memaparkan minggu yang KELIHATAN kosong sepenuhnya
   * — dan slot yang kelihatan kosong padahal sudah ditempah ialah tepat
   * kegagalan yang modul ini wujud untuk hapuskan.
   */
  useEffect(() => {
    let dibuang = false;
    // Keadaan DITETAPKAN DALAM CALLBACK, bukan serta-merta dalam kesan ini.
    // `setState` segerak dalam useEffect mencetuskan render bertingkat —
    // React 19 melaporkannya sebagai ralat, dan ia bukan sekadar amaran:
    // pada minggu yang ditukar cepat, render bertingkat itu boleh memapar
    // data minggu lama di bawah kepala minggu baharu.
    void (async () => {
      const mula = Promise.resolve().then(() => { if (!dibuang) setMemuat(true); });
      try {
        const baharu = await papanBilik(isnin, 7);
        if (!baharu || baharu.belumSedia) throw new Error("Papan tempahan belum tersedia.");
        if (!dibuang) { setData(baharu); setMingguSedia(isnin); }
      } catch {
        if (!dibuang) {
          setMingguSedia(null);
          setNota({ ok: false, teks: "Gagal membaca minggu ini. Muat semula sebelum memilih tempahan." });
        }
      } finally {
        await mula;
        if (!dibuang) setMemuat(false);
      }
    })();
    return () => { dibuang = true; };
  }, [isnin]);

  const tarikh = useMemo(
    () => tarikhMinggu(isnin, tunjukHujung ? 7 : 5),
    [isnin, tunjukHujung],
  );

  useEffect(() => {
    if (!tarikh.includes(data.hariIni)) return;
    // SELEPAS LUKISAN, bukan dalam kesan itu sendiri.
    //
    // Ditetapkan terus dalam kesan, `scrollLeft` kembali kepada 0 —
    // disahkan dalam Chuji sebenar: nilainya diterima (222 → dikepit 196)
    // dan bekas tetap berada di 0 selepas hidrasi. Satu bingkai kemudian ia
    // melekat. Ia dijalankan ke atas nod yang SEDANG dipasang, bukan nod
    // yang dipegang rujukan semasa kesan berjalan.
    const bingkai = requestAnimationFrame(() => {
      for (const bekas of document.querySelectorAll<HTMLElement>("[data-grid-bilik]")) {
        const lajur = bekas.querySelector<HTMLElement>("[data-hari-ini]");
        const lajurWaktu = bekas.querySelector<HTMLElement>("th");
        if (!lajur) continue;
        const anjak = lajur.offsetLeft - (lajurWaktu?.offsetWidth ?? 0);
        if (anjak > 0 && bekas.scrollLeft === 0) bekas.scrollLeft = anjak;
      }
    });
    return () => cancelAnimationFrame(bingkai);
  }, [tarikh, data.hariIni, data.sesi]);

  const bilikAktif = useMemo(() => data.bilik.filter((b) => b.aktif), [data.bilik]);
  const namaBilik = useMemo(
    () => new Map(data.bilik.map((b) => [b.id, b.nama])),
    [data.bilik],
  );

  const blokPilih = useMemo(() => {
    const semua = data.sesi.flatMap((s) => s.blok);
    return [...pilih]
      .map((k) => {
        const { tarikh: t, blokId } = huraiKunci(k);
        const blok = semua.find((b) => b.id === blokId);
        return blok ? { tarikh: t, blok } : null;
      })
      .filter((x): x is { tarikh: string; blok: BlokGrid } => x !== null)
      .sort((a, b) => a.tarikh.localeCompare(b.tarikh) || a.blok.mula.localeCompare(b.blok.mula));
  }, [pilih, data.sesi]);

  /** Tarikh yang ada dalam pemilihan, mengikut urutan. */
  const tarikhPilih = useMemo(
    () => [...new Set(blokPilih.map((x) => x.tarikh))],
    [blokPilih],
  );

  const adaCuti = tarikhPilih.some((t) => perluKelulusan(t, data.cuti));

  /**
   * Status setiap bilik terhadap SELURUH pemilihan.
   *
   * Satu bilik yang bebas pada dua waktu daripada tiga tidak boleh ditempah
   * untuk ketiga-tiganya — jadi ia merah, dengan sebab dari waktu yang
   * berlanggar. Memaparkannya hijau dan membiarkan pelayan menolaknya
   * kemudian bermakna guru menekan Tempah dan mendapat kegagalan separa.
   */
  const statusBilikPilih = useMemo(() => {
    return bilikAktif.map((b) => {
      for (const { tarikh: t, blok } of blokPilih) {
        const s = statusBilik(b.id, t, blok, data.tempahan, data.tetap);
        if (s.status === "kosong") continue;
        return {
          bilik: b,
          status: s.status,
          sebab:
            s.status === "tetap" && s.tetap
              ? sebabTetap(s.tetap)
              : s.tempahan
                ? `Ditempah ${s.tempahan.mula}–${s.tempahan.tamat} oleh ${s.tempahan.nama}` +
                  ((s.tempahan.status ?? "lulus") === "menunggu" ? " (menunggu kelulusan)" : "")
                : "Tidak kosong",
        };
      }
      return { bilik: b, status: "kosong" as const, sebab: "" };
    });
  }, [bilikAktif, blokPilih, data.tempahan, data.tetap]);

  function togolSel(t: string, blok: BlokGrid) {
    if (belumSedia || sibuk) return;
    setBilikPilih(new Set());
    const k = kunciSel(t, blok.id);
    setPilih((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
    setNota(null);
  }

  function togolBilik(id: string) {
    setBilikPilih((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function tempah() {
    if (belumSedia || sibuk) return;
    setSibuk(true);
    setNota(null);
    setGagal([]);
    try {
      const peralatan = perluAlat
        ? Object.entries(alat).filter(([, n]) => n > 0).map(([barang_id, kuantiti]) => ({ barang_id, kuantiti }))
        : [];

      const mesej: string[] = [];
      const semuaGagal: string[] = [];
      let adaBerjaya = false;

      // SATU PANGGILAN SETIAP TARIKH. Pelayan menentukan hari cuti dari
      // tarikh, jadi mencampurkan dua tarikh dalam satu panggilan bermakna
      // satu keputusan kelulusan untuk dua hari yang berbeza jenis.
      for (let i = 0; i < tarikhPilih.length; i++) {
        const t = tarikhPilih[i];
        const blok = blokPilih.filter((x) => x.tarikh === t).map((x) => x.blok);
        const r = await tempahBanyakTindakan({
          bilik_ids: [...bilikPilih],
          tarikh: t,
          blok: blok.map((b) => ({ mula: b.mula, tamat: b.tamat })),
          tujuan,
          // Peralatan dimohon SEKALI, pada tarikh pertama sahaja — bukan
          // sekali setiap hari yang dipilih.
          peralatan: i === 0 ? peralatan : [],
        });
        mesej.push(r.mesej);
        if (r.gagal) semuaGagal.push(...r.gagal);
        if (r.ok) adaBerjaya = true;
      }

      setNota({ ok: adaBerjaya, teks: mesej.join(" ") });
      setGagal(semuaGagal);

      if (adaBerjaya) {
        setPilih(new Set());
        setBilikPilih(new Set());
        setTujuan("");
        setPerluAlat(false);
        setAlat({});
        const baharu = await papanBilik(isnin, 7);
        if (baharu) setData(baharu);
      }
    } catch (e) {
      setNota({ ok: false, teks: e instanceof Error ? e.message : "Gagal menghubungi pelayan. Muat semula sebelum mencuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  async function batal(t: Tempahan) {
    setSibuk(true);
    try {
      const r = await batalTindakan(t.id);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setData((d) => ({ ...d, tempahan: d.tempahan.filter((x) => x.id !== t.id) }));
      }
    } catch (e) {
      setNota({ ok: false, teks: e instanceof Error ? e.message : "Gagal menghubungi pelayan. Muat semula sebelum mencuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  async function putuskan(t: Tempahan, status: "lulus" | "tolak") {
    setSibuk(true);
    try {
      const r = await putuskanTempahanTindakan(t.id, status);
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) {
        setData((d) => ({
          ...d,
          tempahan: d.tempahan.map((x) => (x.id === t.id ? { ...x, status } : x)),
        }));
      }
    } catch (e) {
      setNota({ ok: false, teks: e instanceof Error ? e.message : "Gagal menghubungi pelayan. Muat semula sebelum mencuba lagi." });
    } finally {
      setSibuk(false);
    }
  }

  /** Tempahan hari cuti yang masih menunggu keputusan. */
  const menunggu = useMemo(
    () =>
      data.tempahan
        .filter((t) => !t.dibatalkan && t.status === "menunggu")
        .sort((a, b) => a.tarikh.localeCompare(b.tarikh) || a.mula.localeCompare(b.mula)),
    [data.tempahan],
  );

  if (data.sesi.length === 0) {
    return (
      <p className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        <b>Waktu sekolah belum ditetapkan.</b> Grid tempahan mengambil blok
        waktunya dari Jadual Waktu — pentadbir perlu menetapkan set waktu di
        sana dahulu, supaya papan ini memapar waktu yang SAMA seperti jadual
        kelas.
      </p>
    );
  }

  return (
    <section className="mt-5">
      {/* ------------------------------------------ navigasi minggu --- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={sibuk} onClick={() => { setPilih(new Set()); setBilikPilih(new Set()); setIsnin((d) => tambahHari(d, -7)); }}
          className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-navy-700 hover:border-navy-700"
        >
          ← Minggu lalu
        </button>
        <span className="text-sm font-semibold text-navy-800">
          {labelTarikh(tarikh[0])} – {labelTarikh(tarikh[tarikh.length - 1])}
        </span>
        <button
          type="button"
          disabled={sibuk} onClick={() => { setPilih(new Set()); setBilikPilih(new Set()); setIsnin((d) => tambahHari(d, 7)); }}
          className="rounded-lg border border-garis px-3 py-1.5 text-sm font-semibold text-navy-700 hover:border-navy-700"
        >
          Minggu depan →
        </button>
        {isnin !== isninMinggu(data.hariIni) && (
          <button
            type="button"
            disabled={sibuk} onClick={() => { setPilih(new Set()); setBilikPilih(new Set()); setIsnin(isninMinggu(data.hariIni)); }}
            className="text-xs text-slate-500 underline"
          >
            Balik ke minggu ini
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={tunjukHujung}
            onChange={(e) => setTunjukHujung(e.target.checked)}
          />
          Tunjuk Sabtu &amp; Ahad
        </label>
        {memuat && <span className="text-xs text-slate-400">memuat…</span>}
      </div>

      {/* ------------------------------------------------ petunjuk --- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[#e8eefb] ring-1 ring-[#b9cbf0]" />
          ada bilik kosong
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-[#fbeaea] ring-1 ring-[#e9c4c4]" />
          penuh
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-navy-700" />
          dipilih
        </span>
        <span>Tekan slot untuk melihat bilik mana kosong.</span>
      </div>

      {/* ---------------------------------------------------- grid --- */}
      {data.sesi.map((s) => (
        <div key={s.sesi} className="mt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-emas">{s.nama}</h3>
          <div
            data-grid-bilik=""
            className="mt-1.5 overflow-x-auto rounded-xl border border-garis bg-white"
          >
            <table className="w-full min-w-[34rem] border-collapse text-center text-[11px]">
              <thead>
                <tr className="bg-navy-50">
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Waktu</th>
                  {tarikh.map((t) => {
                    const cuti = perluKelulusan(t, data.cuti);
                    return (
                      <th
                        key={t}
                        data-hari-ini={t === data.hariIni ? "" : undefined}
                        className={`px-1.5 py-1.5 font-semibold ${
                          cuti ? "text-[#7a5a12]" : "text-navy-800"
                        }`}
                      >
                        {labelLajur(t)}
                        {cuti && (
                          <span className="mt-0.5 block text-[9px] font-bold uppercase">
                            {hujungMinggu(t) ? "hujung minggu" : "cuti"} · perlu kelulusan
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-garis">
                {s.blok.map((b) => (
                  <tr key={b.id}>
                    <th className="whitespace-nowrap px-2 py-1 text-left font-mono font-normal text-slate-500">
                      {b.mula}–{b.tamat}
                    </th>
                    {tarikh.map((t) => {
                      const sel = selGrid(t, b, data.bilik, data.tempahan, data.tetap, data.hariIni);
                      const dipilih = pilih.has(kunciSel(t, b.id));
                      const penuh = sel.kosong === 0 && sel.jumlah > 0;
                      return (
                        <td key={t} className="p-0.5">
                          <button
                            type="button"
                            disabled={sel.lalu || belumSedia || sibuk}
                            onClick={() => togolSel(t, b)}
                            aria-pressed={dipilih}
                            aria-label={`${labelTarikh(t)} ${b.mula}–${b.tamat}: ${sel.kosong} daripada ${sel.jumlah} bilik kosong`}
                            className={`w-full rounded px-1 py-1.5 text-[11px] font-semibold tabular-nums transition-colors ${
                              sel.lalu
                                ? "cursor-default bg-slate-50 text-slate-300"
                                : dipilih
                                  ? "bg-navy-700 text-white"
                                  : penuh
                                    ? "bg-[#fbeaea] text-[#8f2424] ring-1 ring-inset ring-[#e9c4c4] hover:bg-[#f7dede]"
                                    : "bg-[#e8eefb] text-navy-800 ring-1 ring-inset ring-[#b9cbf0] hover:bg-[#dbe6f8]"
                            }`}
                          >
                            {sel.lalu ? "·" : penuh ? "penuh" : `${sel.kosong}/${sel.jumlah}`}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* -------------------------------------------- bilik & tempah --- */}
      {blokPilih.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-navy-100 bg-white p-4">
          <h3 className="text-base font-bold text-navy-800">
            {blokPilih.length} waktu dipilih
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {tarikhPilih.map((t) => {
              const julat = gabungJulat(
                blokPilih.filter((x) => x.tarikh === t).map((x) => x.blok),
              );
              return (
                <span key={t} className="mr-3 inline-block">
                  <b>{labelTarikh(t)}</b>{" "}
                  {julat.map((j) => `${j.mula}–${j.tamat}`).join(", ")}
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setPilih(new Set())}
              className="ml-1 text-slate-400 underline"
            >
              kosongkan
            </button>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Waktu berturutan digabung menjadi satu tempahan — tiga waktu
            berturut ialah satu tempahan sejam setengah, bukan tiga baris.
          </p>

          {adaCuti && (
            <p className="mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
              Pemilihan ini termasuk <b>hari cuti atau hujung minggu</b>.
              Tempahan itu dihantar kepada pentadbir untuk kelulusan dan
              <b> belum mengunci bilik</b> — guru lain masih boleh memohon
              waktu yang sama sementara itu.
            </p>
          )}

          {/* HIJAU dan MERAH muncul DI SINI, bukan pada grid. */}
          <h4 className="mt-4 text-[11px] font-bold uppercase tracking-widest text-emas">
            Bilik pada waktu itu
          </h4>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {statusBilikPilih.map(({ bilik, status, sebab }) => {
              const kosong = status === "kosong";
              const ditanda = bilikPilih.has(bilik.id);
              return (
                <li key={bilik.id}>
                  <button
                    type="button"
                    disabled={!kosong || belumSedia || sibuk}
                    onClick={() => togolBilik(bilik.id)}
                    title={sebab || undefined}
                    aria-pressed={ditanda}
                    className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      !kosong
                        ? "cursor-not-allowed bg-[#fbeaea] text-[#8f2424] ring-1 ring-inset ring-[#e9c4c4]"
                        : ditanda
                          ? "bg-[#167a4b] text-white"
                          : "bg-[#e5f4ec] text-[#14603c] ring-1 ring-inset ring-[#bfe3ce] hover:bg-[#d7eee2]"
                    }`}
                  >
                    <span className="block">
                      {ditanda && kosong ? "✓ " : ""}
                      {bilik.nama}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                      {kosong
                        ? bilik.muatan
                          ? `kosong · ${bilik.muatan} orang`
                          : "kosong"
                        : sebab}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            <label htmlFor="tujuan-grid" className="block text-xs font-semibold text-slate-500">
              Tujuan
            </label>
            <input
              id="tujuan-grid"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="Mesyuarat panitia Matematik"
              className="mt-1 w-full rounded-lg border border-garis px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Ini yang guru lain baca sebelum bertanya kepada anda.
            </p>
          </div>

          {/* Peralatan ICT — tersembunyi sehingga ditanda, kerana borang
              yang memapar dua belas baris peralatan kepada setiap guru yang
              hanya mahu bilik ialah borang yang orang berhenti membaca. */}
          {barangIct.length > 0 && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={perluAlat}
                  onChange={(e) => setPerluAlat(e.target.checked)}
                />
                Perlu peralatan ICT juga
              </label>
              {perluAlat && (
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {barangIct.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, b.baki)}
                        value={alat[b.id] ?? 0}
                        onChange={(e) =>
                          setAlat((a) => ({ ...a, [b.id]: Number(e.target.value) || 0 }))
                        }
                        aria-label={`Bilangan ${b.nama}`}
                        className="w-16 rounded border border-garis px-2 py-1"
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-600">
                        {b.nama} <span className="text-slate-400">· {b.baki} ada</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void tempah()}
              disabled={belumSedia || sibuk || bilikPilih.size === 0 || tujuan.trim().length < 3}
              className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sibuk
                ? "Menghantar…"
                : adaCuti
                  ? `Mohon kelulusan · ${bilikPilih.size} bilik`
                  : `Tempah ${bilikPilih.size} bilik × ${blokPilih.length} waktu`}
            </button>
            {bilikPilih.size === 0 && (
              <span className="text-xs text-slate-500">Pilih bilik hijau di atas.</span>
            )}
          </div>
        </div>
      )}

      {nota && (
        <p
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm leading-relaxed ${
            nota.ok
              ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
              : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
          }`}
        >
          {nota.teks}
        </p>
      )}

      {gagal.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
          {gagal.slice(0, 10).map((g, i) => <li key={i}>⚠ {g}</li>)}
          {gagal.length > 10 && <li>… {gagal.length - 10} lagi</li>}
        </ul>
      )}

      {/* ------------------------------------ menunggu kelulusan --- */}
      {menunggu.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#e9d9ae] bg-[#fdf9f0] p-4">
          <h3 className="text-base font-bold text-[#7a5a12]">
            {menunggu.length} tempahan hari cuti menunggu kelulusan
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#7a5a12]">
            {data.bolehUrus
              ? "Meluluskan ialah saat tempahan ini mula mengunci bilik. Kalau dua permohonan bertindih, hanya satu boleh diluluskan."
              : "Pentadbir akan memutuskan. Anda akan menerima pemberitahuan."}
          </p>
          <ul className="mt-2 divide-y divide-[#e9d9ae]">
            {menunggu.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
                <span className="font-semibold text-navy-800">
                  {namaBilik.get(t.bilik_id) ?? "Bilik"}
                </span>
                <span className="text-slate-600">
                  {labelTarikh(t.tarikh)} · {t.mula}–{t.tamat}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-500">
                  {t.tujuan} — {t.nama}
                </span>
                {data.bolehLulus ? (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void putuskan(t, "lulus")}
                      disabled={sibuk}
                      className="rounded bg-[#167a4b] px-2.5 py-1 font-bold text-white disabled:opacity-50"
                    >
                      Luluskan
                    </button>
                    <button
                      type="button"
                      onClick={() => void putuskan(t, "tolak")}
                      disabled={sibuk}
                      className="rounded border border-[#8f2b2b] px-2.5 py-1 font-bold text-[#8f2b2b] disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  </span>
                ) : (
                  t.oleh === data.sayaEmel && (
                    <button
                      type="button"
                      onClick={() => void batal(t)}
                      disabled={sibuk}
                      className="text-[#8f2b2b] underline disabled:opacity-50"
                    >
                      Tarik balik
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------------------------- tempahan minggu ini --- */}
      <MingguIni
        tarikh={tarikh}
        tempahan={data.tempahan}
        namaBilik={namaBilik}
        sayaEmel={data.sayaEmel}
        bolehUrus={data.bolehUrus}
        hariIni={data.hariIni}
        batal={batal}
        sibuk={sibuk}
      />
    </section>
  );
}

/**
 * Senarai tempahan minggu yang dilihat — grid menjawab "bila kosong",
 * senarai ini menjawab "siapa menempah apa".
 *
 * Kedua-duanya diperlukan: grid tidak boleh memapar tujuan tanpa menjadi
 * tidak boleh dibaca, dan senarai tidak boleh memapar ruang kosong.
 */
function MingguIni({
  tarikh, tempahan, namaBilik, sayaEmel, bolehUrus, hariIni, batal, sibuk,
}: {
  tarikh: string[];
  tempahan: Tempahan[];
  namaBilik: Map<string, string>;
  sayaEmel: string;
  bolehUrus: boolean;
  hariIni: string;
  batal: (t: Tempahan) => Promise<void>;
  sibuk: boolean;
}) {
  const ikutHari = tarikh
    .map((t) => ({
      tarikh: t,
      senarai: tempahanAktif(tempahan)
        .filter((x) => x.tarikh === t)
        .sort((a, b) => a.mula.localeCompare(b.mula)),
    }))
    .filter((h) => h.senarai.length > 0);

  if (ikutHari.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-garis bg-white p-4 text-sm text-slate-500">
        Tiada tempahan diluluskan dalam minggu ini.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-base font-bold text-navy-800">Tempahan minggu ini</h3>
      <ul className="mt-2 space-y-3">
        {ikutHari.map((h) => (
          <li key={h.tarikh}>
            <p
              className={`text-xs font-bold ${
                h.tarikh < hariIni ? "text-slate-400" : "text-navy-700"
              }`}
            >
              {labelTarikh(h.tarikh)}
              {h.tarikh < hariIni && " · berlalu"}
            </p>
            <ul className="mt-1 divide-y divide-garis rounded-xl border border-garis bg-white">
              {h.senarai.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
                  <span className="w-24 shrink-0 font-mono text-slate-500">
                    {t.mula}–{t.tamat}
                  </span>
                  <span className="font-semibold text-navy-800">
                    {namaBilik.get(t.bilik_id) ?? "Bilik"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {t.tujuan} <span className="text-slate-400">— {t.nama}</span>
                  </span>
                  {(bolehUrus || t.oleh === sayaEmel) && t.tarikh >= hariIni && (
                    <button
                      type="button"
                      onClick={() => void batal(t)}
                      disabled={sibuk}
                      className="text-[#8f2b2b] underline disabled:opacity-50"
                    >
                      Batal
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
