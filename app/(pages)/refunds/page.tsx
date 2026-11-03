import type { Metadata } from "next";
import LegalLayout, { type LegalSection } from "@/app/_components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Qrave",
  description:
    "How to cancel a Qrave subscription, when subscription fees are refunded, and how guest order cancellations and refunds work.",
  alternates: { canonical: "/refunds" },
  robots: { index: true, follow: true },
};

const SECTIONS: LegalSection[] = [
  { id: "subscriptions", title: "Restaurant subscriptions" },
  { id: "cancel-subscription", title: "Cancelling a subscription" },
  { id: "subscription-refunds", title: "Subscription refunds" },
  { id: "guest-orders", title: "Guest orders" },
  { id: "order-refunds", title: "Refunds for guest orders" },
  { id: "deposits", title: "Reservation deposits" },
  { id: "failed-payments", title: "Failed or duplicate payments" },
  { id: "timelines", title: "How long refunds take" },
  { id: "contact", title: "Contact" },
];

export default function RefundsPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" updated="October 31, 2026" sections={SECTIONS}>
      <p>
        This policy covers two different things: what a <strong>restaurant</strong> pays Qrave for the software, and what a{" "}
        <strong>guest</strong> pays a restaurant for food. They are handled separately. It forms part of our{" "}
        <a href="/terms">Terms of Service</a>.
      </p>

      <h2 id="subscriptions">1. Restaurant subscriptions</h2>
      <p>
        New restaurants can try Qrave free during the trial period shown in their account (currently 7 days). You are not
        charged during the trial. Paid plans renew automatically every month or year through a Razorpay recurring-payment
        mandate until you cancel.
      </p>

      <h2 id="cancel-subscription">2. Cancelling a subscription</h2>
      <ul>
        <li>An owner can cancel at any time in Settings → Subscription. No cancellation fee applies.</li>
        <li>Cancelling stops all future charges. Paid features stop working when you cancel.</li>
        <li>You can cancel during the trial; you will not be charged.</li>
        <li>Export the data you need before cancelling. You can also delete your account in Settings.</li>
      </ul>

      <h2 id="subscription-refunds">3. Subscription refunds</h2>
      <ul>
        <li>
          Fees already paid for a billing period are not refunded when you cancel part-way through it, and are not
          pro-rated.
        </li>
        <li>
          We will refund a charge that was made in error: a duplicate charge, a charge after you cancelled, or an amount
          different from the plan you chose. Write to us within <strong>7 days</strong> of the charge.
        </li>
        <li>
          If a first paid charge was made and you tell us within 7 days that you did not intend to continue and have not
          used the service in that period, we will refund it.
        </li>
        <li>Where the law gives you a right to a refund, that right is not affected by this policy.</li>
      </ul>

      <h2 id="guest-orders">4. Guest orders</h2>
      <p>
        When you order through a Qrave QR code you are buying from the restaurant. You can cancel an order, or remove items
        from it, in the app only while its status is <em>Waiting for confirmation</em>. Once the restaurant accepts it and
        starts preparing, it can no longer be cancelled in the app. Please ask the restaurant&apos;s staff, who may agree to
        cancel or adjust it.
      </p>

      <h2 id="order-refunds">5. Refunds for guest orders</h2>
      <ul>
        <li>
          Refunds for food, drink or service are decided by the restaurant under its own rules and consumer law. Qrave does
          not sell the food and does not hold your money.
        </li>
        <li>
          If a restaurant cancels an order you have already paid for online, or refunds you, the refund goes back to the
          original payment method.
        </li>
        <li>Cash payments are refunded in cash by the restaurant.</li>
        <li>If you have a problem with an order, tell the restaurant&apos;s staff first. If you cannot resolve it, contact us.</li>
      </ul>

      <h2 id="deposits">6. Reservation deposits</h2>
      <p>
        Where a restaurant takes a deposit for a reservation, the restaurant sets whether and when it is refundable. The
        restaurant can refund a deposit from its dashboard, and the money returns to the original payment method.
      </p>

      <h2 id="failed-payments">7. Failed or duplicate payments</h2>
      <p>
        If money left your account but your order was not placed, or you were charged twice, the amount is normally returned
        to you automatically by your bank or payment provider. If it is not, contact the restaurant or us with the date,
        amount and payment reference, and we will help trace it.
      </p>

      <h2 id="timelines">8. How long refunds take</h2>
      <p>
        After a refund is issued it normally reaches the original payment method within <strong>5–7 business days</strong>,
        depending on your bank, card network or UPI app. UPI refunds are often faster.
      </p>

      <h2 id="contact">9. Contact</h2>
      <p>
        To request a subscription refund or raise a payment problem, email{" "}
        <a href="mailto:support@qravetech.in">support@qravetech.in</a> from your account email with your restaurant
        name, the date and amount, and the payment reference.
      </p>
    </LegalLayout>
  );
}
