import PratontonCetak from "./PratontonCetak";

export const metadata = {
  title: "Pratonton Cetakan",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default function HalamanPratontonCetak() {
  return <PratontonCetak />;
}
