"use client";

import { useState } from "react";
import CetakLaporan from "@/components/CetakLaporan";
import { mulaCetak } from "@/components/cetak-mudah-alih";
import type { BarisTugasan } from "@/lib/tugasan";

/**
 * SENARAI LANTIKAN RASMI — untuk fail pentadbiran dan lampiran mesyuarat.
 *
 * Lantikan ditetapkan dalam sistem, tetapi mesyuarat dan fail sekolah
 * berjalan atas kertas. Tanpa dokumen ini, pentadbir menaip semula senarai
 * yang sudah wujud — dan senarai yang ditaip semula akan lapuk pada hari
 * pertama seseorang bertukar.
 *
 * Empat jenis lantikan dalam SATU borang, kerana itulah bentuk lampiran
 * mesyuarat: satu muka surat, bukan empat.
 */
export default function CetakJawatankuasa({
  guruKelas, guruRmt, guruDisiplin, pengurusPasukan,
}: {
  /** kelas → nama guru. */
  guruKelas: { kelas: string; nama: string }[];
  guruRmt: BarisTugasan[];
  guruDisiplin: BarisTugasan[];
  pengurusPasukan: BarisTugasan[];
}) {
  const [cetak, setCetak] = useState(false);

  const baris: (string | number)[][] = [
    ...guruKelas.map((g) => ["Guru Kelas", g.kelas, g.nama]),
    ...guruRmt.map((g) => ["Guru RMT", "Sekolah", g.nama]),
    ...guruDisiplin.map((g) => ["Guru Disiplin", "Sekolah", g.nama]),
    ...pengurusPasukan.map((g) => ["Pengurus Pasukan", g.skop || "—", g.nama]),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => { setCetak(true); setTimeout(() => mulaCetak("jk-cetak", "Senarai Lantikan"), 0); }}
        className="mt-6 min-h-11 touch-manipulation rounded-lg border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800"
      >
        Cetak senarai lantikan ({baris.length})
      </button>

      {cetak && (
        <CetakLaporan
          id="jk-cetak"
          tajuk="Senarai Lantikan Jawatankuasa Sekolah"
          subtajuk={`Sesi ${new Date().getFullYear()}`}
          maklumat={[{ label: "Jumlah lantikan", nilai: String(baris.length) }]}
          lajur={[
            { tajuk: "Jawatan", lebar: "42mm" },
            { tajuk: "Kelas / Skop", lebar: "38mm" },
            { tajuk: "Nama" },
          ]}
          baris={baris}
          nota="Senarai ini dijana daripada rekod lantikan dalam portal. Sebarang pindaan hendaklah dibuat dalam portal supaya senarai kekal terkini."
          tandatangan={[
            { label: "Disediakan oleh" },
            { label: "Disahkan oleh", jawatan: "Guru Besar" },
          ]}
        />
      )}
    </>
  );
}
