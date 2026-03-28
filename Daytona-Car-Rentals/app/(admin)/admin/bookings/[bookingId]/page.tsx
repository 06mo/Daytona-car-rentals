import Link from "next/link";
import { notFound } from "next/navigation";

import { AdjustmentPanel } from "@/components/admin/AdjustmentPanel";
import { ProtectionPackageBadge } from "@/components/booking/ProtectionPackageBadge";
import { BookingActionsPanel } from "@/components/admin/BookingActionsPanel";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { InsuranceReviewPanel } from "@/components/admin/InsuranceReviewPanel";
import { getProtectionPackageDefinition } from "@/lib/protection/config";
import { computeRemainingBalance, listAdjustments } from "@/lib/services/adjustmentService";
import { getAdminChannelMetadata } from "@/lib/services/channelComplianceService";
import { getChecklist } from "@/lib/services/checklistService";
import { getBookingTimeline, listAdminUsers, listAdminVehicles, listUserDocumentsForAdmin } from "@/lib/services/adminService";
import { getBookingById } from "@/lib/services/bookingService";
import { summarizeInsuranceVerificationForBooking } from "@/lib/services/insuranceVerificationService";
import { listPartners } from "@/lib/services/partnerService";
import { getAgreementForBooking } from "@/lib/services/rentalAgreementService";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);

  if (!booking) {
    notFound();
  }

  const [users, vehicles, partners, documents, pickupChecklist, dropoffChecklist, adjustments, insuranceSummary, rentalAgreement] = await Promise.all([
    listAdminUsers(),
    listAdminVehicles(),
    listPartners(),
    listUserDocumentsForAdmin(booking.userId),
    getChecklist(booking.id, "pickup"),
    getChecklist(booking.id, "dropoff"),
    listAdjustments(booking.id),
    summarizeInsuranceVerificationForBooking(booking.id).catch(() => null),
    getAgreementForBooking(booking.id).catch(() => null),
  ]);
  const customer = users.find((user) => user.id === booking.userId) ?? null;
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId) ?? null;
  const partner = booking.partnerId ? partners.find((item) => item.id === booking.partnerId) ?? null : null;
  const insuranceDocument = documents.find((document) => document.type === "insurance_card") ?? null;
  const timeline = getBookingTimeline(booking);
  const protectionPackageId = booking.protectionPackage ?? "standard";
  const protectionPackage = getProtectionPackageDefinition(protectionPackageId);
  const customerVerified = customer?.verificationStatus === "verified";
  const statusActions =
    booking.status === "pending_verification" && customerVerified
      ? [{ label: "Confirm Booking", status: "confirmed" as const }]
      : booking.status === "insurance_cleared"
        ? [{ label: "Confirm Booking", status: "confirmed" as const }]
      : booking.status === "confirmed"
        ? [{ label: "Mark as Active", status: "active" as const }]
        : booking.status === "active"
          ? [{ label: "Mark Completed", status: "completed" as const }]
          : [];
  const actionNote =
    booking.status === "pending_verification" && !customerVerified
      ? "This booking can be confirmed after the customer's verification status is marked as verified."
      : booking.status === "payment_authorized"
        ? "Payment has been captured, but insurance evaluation has not cleared this booking yet."
      : booking.status === "insurance_pending"
        ? "Insurance verification is still in progress. Do not release the vehicle until coverage is cleared."
      : booking.status === "insurance_manual_review"
        ? `Insurance requires manual review${booking.insuranceBlockingReasons?.length ? `: ${booking.insuranceBlockingReasons.join(", ")}` : "."}`
      : booking.status === "insurance_cleared"
        ? "Coverage is cleared. This booking can now be confirmed."
      : statusActions.length === 0 && ["completed", "cancelled", "payment_failed"].includes(booking.status)
        ? "No further manual actions are available for this booking."
        : null;
  const needsInsuranceReviewWarning =
    booking.status === "confirmed" && protectionPackageId === "basic" && insuranceDocument?.status === "pending";
  const channelMetadata = getAdminChannelMetadata(booking, partner);
  const baseBalance = booking.pricing.totalAmount - booking.pricing.depositAmount;
  const remainingBalance = computeRemainingBalance(booking, adjustments);

  return (
    <section className="space-y-6">
      {needsInsuranceReviewWarning ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-medium text-amber-800">
          Insurance review required before pickup.
        </div>
      ) : null}
      {channelMetadata.complianceIssues.length > 0 ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-800">
          Channel compliance issue: {channelMetadata.complianceIssues.join(" ")}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Booking Detail</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>ID: {booking.id}</p>
              <p>Dates: {booking.startDate.toDateString()} - {booking.endDate.toDateString()}</p>
              <p>Location: {booking.pickupLocation}</p>
              <p>Vehicle: {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleId}</p>
              <div className="flex items-center gap-3">
                <span>Protection:</span>
                <ProtectionPackageBadge packageId={protectionPackageId} />
              </div>
              {booking.referralCode ? (
                <p>
                  Referral: {booking.referralCode} {partner ? `(${partner.name})` : "(unrecognised)"}
                </p>
              ) : null}
              <p>Rental channel: {channelMetadata.rentalChannel}</p>
              <p>Coverage source: {channelMetadata.coverageSource.replaceAll("_", " ")}</p>
              {channelMetadata.platformTripId ? <p>External trip ID: {channelMetadata.platformTripId}</p> : null}
              {channelMetadata.partnerName ? <p>Partner: {channelMetadata.partnerName}</p> : null}
              {channelMetadata.partnerCoverageResponsibility ? (
                <p>Partner coverage responsibility: {channelMetadata.partnerCoverageResponsibility}</p>
              ) : null}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Status Timeline</h2>
            <div className="mt-4 grid gap-4">
              {timeline.map((item) => (
                <div key={`${item.label}-${item.time.toISOString()}`} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <p>{item.time.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Risk</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Risk score: {booking.riskScore ?? "Not scored"}</p>
              <p>Risk level: {booking.riskLevel ?? "unknown"}</p>
              <div>
                <p className="font-medium text-slate-900">Flags</p>
                {booking.riskFlags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {booking.riskFlags.map((flag) => (
                      <span key={flag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1">No elevated risk flags recorded.</p>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>{customer?.displayName ?? booking.userId}</p>
              <p>{customer?.email ?? "No email"}</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Protection</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>{protectionPackage.name}</p>
              <p>{protectionPackage.liabilityLabel}</p>
              <p>Protection total: {formatCurrency(booking.pricing.protectionAmount / 100)}</p>
              <p>Deposit at booking: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
              {protectionPackageId === "basic" ? (
                <p>Insurance on file: {insuranceDocument ? insuranceDocument.status : "missing"}</p>
              ) : (
                <p>Insurance on file: optional</p>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Insurance Verification</h2>
            <div className="mt-4">
              {insuranceSummary ? (
                <InsuranceReviewPanel
                  bookingId={booking.id}
                  protectionPackage={protectionPackage.name}
                  rentalChannel={booking.rentalChannel ?? "direct"}
                  riskLevel={booking.riskLevel}
                  summary={insuranceSummary}
                />
              ) : (
                <p className="text-sm text-slate-500">No verification data available.</p>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Rental Agreement</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              {rentalAgreement ? (
                <>
                  <p>Status: {rentalAgreement.status.replaceAll("_", " ")}</p>
                  <p>Terms version: {rentalAgreement.termsVersion}</p>
                  <p>Consented at: {rentalAgreement.consentedAt ? rentalAgreement.consentedAt.toLocaleString() : "Not recorded"}</p>
                  <p>Signed at: {rentalAgreement.signedAt ? rentalAgreement.signedAt.toLocaleString() : "Not signed at pickup"}</p>
                  <p>Customer signature on file: {rentalAgreement.customerSignature ? "Yes" : "No"}</p>
                  <p>Admin witness signature: {rentalAgreement.adminWitnessSignature ? "Present" : "Not recorded"}</p>
                </>
              ) : (
                <p>No agreement on record.</p>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>Deposit paid: {formatCurrency(booking.pricing.depositAmount / 100)}</p>
              <p>Total: {formatCurrency(booking.pricing.totalAmount / 100)}</p>
              <p>Base balance at pickup: {formatCurrency(baseBalance / 100)}</p>
              <p>Current remaining balance: {formatCurrency(remainingBalance / 100)}</p>
              <p>Payment authorized at: {booking.paymentAuthorizedAt ? booking.paymentAuthorizedAt.toLocaleString() : "Not recorded"}</p>
              <p>PI ID: {booking.stripePaymentIntentId}</p>
            </div>
          </div>
          <AdjustmentPanel
            baseBalance={baseBalance}
            bookingId={booking.id}
            initialAdjustments={adjustments}
            initialRemainingBalance={remainingBalance}
          />
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
            <div className="mt-4 space-y-4">
              <BookingActionsPanel
                bookingId={booking.id}
                canCancel={!["active", "completed", "cancelled"].includes(booking.status)}
                note={actionNote}
                statusActions={statusActions}
              />
              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">Pickup checklist</p>
                  <p className="mt-1 text-slate-600">Status: {pickupChecklist?.status ?? "not started"}</p>
                  {(booking.status === "confirmed" || pickupChecklist) ? (
                    <Link className="mt-2 inline-flex font-semibold text-orange-600 hover:text-orange-700" href={`/admin/bookings/${booking.id}/checklist/pickup`}>
                      {pickupChecklist ? "Open pickup checklist" : "Start pickup checklist"}
                    </Link>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">Dropoff checklist</p>
                  <p className="mt-1 text-slate-600">Status: {dropoffChecklist?.status ?? "not started"}</p>
                  {(booking.status === "active" || dropoffChecklist) ? (
                    <Link className="mt-2 inline-flex font-semibold text-orange-600 hover:text-orange-700" href={`/admin/bookings/${booking.id}/checklist/dropoff`}>
                      {dropoffChecklist ? "Open dropoff checklist" : "Start dropoff checklist"}
                    </Link>
                  ) : null}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">Claims evidence package</p>
                  <p className="mt-1 text-slate-500 text-xs">Read-only snapshot of all operational and insurance artifacts for this booking.</p>
                  <a
                    className="mt-2 inline-flex font-semibold text-orange-600 hover:text-orange-700"
                    href={`/api/admin/bookings/${booking.id}/claims-evidence`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View claims evidence (JSON)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
