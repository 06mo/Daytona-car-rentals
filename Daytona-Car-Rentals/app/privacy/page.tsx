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
          trip selection to review and coordinate the request. Your verified
          email account can access its own requests. The owner reviews them
          through a protected console. My trips collects confirmed renter fields
          and private license/insurance images for review. We do not collect
          card details, Social Security numbers or driving records here.
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
          details only. Use synthetic renter fields and images; never upload
          real identity documents in Preview. Sign-in is limited to explicitly
          approved test email recipients. No payment or actual reservation is
          made.
        </p>
      </div>
      <div className="panel">
        <h2>Private document retention</h2>
        <p>
          Uploaded images are stored in the private application database, not a
          public bucket. Downloads require an authenticated owner or the
          customer who owns the request, and are audited. Images expire 30 days
          after the requested return; expired downloads are denied and a
          retention job removes the stored images. You may delete them earlier
          in My trips. Deletion makes required review incomplete. Backup copies
          remain subject to the backup retention schedule, which must be
          approved before live use.
        </p>
        <p>
          Images are validated and stripped of metadata. There is no OCR or
          automated driver verification. Confirm your entered fields and allow
          the owner to review them.
        </p>
      </div>
      <div className="panel">
        <h2>Cookies and contact</h2>
        <p>
          Customer and owner sign-ins use separate restricted cookies. Supabase
          Auth sends customer sign-in links; transactional request emails use a
          separate delivery queue. This implementation does not add advertising
          or session-recording tools. For information access, correction or
          deletion requests, contact hello@daytonacarrentals.com. The production
          retention and provider disclosures must be finalized before live
          requests open.
        </p>
      </div>
    </section>
  );
}
