import { notFound } from "next/navigation";
import { resitAkuan } from "@/lib/borang-aktiviti";
import CetakAkuan from "@/components/CetakAkuan";
export const metadata={title:"Resit Akuan",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;const r=await resitAkuan(token);if(!r)notFound();return <main className="mx-auto max-w-6xl p-4"><h1 className="text-xl font-bold print:hidden">Akuan diterima</h1><CetakAkuan aktiviti={r.aktiviti} data={r.jawapan.data}/></main>}
