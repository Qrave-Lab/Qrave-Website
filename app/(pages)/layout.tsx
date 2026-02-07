import { Metadata } from "next";
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
      <TitleManager />
      {children}
    </>
  );
}
