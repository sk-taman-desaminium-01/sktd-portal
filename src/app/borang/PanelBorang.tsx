"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import CetakMedia from "@/components/CetakMedia";
import TandaTangan from "@/components/TandaTangan";
import CetakSurat, { type KepalaSurat } from "@/components/CetakSurat";
import EditorIsiSurat from "@/components/EditorIsiSurat";
import { gayaLama } from "@/data/isi-surat";
import {
  hantarSuratRasmi, hantarSuratGambar, suntingSuratRasmi, tetapkanRujukan, padamSurat,
  type BarisSurat, type DataSuratRasmi, type DataSuratGambar,
  tandatanganSurat,
} from "@/lib/surat";
import PilihCari from "@/components/PilihCari";
import { hariIniMY } from "@/data/tarikh-my";

type Kepala = KepalaSurat;

/**
 * Borang Sekolah — DUA borang dalam satu skrin (permintaan A.1/A.2/A.4):
 * Surat Rasmi (Alamat/Tarikh/Tajuk/Isi + wakil Guru Besar) dan Borang
 * Kebenaran Gambar. Kertas kerja/PDF dijana dengan `window.print()` — lihat
 * corak yang sama dalam `src/app/pbd/slip/PanelSlip.tsx`.
 */
export default function PanelBorang({
  pentadbir, kelas, senarai, kepala, sayaNama, bolehPejabat = false,
}: {
  pentadbir: { nama: string; jawatan: string }[];
  kelas: string[];
  senarai: BarisSurat[];
  kepala: Kepala;
  sayaNama: string;
  bolehPejabat?: boolean;
}) {
  const [tab, setTab] = useState<"rasmi" | "gambar" | "senarai">("rasmi");
  const [senaraiData, setSenaraiData] = useState(senarai);
  const [cetak, setCetak] = useState<BarisSurat | null>(null);

  const guruBesar = useMemo(
    () => pentadbir.find((p) => p.jawatan.toLowerCase().includes("guru besar")) ?? pentadbir[0],
    [pentadbir],
  );

  /**
   * Dialog cetak mesti dipanggil dalam klik pengguna, khususnya pada Safari
   * mudah alih. `flushSync` memastikan surat baharu sudah berada dalam DOM
   * sebelum dialog dibuka tanpa menangguhkan panggilan melalui setTimeout.
   */
  async function bukaCetak(baris: BarisSurat) {
    // Senarai tidak membawa imej tandatangan (jimat egress); ambil untuk
    // rekod yang dicetak sahaja.
    const lengkap = baris.jenis === "gambar" && !baris.tandatangan_url
      ? { ...baris, tandatangan_url: await tandatanganSurat(baris.id).catch(() => null) }
      : baris;
    flushSync(() => setCetak(lengkap));
    mulaCetak("surat-cetak", lengkap.tajuk);
  }

  async function buangSurat(id: string) {
    const r = await padamSurat(id);
    if (r.ok) setSenaraiData((s) => s.filter((b) => b.id !== id));
    return r;
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
        {(["rasmi", "gambar", "senarai"] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => setTab(t)}
            className={`min-h-11 touch-manipulation rounded-full px-4 py-2 ${tab === t ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700"}`}
          >
            {t === "rasmi" ? "Surat Rasmi" : t === "gambar" ? "Kebenaran Gambar" : `Senarai Saya (${senaraiData.length})`}
          </button>
        ))}
      </div>

      {tab === "rasmi" && (
        <FormRasmi
          pentadbir={pentadbir} guruBesarLalai={guruBesar}
          selesai={(b) => { setSenaraiData((s) => [b, ...s]); setTab("senarai"); }}
        />
      )}
      {tab === "gambar" && (
        <FormGambar kelas={kelas} selesai={(b) => { setSenaraiData((s) => [b, ...s]); setTab("senarai"); }} />
      )}
      {tab === "senarai" && (
        <SenaraiSaya
          senarai={senaraiData} bolehPejabat={bolehPejabat} pentadbir={pentadbir}
          bukaCetak={bukaCetak}
          buang={buangSurat}
          kemaskini={(id, patch) => setSenaraiData((s) => s.map((b) => (b.id === id ? { ...b, ...patch } : b)))}
        />
      )}

      {cetak?.jenis === "gambar" && <CetakMedia surat={cetak} data={cetak.data as DataSuratGambar} kepala={kepala} />}
      {cetak && cetak.jenis === "rasmi" && (
        <CetakSurat surat={cetak} data={cetak.data as DataSuratRasmi} kepala={kepala} sayaNama={sayaNama} />
      )}
    </>
  );
}

function FormRasmi({
  pentadbir, guruBesarLalai, selesai,
}: {
  pentadbir: { nama: string; jawatan: string }[];
  guruBesarLalai?: { nama: string; jawatan: string };
  selesai: (b: BarisSurat) => void;
}) {
  const [tajuk, setTajuk] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tarikh, setTarikh] = useState(hariIniMY);
  const [isi, setIsi] = useState("");
  const [wakil, setWakil] = useState(guruBesarLalai ? `${guruBesarLalai.nama}|${guruBesarLalai.jawatan}` : "");
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);

  async function hantar() {
    setSibuk(true);
    setMesej(null);
    const [wakilGbNama, wakilGbJawatan] = wakil.split("|");
    const r = await hantarSuratRasmi({ tajuk, alamat, tarikh, isi, wakilGbNama, wakilGbJawatan });
    setMesej({ ok: r.ok, teks: r.mesej });
    if (r.ok && r.id) {
      selesai({
        id: r.id, jenis: "rasmi", status: "baharu", tajuk, rujukan_kami: null,
        pemohon_nama: "", pemohon_emel: "", tandatangan_url: null,
        data: { alamat, tarikh, isi, wakilGbNama, wakilGbJawatan }, dicipta: new Date().toISOString(),
      });
      setTajuk(""); setAlamat(""); setIsi("");
    }
    setSibuk(false);
  }

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-garis bg-white p-5">
      <Medan label="Tajuk surat">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Contoh: Permohonan Kebenaran Menggunakan Padang"
          maxLength={180} className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>
      <Medan label="Alamat (kepada)">
        <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={3}
          placeholder={"Contoh:\nPengurus,\nDewan Serbaguna Seri Kembangan"}
          maxLength={360} className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>
      <Medan label="Tarikh">
        <input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)}
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>
      <Medan label="Isi surat">
        <EditorIsiSurat nilai={isi} ubah={setIsi} />
      </Medan>
      <Medan label="Ditandatangani bagi pihak Guru Besar oleh">
        <select value={wakil} onChange={(e) => setWakil(e.target.value)}
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm">
          {pentadbir.map((p) => (
            <option key={p.nama} value={`${p.nama}|${p.jawatan}`}>{p.nama} — {p.jawatan}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Lalai Guru Besar semasa. Tukar jika Guru Besar tiada di sekolah.
        </p>
      </Medan>
      <p className="rounded-lg bg-navy-50 px-3 py-2 text-xs leading-relaxed text-navy-800">
        Ruang tandatangan pada surat dibiarkan kosong untuk tandatangan hidup Guru Besar atau wakil yang dipilih.
      </p>

      {mesej && <Mesej mesej={mesej} />}
      <button type="button" disabled={sibuk} onClick={hantar}
        className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {sibuk ? "Menghantar…" : "Hantar ke Urusan Pejabat"}
      </button>
    </div>
  );
}

function FormGambar({ kelas, selesai }: { kelas: string[]; selesai: (b: BarisSurat) => void }) {
  const [muridNama, setMuridNama] = useState("");
  const [muridKelas, setMuridKelas] = useState(kelas[0] ?? "");
  const [bersetuju, setBersetuju] = useState<boolean | null>(null);
  const [catatan, setCatatan] = useState("");
  const [penjaga, setPenjaga] = useState({ penjagaNama: "", penjagaKp: "", alamat: "", telefon: "", muridKp: "" });
  const [tandatangan, setTandatangan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [mesej, setMesej] = useState<{ ok: boolean; teks: string } | null>(null);

  async function hantar() {
    if (bersetuju === null) {
      setMesej({ ok: false, teks: "Pilih Bersetuju atau Tidak bersetuju." });
      return;
    }
    setSibuk(true);
    setMesej(null);
    const r = await hantarSuratGambar({ ...penjaga, muridNama, muridKelas, bersetuju, catatan, tandatangan_url: tandatangan });
    setMesej({ ok: r.ok, teks: r.mesej });
    if (r.ok && r.id) {
      selesai({
        id: r.id, jenis: "gambar", status: "selesai", tajuk: `Kebenaran Gambar — ${muridNama}`,
        rujukan_kami: null, pemohon_nama: "", pemohon_emel: "", tandatangan_url: tandatangan,
        data: { ...penjaga, muridNama, muridKelas, bersetuju, catatan }, dicipta: new Date().toISOString(),
      });
      setMuridNama(""); setBersetuju(null); setCatatan(""); setTandatangan(null);
    }
    setSibuk(false);
  }

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-garis bg-white p-5">
      <p className="rounded-lg bg-navy-50 p-3 text-xs leading-relaxed text-navy-800">
        Borang Kebenaran Mengambil Gambar — keputusan kebenaran ibu bapa direkod di sini
        oleh guru, dan guru kelas murid diberitahu secara automatik.
      </p>
      {([
        ["penjagaNama", "Nama ibu bapa/penjaga"], ["penjagaKp", "No. KP penjaga"],
        ["alamat", "Alamat penjaga"], ["telefon", "No. telefon"], ["muridKp", "No. MyKid/KP murid"],
      ] as const).map(([k, label]) => <Medan key={k} label={label}>
        <input value={penjaga[k]} onChange={(e) => setPenjaga((p) => ({ ...p, [k]: e.target.value }))}
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>)}
      <Medan label="Nama murid">
        <input value={muridNama} onChange={(e) => setMuridNama(e.target.value)}
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>
      <Medan label="Kelas">
        <PilihCari id="borang-kelas" label="Kelas" sembunyiLabel nilai={muridKelas} tukar={setMuridKelas} placeholder="Taip kelas, cth: 4 bes" pilihan={kelas.map((k) => ({ nilai: k, label: k }))} />
      </Medan>
      <fieldset>
        <legend className="mb-1 block text-sm font-semibold text-navy-800">Keputusan kebenaran ibu bapa</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="keputusan-kebenaran" checked={bersetuju === true} onChange={() => setBersetuju(true)} />
            Bersetuju
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="keputusan-kebenaran" checked={bersetuju === false} onChange={() => setBersetuju(false)} />
            Tidak bersetuju
          </label>
        </div>
      </fieldset>
      <Medan label="Catatan (jika perlu)">
        <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
          className="block w-full min-w-0 max-w-full rounded-lg border border-garis px-3 py-2 text-sm" />
      </Medan>
      <Medan label="Tandatangan ibu bapa/penjaga">
        <TandaTangan nilai={tandatangan} tetap={setTandatangan} tempatan />
      </Medan>

      {mesej && <Mesej mesej={mesej} />}
      <button type="button" disabled={sibuk} onClick={hantar}
        className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {sibuk ? "Menyimpan…" : "Rekod keputusan"}
      </button>
    </div>
  );
}

function SenaraiSaya({
  senarai, bolehPejabat, pentadbir, bukaCetak, buang, kemaskini,
}: {
  senarai: BarisSurat[];
  bolehPejabat: boolean;
  pentadbir: { nama: string; jawatan: string }[];
  bukaCetak: (b: BarisSurat) => void;
  buang: (id: string) => Promise<{ ok: boolean; mesej: string }>;
  kemaskini: (id: string, patch: Partial<BarisSurat>) => void;
}) {
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sunting, setSunting] = useState<{
    id: string; tajuk: string; alamat: string; tarikh: string; isi: string; wakil: string;
  } | null>(null);
  const [maklum, setMaklum] = useState<{ ok: boolean; teks: string } | null>(null);

  async function simpanRujukan(id: string) {
    const nilai = rujukan[id]?.trim();
    if (!nilai) return;
    setSibuk(id);
    const r = await tetapkanRujukan(id, nilai);
    setMaklum({ ok: r.ok, teks: r.mesej });
    if (r.ok) kemaskini(id, { rujukan_kami: nilai, status: "selesai" });
    setSibuk(null);
  }

  async function padam(id: string, tajuk: string) {
    if (!window.confirm(`Padam "${tajuk}"? Tindakan ini tidak boleh diundur.`)) return;
    setSibuk(id);
    const r = await buang(id);
    setMaklum({ ok: r.ok, teks: r.mesej });
    setMenuId(null);
    setSibuk(null);
  }

  function mulaSunting(b: BarisSurat) {
    if (b.jenis !== "rasmi") return;
    const d = b.data as DataSuratRasmi;
    // Surat lama: satu Enter = satu perenggan. Tukar kepada baris kosong
    // supaya susunannya kekal bila disimpan dengan format baharu.
    const isi = d.formatIsi !== 2 && gayaLama(b.dicipta) ? d.isi.replace(/\r/g, "").replace(/\n+/g, "\n\n") : d.isi;
    setSunting({ id: b.id, tajuk: b.tajuk, alamat: d.alamat, tarikh: d.tarikh, isi, wakil: `${d.wakilGbNama}|${d.wakilGbJawatan}` });
    setMenuId(null);
  }

  async function simpanSunting() {
    if (!sunting) return;
    const [wakilGbNama, wakilGbJawatan] = sunting.wakil.split("|");
    setSibuk(sunting.id);
    const r = await suntingSuratRasmi(sunting.id, {
      tajuk: sunting.tajuk, alamat: sunting.alamat, tarikh: sunting.tarikh,
      isi: sunting.isi, wakilGbNama, wakilGbJawatan,
    });
    setMaklum({ ok: r.ok, teks: r.mesej });
    if (r.ok) {
      kemaskini(sunting.id, {
        tajuk: sunting.tajuk, status: "baharu", rujukan_kami: null, tandatangan_url: null,
        data: { alamat: sunting.alamat, tarikh: sunting.tarikh, isi: sunting.isi, wakilGbNama, wakilGbJawatan },
      });
      setSunting(null);
    }
    setSibuk(null);
  }

  if (senarai.length === 0) {
    return <p className="mt-5 rounded-xl border border-garis bg-white p-6 text-center text-sm text-slate-500">Belum ada borang dihantar.</p>;
  }

  return (
    <ul className="mt-5 space-y-3">
      {maklum && <li role="status" className={`rounded-lg px-3 py-2 text-sm ${maklum.ok ? "bg-[#eef8f2] text-[#167a4b]" : "bg-[#fdecec] text-red-700"}`}>{maklum.teks}</li>}
      {senarai.map((b) => {
        const rasmi = b.jenis === "rasmi" ? b.data as DataSuratRasmi : null;
        const ditolak = rasmi?.keputusanPejabat === "ditolak";
        const labelStatus = ditolak ? "ditolak" : rasmi?.keputusanPejabat === "diluluskan" ? "diluluskan" : b.status;
        return <li key={b.id} className="rounded-xl border border-garis bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-navy-800">{b.tajuk}</p>
              <p className="text-xs text-slate-500">
                {b.jenis === "rasmi" ? "Surat Rasmi" : "Kebenaran Gambar"} · {new Date(b.dicipta).toLocaleDateString("ms-MY")}
                {b.rujukan_kami && <> · Rujukan: <b>{b.rujukan_kami}</b></>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                ditolak ? "bg-[#fdecec] text-[#9a2e2e]" : b.status === "selesai" ? "bg-[#e5f4ec] text-[#167a4b]" : "bg-[#fdf3dc] text-[#9a6b06]"
              }`}>
                {labelStatus}
              </span>
              {(b.jenis === "rasmi" || b.jenis === "gambar") && (
                <button type="button" onClick={() => void bukaCetak(b)} className="min-h-11 touch-manipulation px-1 text-xs font-semibold text-navy-700 underline">
                  Cetak PDF
                </button>
              )}
              <span className="relative">
                <button
                  type="button" aria-label={`Tindakan untuk ${b.tajuk}`} aria-expanded={menuId === b.id}
                  disabled={sibuk === b.id} onClick={() => setMenuId((m) => m === b.id ? null : b.id)}
                  className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-garis px-2 py-1 text-sm leading-none text-slate-600 disabled:opacity-50"
                >
                  ⋮
                </button>
                {menuId === b.id && <>
                  <span className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuId(null)} />
                  <span className="absolute right-0 z-50 mt-1 block w-40 overflow-hidden rounded-xl border border-garis bg-white shadow-lg">
                    {b.jenis === "rasmi" && <button type="button" onClick={() => mulaSunting(b)} className="block w-full px-4 py-3 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50">Sunting surat</button>}
                    <button type="button" onClick={() => void padam(b.id, b.tajuk)} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#8f2424] hover:bg-[#fbeaea]">Padam borang</button>
                  </span>
                </>}
              </span>
            </div>
          </div>
          {ditolak && rasmi?.komenPejabat && (
            <p className="mt-3 rounded-lg bg-[#fdecec] px-3 py-2 text-xs leading-relaxed text-[#8f2424]">
              <b>Komen Urusan Pejabat:</b> {rasmi.komenPejabat}
            </p>
          )}
          {sunting?.id === b.id && (
            <div className="mt-3 grid min-w-0 gap-3 rounded-xl border border-garis bg-slate-50 p-3 sm:grid-cols-2">
              <input aria-label="Tajuk surat" value={sunting.tajuk} maxLength={180} onChange={(e) => setSunting({ ...sunting, tajuk: e.target.value })}
                className="block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm sm:col-span-2" />
              <textarea aria-label="Alamat penerima" value={sunting.alamat} maxLength={360} rows={3} onChange={(e) => setSunting({ ...sunting, alamat: e.target.value })}
                className="block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm" />
              <div className="min-w-0 space-y-3">
                <input aria-label="Tarikh surat" type="date" value={sunting.tarikh} onChange={(e) => setSunting({ ...sunting, tarikh: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm" />
                <select aria-label="Penandatangan" value={sunting.wakil} onChange={(e) => setSunting({ ...sunting, wakil: e.target.value })}
                  className="block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm">
                  {pentadbir.map((p) => <option key={`${p.nama}-${p.jawatan}`} value={`${p.nama}|${p.jawatan}`}>{p.nama} — {p.jawatan}</option>)}
                </select>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <EditorIsiSurat nilai={sunting.isi} rows={7} ubah={(v) => setSunting({ ...sunting, isi: v })} />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="button" disabled={sibuk === b.id} onClick={() => void simpanSunting()} className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Simpan dan hantar semula</button>
                <button type="button" onClick={() => setSunting(null)} className="min-h-11 touch-manipulation rounded-lg border border-garis px-3 py-2 text-xs font-semibold text-navy-700">Batal</button>
              </div>
            </div>
          )}
          {bolehPejabat && b.jenis === "rasmi" && !b.rujukan_kami && (
            <div className="mt-3 flex gap-2">
              <input
                value={rujukan[b.id] ?? ""} onChange={(e) => setRujukan((r) => ({ ...r, [b.id]: e.target.value }))}
                placeholder="Nombor rujukan kami" className="min-w-0 flex-1 rounded-lg border border-garis px-3 py-1.5 text-xs"
              />
              <button type="button" disabled={sibuk === b.id} onClick={() => simpanRujukan(b.id)}
                className="min-h-11 touch-manipulation rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                Simpan
              </button>
            </div>
          )}
        </li>;
      })}
    </ul>
  );
}

function Medan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1 block font-semibold text-navy-800">{label}</span>
      {children}
    </label>
  );
}

function Mesej({ mesej }: { mesej: { ok: boolean; teks: string } }) {
  return (
    <p className={`rounded-lg border p-3 text-sm ${mesej.ok ? "border-[#bfe3ce] bg-[#eef8f2] text-[#15693f]" : "border-[#e9c4c4] bg-[#fdf1f1] text-[#8f2b2b]"}`}>
      {mesej.teks}
    </p>
  );
}
