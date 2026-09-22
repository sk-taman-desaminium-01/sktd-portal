import { pecahFormat, type BarisIsi, type KepingTeks } from "@/data/isi-surat";

function Keping({ k }: { k: KepingTeks }) {
  let n: React.ReactNode = k.teks;
  if (k.coret) n = <s>{n}</s>;
  if (k.italik) n = <i>{n}</i>;
  if (k.tebal) n = <b>{n}</b>;
  return <>{n}</>;
}

/** Teks gaya WhatsApp → <b>/<i>/<s>. */
export function TeksBerformat({ teks }: { teks: string }) {
  return <>{pecahFormat(teks).map((k, i) => <Keping key={i} k={k} />)}</>;
}

/**
 * "Tarikh : 26 Sep" → [label, nilai] selepas format dihurai (supaya
 * `*Tarikh : 26 Sep*` kekal tebal pada kedua-dua bahagian). Null jika baris
 * bukan pasangan label pendek.
 */
function pecahLabel(teks: string): [KepingTeks[], KepingTeks[]] | null {
  const keping = pecahFormat(teks);
  const kiri: KepingTeks[] = [];
  for (let i = 0; i < keping.length; i++) {
    const k = keping[i];
    const t = k.teks.indexOf(":");
    if (t < 0) { kiri.push(k); continue; }
    kiri.push({ ...k, teks: k.teks.slice(0, t).trimEnd() });
    const kanan = [{ ...k, teks: k.teks.slice(t + 1).trimStart() }, ...keping.slice(i + 1)].filter((x) => x.teks);
    const label = kiri.map((x) => x.teks).join("").trim();
    if (!label || label.length > 25 || /^\d/.test(label)) return null;
    return [kiri.filter((x) => x.teks), kanan];
  }
  return null;
}

/**
 * Perenggan isi surat: baris bernombor (nombor ditaip guru) mendapat inden
 * tergantung; baris sejajar diletakkan di bawah teks. Dua atau lebih baris
 * berturut-turut berbentuk "Label : nilai" dijajarkan titik bertindihnya
 * seperti surat asal (Tarikh / Hari / Masa). Satu komponen untuk CETAKAN
 * dan PRATONTON supaya kedua-duanya sama.
 */
export default function IsiSurat({ perenggan, jarak = "3.5mm", inden = "8mm" }: { perenggan: BarisIsi[][]; jarak?: string; inden?: string }) {
  return <>{perenggan.map((baris, i) => {
    const kumpulan: (BarisIsi | BarisIsi[])[] = [];
    for (const b of baris) {
      const akhir = kumpulan[kumpulan.length - 1];
      if (!b.nombor && pecahLabel(b.teks)) {
        if (Array.isArray(akhir) && akhir[0].sejajar === b.sejajar) akhir.push(b);
        else kumpulan.push([b]);
      } else kumpulan.push(b);
    }
    return (
      <div key={i} style={{ marginBottom: jarak, textAlign: "justify" }}>
        {kumpulan.map((g, j) => {
          if (Array.isArray(g)) {
            if (g.length === 1) g = g[0];
            else return (
              <div key={j} style={{ display: "grid", gridTemplateColumns: "max-content auto 1fr", columnGap: "0.4em", paddingLeft: g[0].sejajar ? inden : 0, textAlign: "left" }}>
                {g.map((b, n) => {
                  const [kiri, kanan] = pecahLabel(b.teks)!;
                  const tebal = kiri.some((k) => k.tebal) && kanan.some((k) => k.tebal);
                  return [
                    <span key={`${n}a`}>{kiri.map((k, x) => <Keping key={x} k={k} />)}</span>,
                    <span key={`${n}b`} style={{ fontWeight: tebal ? 700 : undefined }}>:</span>,
                    <span key={`${n}c`}>{kanan.map((k, x) => <Keping key={x} k={k} />)}</span>,
                  ];
                })}
              </div>
            );
          }
          const b = g;
          return b.nombor ? (
            <div key={j} style={{ display: "grid", gridTemplateColumns: `${inden} 1fr` }}>
              <span>{b.nombor}</span><span><TeksBerformat teks={b.teks} /></span>
            </div>
          ) : (
            <div key={j} style={{ paddingLeft: b.sejajar ? inden : 0 }}><TeksBerformat teks={b.teks} /></div>
          );
        })}
      </div>
    );
  })}</>;
}
