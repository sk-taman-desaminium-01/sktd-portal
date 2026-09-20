import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { kelasBolehSunting } from "@/lib/guru-kelas";
import { sayaBertugas } from "@/lib/tugasan";
import { kelasBerisi, sesiSemasa } from "@/lib/pbd";
import { senaraiDisiplinKelas, type BarisDisiplin } from "@/lib/disiplin";
import { senaraiKebenaranGambarKelas, type BarisSurat, type DataSuratGambar } from "@/lib/surat";
import PanelMuridKelas, { type KelasGuru } from "./PanelMuridKelas";

export const metadata = { title: "Guru Kelas" };

/**
 * Guru Kelas (permintaan K) — SATU tempat untuk kerja pukal kelas.
 *
 * Tulisan sengaja PENDEK di sini (permintaan K eksplisit: "arahan tidak
 * terlalu panjang yang boleh serabutkan kepala mereka"). Kad ini TIDAK
 * mengulang borang sedia ada — ia PAUTAN pukal ke skrin yang sudah wujud
 * (PBD, Kawalan Kelas, Borang Sekolah), supaya guru kelas ada satu tempat
 * mula tanpa mencipta borang ketiga untuk kerja yang sama.
 */
export default async function GuruKelasHub() {
  const saya = await pengguna();
  if (!saya?.peranan) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-bold text-navy-800">Tiada kebenaran</h1>
        <Link href="/" className="mt-6 inline-block text-sm text-navy-700 underline">← Portal</Link>
      </main>
    );
  }

  const sesi = (await sesiSemasa())?.tahun_sesi ?? new Date().getFullYear();
  const [kelasSendiri, isiKelas, pengurusPasukan, guruRmt] = await Promise.all([
    kelasBolehSunting(),
    kelasBerisi(sesi),
    sayaBertugas("pengurus_pasukan"),
    sayaBertugas("guru_rmt"),
  ]);

  const nampakSemua = kelasSendiri === null || saya?.peranan === "admin_mutlak" || saya?.peranan === "admin" || saya?.peranan === "pentadbir";
  const kelasDipilih = nampakSemua
    ? isiKelas.map((k) => `${k.tahun} ${k.kelas}`)
    : kelasSendiri ?? [];
  const bolehRmt = guruRmt || kelasSendiri === null || (kelasSendiri?.length ?? 0) > 0;

  const kelasUrus: KelasGuru[] = kelasDipilih.map((label) => {
    const sedia = isiKelas.find((k) => `${k.tahun} ${k.kelas}` === label);
    if (sedia) return { label, tahun: sedia.tahun, kelas: sedia.kelas, bil: sedia.bil };
    if (/^PPKI\s+/i.test(label)) return { label, tahun: 0, kelas: label.toUpperCase(), bil: 0 };
    const [t, ...nama] = label.split(" ");
    return { label, tahun: Number(t), kelas: nama.join(" ").toUpperCase(), bil: 0 };
  });
  const [disiplinKelas, kebenaranKelas] = await Promise.all([
    senaraiDisiplinKelas(sesi, kelasDipilih),
    senaraiKebenaranGambarKelas(kelasDipilih),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-navy-700">← Portal</Link>
      <h1 className="mt-3 text-2xl font-bold text-navy-800">Guru Kelas</h1>
      <p className="mt-1 text-sm text-slate-500">
        {nampakSemua ? "Anda pentadbir: memilih daripada semua kelas." : "Satu tempat untuk semua kerja kelas anda."}
      </p>

      {kelasDipilih.length === 0 ? (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm text-slate-500">
          Anda belum ditugaskan sebagai guru kelas.
        </p>
      ) : <PanelMuridKelas kelasGuru={kelasUrus} />}

      <div className="mt-8 grid gap-4">
        <KadKebenaran senarai={kebenaranKelas.senarai} belumSedia={kebenaranKelas.belumSedia} />
        <KadDisiplin senarai={disiplinKelas.senarai} belumSedia={disiplinKelas.belumSedia} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Kad href="/pbd" nama="Nilai & Ulasan PBD" nota="Isi pukal untuk kelas anda." />
        <Kad href="/kawalan-kelas" nama="Kawalan Kelas & Kehadiran" nota="Rekod harian." />
        {bolehRmt && <Kad href="/rmt" nama="RMT" nota={guruRmt ? "Anda Guru RMT — urus semua senarai & kehadiran." : "Muat naik murid RMT untuk kelas sendiri."} />}
        {pengurusPasukan && <Kad href="/borang/aktiviti/urus" nama="Pengurus Pasukan" nota="Surat Akuan Penyertaan Aktiviti." />}
      </div>
    </main>
  );
}

function ikutKelas<T>(senarai: T[], kelas: (baris: T) => string) {
  const peta = new Map<string, T[]>();
  for (const baris of senarai) {
    const k = kelas(baris) || "Kelas tidak dinyatakan";
    peta.set(k, [...(peta.get(k) ?? []), baris]);
  }
  return [...peta.entries()].sort(([a], [b]) => a.localeCompare(b, "ms", { numeric: true }));
}

function BingkaiRekod({ tajuk, jumlah, href, pautan, children }: {
  tajuk: string; jumlah: number; href: string; pautan: string; children: React.ReactNode;
}) {
  return <section className="rounded-xl border border-garis bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-bold text-navy-800">{tajuk}</h2><p className="mt-0.5 text-xs text-slate-500">Paparan baca sahaja · {jumlah} rekod</p></div>
      <Link href={href} className="min-h-11 rounded-lg border border-navy-200 px-3 py-3 text-xs font-semibold text-navy-700">{pautan} →</Link>
    </div>
    {children}
  </section>;
}

function KadKebenaran({ senarai, belumSedia }: { senarai: BarisSurat[]; belumSedia: boolean }) {
  const kumpulan = ikutKelas(senarai, (b) => (b.data as DataSuratGambar).muridKelas);
  return <BingkaiRekod tajuk="Kebenaran Gambar Kelas" jumlah={senarai.length} href="/borang/urus" pautan="Buka Kad Borang Sekolah">
    {belumSedia ? <p className="mt-4 text-sm text-amber-700">Modul Borang Sekolah belum tersedia.</p>
      : kumpulan.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada keputusan ibu bapa bagi kelas anda.</p>
      : <div className="mt-4 space-y-2">{kumpulan.map(([kelas, baris]) => <details key={kelas} className="rounded-lg border border-garis">
          <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-navy-800">{kelas} <span className="font-normal text-slate-500">({baris.length})</span></summary>
          <ul className="divide-y divide-garis border-t border-garis">{baris.map((b) => {
            const d = b.data as DataSuratGambar;
            return <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <span><b>{d.muridNama}</b><span className="block text-xs text-slate-500">{new Date(b.dicipta).toLocaleDateString("ms-MY")}</span></span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${d.bersetuju ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{d.bersetuju ? "Bersetuju" : "Tidak bersetuju"}</span>
            </li>;
          })}</ul>
        </details>)}</div>}
  </BingkaiRekod>;
}

function KadDisiplin({ senarai, belumSedia }: { senarai: BarisDisiplin[]; belumSedia: boolean }) {
  const kumpulan = ikutKelas(senarai, (b) => b.kelas);
  return <BingkaiRekod tajuk="Disiplin & Sahsiah Kelas" jumlah={senarai.length} href="/disiplin" pautan="Buka Kad Disiplin & Sahsiah">
    {belumSedia ? <p className="mt-4 text-sm text-amber-700">Modul Disiplin belum tersedia.</p>
      : kumpulan.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada rekod disiplin bagi kelas anda.</p>
      : <div className="mt-4 space-y-2">{kumpulan.map(([kelas, baris]) => <details key={kelas} className="rounded-lg border border-garis">
          <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-navy-800">{kelas} <span className="font-normal text-slate-500">({baris.length})</span></summary>
          <ul className="divide-y divide-garis border-t border-garis">{baris.map((b) => <li key={b.id} className="px-3 py-2.5 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><b>{b.murid_nama}</b><span className="text-xs text-slate-500">{new Date(b.tarikh).toLocaleDateString("ms-MY")}</span></div>
            <p className="mt-1 text-slate-600">{b.kesalahan}</p>
            {b.tindakan && <p className="mt-0.5 text-xs text-slate-500">Tindakan: {b.tindakan}</p>}
          </li>)}</ul>
        </details>)}</div>}
  </BingkaiRekod>;
}

function Kad({ href, nama, nota }: { href: string; nama: string; nota: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-garis bg-white p-4 transition hover:border-navy-300 hover:shadow-sm">
      <p className="font-semibold text-navy-800">{nama}</p>
      <p className="mt-0.5 text-xs text-slate-500">{nota}</p>
    </Link>
  );
}
