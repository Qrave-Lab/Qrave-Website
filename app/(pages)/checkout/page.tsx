import type { Metadata } from "next";
import CheckoutPage from "./checkOutUi";

export const metadata: Metadata = {
    title: "Checkout",
};

export default function Checkout() {
    return <CheckoutPage />;
}
