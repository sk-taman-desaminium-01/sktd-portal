"use client";

/**
 * Jaring TERAKHIR — bila layout akar sendiri gagal.
 *
 * `error.tsx` biasa dirender DI DALAM layout; kalau layout itu yang gagal,
 * ia tidak pernah dipapar dan pengguna mendapat skrin kosong. Fail ini
 * menggantikan seluruh dokumen, jadi ia mesti membawa <html> dan <body>
 * sendiri dan TIDAK boleh bergantung pada apa-apa dalam layout.
 */
export default function RalatGlobal({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ms">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f8fa", color: "#0b2545" }}>
        <main style={{ maxWidth: "32rem", margin: "0 auto", padding: "3rem 1.25rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Portal tidak dapat dimuat</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Ralat berlaku sebelum halaman sempat dibina. Tiada data anda yang hilang.
            Cuba muat semula; jika ia berulang, tutup app dan buka semula.
          </p>
          <button
            type="button" onClick={reset}
            style={{ marginTop: "1.25rem", minHeight: 44, padding: "0 1rem", borderRadius: 8, border: 0, background: "#0b2545", color: "#fff", fontWeight: 600 }}
          >
            Cuba muat semula
          </button>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#64748b" }}>Kod ralat: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
