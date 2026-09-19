"use client";

/**
 * OCR untuk fail imbasan. Ia sengaja berjalan dalam pelayar: fail murid
 * kekal pada telefon/komputer pentadbir dan tidak dihantar ke servis OCR
 * pihak ketiga. Model bahasa dimuat turun sekali oleh pelayar apabila perlu.
 */
export async function bacaImbasan(
  fail: File,
  kemajuan?: (teks: string) => void,
  hadMuka = 20,
): Promise<string> {
  const workerModule = await import("tesseract.js");
  const worker = await workerModule.createWorker("eng", workerModule.OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        kemajuan?.(`OCR ${Math.round(m.progress * 100)}%…`);
      }
    },
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: workerModule.PSM.SINGLE_BLOCK });
    const imej = await mukaImbasan(fail, kemajuan, hadMuka);
    const teks: string[] = [];
    for (let i = 0; i < imej.length; i++) {
      kemajuan?.(`Membaca muka ${i + 1}/${imej.length}…`);
      const hasil = await worker.recognize(imej[i]);
      if (hasil.data.text.trim()) teks.push(hasil.data.text.trim());
    }
    return teks.join("\n\n").trim();
  } finally {
    await worker.terminate();
  }
}

async function mukaImbasan(fail: File, kemajuan?: (teks: string) => void, had = 20): Promise<Blob[]> {
  if (!/\.pdf$/i.test(fail.name) && fail.type !== "application/pdf") return [fail];

  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await fail.arrayBuffer()));
  const hadMuka = Math.min(pdf.numPages, had);
  const hasil: Blob[] = [];

  for (let nombor = 1; nombor <= hadMuka; nombor++) {
    kemajuan?.(`Menyediakan muka ${nombor}/${hadMuka} untuk OCR…`);
    const muka = await pdf.getPage(nombor);
    const viewport = muka.getViewport({ scale: 1.8 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Pelayar tidak dapat menyediakan kanvas OCR.");
    await muka.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((selesai) => canvas.toBlob(selesai, "image/png"));
    canvas.width = 1;
    canvas.height = 1;
    if (blob) hasil.push(blob);
  }

  if (pdf.numPages > hadMuka) {
    throw new Error(`PDF ini mempunyai ${pdf.numPages} muka. OCR dihadkan kepada ${hadMuka} muka setiap fail.`);
  }
  if (!hasil.length) throw new Error("Tiada muka PDF dapat disediakan untuk OCR.");
  return hasil;
}

export function failTeksOcr(fail: File, teks: string): File {
  const nama = fail.name.replace(/\.[^.]+$/, "") || "imbasan";
  return new File([teks], `${nama}.ocr.txt`, { type: "text/plain" });
}
