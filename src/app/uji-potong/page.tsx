"use client";
import { useEffect, useState } from "react";
import PemotongWajah from "../admin/pentadbir/PemotongWajah";

/** HALAMAN UJIAN SEMENTARA — dipadam selepas tangkap skrin. */
export default function Uji() {
  const [fail, setFail] = useState<File | null>(null);
  useEffect(() => {
    // Gambar potret tiruan: segi empat tegak dengan "kepala" di bahagian atas.
    const c = document.createElement("canvas");
    c.width = 600; c.height = 900;
    const x = c.getContext("2d")!;
    x.fillStyle = "#dbe6f2"; x.fillRect(0, 0, 600, 900);
    x.fillStyle = "#123561"; x.fillRect(0, 700, 600, 200);          // bahu
    x.fillStyle = "#e8c9a0"; x.beginPath();
    x.arc(300, 260, 150, 0, Math.PI * 2); x.fill();                  // kepala
    x.fillStyle = "#2b2b2b"; x.beginPath();
    x.arc(250, 230, 18, 0, Math.PI * 2); x.arc(350, 230, 18, 0, Math.PI * 2); x.fill();
    x.strokeStyle = "#8a5a3a"; x.lineWidth = 8;
    x.beginPath(); x.arc(300, 300, 60, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
    x.fillStyle = "#94a3b8"; x.font = "28px sans-serif";
    x.fillText("bawah gambar", 180, 640);
    c.toBlob((b) => b && setFail(new File([b], "potret.png", { type: "image/png" })));
  }, []);
  if (!fail) return <p className="p-10">Menyedia…</p>;
  return (
    <PemotongWajah fail={fail} namaOrang="PUAN SITI BINTI OMAR"
      onBatal={() => {}} onSiap={() => {}} />
  );
}
