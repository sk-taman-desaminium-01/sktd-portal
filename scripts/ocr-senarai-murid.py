#!/usr/bin/env python3
"""
OCR senarai murid iDMe → teks yang boleh ditampal ke ePBD.

KENAPA SKRIP INI WUJUD, dan kenapa ia di Mac dan bukan dalam web.

Fail senarai kelas yang dimuat turun dari iDMe ialah PDF IMBASAN — ia
mengandungi gambar, bukan teks. Diukur pada `~/Desktop/PBD/TAHAP 1/1
AMANAH.pdf`: empat muka, `bilItem = 0`. Tiada penghurai boleh membaca teks
yang tidak wujud, dan itulah sebabnya portal menolaknya dengan jujur dan
bukan menghasilkan sampah.

Membacanya memerlukan OCR. OCR dalam pelayar (tesseract.js) lambat dan
lemah dengan nama Melayu; OCR Apple Vision pada Mac ini pantas dan tepat,
dan ia sudah terbukti dalam projek eGPI. Maka: OCR berlaku di sini, sekali,
dan hasilnya ditampal atau dimuat naik ke ePBD.

CARA GUNA
    python3 scripts/ocr-senarai-murid.py "~/Desktop/PBD/TAHAP 1/1 AMANAH.pdf"
    python3 scripts/ocr-senarai-murid.py "~/Desktop/PBD/TAHAP 1"      # satu folder

Setiap PDF menghasilkan fail .txt di sebelahnya:
    NAMA PENUH MURID  060101101234

Fail itu boleh ditampal terus ke kotak "Masukkan murid", atau dimuat naik
melalui "Baca fail" — kedua-duanya menerima bentuk ini.

ORIENTASI TIDAK DITEKA. Setiap muka dicuba pada empat putaran dan yang
menghasilkan paling banyak No. KP sah dipilih. Itu peraturan yang sama
seperti dalam portal: berhenti meneka, ukur.
"""

import re
import sys
import pathlib

import fitz
import Vision
import Quartz
from Foundation import NSData

# No. KP 12 digit, ditulis dengan atau tanpa pemisah.
RE_KP = re.compile(r"\b(\d{6})\s*[-–—. ]?\s*(\d{2})\s*[-–—. ]?\s*(\d{4})\b")

# Perkataan kepala jadual yang bukan nama.
BUKAN_NAMA = {
    "BIL", "BIL.", "NAMA", "ID", "PENGENALAN", "NO", "NO.", "KP", "JANTINA",
    "KELAS", "GURU", "ULASAN", "TAHUN", "SEKOLAH", "SENARAI", "MURID",
    "L", "P", "LELAKI", "PEREMPUAN",
}

# Vision kadang membaca huruf Latin sebagai Cyrillic yang serupa.
CYRILLIC = str.maketrans({
    "Т": "T", "Р": "P", "З": "3", "О": "O", "А": "A", "В": "B", "Е": "E",
    "С": "C", "Н": "H", "К": "K", "М": "M", "Х": "X", "У": "Y", "І": "I",
})

DPI = 220


def baca_muka(pix_bytes: bytes) -> list:
    """Jalankan Apple Vision pada satu gambar; pulangkan (teks, x, y)."""
    data = NSData.dataWithBytes_length_(pix_bytes, len(pix_bytes))
    sumber = Quartz.CGImageSourceCreateWithData(data, None)
    if sumber is None:
        return []
    imej = Quartz.CGImageSourceCreateImageAtIndex(sumber, 0, None)
    if imej is None:
        return []

    permintaan = Vision.VNRecognizeTextRequest.alloc().init()
    permintaan.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    permintaan.setUsesLanguageCorrection_(False)

    pengendali = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(imej, None)
    ok, _ = pengendali.performRequests_error_([permintaan], None)
    if not ok:
        return []

    keluar = []
    for hasil in permintaan.results() or []:
        calon = hasil.topCandidates_(1)
        if not calon:
            continue
        kotak = hasil.boundingBox()
        keluar.append((
            calon[0].string().translate(CYRILLIC).strip(),
            kotak.origin.x,
            # Vision mengira y dari BAWAH; dibalikkan supaya ia mengikut
            # cara manusia membaca, dari atas ke bawah.
            1.0 - kotak.origin.y,
        ))
    return keluar


def baris_dari_serpihan(serpihan: list, toleransi: float = 0.012) -> list:
    """
    Kumpulkan serpihan yang berada pada ketinggian yang sama menjadi baris.

    Setiap baris mengekalkan KEDUDUKAN X setiap serpihan, bukan hanya teksnya.
    Itu yang membezakan nama daripada gred TP dan ulasan guru: dalam slip
    iDMe, ketiga-tiganya berada pada baris yang SAMA tetapi dalam lajur yang
    berbeza. Menggabungkan baris menjadi satu rentetan membuang maklumat itu
    — dan hasilnya "AAFIYAH ZAHRA (TP3) (TP3) … INI TELAH MENUNJUKKAN" sebagai
    nama murid, yang diukur dan dilihat sendiri.
    """
    susun = sorted(serpihan, key=lambda s: (s[2], s[1]))
    baris, semasa, y_semasa = [], [], None
    for teks, x, y in susun:
        if y_semasa is None or abs(y - y_semasa) <= toleransi:
            semasa.append((teks, x))
            y_semasa = y if y_semasa is None else (y_semasa + y) / 2
        else:
            baris.append(sorted(semasa, key=lambda p: p[1]))
            semasa, y_semasa = [(teks, x)], y
    if semasa:
        baris.append(sorted(semasa, key=lambda p: p[1]))
    return baris


def bersihkan_nama(kata: list) -> str:
    """Buang nombor senarai, gred, dan perkataan kepala daripada nama."""
    teks = " ".join(kata)
    # Gred dan ulasan bermula pada kurungan pertama. Nama murid tidak pernah
    # mengandungi kurungan, jadi potongan itu selamat.
    teks = teks.split("(")[0]
    teks = re.sub(r"^\s*\d{1,3}\s*[.)\-]?\s*", "", teks)
    bersih = [k for k in teks.split() if k.upper() not in BUKAN_NAMA and not k.isdigit()]
    return re.sub(r"\s+", " ", " ".join(bersih)).strip(" .,-").upper()


def murid_dari_baris(baris: list) -> list:
    """
    Cari pasangan NAMA + No. KP.

    NAMA DIAMBIL DARI KIRI No. KP SAHAJA. Dalam slip iDMe susunannya ialah
    Bil · Nama · No. KP · gred setiap subjek · ulasan guru. Segala-galanya di
    KANAN No. KP ialah markah dan ayat guru, bukan sebahagian nama.

    NAMA YANG MEMBALUT DISAMBUNG. Nama panjang membalut ke baris berikutnya
    dalam lajur yang sama, dan baris itu tiada No. KP — tanpa penyambungan,
    "AARIZ RAFAEL BIN" kehilangan nama bapanya.
    """
    keluar = []
    for i, b in enumerate(baris):
        gabung = " ".join(t for t, _ in b)
        m = RE_KP.search(gabung)
        if not m:
            continue
        kp = f"{m.group(1)}{m.group(2)}{m.group(3)}"

        # Kedudukan x No. KP: serpihan pertama yang mengandunginya.
        x_kp = next((x for t, x in b if RE_KP.search(t)), 0.5)
        kata = [t for t, x in b if x < x_kp and not RE_KP.search(t)]
        nama = bersihkan_nama(kata)

        # Sambungan nama pada baris SETERUSNYA: dalam lajur nama, tiada
        # No. KP, dan bukan gred atau ulasan.
        if i + 1 < len(baris):
            sambung = [
                t for t, x in baris[i + 1]
                if x < x_kp and not RE_KP.search(t) and "(" not in t
                and not any(ch.isdigit() for ch in t)
            ]
            ekor = bersihkan_nama(sambung)
            # Hanya disambung bila baris itu sendiri BUKAN murid lain.
            if ekor and not RE_KP.search(" ".join(t for t, _ in baris[i + 1])):
                nama = f"{nama} {ekor}".strip()

        if len(nama) < 3:
            continue
        keluar.append((nama, kp))
    return keluar


def baca_pdf(jalan: pathlib.Path) -> list:
    dok = fitz.open(jalan)
    semua = []
    for muka in dok:
        # ORIENTASI DIUKUR, BUKAN DITEKA. Muka yang sama dicuba pada empat
        # putaran; yang menghasilkan paling banyak No. KP menang. Fail iDMe
        # datang terbalik dan senget, dan meneka satu orientasi ialah punca
        # asal setiap kesilapan bacaan dalam projek eGPI.
        terbaik = []
        for putaran in (0, 90, 180, 270):
            matriks = fitz.Matrix(DPI / 72, DPI / 72).prerotate(putaran)
            png = muka.get_pixmap(matrix=matriks).tobytes("png")
            calon = murid_dari_baris(baris_dari_serpihan(baca_muka(png)))
            if len(calon) > len(terbaik):
                terbaik = calon
            # Cukup banyak untuk yakin — jangan bazir tiga putaran lagi.
            # Cukup untuk yakin orientasi itu betul — tiga putaran lagi
            # hanya membazir masa pada fail yang memang lurus.
            if len(terbaik) >= 5:
                break
        semua.extend(terbaik)
    dok.close()

    # No. KP berulang dibuang; muka bertindih berlaku dalam PDF berbilang muka.
    nampak, bersih = set(), []
    for nama, kp in semua:
        if kp in nampak:
            continue
        nampak.add(kp)
        bersih.append((nama, kp))
    return bersih


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    sasaran = pathlib.Path(sys.argv[1]).expanduser()
    fail = sorted(sasaran.glob("*.pdf")) if sasaran.is_dir() else [sasaran]
    if not fail:
        raise SystemExit(f"Tiada PDF dalam {sasaran}")

    for f in fail:
        murid = baca_pdf(f)
        keluar = f.with_suffix(".txt")
        keluar.write_text(
            "\n".join(f"{nama}  {kp}" for nama, kp in murid),
            encoding="utf-8",
        )
        print(f"  {f.name}: {len(murid)} murid → {keluar.name}")

    print("\nTampal fail .txt itu ke ePBD → Masukkan murid, atau muat naiknya.")


if __name__ == "__main__":
    main()
