"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  notifikasiSaya, tandaDibacaTindakan, padamNotifikasiTindakan,
  kosongkanTindakan, daftarPush, kunciPush,
  segerakPush, buangPush,
} from "@/lib/tindakan-notifikasi";
import { IKON_JENIS, NAMA_JENIS, masaLalu, ikutHari, type Notifikasi } from "@/data/notifikasi";

export default function PanelNotifikasi({ hariIni }: { hariIni: string }) {
  const [senarai, setSenarai] = useState<Notifikasi[] | null>(null);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [tab, setTab] = useState<"semua" | "belum">("semua");
  const [jenis, setJenis] = useState<Notifikasi["jenis"] | "semua">("semua");

  useEffect(() => {
    void notifikasiSaya().then((r) => {
      setSenarai(r.senarai ?? []);
      if (!r.ok) setNota({ ok: false, teks: r.mesej });
    });
  }, []);

  async function semuaDibaca() {
    setSibuk(true);
    try {
      await tandaDibacaTindakan();
      setSenarai((l) => (l ?? []).map((n) => ({ ...n, dibaca: true })));
    } finally { setSibuk(false); }
  }

  async function buka(n: Notifikasi) {
    if (!n.dibaca) {
      setSenarai((l) => (l ?? []).map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)));
      // Kegagalan tidak boleh senyap: tanda dikembalikan supaya kiraan
      // "belum dibaca" kekal jujur.
      void tandaDibacaTindakan(n.id).catch(() => {
        setSenarai((l) => (l ?? []).map((x) => (x.id === n.id ? { ...x, dibaca: false } : x)));
      });
    }
  }

  async function padam(id: string) {
    const sebelum = senarai;
    setSenarai((l) => (l ?? []).filter((n) => n.id !== id));
    void padamNotifikasiTindakan(id).catch(() => {
      setSenarai(sebelum);
      setNota({ ok: false, teks: "Sambungan terputus — notifikasi itu tidak dibuang." });
    });
  }

  async function kosong() {
    setSibuk(true);
    try {
      const r = await kosongkanTindakan();
      setNota({ ok: r.ok, teks: r.mesej });
      if (r.ok) setSenarai((l) => (l ?? []).filter((n) => !n.dibaca));
    } finally { setSibuk(false); }
  }

  const belumBaca = (senarai ?? []).filter((n) => !n.dibaca).length;
  const jenisAda = [...new Set((senarai ?? []).map((n) => n.jenis))];
  const ditapis = (senarai ?? []).filter((n) =>
    (tab === "semua" || !n.dibaca) && (jenis === "semua" || n.jenis === jenis));
  const kumpulan = ikutHari(ditapis, hariIni);

  return (
    <>
      <Push />

      {nota && (
        <p
          className={`mt-4 rounded-xl border p-3 text-sm leading-relaxed ${
            nota.ok
              ? "border-[#c6e2d1] bg-[#eef8f2] text-[#167a4b]"
              : "border-[#e9d9ae] bg-[#fdf9f0] text-[#7a5a12]"
          }`}
        >
          {nota.teks}
        </p>
      )}

      {/* Memuat: rangka, bukan skrin kosong — pengguna tahu ia sedang bekerja. */}
      {senarai === null && (
        <div className="mt-5 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-garis bg-white p-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {senarai !== null && senarai.length > 0 && (
        <>
          {/* Tab + tindakan: susunan biasa app lain — Semua / Belum dibaca. */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-garis pb-2">
            <div className="flex gap-1" role="tablist" aria-label="Tapis notifikasi">
              {([["semua", "Semua"], ["belum", "Belum dibaca"]] as const).map(([k, l]) => (
                <button
                  key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${
                    tab === k ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {l}{k === "belum" && belumBaca > 0 ? ` (${belumBaca})` : ""}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {belumBaca > 0 && (
                <button onClick={() => void semuaDibaca()} disabled={sibuk}
                  className="font-semibold text-navy-700 underline disabled:opacity-50">
                  Tandakan semua dibaca
                </button>
              )}
              <button onClick={() => void kosong()} disabled={sibuk}
                className="text-slate-500 underline hover:text-[#8f2b2b] disabled:opacity-50">
                Buang yang sudah dibaca
              </button>
            </div>
          </div>

          {/* Penapis jenis — hanya jenis yang memang ada dalam senarai. */}
          {jenisAda.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["semua", ...jenisAda] as const).map((j) => (
                <button
                  key={j} onClick={() => setJenis(j as typeof jenis)}
                  className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${
                    jenis === j ? "border-navy-700 bg-navy-50 text-navy-800" : "border-garis text-slate-500 hover:bg-slate-50"}`}
                >
                  {j === "semua" ? "Semua jenis" : `${IKON_JENIS[j] ?? "🔔"} ${NAMA_JENIS[j] ?? j}`}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {senarai !== null && senarai.length === 0 && (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-500">
          Tiada notifikasi. Apabila seseorang menempah bilik yang anda uruskan,
          memohon barang, atau menunggu kelulusan anda, ia muncul di sini.
        </p>
      )}

      {senarai !== null && senarai.length > 0 && ditapis.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
          {tab === "belum" ? "Semua sudah dibaca. ✓" : "Tiada notifikasi jenis itu."}
        </p>
      )}

      {kumpulan.map((k) => (
        <section key={k.label} className="mt-5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas-gelap">{k.label}</h2>
          <ul className="mt-2 space-y-1.5">
            {k.senarai.map((n) => {
              const isi = (
                <>
                  <span aria-hidden="true"
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base ${
                      n.dibaca ? "bg-slate-100" : "bg-navy-50"}`}>
                    {IKON_JENIS[n.jenis] ?? "🔔"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.dibaca ? "text-slate-600" : "font-semibold text-navy-800"}`}>
                      {n.tajuk}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{n.teks}</span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {NAMA_JENIS[n.jenis] ?? "Umum"} · {masaLalu(n.dicipta)}
                    </span>
                  </span>
                  {!n.dibaca && (
                    <span aria-label="Belum dibaca" title="Belum dibaca"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c2410c]" />
                  )}
                </>
              );
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition hover:border-navy-700/40 ${
                    n.dibaca ? "border-garis bg-white" : "border-navy-700/25 bg-navy-50/40"
                  }`}
                >
                  {n.pautan ? (
                    <Link href={n.pautan} onClick={() => void buka(n)} className="flex min-w-0 flex-1 items-start gap-3">
                      {isi}
                    </Link>
                  ) : (
                    <button onClick={() => void buka(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      {isi}
                    </button>
                  )}
                  <button
                    onClick={() => void padam(n.id)}
                    aria-label={`Buang notifikasi: ${n.tajuk}`}
                    title="Buang"
                    className="shrink-0 rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-[#8f2b2b]"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * PEMBERITAHUAN DI SKRIN TELEFON.
 *
 * Kebenaran DIMINTA, tidak pernah diandaikan — dan diminta hanya selepas
 * pengguna menekan butang, kerana pelayar menolak permintaan yang datang
 * tanpa ketukan manusia.
 *
 * Tiga punca "admin lain tak dapat hidupkan / notifikasi tak naik" yang
 * ditutup di sini:
 *  1. iPhone/iPad hanya menyokong push dari app yang DIPASANG ke Skrin
 *     Utama (iOS 16.4+). Dalam tab Safari `Notification` tidak wujud, dan
 *     dahulu komponen ini memulangkan `null` — tiada butang, tiada sebab.
 *  2. Langganan pelayar kekal milik akaun PERTAMA yang melanggan pada
 *     pelayar itu. Akaun kedua melihat "aktif" tetapi tidak menerima
 *     apa-apa. Kini setiap kali halaman dibuka, langganan diikat semula
 *     kepada akaun semasa.
 *  3. Kunci VAPID bertukar → `subscribe()` melontar InvalidStateError.
 *     Langganan lama dibuang dan dicuba sekali lagi.
 */
type KeadaanPush = "memuat" | "tiada" | "ios-pasang" | "boleh" | "hidup" | "ditolak";

function perantiIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function dipasangSebagaiApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** `serviceWorker.ready` tidak pernah selesai jika pendaftaran gagal — hadkan masa. */
async function swSedia(): Promise<ServiceWorkerRegistration> {
  const sedia = await navigator.serviceWorker.getRegistration("/portal/");
  if (!sedia) await navigator.serviceWorker.register("/portal/sw.js", { scope: "/portal/" });
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, tolak) =>
      setTimeout(() => tolak(new Error("Service worker portal tidak aktif. Muat semula halaman dan cuba lagi.")), 10000)),
  ]);
}

function jsonLanggan(l: PushSubscription) {
  const j = l.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  return { endpoint: j.endpoint ?? "", p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" };
}

function samaKunci(l: PushSubscription, kunci: string): boolean {
  const ada = l.options?.applicationServerKey;
  if (!ada) return true;
  const a = new Uint8Array(ada);
  const b = kunciKeBait(kunci);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function Push() {
  const [keadaan, setKeadaan] = useState<KeadaanPush>("memuat");
  const [nota, setNota] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    let hidup = true;
    void (async () => {
      await Promise.resolve();
      if (!hidup) return;
      const sokong = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      if (!sokong) {
        setKeadaan(perantiIos() && !dipasangSebagaiApp() ? "ios-pasang" : "tiada");
        return;
      }
      if (Notification.permission === "denied") { setKeadaan("ditolak"); return; }
      try {
        const r = await swSedia();
        const langganan = await r.pushManager.getSubscription();
        if (!hidup) return;
        if (!langganan || Notification.permission !== "granted") { setKeadaan("boleh"); return; }
        const kunci = await kunciPush();
        if (kunci && !samaKunci(langganan, kunci)) {
          // Kunci pelayan sudah bertukar — langganan lama tidak akan menerima apa-apa.
          await langganan.unsubscribe().catch(() => {});
          if (hidup) setKeadaan("boleh");
          return;
        }
        const r2 = await segerakPush(jsonLanggan(langganan));
        if (hidup) setKeadaan(r2.ok ? "hidup" : "boleh");
      } catch { if (hidup) setKeadaan("boleh"); }
    })();
    return () => { hidup = false; };
  }, []);

  async function benarkan() {
    setSibuk(true);
    setNota(null);
    try {
      const kunci = await kunciPush();
      if (!kunci) {
        setNota(
          "Pemberitahuan telefon belum dikonfigurasikan oleh admin sistem. " +
          "Loceng dalam portal tetap berfungsi seperti biasa.",
        );
        return;
      }
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setKeadaan(izin === "denied" ? "ditolak" : "boleh");
        setNota("Kebenaran tidak diberi. Anda boleh menghidupkannya bila-bila masa.");
        return;
      }
      const sw = await swSedia();
      const kunciBait = kunciKeBait(kunci);
      let langganan: PushSubscription;
      try {
        const lama = await sw.pushManager.getSubscription();
        if (lama && !samaKunci(lama, kunci)) await lama.unsubscribe();
        langganan = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciBait });
      } catch {
        // Langganan tersangkut (kunci lama / keadaan pelayar) — buang dan cuba sekali lagi.
        const lama = await sw.pushManager.getSubscription();
        await lama?.unsubscribe().catch(() => {});
        langganan = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciBait });
      }
      const r = await daftarPush(jsonLanggan(langganan));
      setNota(r.mesej);
      if (r.ok) setKeadaan("hidup");
    } catch (e) {
      setNota("Peranti ini tidak dapat menerima pemberitahuan: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSibuk(false);
    }
  }

  async function matikan() {
    setSibuk(true);
    setNota(null);
    try {
      const sw = await swSedia();
      const l = await sw.pushManager.getSubscription();
      if (l) {
        await buangPush(l.endpoint);
        await l.unsubscribe().catch(() => {});
      }
      setKeadaan("boleh");
      setNota("Peranti ini tidak lagi menerima pemberitahuan.");
    } catch (e) {
      setNota(e instanceof Error ? e.message : "Gagal mematikan.");
    } finally { setSibuk(false); }
  }

  if (keadaan === "memuat") return null;

  if (keadaan === "ios-pasang") {
    return (
      <div className="mt-4 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
        <p className="font-semibold">Pasang portal ke Skrin Utama untuk menerima pemberitahuan</p>
        <p className="mt-1">
          iPhone dan iPad hanya membenarkan pemberitahuan daripada app yang dipasang.
          Dalam Safari: tekan butang <b>Kongsi</b> → <b>Tambah ke Skrin Utama</b>, kemudian
          buka Portal SKTD dari ikon itu dan kembali ke halaman ini. (Perlu iOS 16.4 atau lebih baharu.)
        </p>
      </div>
    );
  }

  if (keadaan === "tiada") {
    return (
      <p className="mt-4 rounded-xl border border-garis bg-white p-3 text-xs leading-relaxed text-slate-500">
        Pelayar ini tidak menyokong pemberitahuan telefon. Guna Chrome, Edge, Firefox
        atau Safari terkini. Loceng dalam portal tetap berfungsi.
      </p>
    );
  }

  if (keadaan === "hidup") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="font-semibold text-[#14603c]">✓ Pemberitahuan peranti aktif</span>
        <button onClick={() => void matikan()} disabled={sibuk}
          className="text-slate-500 underline hover:text-[#8f2b2b] disabled:opacity-50">
          Matikan di peranti ini
        </button>
        {nota && <p className="w-full leading-relaxed text-slate-500">{nota}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-garis bg-white p-4">
      <p className="text-sm font-semibold text-navy-800">
        Terima pemberitahuan di telefon
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Pemberitahuan akan muncul di skrin telefon anda walaupun portal ditutup —
        untuk perkara mengikut tugas anda, termasuk kelas, disiplin, RMT,
        tempahan, borang, ICT dan pengumuman sekolah.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Hidupkan pada setiap peranti yang anda guna. Anda boleh mematikannya bila-bila masa.
      </p>

      {keadaan === "ditolak" ? (
        <p className="mt-3 rounded-lg bg-[#fdf9f0] p-2.5 text-xs leading-relaxed text-[#7a5a12]">
          Pelayar ini sudah menyekat pemberitahuan untuk portal. Tekan ikon 🔒 atau ⓘ
          di sebelah alamat laman → <b>Pemberitahuan</b> → <b>Benarkan</b>, kemudian muat
          semula halaman ini. Pada app yang dipasang: Tetapan telefon → Pemberitahuan →
          Portal SKTD.
        </p>
      ) : (
        <button
          onClick={() => void benarkan()}
          disabled={sibuk}
          className="mt-3 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sibuk ? "Sedang menghidupkan…" : "Benarkan pemberitahuan"}
        </button>
      )}

      {nota && <p className="mt-2 text-xs leading-relaxed text-slate-500">{nota}</p>}
    </div>
  );
}

/** Kunci VAPID base64url → Uint8Array, seperti yang dituntut PushManager. */
function kunciKeBait(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const biasa = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const mentah = atob(biasa);
  const bait = new Uint8Array(new ArrayBuffer(mentah.length));
  for (let i = 0; i < mentah.length; i++) bait[i] = mentah.charCodeAt(i);
  return bait;
}
