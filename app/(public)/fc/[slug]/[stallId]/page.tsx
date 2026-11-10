import type { Metadata } from "next";
import StallMenuClient from "./StallMenuClient";

type Props = { params: Promise<{ slug: string; stallId: string }> };

export const metadata: Metadata = {
  title: "Stall menu",
  description: "Browse this stall's menu, with photos and 3D dishes.",
};

export default async function StallMenuPage({ params }: Props) {
  const { slug, stallId } = await params;
  return <StallMenuClient slug={slug} stallId={stallId} />;
}
