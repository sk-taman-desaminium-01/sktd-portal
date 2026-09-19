"use client";

import { AWALAN } from "@/lib/laluan";

type Kertas = "portrait" | "landscape";

function hidupkanKandunganCetak(dokumen: HTMLElement) {
  dokumen.classList.remove("hidden");
  for (const unsur of dokumen.querySelectorAll<HTMLElement>(".hidden")) {
    if ([...unsur.classList].some((kelas) => kelas.startsWith("print:"))) unsur.classList.remove("hidden");
  }
}

function bersihkan(dokumen: HTMLElement) {
  for (const unsur of dokumen.querySelectorAll("script,iframe,object,embed")) unsur.remove();
  for (const unsur of [dokumen, ...dokumen.querySelectorAll<HTMLElement>("*")]) {
    for (const atribut of [...unsur.attributes]) {
      if (/^on/i.test(atribut.name)) unsur.removeAttribute(atribut.name);
    }
  }
}

/**
 * Laptop, iPhone dan Android semuanya menggunakan halaman pratonton React
 * yang sama. Tiada window.print() pada portal, popup, blob atau skrip sebaris.
 */
export function mulaCetak(id: string, tajuk: string): boolean {
  const asal = document.getElementById(id);
  if (!asal) return false;

  const dokumen = asal.cloneNode(true) as HTMLElement;
  hidupkanKandunganCetak(dokumen);
  dokumen.style.display = "block";
  dokumen.style.position = "static";
  for (const imej of dokumen.querySelectorAll("img")) {
    const sumber = imej.getAttribute("src");
    if (sumber) imej.src = new URL(sumber, document.baseURI).href;
  }
  bersihkan(dokumen);

  const kertas: Kertas = asal.dataset.cetakKertas === "landscape" ? "landscape" : "portrait";
  const kunci = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    sessionStorage.setItem(`sktd-cetak:${kunci}`, JSON.stringify({
      versi: 1, tajuk, kertas, kandungan: dokumen.outerHTML,
    }));
  } catch {
    return false;
  }

  window.location.href = `${AWALAN}/borang/pratonton-cetak?k=${encodeURIComponent(kunci)}`;
  return true;
}
