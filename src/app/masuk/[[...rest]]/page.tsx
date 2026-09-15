import { SignIn } from "@clerk/nextjs";

/** Satu-satunya skrin yang boleh dicapai tanpa log masuk. */
export default function Masuk() {
  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <SignIn />
    </main>
  );
}
