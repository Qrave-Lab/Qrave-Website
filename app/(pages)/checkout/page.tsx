import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutPage from "./checkOutUi";

export const metadata: Metadata = {
    title: "Checkout",
};

export default function Checkout() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
            <CheckoutPage />
        </Suspense>
    );
}
