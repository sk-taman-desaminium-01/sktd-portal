"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  notifikasiSaya, tandaDibacaTindakan, padamNotifikasiTindakan,
  kosongkanTindakan, daftarPush, kunciPush,
} from "@/lib/tindakan-notifikasi";
import { IKON_JENIS, NAMA_JENIS, masaLalu, ikutHari, type Notifikasi } from "@/data/notifikasi";

export default function PanelNotifikasi({ hariIni }: { hariIni: string }) {
  const [senarai, setSenarai] = useState<Notifikasi[] | null>(null);
  const [nota, setNota] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

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
      void tandaDibacaTindakan(n.id);
    }
  }

  async function padam(id: string) {
    setSenarai((l) => (l ?? []).filter((n) => n.id !== id));
    void padamNotifikasiTindakan(id);
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
  const kumpulan = ikutHari(senarai ?? [], hariIni);

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

      {senarai !== null && senarai.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          {belumBaca > 0 && (
            <button
              onClick={() => void semuaDibaca()}
              disabled={sibuk}
              className="rounded-lg border border-navy-700 px-3 py-1.5 font-semibold text-navy-700 disabled:opacity-50"
            >
              Tandakan semua dibaca
            </button>
          )}
          <button
            onClick={() => void kosong()}
            disabled={sibuk}
            className="text-slate-500 underline hover:text-[#8f2b2b] disabled:opacity-50"
          >
            Buang yang sudah dibaca
          </button>
        </div>
      )}

      {senarai !== null && senarai.length === 0 && (
        <p className="mt-6 rounded-xl border border-garis bg-white p-5 text-sm leading-relaxed text-slate-500">
          Tiada notifikasi. Apabila seseorang menempah bilik yang anda uruskan,
          memohon barang, atau menunggu kelulusan anda, ia muncul di sini.
        </p>
      )}

      {kumpulan.map((k) => (
        <section key={k.label} className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-emas">{k.label}</h2>
          <ul className="mt-2 space-y-1.5">
            {k.senarai.map((n) => {
              const isi = (
                <>
                  <span aria-hidden="true" className="shrink-0 text-base leading-none">
                    {IKON_JENIS[n.jenis] ?? "🔔"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.dibaca ? "text-slate-600" : "font-semibold text-navy-800"}`}>
                      {n.tajuk}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{n.teks}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {NAMA_JENIS[n.jenis] ?? "Umum"} · {masaLalu(n.dicipta)}
                    </span>
                  </span>
                </>
              );
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
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
                    className="shrink-0 rounded-full px-2 py-1 text-xs text-slate-300 hover:text-[#8f2b2b]"
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
 * tanpa ketukan manusia. Ayatnya menerangkan apa yang akan sampai dan bila,
 * supaya "Benarkan" ialah keputusan dan bukan tekaan.
 */
function Push() {
  const [keadaan, setKeadaan] = useState<"memuat" | "tiada" | "boleh" | "hidup" | "ditolak">("memuat");
  const [nota, setNota] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    let hidup = true;
    void (async () => {
      await Promise.resolve();
      if (!hidup) return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) { setKeadaan("tiada"); return; }
      if (Notification.permission === "denied") { setKeadaan("ditolak"); return; }
      try {
        const r = await navigator.serviceWorker.ready;
        const langganan = await r.pushManager.getSubscription();
        if (hidup) setKeadaan(langganan ? "hidup" : "boleh");
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
      const sw = await navigator.serviceWorker.ready;
      const langganan = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: kunciKeBait(kunci),
      });
      const json = langganan.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const r = await daftarPush({
        endpoint: json.endpoint ?? "",
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setNota(r.mesej);
      if (r.ok) setKeadaan("hidup");
    } catch (e) {
      setNota("Peranti ini tidak dapat menerima pemberitahuan: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSibuk(false);
    }
  }

  if (keadaan === "memuat" || keadaan === "tiada" || keadaan === "hidup") {
    return nota ? <p className="mt-4 text-xs text-[#167a4b]">{nota}</p> : null;
  }

  return (
    <div className="mt-4 rounded-xl border border-garis bg-white p-4">
      <p className="text-sm font-semibold text-navy-800">
        Terima pemberitahuan di telefon
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Pemberitahuan akan muncul di skrin telefon anda walaupun portal ditutup —
        hanya untuk perkara yang memerlukan tindakan anda: tempahan bilik yang
        anda uruskan, permohonan barang, dan kelulusan yang menunggu. Bukan
        untuk pengumuman umum.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Anda boleh mematikannya bila-bila masa dalam tetapan pelayar.
      </p>

      {keadaan === "ditolak" ? (
        <p className="mt-3 rounded-lg bg-[#fdf9f0] p-2.5 text-xs leading-relaxed text-[#7a5a12]">
          Pelayar ini sudah menolak pemberitahuan untuk portal. Untuk
          menghidupkannya, buka tetapan tapak dalam pelayar dan benarkan
          Pemberitahuan.
        </p>
      ) : (
        <button
          onClick={() => void benarkan()}
          disabled={sibuk}
          className="mt-3 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sibuk ? "…" : "Benarkan pemberitahuan"}
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
