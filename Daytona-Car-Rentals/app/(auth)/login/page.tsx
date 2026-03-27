import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Daytona Car Rentals",
};

type LoginPageProps = {
  searchParams: Promise<{
    returnUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnUrl } = await searchParams;

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-2 text-slate-500">Welcome back to Daytona Car Rentals.</p>

      <div className="mt-8">
        <LoginForm returnUrl={returnUrl} />
      </div>
    </section>
  );
}
