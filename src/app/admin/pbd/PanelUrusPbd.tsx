"use client";

import { useMemo, useState } from "react";
import { importMuridKelas, type HasilImportKelas } from "@/lib/import-murid";
import { tugaskanGuruSubjek, buangTugasanGuruSubjek, naikTahunTindakan, cubaNaikTahun } from "@/lib/tindakan-pbd";
import type { RancanganNaik } from "@/data/naik-tahun";
import PilihCari from "@/components/PilihCari";
import { SUBJEK, namaSubjek } from "@/data/subjek";

/**
 * Urus ePBD — sesi, murid, dan siapa mengajar apa.
 *
 * TIGA PEMBETULAN DARI MAKLUM BALAS PENGGUNA (17 Sep 2026):
 *
 *  1. Import murid tidak lagi menuntut CSV. Kelas dipilih dari senarai yang
 *     sistem sudah tahu; hanya nama dan No. KP ditampal, dalam apa jua
 *     bentuk ia datang. Jantina dikira dari digit terakhir No. KP.
 *  2. Setiap pemilih panjang boleh dicari. 57 kelas dan 130 nama guru dalam
 *     `<select>` bermakna menatal dengan ibu jari, dan memilih yang salah.
 *  3. Seorang guru mengajar BANYAK subjek merentas banyak kelas. Menugaskan
 *     satu demi satu bermakna dua belas klik untuk seorang guru; subjek dan
 *     kelas kini kedua-duanya boleh dipilih berbilang.
 */

export interface Tugasan {
  id: string;
  emel: string;
  subjek: string;
  tahun: number;
  kelas: string;
}

export default function PanelUrusPbd({
  tugasanAwal, senaraiGuru, senaraiKelas, semuaKelas, tahunSesi, jumlahMurid,
}: {
  tugasanAwal: Tugasan[];
  senaraiGuru: { emel: string; nama: string }[];
  senaraiKelas: { tahun: number; kelas: string }[];
  /** Setiap kelas sekolah, termasuk yang belum ada murid. */
  semuaKelas: string[];
  tahunSesi: number;
  jumlahMurid: number;
}) {
  /* --------------------------------------------------------------- sesi */
  const [sahNaik, setSahNaik] = useState(false);
  const [sibukSesi, setSibukSesi] = useState(false);
  const [mesejSesi, setMesejSesi] = useState<{ ok: boolean; teks: string } | null>(null);

  const [cuba, setCuba] = useState<
    { rancangan: RancanganNaik; gerak: { label: string; bil: number }[] } | null
  >(null);

  /**
   * Larian kering. Tidak menulis apa-apa, boleh diulang.
   *
   * Butang sebenar dikunci sehingga ini dijalankan — naik tahun berlaku
   * sekali setahun kepada setiap murid sekali, dan orang yang menekannya
   * tidak akan pernah cukup biasa dengannya untuk perasan bila ia salah.
   */
  async function cubaDahulu() {
    setSibukSesi(true);
    setMesejSesi(null);
    try {
      const r = await cubaNaikTahun();
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      setCuba(r.ok && r.rancangan ? { rancangan: r.rancangan, gerak: r.gerak ?? [] } : null);
    } finally {
      setSibukSesi(false);
    }
  }

  async function naikTahun() {
    setSibukSesi(true);
    try {
      const r = await naikTahunTindakan();
      setMesejSesi({ ok: r.ok, teks: r.mesej });
      if (r.ok) setSahNaik(false);
    } finally {
      setSibukSesi(false);
    }
  }

  /* ------------------------------------------------------------- import */
  const [kelasImport, setKelasImport] = useState(semuaKelas[0] ?? "");
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilImportKelas | null>(null);
  const [sibukImport, setSibukImport] = useState(false);

  async function jalanImport(simpan: boolean) {
    const [tahunStr, ...sisa] = kelasImport.split(" ");
    const tahun = Number(tahunStr);
    if (!tahun || sisa.length === 0) {
      setHasil({ ok: false, kering: true, mesej: "Pilih kelas dahulu." });
      return;
    }
    if (teks.trim() === "") {
      setHasil({ ok: false, kering: true, mesej: "Tampal senarai nama dahulu." });
      return;
    }
    setSibukImport(true);
    try {
      const r = await importMuridKelas(tahun, sisa.join(" "), teks, simpan);
      setHasil(r);
      if (r.ok && !r.kering) setTeks("");
    } finally {
      setSibukImport(false);
    }
  }

  /* ------------------------------------------------------------ tugasan */
  const [tugasan, setTugasan] = useState(tugasanAwal);
  const [emel, setEmel] = useState(senaraiGuru[0]?.emel ?? "");
  const [subjekPilih, setSubjekPilih] = useState<Set<string>>(new Set());
  const [kelasPilih, setKelasPilih] = useState<Set<string>>(new Set());
  const [mesejTugas, setMesejTugas] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibukTugas, setSibukTugas] = useState<string | null>(null);
  const [cari, setCari] = useState("");

  function togolSet(set: Set<string>, nilai: string): Set<string> {
    const baharu = new Set(set);
    if (baharu.has(nilai)) baharu.delete(nilai);
    else baharu.add(nilai);
    return baharu;
  }

  async function tambah() {
    if (subjekPilih.size === 0 || kelasPilih.size === 0) {
      setMesejTugas({ ok: false, teks: "Pilih sekurang-kurangnya satu subjek dan satu kelas." });
      return;
    }
    setSibukTugas("tambah");
    const baharu: Tugasan[] = [];
    try {
      for (const s of subjekPilih) {
        for (const k of kelasPilih) {
          const [tahunStr, ...sisa] = k.split(" ");
          const kelas = sisa.join(" ");
          const r = await tugaskanGuruSubjek(emel, s, Number(tahunStr), kelas);
          if (r.ok) {
            baharu.push({
              id: `sementara-${s}-${k}-${Date.now()}`,
              emel, subjek: s, tahun: Number(tahunStr), kelas,
            });
          } else {
            setMesejTugas({ ok: false, teks: r.mesej });
          }
        }
      }
      if (baharu.length > 0) {
        setTugasan((lama) => [
          ...lama.filter(
            (t) =>
              !baharu.some(
                (b) =>
                  b.emel === t.emel && b.subjek === t.subjek &&
                  b.tahun === t.tahun && b.kelas === t.kelas,
              ),
          ),
          ...baharu,
        ]);
        setMesejTugas({ ok: true, teks: `${baharu.length} tugasan disimpan untuk ${emel}.` });
        setSubjekPilih(new Set());
        setKelasPilih(new Set());
      }
    } finally {
      setSibukTugas(null);
    }
  }

  async function buang(t: Tugasan) {
    setSibukTugas(t.id);
    try {
      const r = await buangTugasanGuruSubjek(t.id);
      setMesejTugas({ ok: r.ok, teks: r.mesej });
      if (r.ok) setTugasan((s) => s.filter((x) => x.id !== t.id));
    } finally {
      setSibukTugas(null);
    }
  }

  const carian = cari.trim().toLowerCase();
  const ditapis = carian
    ? tugasan.filter(
        (t) =>
          t.emel.toLowerCase().includes(carian) ||
          namaSubjek(t.subjek).toLowerCase().includes(carian) ||
          `${t.tahun} ${t.kelas}`.toLowerCase().includes(carian),
      )
    : tugasan;

  // Tugasan dikumpul MENGIKUT GURU. Seorang guru boleh memegang dua belas
  // tugasan; senarai rata bermakna namanya berulang dua belas kali dan tiada
  // sesiapa dapat melihat beban siapa.
  const ikutGuru = useMemo(() => {
    const peta = new Map<string, Tugasan[]>();
    for (const t of ditapis) {
      const ada = peta.get(t.emel);
      if (ada) ada.push(t);
      else peta.set(t.emel, [t]);
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ditapis]);

  const namaGuru = (e: string) => senaraiGuru.find((g) => g.emel === e)?.nama || e;

  return (
    <>
      {/* ---------------- Hujung sesi ---------------- */}
      <section className="mt-8 rounded-xl border border-garis bg-white p-5">
        <h2 className="text-base font-bold text-navy-800">Hujung sesi</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Menutup sesi {tahunSesi}, membuka sesi {tahunSesi + 1}, dan menaikkan
          semua murid satu tahun. Murid Tahun 6 ditandakan tamat.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-navy-800">
          <b>Keputusan sesi {tahunSesi} tidak disentuh.</b> Murid mendapat
          pendaftaran baharu; yang lama kekal, jadi slip sesi {tahunSesi} boleh
          dicetak selamanya. Menekan dua kali tidak mencipta murid pendua.
        </p>

        {mesejSesi && <div className="mt-3"><Mesej ok={mesejSesi.ok} teks={mesejSesi.teks} /></div>}

        {cuba && <SemakanNaik {...cuba} tahunSesi={tahunSesi} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void cubaDahulu()}
            disabled={sibukSesi}
            className="rounded-lg border border-garis px-4 py-2 text-sm font-semibold text-navy-700 hover:border-navy-700 disabled:opacity-50"
          >
            {sibukSesi && !sahNaik ? "Menyemak…" : "Cuba dahulu (tiada apa ditulis)"}
          </button>
        </div>

        <div className="mt-3">
          {sahNaik ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#8f2b2b]">
                Naikkan {jumlahMurid} murid ke sesi {tahunSesi + 1}?
              </span>
              <button
                onClick={() => void naikTahun()}
                disabled={sibukSesi}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sibukSesi ? "Menjalankan…" : "Ya, naikkan"}
              </button>
              <button onClick={() => setSahNaik(false)} className="text-sm text-slate-500 underline">
                Batal
              </button>
            </span>
          ) : (
            <button
              onClick={() => setSahNaik(true)}
              disabled={!cuba}
              title={cuba ? undefined : "Jalankan larian kering dahulu."}
              className="rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700 disabled:border-garis disabled:text-slate-400"
            >
              Tutup sesi {tahunSesi} &amp; naik tahun
            </button>
          )}
          {!cuba && (
            <p className="mt-2 text-xs text-slate-400">
              Jalankan <b>Cuba dahulu</b> sebelum ini boleh ditekan.
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Masukkan murid ---------------- */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Masukkan murid</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Pilih kelas, kemudian tampal senarai nama dan No. KP — dalam apa jua
          bentuk ia datang. Sistem mengenal No. KP walaupun ditulis dengan
          sempang, ruang atau titik, dan mengira jantina dari digit terakhirnya.
          Kelas tidak perlu ditaip.
        </p>

        <div className="mt-3 rounded-xl border border-garis bg-white p-4">
          <div className="max-w-xs">
            <PilihCari
              id="kelas-import"
              label="Kelas"
              pilihan={semuaKelas.map((k) => {
                const ada = senaraiKelas.some((x) => `${x.tahun} ${x.kelas}` === k);
                return { nilai: k, label: k, nota: ada ? "sudah ada murid" : undefined };
              })}
              nilai={kelasImport}
              tukar={setKelasImport}
              placeholder="Cari kelas…"
            />
          </div>

          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={8}
            aria-label="Senarai nama dan No. KP"
            placeholder={
              "AHMAD BIN ALI 060101101233\n" +
              "2. NUR AISYAH BINTI OMAR, 070202-10-5678\n" +
              "051212105566 MUHAMMAD DANIAL BIN ZAKARIA"
            }
            className="mt-4 w-full rounded-xl border border-garis p-3 font-mono text-xs"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void jalanImport(false)}
              disabled={sibukImport}
              className="rounded-lg border border-navy-700 px-4 py-2 text-sm font-semibold text-navy-700 disabled:opacity-50"
            >
              {sibukImport ? "Menyemak…" : "Semak dahulu (tiada apa ditulis)"}
            </button>
            {hasil?.ok && hasil.kering && (
              <button
                onClick={() => void jalanImport(true)}
                disabled={sibukImport}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Simpan {hasil.jumlah} murid ke {kelasImport}
              </button>
            )}
          </div>
        </div>

        {hasil && (
          <div className="mt-3">
            <Mesej ok={hasil.ok} teks={hasil.mesej} />

            {hasil.ralat && hasil.ralat.length > 0 && (
              <ul className="mt-2 space-y-0.5 rounded-lg border border-[#e9d9ae] bg-[#fdf9f0] p-3 text-xs leading-relaxed text-[#7a5a12]">
                {hasil.ralat.slice(0, 12).map((r, i) => <li key={i}>⚠ {r}</li>)}
                {hasil.ralat.length > 12 && <li>… {hasil.ralat.length - 12} lagi</li>}
              </ul>
            )}

            {hasil.murid && hasil.murid.length > 0 && (
              <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-garis bg-white">
                <table className="w-full min-w-[30rem] text-left text-xs">
                  <thead className="sticky top-0 bg-navy-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Nama</th>
                      <th className="px-3 py-2 font-semibold">No. KP</th>
                      <th className="px-3 py-2 font-semibold">Jantina</th>
                      <th className="px-3 py-2 font-semibold">Lahir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-garis">
                    {hasil.murid.map((m, i) => (
                      <tr key={i} className={m.amaran.length ? "bg-[#fffdf5]" : undefined}>
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-navy-800">{m.nama}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">{m.no_kp ?? "—"}</td>
                        <td className="px-3 py-1.5">{m.jantina ?? "—"}</td>
                        <td className="px-3 py-1.5 text-slate-500">{m.lahir ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Guru subjek ---------------- */}
      <section className="mt-10">
        <h2 className="text-base font-bold text-navy-800">Guru subjek</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Menentukan siapa boleh mengisi TP bagi subjek dan kelas mana. Seorang
          guru selalunya mengajar beberapa subjek merentas beberapa kelas —
          pilih semuanya sekali gus.
        </p>

        {senaraiKelas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm text-[#7a5a12]">
            Belum ada murid dimasukkan, jadi belum ada kelas untuk ditugaskan.
          </p>
        ) : (
          <div className="mt-3 rounded-xl border border-garis bg-white p-4">
            <div className="max-w-sm">
              <PilihCari
                id="guru-tugas"
                label="Guru"
                pilihan={senaraiGuru.map((g) => ({
                  nilai: g.emel,
                  label: g.nama || g.emel,
                  nota: g.nama ? g.emel : undefined,
                }))}
                nilai={emel}
                tukar={setEmel}
                placeholder="Cari nama atau emel…"
              />
            </div>

            <Berbilang
              tajuk="Subjek"
              pilihan={SUBJEK.map((s) => ({ nilai: s.kod, label: s.nama }))}
              dipilih={subjekPilih}
              togol={(v) => setSubjekPilih((s) => togolSet(s, v))}
            />
            <Berbilang
              tajuk="Kelas"
              pilihan={senaraiKelas.map((k) => ({
                nilai: `${k.tahun} ${k.kelas}`,
                label: `${k.tahun} ${k.kelas}`,
              }))}
              dipilih={kelasPilih}
              togol={(v) => setKelasPilih((s) => togolSet(s, v))}
            />

            <button
              onClick={() => void tambah()}
              disabled={sibukTugas !== null || !emel}
              className="mt-4 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sibukTugas === "tambah"
                ? "Menyimpan…"
                : `Tugaskan ${subjekPilih.size} subjek × ${kelasPilih.size} kelas`}
            </button>
          </div>
        )}

        {mesejTugas && <div className="mt-3"><Mesej ok={mesejTugas.ok} teks={mesejTugas.teks} /></div>}

        {tugasan.length > 8 && (
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari guru, subjek atau kelas…"
            aria-label="Cari tugasan"
            className="mt-4 w-full rounded-lg border border-garis px-3 py-2 text-sm"
          />
        )}

        {ikutGuru.length > 0 && (
          <ul className="mt-3 space-y-3">
            {ikutGuru.map(([e, senarai]) => (
              <li key={e} className="rounded-xl border border-garis bg-white p-4">
                <p className="font-semibold text-navy-800">{namaGuru(e)}</p>
                <p className="text-xs text-slate-500">{e} · {senarai.length} tugasan</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {senarai.map((t) => (
                    <li key={t.id}>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-garis px-2 py-1 text-xs">
                        <span className="text-navy-800">
                          {namaSubjek(t.subjek)} · {t.tahun} {t.kelas}
                        </span>
                        <button
                          onClick={() => void buang(t)}
                          disabled={sibukTugas === t.id}
                          aria-label={`Buang ${namaSubjek(t.subjek)} ${t.tahun} ${t.kelas}`}
                          className="text-slate-400 hover:text-[#8f2b2b] disabled:opacity-50"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Mesej({ ok, teks }: { ok: boolean; teks: string }) {
  return (
    <p
      className={`rounded-lg border p-3 text-sm leading-relaxed ${
        ok
          ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]"
          : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"
      }`}
    >
      {teks}
    </p>
  );
}

/** Pemilih berbilang berbentuk cip — untuk subjek dan kelas. */
function Berbilang({
  tajuk, pilihan, dipilih, togol,
}: {
  tajuk: string;
  pilihan: { nilai: string; label: string }[];
  dipilih: Set<string>;
  togol: (nilai: string) => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-xs font-semibold text-slate-500">
        {tajuk}
        {dipilih.size > 0 && <span className="ml-1.5 text-navy-700">({dipilih.size} dipilih)</span>}
      </span>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {pilihan.map((p) => {
          const aktif = dipilih.has(p.nilai);
          return (
            <li key={p.nilai}>
              <button
                type="button"
                onClick={() => togol(p.nilai)}
                aria-pressed={aktif}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  aktif
                    ? "border-navy-700 bg-navy-700 text-white"
                    : "border-garis text-slate-600 hover:border-navy-700"
                }`}
              >
                {p.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


/**
 * Apa yang AKAN berlaku — dibaca sebelum apa-apa ditulis.
 *
 * Taburan per tahun ialah semakan mata kasar yang paling berkesan: guru yang
 * tahu sekolahnya ada kira-kira 120 murid setiap tahun akan nampak "Tahun 4:
 * 12" dalam sesaat, sedangkan mereka tidak akan pernah membaca 700 nama.
 */
function SemakanNaik({ rancangan, gerak, tahunSesi }: {
  rancangan: RancanganNaik;
  gerak: { label: string; bil: number }[];
  tahunSesi: number;
}) {
  return (
    <div className="mt-3 rounded-xl border border-garis bg-navy-50/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Larian kering · sesi {tahunSesi} → {tahunSesi + 1}
      </p>

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <span><b className="text-navy-800">{rancangan.naik.length}</b> naik</span>
        <span><b className="text-navy-800">{rancangan.tamat.length}</b> tamat (Tahun 6)</span>
        {rancangan.sudahAda.length > 0 && (
          <span><b className="text-navy-800">{rancangan.sudahAda.length}</b> dilangkau</span>
        )}
        {rancangan.ditolak.length > 0 && (
          <span className="text-[#8f2b2b]"><b>{rancangan.ditolak.length}</b> ditolak</span>
        )}
      </div>

      {rancangan.taburan.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Selepas naik:{" "}
          {rancangan.taburan.map((t) => `Tahun ${t.tahun}: ${t.bil}`).join(" · ")}
        </p>
      )}

      {rancangan.amaran.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rancangan.amaran.map((a, i) => (
            <li key={i} className="text-xs leading-relaxed text-[#7a5a12]">⚠ {a}</li>
          ))}
        </ul>
      )}

      {rancangan.ditolak.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-0.5 overflow-auto text-xs text-[#8f2b2b]">
          {rancangan.ditolak.slice(0, 40).map((d, i) => (
            <li key={i}>{d.murid_id} — {d.sebab}</li>
          ))}
        </ul>
      )}

      {gerak.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-500">
            Pergerakan setiap kelas ({gerak.length})
          </summary>
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto text-xs text-slate-600">
            {gerak.map((g) => <li key={g.label}>{g.label} · {g.bil} murid</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
