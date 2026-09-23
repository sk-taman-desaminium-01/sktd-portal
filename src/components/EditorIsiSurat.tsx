"use client";

import { useRef } from "react";
import { susunIsiSurat, HAD_ISI_SATU_MUKA } from "@/data/isi-surat";
import IsiSurat from "./IsiSurat";

/**
 * Kotak isi surat rasmi dengan tiga butang — direka untuk TELEFON juga.
 *
 * Format gaya WhatsApp (*tebal* _italik_ ~coret~) — guru sudah biasa.
 * Memilih teks dengan ibu jari sukar, jadi butang B / I / S membalut
 * pilihan; tanpa pilihan ia memasukkan sepasang penanda dan meletakkan
 * kursor di tengah — terus taip. Nombor perenggan ditaip guru sendiri.
 * Butang guna `onPointerDown` + preventDefault supaya papan kekunci tidak
 * tertutup dan pilihan teks tidak hilang bila butang ditekan.
 */
export default function EditorIsiSurat({
  nilai, ubah, rows = 8, labelAria = "Isi surat",
}: { nilai: string; ubah: (v: string) => void; rows?: number; labelAria?: string }) {
  const kotak = useRef<HTMLTextAreaElement>(null);
  const pilihan = useRef<[number, number]>([nilai.length, nilai.length]);

  function ingat() {
    const k = kotak.current;
    if (k) pilihan.current = [k.selectionStart, k.selectionEnd];
  }

  function masuk(sebelum: string, selepas = "") {
    const k = kotak.current;
    const [a, b] = k && document.activeElement === k ? [k.selectionStart, k.selectionEnd] : pilihan.current;
    const baharu = (nilai.slice(0, a) + sebelum + nilai.slice(a, b) + selepas + nilai.slice(b)).slice(0, HAD_ISI_SATU_MUKA);
    ubah(baharu);
    const kursor = b === a ? a + sebelum.length : b + sebelum.length + selepas.length;
    requestAnimationFrame(() => {
      if (!k) return;
      k.focus();
      k.setSelectionRange(kursor, kursor);
      pilihan.current = [kursor, kursor];
    });
  }

  const pratonton = susunIsiSurat(nilai).perenggan;

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap gap-1.5" role="toolbar" aria-label="Format isi surat">
        <ButangFormat label="Tebal" tekan={() => masuk("*", "*")}><b>B</b></ButangFormat>
        <ButangFormat label="Italik" tekan={() => masuk("_", "_")}><i className="font-serif">I</i></ButangFormat>
        <ButangFormat label="Coret" tekan={() => masuk("~", "~")}><s>S</s></ButangFormat>
      </div>
      <textarea
        ref={kotak} value={nilai} rows={rows} maxLength={HAD_ISI_SATU_MUKA} aria-label={labelAria}
        onChange={(e) => { ubah(e.target.value); ingat(); }} onSelect={ingat} onKeyUp={ingat} onBlur={ingat}
        placeholder={"2. Sukacita dimaklumkan bahawa …\n\n3. Bersama-sama ini disertakan butiran:\nTarikh : *26 September 2026*\nMasa : *8.00 pagi*"}
        className="block w-full min-w-0 max-w-full rounded-lg border border-garis bg-white px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Seperti WhatsApp: <b>*tebal*</b> · <i>_italik_</i> · <s>~coret~</s>. Taip nombor sendiri (2., 3., (a)) —
        baris di bawahnya sejajar dengan teks. Baris kosong = perenggan baharu.
        {" "}{nilai.length}/{HAD_ISI_SATU_MUKA.toLocaleString("ms-MY")} aksara, satu halaman A4.
      </p>
      {pratonton.length > 0 && (
        <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 font-serif text-[13px] leading-relaxed text-black">
          <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-500">Pratonton susunan</p>
          <p>Dengan hormatnya perkara di atas adalah dirujuk.</p>
          <div className="mt-2"><IsiSurat perenggan={pratonton} jarak="0.5rem" inden="1.6rem" /></div>
        </div>
      )}
    </div>
  );
}

/** `onPointerDown` + preventDefault: papan kekunci telefon kekal terbuka dan pilihan teks tidak hilang. */
function ButangFormat({ tekan, children, label }: { tekan: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button" aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); tekan(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tekan(); } }}
      className="min-h-10 min-w-10 touch-manipulation rounded-lg border border-garis bg-white px-3 text-sm text-navy-800 active:bg-navy-50"
    >
      {children}
    </button>
  );
}
