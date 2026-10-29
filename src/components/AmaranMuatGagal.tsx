/** Papar bila sebahagian data gagal dimuatkan — supaya tidak disangka "tiada rekod". */
export default function AmaranMuatGagal({ apa }: { apa: string }) {
  return (
    <p role="alert" className="mt-5 rounded-xl border border-[#e9d9ae] bg-[#fdf9f0] p-4 text-sm leading-relaxed text-[#7a5a12]">
      <span className="font-semibold">{apa} gagal dimuatkan.</span> Senarai di bawah mungkin tidak lengkap — muat semula halaman atau cuba sebentar lagi.
    </p>
  );
}
