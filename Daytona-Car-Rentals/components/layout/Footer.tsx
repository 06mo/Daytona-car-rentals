"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { TURO_HOST_URL } from "@/lib/data/vehicles";
export function Footer() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/">
            <Brand light />
          </Link>
          <p>
            Local cars. A little more freedom.
            <br />
            Daytona Beach, Florida.
          </p>
        </div>
        <div>
          <h2>Let’s get you moving.</h2>
          <a href="tel:+13868984035">(386) 898-4035</a>
          <a href="mailto:hello@daytonacarrentals.com">
            hello@daytonacarrentals.com
          </a>
        </div>
        <div className="footer-links">
          <Link href="/about">About Daytona</Link>
          <Link href="/my-trip">Trip support</Link>
          <Link href="/assistant">Help me choose</Link>
          <Link href="/contact">Pickup & help</Link>
          <Link href="/terms">Rental requirements</Link>
          <Link href="/privacy">Privacy</Link>
          <details><summary>Rental guides</summary>
            {["daytona-beach-airport", "suv", "van", "luxury", "bike-week", "daytona-500", "spring-break"].map((slug) => <Link key={slug} href={`/rentals/${slug}`}>{slug.replaceAll("-", " ")}</Link>)}
          </details>
          <a href={TURO_HOST_URL} target="_blank" rel="noreferrer">
            Prefer Turo? Book there
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Daytona Car Rentals</span>
        <span>Direct requests are reviewed before confirmation.</span>
      </div>
    </footer>
  );
}
