import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <SignUp fallbackRedirectUrl="/app" />
    </main>
  );
}
