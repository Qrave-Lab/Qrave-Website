import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: {
      default: "Qrave",
      template: "%s",
    },
    description: "Join Qrave and transform your restaurant experience.",
    // App screens (staff, checkout, auth) stay out of search; public pages opt back in.
    robots: { index: false, follow: false },
  };
}

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
