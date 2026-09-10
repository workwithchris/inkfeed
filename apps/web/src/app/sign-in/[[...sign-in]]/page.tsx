import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <SignIn fallbackRedirectUrl="/app" />
    </main>
  );
}
