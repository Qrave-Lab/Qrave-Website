import { Metadata } from "next";
import { Suspense } from "react";
import TitleManager from "./TitleManager";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: "Qrave",
      template: "%s",
    },
    description: "Join Qrave and transform your restaurant experience.",
  };
}

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <TitleManager />
      </Suspense>
      {children}
    </>
  );
}
