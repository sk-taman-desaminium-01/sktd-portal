"use client";

/**
 * Cetakan pada iPhone/iPad dan sebahagian Android PWA tidak semestinya
 * membuka dialog apabila `window.print()` dipanggil daripada halaman aplikasi.
 * Untuk peranti itu, buka pratonton berdikari dalam tab baharu yang memegang
 * dokumen sahaja. Pengguna boleh melihat borang dahulu dan menekan butang
 * Cetak / Simpan PDF di situ; pada laptop dialog cetak kekal dibuka terus.
 */
function mudahAlih() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function selamat(teks: string) {
  return teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function mulaCetak(id: string, tajuk: string): boolean {
  const asal = document.getElementById(id);
  if (!asal) return false;

  if (!mudahAlih()) {
    window.print();
    return true;
  }

  const tetingkap = window.open("", "_blank");
  if (!tetingkap) {
    // Penyemak imbas menyekat tetingkap baharu. Cuba laluan biasa supaya
    // pengguna masih tidak kehilangan fungsi cetak sepenuhnya.
    window.print();
    return false;
  }

  const dokumen = asal.cloneNode(true) as HTMLElement;
  dokumen.classList.remove("hidden");
  dokumen.style.display = "block";
  for (const imej of dokumen.querySelectorAll("img")) {
    const sumber = imej.getAttribute("src");
    if (sumber) imej.src = new URL(sumber, document.baseURI).href;
  }
  const kepala = document.head.cloneNode(true) as HTMLHeadElement;
  for (const pautan of kepala.querySelectorAll<HTMLElement>("[href], [src]")) {
    const atribut = pautan.hasAttribute("href") ? "href" : "src";
    const nilai = pautan.getAttribute(atribut);
    if (nilai && !/^(?:data:|https?:)/i.test(nilai)) {
      pautan.setAttribute(atribut, new URL(nilai, document.baseURI).href);
    }
  }

  tetingkap.document.open();
  tetingkap.document.write(`<!doctype html><html lang="ms"><head>${kepala.innerHTML}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${selamat(tajuk)}</title>
    <style>
      body { margin: 0; background: #eef2f7; color: #000; }
      .sktd-cetak-bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; padding: 12px 16px; background: #123561; color: #fff; font: 600 14px system-ui, sans-serif; }
      .sktd-cetak-bar button { border: 0; border-radius: 8px; padding: 9px 12px; background: #fff; color: #123561; font: inherit; }
      .sktd-cetak-kertas { max-width: 210mm; margin: 16px auto; background: #fff; box-shadow: 0 2px 12px #0002; }
      #${id} { display: block !important; position: static !important; width: auto !important; }
      @media print { .sktd-cetak-bar { display: none !important; } .sktd-cetak-kertas { margin: 0; max-width: none; box-shadow: none; } }
    </style></head><body>
    <div class="sktd-cetak-bar"><span>Pratonton cetakan</span><button type="button" onclick="window.print()">Cetak / Simpan PDF</button></div>
    <main class="sktd-cetak-kertas">${dokumen.outerHTML}</main></body></html>`);
  tetingkap.document.close();
  return true;
}
