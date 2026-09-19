import Link from "next/link";
import { senaraiAktivitiSaya, skopAktivitiSaya } from "@/lib/borang-aktiviti";
import Panel from "./Panel";
export const metadata={title:"Aktiviti dan Borang Akuan"};
export default async function Page(){const [senarai,skop]=await Promise.all([senaraiAktivitiSaya(),skopAktivitiSaya()]);return <main className="mx-auto max-w-4xl p-6"><Link href="/borang" className="text-sm underline">← Borang Sekolah</Link><h1 className="mt-4 text-2xl font-bold">Aktiviti dan Borang Akuan</h1>{!skop.length?<p className="mt-5">Pentadbir perlu menetapkan tugasan pengurus pasukan kepada anda dahulu.</p>:<Panel senarai={senarai} skop={skop}/>}</main>}
