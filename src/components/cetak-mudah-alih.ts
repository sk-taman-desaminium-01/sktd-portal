"use client";

function selamat(teks: string) {
  return teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Kertas = "portrait" | "landscape";

/**
 * Semua dokumen cetak mesti mengisytiharkan orientasinya pada akar cetakan.
 * Satu enjin menetapkan ruang selamat terakhir supaya gaya tempatan lama
 * tidak boleh menjadikan sesetengah borang terlalu rapat dengan tepi kertas.
 */
function tetapanKertas(asal: HTMLElement) {
  const kertas: Kertas = asal.dataset.cetakKertas === "landscape" ? "landscape" : "portrait";
  return {
    kertas,
    // 18–19 mm potret menyerupai surat rasmi SKTD; landskap perlu lebih
    // kecil supaya dua borang masih muat satu A4, tetapi kekal ada ruang nafas.
    margin: kertas === "landscape" ? "9mm 10mm" : "18mm 19mm 17mm",
  };
}

function gayaKertas(kertas: Kertas, margin: string) {
  return `
    @page { size: A4 ${kertas}; margin: ${margin}; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      .sktd-cetak-bar { display: none !important; }
      .sktd-cetak-viewport, .sktd-cetak-kertas {
        display: block !important; visibility: visible !important; position: static !important;
        width: auto !important; min-height: 0 !important; margin: 0 !important;
        padding: 0 !important; max-width: none !important; min-width: 0 !important;
        overflow: visible !important; box-shadow: none !important; background: #fff !important;
      }
      .sktd-cetak-kertas > [id] {
        display: block !important; visibility: visible !important; position: static !important;
        inset: auto !important; width: 100% !important; margin: 0 !important;
      }
      .sktd-cetak-kertas > [id], .sktd-cetak-kertas > [id] * { visibility: visible !important; }
    }
  `;
}

/** Salin CSS sahaja. Menyalin seluruh <head> turut menyalin skrip Next dan
 * boleh menghidupkan semula keseluruhan portal di dalam tab cetakan. */
function gayaAsal() {
  return [...document.head.querySelectorAll<HTMLStyleElement | HTMLLinkElement>("style,link[rel='stylesheet']")]
    .map((unsur) => {
      const salinan = unsur.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
      if (salinan instanceof HTMLLinkElement) salinan.href = new URL(salinan.href, document.baseURI).href;
      return salinan.outerHTML;
    })
    .join("\n");
}

function hidupkanKandunganCetak(dokumen: HTMLElement) {
  dokumen.classList.remove("hidden");
  // Ada cetakan lama yang membungkus kandungan dengan `hidden print:block`.
  // Dalam pratonton telefon media `print` belum aktif, jadi hanya elemen ini
  // patut dihidupkan — bukan apa-apa kandungan tersembunyi yang lain.
  for (const unsur of dokumen.querySelectorAll<HTMLElement>(".hidden")) {
    if ([...unsur.classList].some((kelas) => kelas.startsWith("print:"))) {
      unsur.classList.remove("hidden");
    }
  }
}

export function mulaCetak(id: string, tajuk: string): boolean {
  const asal = document.getElementById(id);
  if (!asal) return false;
  const { kertas, margin } = tetapanKertas(asal);

  const tetingkap = window.open("", "_blank");
  const dokumen = asal.cloneNode(true) as HTMLElement;
  hidupkanKandunganCetak(dokumen);
  dokumen.style.display = "block";
  for (const imej of dokumen.querySelectorAll("img")) {
    const sumber = imej.getAttribute("src");
    if (sumber) imej.src = new URL(sumber, document.baseURI).href;
  }

  const html = `<!doctype html><html lang="ms"><head>${gayaAsal()}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${selamat(tajuk)}</title>
    <style>
      body { margin: 0; background: #eef2f7; color: #000; }
      .sktd-cetak-bar { position: sticky; top: 0; z-index: 3; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; background: #123561; color: #fff; font: 600 14px system-ui, sans-serif; }
      .sktd-cetak-bar span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
      .sktd-cetak-bar button { min-height: 40px; border: 0; border-radius: 8px; padding: 8px 12px; background: #fff; color: #123561; font: inherit; white-space: nowrap; }
      .sktd-cetak-bar .sktd-kembali { background: transparent; box-shadow: inset 0 0 0 1px #ffffff88; color: #fff; }
      .sktd-cetak-viewport { overflow: auto; padding: 16px; }
      .sktd-cetak-kertas { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 19mm 17mm; background: #fff; box-shadow: 0 2px 12px #0002; }
      .sktd-cetak-kertas.sktd-cetak-landscape { width: 297mm; min-height: 210mm; padding: 9mm 10mm; max-width: none; }
      .sktd-cetak-landscape #akuan-cetak { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      #${id} { display: block !important; position: static !important; inset: auto !important; width: 100% !important; }
      @media (max-width: 720px) { .sktd-cetak-viewport { padding: 10px; } }
    </style></head><body>
    <div class="sktd-cetak-bar"><button type="button" class="sktd-kembali" id="sktd-kembali" aria-label="Kembali ke portal">← Kembali</button><span>Pratonton cetakan</span><button type="button" id="sktd-cetak">Cetak / Simpan PDF</button></div>
    <div class="sktd-cetak-viewport"><main class="sktd-cetak-kertas sktd-cetak-${kertas}">${dokumen.outerHTML}</main></div>
    <style id="sktd-gaya-cetak-tetap">${gayaKertas(kertas, margin)}</style>
    <script>
      (function () {
        var kembali = document.getElementById("sktd-kembali");
        var cetak = document.getElementById("sktd-cetak");
        async function cetakBilaSedia() {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
          await Promise.all(Array.from(document.images).map(function (img) {
            return img.complete ? Promise.resolve() : new Promise(function (selesai) {
              img.addEventListener("load", selesai, { once: true });
              img.addEventListener("error", selesai, { once: true });
            });
          }));
          requestAnimationFrame(function () { requestAnimationFrame(function () { window.print(); }); });
        }
        if (cetak) cetak.addEventListener("click", cetakBilaSedia);
        if (kembali) kembali.addEventListener("click", function () {
          if (window.opener && !window.opener.closed) { window.close(); return; }
          if (window.history.length > 1) { window.history.back(); return; }
          window.location.assign(document.referrer || window.location.origin);
        });
      }());
    </script></body></html>`;

  if (!tetingkap) {
    // Jika pop-up disekat (kerap dalam PWA iOS), buka dokumen yang sama pada
    // tab semasa. Butang Kembali menggunakan sejarah pelayar untuk pulang ke
    // borang; fungsi cetak tidak lagi jatuh semula kepada window.print().
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    window.location.assign(url);
    return true;
  }

  tetingkap.document.open();
  tetingkap.document.write(html);
  tetingkap.document.close();
  return true;
}
