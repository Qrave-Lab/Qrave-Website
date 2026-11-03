import type { Metadata } from "next";
import LegalLayout, { type LegalSection } from "@/app/_components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Qrave",
  description:
    "The terms that govern use of Qrave by restaurants, their staff and their guests: accounts, subscriptions, payments, acceptable use and liability.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  { id: "acceptance", title: "Acceptance of these terms" },
  { id: "service", title: "The Qrave service" },
  { id: "accounts", title: "Accounts and security" },
  { id: "subscriptions", title: "Subscriptions, trial and billing" },
  { id: "cancellation", title: "Cancellation" },
  { id: "restaurants", title: "Restaurant responsibilities" },
  { id: "payments", title: "Payments between guests and restaurants" },
  { id: "guests", title: "Guests" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "content", title: "Your content and our software" },
  { id: "data", title: "Data and privacy" },
  { id: "availability", title: "Availability and changes" },
  { id: "liability", title: "Disclaimers and limitation of liability" },
  { id: "termination", title: "Suspension and termination" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="October 31, 2026" sections={SECTIONS}>
      <h2 id="acceptance">1. Acceptance of these terms</h2>
      <p>
        These terms are an agreement between you and Qrave (&quot;Qrave&quot;, &quot;we&quot;, &quot;us&quot;). By creating an
        account, starting a free trial, scanning a Qrave QR code to order, or otherwise using Qrave, you agree to them
        and to our <a href="/privacy">Privacy Policy</a> and <a href="/refunds">Refund &amp; Cancellation Policy</a>. If
        you use Qrave for a restaurant, you confirm you are authorised to bind that business. If you do not agree, do not
        use Qrave.
      </p>

      <h2 id="service">2. The Qrave service</h2>
      <p>
        Qrave is software for restaurants: QR table ordering, 3D/AR menus, a cloud point-of-sale, kitchen display, GST
        billing, inventory, reservations, waitlists and analytics. Qrave provides the software. The restaurant, not Qrave,
        prepares and sells food and drink, sets its prices, and is the seller to its guests.
      </p>

      <h2 id="accounts">3. Accounts and security</h2>
      <ul>
        <li>Give accurate information and keep it current.</li>
        <li>
          You are responsible for everything done through your account and your staff&apos;s accounts. Remove staff access
          when people leave.
        </li>
        <li>
          Restaurant owner accounts must use two-factor authentication (an authenticator app). Keep your recovery codes
          somewhere safe; we cannot bypass two-factor authentication for you without verifying your identity.
        </li>
        <li>Tell us promptly at the address below if you suspect unauthorised access.</li>
      </ul>

      <h2 id="subscriptions">4. Subscriptions, trial and billing</h2>
      <ul>
        <li>
          New restaurants may start with a free trial (currently 7 days unless your account says otherwise). When the trial
          ends, paid features need an active subscription.
        </li>
        <li>
          Plans, prices, table and staff limits, and included features are shown on our pricing page and in Settings →
          Subscription. Applicable taxes, including GST where it applies, are shown at checkout.
        </li>
        <li>
          Subscriptions renew automatically each month or year through a recurring-payment mandate with our payment
          processor, Razorpay. You authorise us to charge the plan price on each renewal until you cancel.
        </li>
        <li>
          If a payment fails we may retry it, and we may restrict paid features until it succeeds.
        </li>
        <li>
          If you change plan, the change and any price difference are shown before you confirm. A downgrade or scheduled
          change takes effect at the time shown.
        </li>
        <li>We will tell you before changing prices. A new price applies from your next renewal after the notice.</li>
      </ul>

      <h2 id="cancellation">5. Cancellation</h2>
      <p>
        An owner can cancel at any time in Settings → Subscription. Cancelling stops future charges, and paid features
        stop working when you cancel. Refunds are covered in our <a href="/refunds">Refund &amp; Cancellation Policy</a>.
        You can export your data before cancelling, and you can delete your account in Settings.
      </p>

      <h2 id="restaurants">6. Restaurant responsibilities</h2>
      <p>If you run a restaurant on Qrave, you are responsible for:</p>
      <ul>
        <li>
          the accuracy of your menu, prices, descriptions, photos, allergen and dietary information, and opening hours;
        </li>
        <li>
          your tax and licensing obligations, including GST registration and invoicing, FSSAI and local licences. Qrave
          produces invoices from the details you enter; you are responsible for those details being correct;
        </li>
        <li>
          fulfilling and, where appropriate, refunding the orders your guests place, and for your own cancellation and
          refund rules;
        </li>
        <li>
          the personal data of your guests that you collect through Qrave. You are the controller of that data and Qrave
          processes it for you (see Data and privacy below).
        </li>
      </ul>

      <h2 id="payments">7. Payments between guests and restaurants</h2>
      <p>
        When a guest pays online or by UPI, the payment is processed by a third-party payment provider and settled to the
        restaurant&apos;s own account. Qrave is not a bank, payment aggregator or the seller of the food, and does not hold
        guest funds for restaurants. Disputes about an order, its quality or a refund are between the guest and the
        restaurant; we provide tools to help the restaurant resolve them. Payment providers&apos; own terms also apply.
      </p>

      <h2 id="guests">8. Guests</h2>
      <p>
        If you order through a Qrave QR code you are buying from that restaurant, not from Qrave. You agree to give
        accurate order and contact details and to pay for what you order. You can cancel an order in the app only while it
        is still waiting for the restaurant&apos;s confirmation; after that, please speak to the restaurant.
      </p>

      <h2 id="acceptable-use">9. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>break the law, or use Qrave to sell anything illegal;</li>
        <li>attempt to access accounts, data or systems you are not authorised to use, or probe or disrupt the service;</li>
        <li>send spam, or message people who have not agreed to hear from you;</li>
        <li>upload content that is unlawful, infringing, or that you have no right to use;</li>
        <li>scrape, copy, reverse engineer or resell the service, except as permitted by law;</li>
        <li>use bots or scripts to place orders, join waitlists or request codes in bulk.</li>
      </ul>

      <h2 id="content">10. Your content and our software</h2>
      <p>
        You own the menus, images, 3D models, logos and other content you upload. You give us a licence to host, process,
        display and back up it only as needed to run Qrave for you and your guests. Qrave, its software, design and brand
        belong to us; you receive a limited, non-exclusive, non-transferable right to use the service while these terms
        apply. Sample menu items we create for you are for setup and can be removed at any time.
      </p>

      <h2 id="data">11. Data and privacy</h2>
      <p>
        Our <a href="/privacy">Privacy Policy</a> explains what we collect and why, how long we keep it, and your rights,
        including access, export and deletion. For guest data collected by a restaurant, the restaurant decides why and
        how it is used and Qrave acts on its instructions. GST tax invoices and related records are kept for the period the
        law requires even after other data is deleted.
      </p>

      <h2 id="availability">12. Availability and changes</h2>
      <p>
        We work to keep Qrave available but do not promise uninterrupted service. We may update, improve or remove features,
        and will give reasonable notice of changes that materially reduce what you pay for. We may update these terms; if a
        change is material we will notify account owners by email or in the product before it takes effect, and continuing
        to use Qrave afterwards means you accept it.
      </p>

      <h2 id="liability">13. Disclaimers and limitation of liability</h2>
      <p>
        Qrave is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we disclaim implied
        warranties, and we are not liable for indirect or consequential loss, lost profit, lost sales or lost data, or for
        problems caused by the restaurant&apos;s own network, devices, payment provider or third-party services. Our total
        liability for any claim relating to Qrave is limited to the fees you paid us in the 12 months before the event that
        gave rise to it. Nothing in these terms limits liability that cannot be limited by law, or your statutory consumer
        rights.
      </p>

      <h2 id="termination">14. Suspension and termination</h2>
      <p>
        You may stop using Qrave at any time. We may suspend or end access if you breach these terms, if your account is
        used fraudulently or puts others at risk, if you do not pay, or if the law requires. Where practical we will tell you
        first and give you a chance to export your data. Sections that by their nature should continue (such as liability,
        payment obligations already due, and governing law) survive termination.
      </p>

      <h2 id="law">15. Governing law</h2>
      <p>
        These terms are governed by the laws of India. Courts of competent jurisdiction in India have jurisdiction over
        disputes, subject to any mandatory consumer rights you have to bring a claim elsewhere. We would always rather
        resolve a problem informally first.
      </p>

      <h2 id="contact">16. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:support@qravetech.in">support@qravetech.in</a>.
      </p>
    </LegalLayout>
  );
}
