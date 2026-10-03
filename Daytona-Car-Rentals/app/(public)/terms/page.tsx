export const metadata = { title: "Rental requirements · Daytona Car Rentals" };
export default function TermsPage() {
  return (
    <section className="container page-section narrow">
      <p className="eyebrow">BEFORE YOU BOOK</p>
      <h1>Clear expectations.</h1>
      <p className="page-intro">
        A direct booking request is not a confirmed rental. The final approved
        agreement, price and verification requirements are provided before
        confirmation.
      </p>
      {[
        {
          title: "Driver approval",
          text: "All drivers need a valid, unexpired license and must meet the approved age and eligibility rules. Identity and a standard driving-record review are handled separately, with appropriate consent. Additional drivers need the same approval.",
        },
        {
          title: "Renter insurance",
          text: "Qualifying renter coverage must be verified. A policy card alone does not establish coverage for the rental vehicle or every type of loss. Trip protection depends on the actual policy and approved trip requirements.",
        },
        {
          title: "Price and payment",
          text: "Your quote identifies rental charges, applicable taxes, surcharge, delivery and a separate security deposit. No payment is taken when you submit this request. Payment timing, cancellation terms and the signed agreement must be accepted before confirmation.",
        },
        {
          title: "Availability and pickup",
          text: "We check shared-channel availability manually before confirming. Each request has an internal review hold of up to 24 hours, or until pickup if sooner. An expired hold is not a reservation. Pickup is by appointment; airport delivery needs confirmed arrangements.",
        },
        {
          title: "Turo bookings",
          text: "Turo reservations, changes, payments and protection options follow the platform’s own terms. These direct-rental requirements do not replace your Turo agreement.",
        },
      ].map((s) => (
        <div className="panel" key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </div>
      ))}
    </section>
  );
}
