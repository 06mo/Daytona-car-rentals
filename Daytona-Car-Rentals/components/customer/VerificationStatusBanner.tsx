import { Button } from "@/components/ui/Button";
import type { VerificationStatus } from "@/types";

const content: Record<
  VerificationStatus,
  {
    description: string;
    title: string;
    className: string;
    ctaHref?: string;
    ctaLabel?: string;
  }
> = {
  unverified: {
    title: "Complete your verification to unlock booking.",
    description: "Upload your driver's license and insurance card to get approved for future rentals.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    ctaHref: "/dashboard/documents",
    ctaLabel: "Upload Documents",
  },
  pending: {
    title: "Your documents are under review.",
    description: "We'll email you as soon as verification is complete.",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  verified: {
    title: "You're verified and ready to book.",
    description: "Everything looks good on our side. You're all set for your next trip.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  rejected: {
    title: "One or more documents need attention.",
    description: "Please review your document status and upload replacements where needed.",
    className: "border-red-200 bg-red-50 text-red-900",
    ctaHref: "/dashboard/documents",
    ctaLabel: "Review Documents",
  },
};

export function VerificationStatusBanner({ status }: { status: VerificationStatus }) {
  const current = content[status];

  return (
    <div className={`rounded-[2rem] border px-6 py-5 ${current.className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">Verification Status</p>
          <h2 className="mt-2 text-xl font-semibold">{current.title}</h2>
          <p className="mt-2 max-w-2xl text-sm opacity-90">{current.description}</p>
        </div>
        {current.ctaHref && current.ctaLabel ? (
          <Button asChild href={current.ctaHref} variant="secondary">
            {current.ctaLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
