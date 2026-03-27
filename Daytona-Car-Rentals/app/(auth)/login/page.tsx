type LoginPageProps = {
  searchParams: Promise<{
    returnUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnUrl } = await searchParams;

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Login</h1>
      <p className="mt-4 text-slate-600">
        Authentication screens are scaffolded and ready for Firebase integration.
      </p>
      {returnUrl ? (
        <p className="mt-3 text-sm text-slate-500">
          After login, return here: <span className="font-mono">{returnUrl}</span>
        </p>
      ) : null}
    </section>
  );
}
