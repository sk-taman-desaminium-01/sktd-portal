import Link from "next/link";
import { senaraiGuruKelas } from "@/lib/guru-kelas";
import { senaraiAkses } from "@/lib/akses-urus";
import { senaraiTugasan } from "@/lib/tugasan";
import { semuaKelas, semuaKelasPPKI } from "@/data/kelas";
import PanelGuruKelas from "./PanelGuruKelas";
import PanelTugasanLain from "./PanelTugasanLain";
import CetakJawatankuasa from "./CetakJawatankuasa";
import TagDariBuku from "./TagDariBuku";

export const metadata = { title: "Jawatankuasa Sekolah" };

/**
 * Tetapkan siapa guru kelas bagi setiap kelas.
 *
 * Skrin ini ialah PASANGAN kepada Jadual Waktu: guru kelas hanya boleh
 * menyunting jadual kelas yang ditugaskan kepadanya DI SINI. Tanpa skrin ini,
 * keupayaan itu wujud dalam kod tetapi tiada sesiapa boleh menggunakannya.
 *
 * Tugasan lain (guru RMT, guru disiplin, pengurus pasukan) dikongsi skrin
 * ini — bentuknya sama (nama orang + skop), jadi tiga skrin berasingan
 * ialah kerja berulang yang tidak perlu (permintaan pengguna D/E/3.1).
 */
export default async function GuruKelas() {
  const [tugasan, orang, guruRmt, guruDisiplin, pengurusPasukan] = await Promise.all([
    senaraiGuruKelas(), senaraiAkses(),
    senaraiTugasan("guru_rmt"), senaraiTugasan("guru_disiplin"), senaraiTugasan("pengurus_pasukan"),
  ]);

  // Hanya orang yang SUDAH dibenarkan masuk portal boleh ditugaskan — kalau
  // tidak, mereka dilantik guru kelas tetapi tidak boleh log masuk untuk
  // membuat kerja itu.
  const boleh = orang
    .filter((o) => o.dibenarkan)
    .map((o) => ({ id: o.id, nama: o.nama, emel: o.email }));

  // PPKI disertakan (permintaan pengguna I) — kelas Pendidikan Khas juga
  // perlu guru kelas yang dilantik, bukan sekadar kelas perdana.
  const kelas = [...semuaKelas(), ...semuaKelasPPKI()];
  const petaan = Object.fromEntries(tugasan.map((t) => [t.label, t]));

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-navy-700">
        ← Urus Laman
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-navy-800">Jawatankuasa Sekolah</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {tugasan.length} daripada {kelas.length} kelas sudah ada guru kelas.
      </p>

      <p className="mt-5 rounded-xl border border-garis bg-navy-50 p-4 text-sm leading-relaxed text-navy-800">
        Guru kelas boleh menyunting <b>jadual waktu kelasnya sendiri sahaja</b>.
        Pentadbir dan admin boleh menyunting semua kelas. Seorang guru boleh
        memegang lebih daripada satu kelas.
      </p>

      {boleh.length === 0 ? (
        <p className="mt-6 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-5 text-sm leading-relaxed text-[#7a5a12]">
          Belum ada sesiapa dalam senarai akses yang dibenarkan masuk portal,
          jadi tiada siapa boleh ditugaskan lagi. Luluskan guru di{" "}
          <Link href="/admin/akses" className="font-semibold underline">
            Senarai Akses
          </Link>{" "}
          dahulu.
        </p>
      ) : (
        <>
          <TagDariBuku />

          <PanelGuruKelas kelas={kelas} awal={petaan} orang={boleh} />

          <PanelTugasanLain
            jenis="guru_rmt" tajuk="Guru RMT" skopTunggal
            ringkas="Guru yang dilantik menguruskan Rancangan Makanan Tambahan — muat naik senarai murid dan rekod kehadiran RMT."
            placeholderSkop="" awal={guruRmt} orang={boleh}
          />
          <PanelTugasanLain
            jenis="guru_disiplin" tajuk="Guru Disiplin" skopTunggal
            ringkas="Satu-satunya (selain pentadbir & admin) yang boleh membaca rekod disiplin murid lain, bukan sekadar merekod sendiri."
            placeholderSkop="" awal={guruDisiplin} orang={boleh}
          />
          <PanelTugasanLain
            jenis="pengurus_pasukan" tajuk="Pengurus Pasukan"
            ringkas="Urus Surat Kebenaran Waris & Perakuan Kesihatan bagi aktiviti/pertandingan pasukan masing-masing."
            labelSkop="Nama pasukan" placeholderSkop="Contoh: Bola Sepak" awal={pengurusPasukan} orang={boleh}
          />
          <CetakJawatankuasa
            guruKelas={tugasan.map((t) => ({ kelas: t.label, nama: t.nama }))}
            guruRmt={guruRmt}
            guruDisiplin={guruDisiplin}
            pengurusPasukan={pengurusPasukan}
          />
        </>
      )}
    </main>
  );
}

