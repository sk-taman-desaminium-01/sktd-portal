"use client";

import { useMemo, useState } from "react";
import { simpanJadualKelas, simpanSetWaktu } from "@/lib/jadual";
import { naikFailJadual, type HasilBaca } from "@/lib/baca-jadual";
import PukalJadual from "./PukalJadual";
import { SUBJEK } from "@/data/subjek";
import { semakSaiz } from "@/data/had-fail";
import { sediaMuatan, normalkanFail } from "@/data/muatan-pelayar";
import { bacaImbasanJadual, failOcrJadual, pdfTanpaTeks } from "@/data/ocr-pelayar";
import {
  HARI, NAMA_HARI, NAMA_SESI, SESI, jamPapar, setUntukKelas, tahunKelas,
  type Hari, type Jadual, type Sesi, type SetWaktu, type Waktu,
} from "@/data/jadual-jenis";
import PilihCari from "@/components/PilihCari";

/**
 * Penyunting jadual waktu.
 *
 * SATU KELAS PADA SATU MASA, dengan sengaja. Grid 19 kelas × 5 hari × 11
 * waktu ialah lebih 1,000 sel — mustahil disunting pada telefon, dan mudah
 * tersalah taip pada baris yang salah. Pentadbir juga menyusun jadual satu
 * kelas pada satu masa, jadi skrin mengikut cara kerja itu.
 *
 * Waktu dan rehat datang dari SET WAKTU kelas itu, yang ditentukan tahunnya.
 * Rehat sekolah ini berperingkat dan menganjakkan waktu selepasnya, jadi
 * setiap kumpulan tahun ada senarai waktunya sendiri.
 */

/** Senarai subjek datang dari SATU tempat — lihat src/data/subjek.ts. */
const PILIHAN = SUBJEK;

const NAMA_SUBJEK = new Map(PILIHAN.map((p) => [p.kod, p.nama]));
// 0 = Pendidikan Khas (PPKI) — sentinel dari `tahunKelas()`, bukan tahun
// sebenar. Diletak terakhir supaya susunan Tahun 1–6 kekal seperti biasa.
const TAHUN = [1, 2, 3, 4, 5, 6, 0];
const LABEL_TAHUN = (t: number) => (t === 0 ? "PPKI" : `Tahun ${t}`);

export default function PanelJadual({
  awal, kelas, bolehWaktu,
}: {
  awal: Jadual;
  /** Kelas yang pengguna INI dibenarkan sunting — ditentukan pelayan. */
  kelas: string[];
  /** Set waktu dikongsi banyak kelas, jadi hanya pentadbir ke atas. */
  bolehWaktu: boolean;
}) {
  const [jadual, setJadual] = useState<Jadual>(awal);
  const [pilih, setPilih] = useState<string>(kelas[0]);
  const [hasil, setHasil] = useState<{ ok: boolean; mesej: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [bukaWaktu, setBukaWaktu] = useState(false);
  const [baca, setBaca] = useState<HasilBaca | null>(null);
  const [naik, setNaik] = useState(false);

  const kelasIni = jadual.kelas[pilih];
  const set = setUntukKelas(jadual, pilih);
  const waktu = set?.senarai ?? [];

  const terisi = useMemo(() => {
    const h = kelasIni?.hari ?? {};
    return Object.values(h).reduce((n, w) => n + Object.keys(w ?? {}).length, 0);
  }, [kelasIni]);

  const subjekDigunakan = useMemo(() => {
    const ada = new Set<string>();
    for (const hariIni of Object.values(kelasIni?.hari ?? {})) {
      for (const slot of Object.values(hariIni ?? {})) ada.add(slot.subjek);
    }
    return PILIHAN.map((p) => p.kod).filter((k) => ada.has(k));
  }, [kelasIni]);

  async function jalan(f: () => Promise<{ ok: boolean; mesej: string }>) {
    setSibuk(true);
    try {
      setHasil(await f());
    } catch (e) {
      setHasil({ ok: false, mesej: e instanceof Error ? e.message : "Gagal menyimpan." });
    } finally {
      setSibuk(false);
    }
  }

  const simpan = () =>
    jalan(() => simpanJadualKelas(pilih, jadual.kelas[pilih] ?? { hari: {} }));

  function ubahSlot(hari: Hari, waktuId: string, subjek: string) {
    setJadual((j) => {
      const k = j.kelas[pilih] ?? { hari: {} };
      const hariIni = { ...(k.hari[hari] ?? {}) };
      // Memilih "—" MEMBUANG slot, bukan menyimpan subjek kosong. Slot kosong
      // dan slot bernilai "" kelihatan sama di skrin tetapi berbeza dalam
      // data, dan perbezaan itu muncul sebagai sel hantu di laman awam.
      if (!subjek) delete hariIni[waktuId];
      else hariIni[waktuId] = { ...(hariIni[waktuId] ?? {}), subjek };
      return { ...j, kelas: { ...j.kelas, [pilih]: { ...k, hari: { ...k.hari, [hari]: hariIni } } } };
    });
  }

  function ubahGuru(kod: string, nama: string) {
    setJadual((j) => {
      const k = j.kelas[pilih] ?? { hari: {} };
      const guru = { ...(k.guruSubjek ?? {}) };
      // Nama kosong MEMBUANG entri — kalau tidak, laman awam memapar baris
      // guru yang kosong di bawah subjek.
      if (nama.trim()) guru[kod] = nama.trim();
      else delete guru[kod];
      return { ...j, kelas: { ...j.kelas, [pilih]: { ...k, guruSubjek: guru } } };
    });
  }

  function ubahSet(id: string, i: number, medan: keyof Waktu, nilai: string | boolean) {
    setJadual((j) => ({
      ...j,
      set: j.set.map((s) =>
        s.id !== id ? s : { ...s, senarai: s.senarai.map((w, n) => (n === i ? { ...w, [medan]: nilai } : w)) },
      ),
    }));
  }

  function ubahSetMedan(id: string, medan: "nama" | "sesi", nilai: string) {
    setJadual((j) => ({
      ...j,
      set: j.set.map((s) => (s.id === id ? { ...s, [medan]: nilai } : s)),
    }));
  }

  function ubahTahunSet(tahun: number, idSet: string) {
    setJadual((j) => ({ ...j, tahunSet: { ...j.tahunSet, [tahun]: idSet } }));
  }

  async function muatNaikFail(borang: HTMLFormElement) {
    const fd = new FormData(borang);
    const fail = fd.get("fail");
    if (!(fail instanceof File) || fail.size === 0) {
      setBaca({ ok: false, mesej: "Tiada fail dipilih." });
      return;
    }

    // Semak saiz DI SINI, sebelum apa-apa dihantar. Kalau kita biarkan fail
    // besar pergi, ia ditolak oleh lapisan pengangkutan yang tidak tahu
    // apa-apa tentang fail itu, dan mesejnya tidak menyebut saiz langsung.
    const ralat = semakSaiz(fail);
    if (ralat) {
      setBaca({ ok: false, mesej: ralat });
      return;
    }

    setNaik(true);
    setBaca(null);
    try {
      // Fail ≤ 3 MB dihantar sebagai base64 (WAF Cloudflare menyekat muat naik
      // multipart PDF ke domain ini); fail lebih besar terus ke storan
      // Supabase — lihat src/data/muatan-pelayar.ts.
      // Jenis dikenal daripada kandungan (Android kerap memberi octet-stream).
      const f = await normalkanFail(fail);
      // Foto / imbasan terus ke OCR JADUAL di peranti — tiada muat naik fail besar.
      const imbasan = f.type.startsWith("image/") || (/\.pdf$/i.test(f.name) && await pdfTanpaTeks(f));
      let dibaca = imbasan ? null : await naikFailJadual(pilih, await sediaMuatan(f));
      if (!dibaca || ((/\.pdf$/i.test(f.name) || f.type.startsWith("image/")) && !dibaca.draf && /TIDAK boleh dibaca|imbasan|gambar/i.test(dibaca.mesej))) {
        const hasil = await bacaImbasanJadual(f, (teks) => setBaca({ ok: true, mesej: teks }));
        if (!hasil.teks.trim() && hasil.item.length === 0) throw new Error("OCR selesai tetapi tiada teks dapat dikenal pasti. Ambil foto lebih dekat dan terang.");
        dibaca = await naikFailJadual(pilih, await sediaMuatan(failOcrJadual(f, hasil)));
        dibaca.mesej = `OCR pada peranti selesai. ${dibaca.mesej}`;
      }
      setBaca(dibaca);
    } catch (e) {
      setBaca({ ok: false, mesej: e instanceof Error ? e.message : "Muat naik gagal." });
    } finally {
      setNaik(false);
      borang.reset();
    }
  }

  /** Salin cadangan ke dalam grid. TIDAK menyimpan — guru semak dahulu. */
  function guna(draf: NonNullable<HasilBaca["draf"]>) {
    setJadual((j) => {
      const k = j.kelas[pilih];
      // Nama guru yang DIBACA dari fail menang, kerana ia datang terus dari
      // dokumen rasmi. Nama yang sudah ditaip dikekalkan untuk subjek yang
      // fail itu tidak menyebutnya, supaya kerja sebelum ini tidak hilang.
      const guruSubjek = { ...(k?.guruSubjek ?? {}), ...(draf.guruSubjek ?? {}) };
      return {
        ...j,
        kelas: {
          ...j.kelas,
          [pilih]: {
            hari: draf.hari,
            ...(Object.keys(guruSubjek).length > 0 ? { guruSubjek } : {}),
          },
        },
      };
    });
  }

  return (
    <>
      {/* ---------- Pilih kelas ---------- */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-garis bg-white p-4">
        <div className="w-52"><PilihCari id="jadual-kelas" label="Kelas" nilai={pilih} tukar={setPilih} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} /></div>

        <p className="text-sm text-slate-600">
          Waktu &amp; rehat:{" "}
          <b>{set ? set.nama : "(tiada set waktu)"}</b>
          <span className="mt-0.5 block text-xs text-slate-500">
            Ditentukan oleh tahun kelas ini
            {tahunKelas(pilih) !== null && ` (${LABEL_TAHUN(tahunKelas(pilih) as number)})`}.
          </span>
        </p>

        <span className="ml-auto text-sm text-slate-500">{terisi} waktu diisi</span>
      </div>

      {/* ---------- Grid hari × waktu ---------- */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-garis bg-white">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy-50">
              <th className="w-28 border-b border-garis p-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Waktu
              </th>
              {HARI.map((h) => (
                <th key={h} className="border-b border-l border-garis p-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {NAMA_HARI[h]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waktu.map((w) => (
              <tr key={w.id} className={w.rehat ? "bg-slate-50" : undefined}>
                <th className="border-b border-garis p-2 text-left align-top font-mono text-[11px] font-normal text-slate-500">
                  {jamPapar(w.mula)}
                  <span className="block text-slate-500">{jamPapar(w.tamat)}</span>
                </th>
                {HARI.map((h) => (
                  <td key={h} className="border-b border-l border-garis p-1.5 align-top">
                    {w.rehat ? (
                      <span className="block px-1 py-2 text-xs text-slate-500">
                        {w.label ?? "Rehat"}
                      </span>
                    ) : (
                      <select
                        value={kelasIni?.hari?.[h]?.[w.id]?.subjek ?? ""}
                        onChange={(e) => ubahSlot(h, w.id, e.target.value)}
                        className="w-full rounded border border-garis px-1.5 py-1.5 text-xs"
                      >
                        <option value="">—</option>
                        {PILIHAN.map((p) => (
                          <option key={p.kod} value={p.kod}>{p.nama}</option>
                        ))}
                      </select>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Muat naik fail jadual ---------- */}
      <section className="mt-5 rounded-xl border border-garis bg-white p-4">
        <h2 className="text-base font-bold text-navy-800">Muat naik fail jadual</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Ada fail jadual untuk {pilih}? Muat naik dan sistem akan cuba
          membacanya, termasuk <b>nama guru</b> kalau ia tertulis dalam fail
          itu. <b>Tiada apa yang tersimpan secara automatik</b> — ia hanya
          mengisi grid di atas sebagai cadangan untuk anda semak.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); muatNaikFail(e.currentTarget); }}
          className="mt-3 flex flex-wrap items-center gap-3"
        >
          <input
            type="file" name="fail" required
            accept=".pdf,.docx,.xlsx,.xlsm,.csv,application/pdf,application/octet-stream,image/png,image/jpeg,image/webp"
            className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2.5 text-sm"
          />
          <button
            type="submit" disabled={naik}
            className="rounded-lg border border-navy-800 px-4 py-2.5 text-sm font-semibold text-navy-800 disabled:opacity-60"
          >
            {naik ? "Membaca…" : "Muat naik & baca"}
          </button>
        </form>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          <b>Excel (.xlsx) dan CSV paling tepat</b> — ia menyimpan baris dan
          lajur sebenar, jadi sistem tahu sel mana di bawah hari yang mana.
          DOCX berjadual juga baik. PDF berteks boleh dibaca tetapi kurang
          tepat. PDF imbasan dan gambar dibaca dengan OCR terus pada peranti
          anda; semak cadangan grid sebelum menyimpan.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          <b>Fail anda tidak disimpan.</b> Ia dibaca sekali, kemudian
          dilupakan — yang kekal hanyalah jadual yang anda sahkan di atas.
          Simpan salinan fail itu sendiri kalau anda perlukannya kemudian.
        </p>

        {baca && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm leading-relaxed ${
              baca.ok ? "bg-navy-50 text-navy-800" : "bg-[#fbeaea] text-[#8f2424]"
            }`}
          >
            <p>{baca.mesej}</p>

            {baca.amaran?.map((a) => (
              <p key={a} className="mt-2 text-xs text-[#7a5a12]">⚠ {a}</p>
            ))}

            <div className="mt-3 flex flex-wrap gap-2">
              {baca.draf && (
                <button
                  type="button"
                  onClick={() => guna(baca.draf!)}
                  className="rounded-lg bg-navy-800 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  Isi grid dengan cadangan ini
                </button>
              )}

            </div>

            {baca.teks && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  Lihat teks yang dibaca
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-relaxed text-slate-600">
                  {baca.teks}
                </pre>
              </details>
            )}
          </div>
        )}
      </section>

      {/* ---------- Muat naik pukal — pentadbir ke atas ---------- */}
      {bolehWaktu && <PukalJadual />}

      {/* ---------- Guru subjek ---------- */}
      <section className="mt-5 rounded-xl border border-garis bg-white p-4">
        <h2 className="text-base font-bold text-navy-800">Guru subjek</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Nama guru bagi setiap subjek dalam kelas ini. <b>Ibu bapa akan
          melihat nama ini</b> di laman sekolah, jadi gunakan nama yang guru
          berkenaan selesa dipaparkan secara awam.
        </p>

        {subjekDigunakan.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Isi jadual di atas dahulu — subjek yang digunakan akan muncul di sini.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {subjekDigunakan.map((kod) => (
              <li key={kod} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-sm text-slate-600">
                  {NAMA_SUBJEK.get(kod) ?? kod}
                </span>
                <input
                  type="text"
                  value={kelasIni?.guruSubjek?.[kod] ?? ""}
                  placeholder="Nama guru"
                  onChange={(e) => ubahGuru(kod, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Set waktu & rehat — pentadbir ke atas sahaja ---------- */}
      {bolehWaktu && (
        <section className="mt-5 rounded-xl border border-garis bg-white">
          <button
            type="button"
            onClick={() => setBukaWaktu((b) => !b)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span>
              <span className="block text-base font-bold text-navy-800">
                Waktu &amp; rehat
              </span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Tiga kumpulan rehat. Menukar waktu di sini mengubah paparan
                SEMUA kelas dalam kumpulan itu.
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-500">{bukaWaktu ? "▾" : "▸"}</span>
          </button>

          {bukaWaktu && (
            <div className="border-t border-garis p-4">
              <p className="rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-sm leading-relaxed text-[#7a5a12]">
                <b>Sahkan tetapan ini dahulu.</b> Hanya satu angka di sini
                yang datang dari sekolah: rehat Tahun 1 bermula 3:30 petang,
                dan semua rehat 30 minit. Waktu mula sesi, bilangan waktu, dan
                tahun mana masuk kumpulan mana ialah tetapan permulaan sahaja.
              </p>

              {/* Tahun → set */}
              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tahun mana guna kumpulan mana
              </h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {TAHUN.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-sm text-slate-600">{LABEL_TAHUN(t)}</span>
                    <select
                      value={jadual.tahunSet?.[t] ?? ""}
                      onChange={(e) => ubahTahunSet(t, e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-garis px-2.5 py-2 text-sm"
                    >
                      {jadual.set.map((s) => (
                        <option key={s.id} value={s.id}>{s.nama}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>

              {/* Setiap set */}
              {jadual.set.map((s: SetWaktu) => (
                <div key={s.id} className="mt-6 rounded-xl border border-garis p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text" value={s.nama}
                      onChange={(e) => ubahSetMedan(s.id, "nama", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-2 text-sm font-semibold"
                    />
                    <select
                      value={s.sesi}
                      onChange={(e) => ubahSetMedan(s.id, "sesi", e.target.value)}
                      className="rounded-lg border border-garis px-2.5 py-2 text-sm"
                    >
                      {SESI.map((x) => (
                        <option key={x} value={x}>{NAMA_SESI[x]}</option>
                      ))}
                    </select>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {s.senarai.map((w, i) => (
                      <li key={w.id} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time" value={w.mula}
                          onChange={(e) => ubahSet(s.id, i, "mula", e.target.value)}
                          className="rounded-lg border border-garis px-2 py-1.5 text-sm"
                        />
                        <span className="text-slate-500">–</span>
                        <input
                          type="time" value={w.tamat}
                          onChange={(e) => ubahSet(s.id, i, "tamat", e.target.value)}
                          className="rounded-lg border border-garis px-2 py-1.5 text-sm"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox" checked={Boolean(w.rehat)}
                            onChange={(e) => ubahSet(s.id, i, "rehat", e.target.checked)}
                          />
                          Rehat
                        </label>
                        {w.rehat && (
                          <input
                            type="text" value={w.label ?? ""} placeholder="Rehat"
                            onChange={(e) => ubahSet(s.id, i, "label", e.target.value)}
                            className="w-32 rounded-lg border border-garis px-2 py-1.5 text-sm"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <button
                type="button" disabled={sibuk}
                onClick={() => jalan(() => simpanSetWaktu(jadual.set, jadual.tahunSet))}
                className="mt-4 rounded-lg border border-navy-800 px-4 py-2.5 text-sm font-semibold text-navy-800 disabled:opacity-60"
              >
                Simpan waktu &amp; rehat
              </button>
            </div>
          )}
        </section>
      )}

      {hasil && (
        <p
          role="status"
          className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${
            hasil.ok ? "bg-[#e5f4ec] text-[#14603c]" : "bg-[#fbeaea] text-[#8f2424]"
          }`}
        >
          {hasil.mesej}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button" onClick={simpan} disabled={sibuk}
          className="rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {sibuk ? "Menyimpan…" : `Simpan jadual ${pilih}`}
        </button>
        <span className="text-xs leading-relaxed text-slate-500">
          Menyimpan hanya kelas <b>{pilih}</b> — kerja guru kelas lain tidak
          disentuh. Ia mencetuskan binaan semula laman ibu bapa.
        </span>
      </div>
    </>
  );
}
