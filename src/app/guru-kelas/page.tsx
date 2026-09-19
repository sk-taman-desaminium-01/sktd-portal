import Link from "next/link";
import { pengguna } from "@/lib/akses";
import { kelasBolehSunting } from "@/lib/guru-kelas";
import { sayaBertugas } from "@/lib/tugasan";
import { kelasBerisi, sesiSemasa } from "@/lib/pbd";

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
  const [kelasSendiri, isiKelas, pengurusPasukan, guruRmt, guruDisiplin] = await Promise.all([
    kelasBolehSunting(),
    kelasBerisi(sesi),
    sayaBertugas("pengurus_pasukan"),
    sayaBertugas("guru_rmt"),
    sayaBertugas("guru_disiplin"),
  ]);

  const nampakSemua = kelasSendiri === null || saya?.peranan === "admin_mutlak" || saya?.peranan === "admin" || saya?.peranan === "pentadbir";
  const kelasDipilih = nampakSemua
    ? isiKelas.map((k) => `${k.tahun} ${k.kelas}`)
    : kelasSendiri ?? [];
  const bolehRmt = guruRmt || kelasSendiri === null || (kelasSendiri?.length ?? 0) > 0;

  const bilMurid = (label: string) => {
    const cari = isiKelas.find((k) => `${k.tahun} ${k.kelas}` === label);
    return cari?.bil ?? 0;
  };

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
      ) : (
        <ul className="mt-6 space-y-2">
          {kelasDipilih.map((label) => (
            <li key={label} className="rounded-xl border border-garis bg-white p-4">
              <p className="font-semibold text-navy-800">{label}</p>
              <p className="text-xs text-slate-500">{bilMurid(label)} murid berdaftar</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Kad href="/pbd" nama="Nilai & Ulasan PBD" nota="Isi pukal untuk kelas anda." />
        <Kad href="/kawalan-kelas" nama="Kawalan Kelas & Kehadiran" nota="Rekod harian." />
        <Kad href="/borang/urus" nama="Borang Sekolah" nota="Kebenaran Gambar & surat rasmi." />
        <Kad href="/disiplin" nama="Disiplin & Sahsiah" nota={guruDisiplin ? "Rekod, sunting dan urus laporan disiplin." : "Rekod salah laku."} />
        {bolehRmt && <Kad href="/rmt" nama="RMT" nota={guruRmt ? "Anda Guru RMT — urus semua senarai & kehadiran." : "Muat naik murid RMT untuk kelas sendiri."} />}
        {pengurusPasukan && <Kad href="/borang/aktiviti/urus" nama="Pengurus Pasukan" nota="Surat Akuan Penyertaan Aktiviti." />}
      </div>
    </main>
  );
}

function Kad({ href, nama, nota }: { href: string; nama: string; nota: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-garis bg-white p-4 transition hover:border-navy-300 hover:shadow-sm">
      <p className="font-semibold text-navy-800">{nama}</p>
      <p className="mt-0.5 text-xs text-slate-500">{nota}</p>
    </Link>
  );
}
