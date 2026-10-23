"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Kecilkan kandungan berlebar tetap (kertas A4 landskap 1080px) supaya MUAT
 * sepenuhnya dalam ruangnya — seperti pratonton dokumen. Tanpa ini kertas
 * terpotong di tepi kanan dan nampak rosak, bukan "boleh digulung".
 *
 * Transform diletak pada pembalut, BUKAN pada elemen ber-id yang disalin
 * `mulaCetak` — jadi cetakan sebenar kekal saiz penuh.
 */
export default function MuatLebar({ lebar, children }: { lebar: number; children: ReactNode }) {
  const luar = useRef<HTMLDivElement>(null);
  const dalam = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(1);
  const [tinggi, setTinggi] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const kemas = () => {
      const w = luar.current?.clientWidth ?? lebar;
      const s = Math.min(1, w / lebar);
      setSkala(s);
      setTinggi((dalam.current?.offsetHeight ?? 0) * s);
    };
    kemas();
    const ro = new ResizeObserver(kemas);
    if (luar.current) ro.observe(luar.current);
    if (dalam.current) ro.observe(dalam.current);
    return () => ro.disconnect();
  }, [lebar]);

  return (
    <div ref={luar} className="w-full overflow-hidden" style={{ height: tinggi }}>
      <div ref={dalam} style={{ width: lebar, transform: `scale(${skala})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
