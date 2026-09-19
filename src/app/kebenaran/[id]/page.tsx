import { notFound } from "next/navigation";
import { aktivitiAwam } from "@/lib/borang-aktiviti";
import Borang from "./Borang";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const [a]=await aktivitiAwam(id);if(!a)notFound();return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-bold">Surat Akuan Kebenaran dan Kesihatan Penyertaan Aktiviti dan Pertandingan</h1><h2 className="mt-4 text-lg font-bold">{a.nama}</h2><p>{a.tarikh} · {a.masa} · {a.tempat}</p><Borang aktivitiId={id}/></main>}
