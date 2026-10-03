export const metadata = { title: "Privacy · Daytona Car Rentals" };
export default function PrivacyPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">YOUR INFORMATION</p>
      <h1>Only what the trip needs.</h1>
      <div className="panel">
        <h2>Booking requests</h2>
        <p>
          When direct requests are open, we collect your name, email, phone and
          trip selection to review and coordinate the request. Access is
          restricted to the operator console. We do not collect card details,
          license images, policy documents or driving records in this request
          form.
        </p>
      </div>
      <div className="panel">
        <h2>Verification</h2>
        <p>
          Before confirming a direct rental, our team arranges the required
          identity, license, driving-record and insurance checks.
          Provider-specific notices and consent are supplied separately. Do not
          send sensitive documents by ordinary email.
        </p>
      </div>
      <div className="panel">
        <h2>Preview mode</h2>
        <p>
          A clearly marked preview uses sample rates and saves synthetic request
          details only. Entered contact information is discarded rather than
          stored. No payment or actual reservation is made.
        </p>
      </div>
      <div className="panel">
        <h2>Cookies and contact</h2>
        <p>
          The admin console uses a restricted session cookie for sign-in. This
          implementation does not add advertising or session-recording tools.
          For information access, correction or deletion requests, contact
          hello@daytonacarrentals.com. The production retention and provider
          disclosures must be finalized before live requests open.
        </p>
      </div>
    </section>
  );
}
